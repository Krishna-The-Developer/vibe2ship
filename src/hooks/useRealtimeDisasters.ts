import { useState, useEffect, useRef } from 'react';
import { subscribeToDisasters, FirestoreDisaster, upsertDisaster } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';

export interface MergedDisaster {
  id: string;
  title: string;
  type: 'earthquake' | 'hurricane' | 'flood' | 'wildfire' | 'tsunami';
  magnitude: number;
  depth_km?: number | null;
  population_affected: number;
  damaged_critical: number;
  total_critical: number;
  status: 'active' | 'monitored' | 'resolved';
  total_score: number;
  severity_label: string;
  recommended_response_level: number;
  source: 'firestore' | 'usgs';
  createdAt?: string;
  updatedAt?: string;
}

const USGS_API_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson';

export function useRealtimeDisasters() {
  const { currentUser } = useAuth();
  const [dbDisasters, setDbDisasters] = useState<FirestoreDisaster[]>([]);
  const [usgsDisasters, setUsgsDisasters] = useState<MergedDisaster[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const prevDbLength = useRef<number>(0);
  const onNewDataArrival = useRef<(() => void) | null>(null);
  const persistedDisasterIds = useRef<Set<string>>(new Set());

  const isIgnorableFirestoreError = (err: Error | unknown) => {
    const message = err instanceof Error ? err.message : String(err || '');
    return /permission|insufficient permissions|PERMISSION_DENIED/i.test(message);
  };

  // 1. Subscribe to Firestore Disasters
  useEffect(() => {
    if (!currentUser) {
      setDbDisasters([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Set up the real-time subscription using onSnapshot
    const unsubscribe = subscribeToDisasters(
      (disasters) => {
        setDbDisasters(disasters);
        setLoading(false);

        // Check if new data arrived (either length increased or content modified)
        if (disasters.length > prevDbLength.current) {
          if (onNewDataArrival.current) {
            onNewDataArrival.current();
          }
        }
        prevDbLength.current = disasters.length;
      },
      (err) => {
        if (isIgnorableFirestoreError(err)) {
          console.warn("Firestore disaster access is unavailable; continuing with local telemetry fallback.", err);
          setDbDisasters([]);
          setError(null);
          setLoading(false);
          return;
        }

        console.error("Error subscribing to disasters:", err);
        setError(err.message || "Failed to load real-time disasters");
        setLoading(false);
      }
    );

    // CLEANUP PATTERN EXPLANATION:
    // The `subscribeToDisasters` function returns an unsubscribe function provided by Firestore's `onSnapshot`.
    // Returning this unsubscribe function from the `useEffect` cleanup hook ensures that when the component
    // unmounts or dependencies change, the WebSocket connection/listener is cleanly closed, preventing memory leaks,
    // duplicate listener registrations, and unwanted state updates on unmounted components.
    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const persistDisasterToFirestore = async (disaster: MergedDisaster) => {
    if (!currentUser) return;

    if (persistedDisasterIds.current.has(disaster.id)) {
      return;
    }

    persistedDisasterIds.current.add(disaster.id);

    try {
      await upsertDisaster({
        id: disaster.id,
        title: disaster.title,
        type: disaster.type,
        magnitude: disaster.magnitude,
        depth_km: disaster.depth_km ?? null,
        population_affected: disaster.population_affected,
        damaged_critical: disaster.damaged_critical,
        total_critical: disaster.total_critical,
        status: disaster.status,
        total_score: disaster.total_score,
        severity_label: disaster.severity_label,
        recommended_response_level: disaster.recommended_response_level
      });
    } catch (err) {
      console.warn('Unable to persist disaster to Firestore:', err);
    }
  };

  // 2. Fetch USGS Real-Time Earthquakes
  useEffect(() => {
    let isMounted = true;
    const fetchUSGSData = async () => {
      try {
        const response = await fetch(USGS_API_URL);
        if (!response.ok) {
          throw new Error(`USGS feed returned status: ${response.status}`);
        }
        const data = await response.json();
        
        if (!isMounted) return;

        // Map USGS earthquake features into our MergedDisaster layout
        const mappedEarthquakes: MergedDisaster[] = (data.features || [])
          .slice(0, 10) // limit to top 10 most recent
          .map((feat: any) => {
            const mag = feat.properties?.mag || 5.0;
            const depth = feat.geometry?.coordinates?.[2] || 10.0;
            const title = feat.properties?.place || "Unknown Location";
            
            // Calculate a composite risk score locally using our standard formula
            const magScore = (mag / 10.0) * 25.0;
            // Simulated 1,000 - 150,000 affected people based on magnitude
            const population = Math.floor(Math.pow(mag, 4) * 20); 
            const popScore = Math.min(35.0, (Math.log10(population) / 6.0) * 35.0);
            const totalCrit = Math.floor(mag * 2);
            const damagedCrit = Math.floor(mag);
            const infraScore = totalCrit > 0 ? (damagedCrit / totalCrit) * 25.0 : 0.0;
            const depthScore = Math.max(0, Math.min(15, (1.0 - (depth / 150.0)) * 15.0));
            const total = Math.max(0.0, Math.min(100.0, Math.round((magScore + popScore + infraScore + depthScore) * 100) / 100));

            let severity = 'Moderate';
            let responseLvl = 2;
            if (total <= 25.0) { severity = 'Low'; responseLvl = 1; }
            else if (total <= 50.0) { severity = 'Moderate'; responseLvl = 2; }
            else if (total <= 75.0) { severity = 'High'; responseLvl = 3; }
            else if (total <= 90.0) { severity = 'Critical'; responseLvl = 4; }
            else { severity = 'Catastrophic'; responseLvl = 5; }

            return {
              id: feat.id || `usgs-${feat.properties?.time}`,
              title: `USGS: M${mag} - ${title}`,
              type: 'earthquake' as const,
              magnitude: mag,
              depth_km: depth,
              population_affected: population,
              damaged_critical: damagedCrit,
              total_critical: totalCrit,
              status: 'active' as const,
              total_score: total,
              severity_label: severity,
              recommended_response_level: responseLvl,
              source: 'usgs' as const,
              createdAt: new Date(feat.properties?.time).toISOString(),
              updatedAt: new Date(feat.properties?.time).toISOString()
            };
          });

        setUsgsDisasters(mappedEarthquakes);
        for (const disaster of mappedEarthquakes) {
          void persistDisasterToFirestore(disaster);
        }
      } catch (err) {
        console.warn("Failed to fetch USGS real-time earthquakes. Using offline USGS mock fallback.", err);
        if (isMounted) {
          // Fallback static USGS-like data in case of offline/network blockages
          const offlineFallback: MergedDisaster[] = [
            {
              id: 'usgs-fallback-1',
              title: 'USGS (Simulated): M5.8 - 42km W of Petrolia, CA',
              type: 'earthquake',
              magnitude: 5.8,
              depth_km: 12.1,
              population_affected: 23500,
              damaged_critical: 3,
              total_critical: 12,
              status: 'monitored',
              total_score: 48.72,
              severity_label: 'Moderate',
              recommended_response_level: 2,
              source: 'usgs',
              createdAt: new Date(Date.now() - 3600000).toISOString()
            },
            {
              id: 'usgs-fallback-2',
              title: 'USGS (Simulated): M6.4 - Near Coast of Honshu, Japan',
              type: 'earthquake',
              magnitude: 6.4,
              depth_km: 35.0,
              population_affected: 128000,
              damaged_critical: 8,
              total_critical: 25,
              status: 'active',
              total_score: 62.45,
              severity_label: 'High',
              recommended_response_level: 3,
              source: 'usgs',
              createdAt: new Date(Date.now() - 7200000).toISOString()
            }
          ];
          setUsgsDisasters(offlineFallback);
          for (const disaster of offlineFallback) {
            void persistDisasterToFirestore(disaster);
          }
        }
      }
    };

    fetchUSGSData();
    const usgsInterval = setInterval(fetchUSGSData, 60000); // refresh USGS feed every 60 seconds

    return () => {
      isMounted = false;
      clearInterval(usgsInterval);
    };
  }, [currentUser]);

  // 3. Merge lists together (Deduplicate and Sort)
  const mergedDisasters: MergedDisaster[] = [];

  // Add all Firestore user-managed disasters
  dbDisasters.forEach((d) => {
    mergedDisasters.push({
      id: d.id || '',
      title: d.title,
      type: d.type,
      magnitude: d.magnitude,
      depth_km: d.depth_km,
      population_affected: d.population_affected,
      damaged_critical: d.damaged_critical,
      total_critical: d.total_critical,
      status: d.status,
      total_score: d.total_score,
      severity_label: d.severity_label,
      recommended_response_level: d.recommended_response_level,
      source: 'firestore',
      createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
      updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : d.updatedAt
    });
  });

  // Append USGS earthquakes ensuring no double-adding
  usgsDisasters.forEach((usgs) => {
    if (!mergedDisasters.some((d) => d.id === usgs.id)) {
      mergedDisasters.push(usgs);
    }
  });

  // Sort: active first, then by score descending, then by date descending
  mergedDisasters.sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    return b.total_score - a.total_score;
  });

  const registerOnNewData = (cb: () => void) => {
    onNewDataArrival.current = cb;
  };

  return {
    disasters: mergedDisasters,
    loading,
    error,
    registerOnNewData
  };
}
