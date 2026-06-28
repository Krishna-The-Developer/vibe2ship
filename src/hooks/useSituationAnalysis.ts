import { useState, useEffect, useCallback, useRef } from 'react';

export interface ImmediateThreat {
  threat: string;
  severity: 'Critical' | 'High' | 'Moderate' | string;
  impact_area: string;
}

export interface PriorityAction {
  action: string;
  responsible_party: string;
  time_criticality: string;
}

export interface ResourceGap {
  resource: string;
  needed: number;
  available: number;
  gap: number;
  mitigation_plan: string;
}

export interface SituationAnalysisData {
  executive_summary: string;
  immediate_threats: ImmediateThreat[];
  priority_actions: PriorityAction[];
  resource_gaps: ResourceGap[];
  estimated_response_window: string;
  confidence_level: 'High' | 'Medium' | 'Low' | string;
  confidence_explanation: string;
  updated_at: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

// Simple in-memory cache mapped by disaster ID + hash of some parameters
const analysisCache: Record<string, SituationAnalysisData> = {};

export interface UseSituationAnalysisOptions {
  disasterId: string;
  disasterTitle: string;
  disasterType: string;
  magnitude: number;
  affectedPopulation: number;
  damagedCritical: number;
  totalCritical: number;
  riskScore: number;
  resources?: any[];
  useStreaming?: boolean;
}

export function useSituationAnalysis(options: UseSituationAnalysisOptions) {
  const {
    disasterId,
    disasterTitle,
    disasterType,
    magnitude,
    affectedPopulation,
    damagedCritical,
    totalCritical,
    riskScore,
    resources,
    useStreaming = true
  } = options;

  const [data, setData] = useState<SituationAnalysisData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [streamingText, setStreamingText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const resourcesString = JSON.stringify(resources);

  const runStandardFetch = useCallback(async (payload: any, cacheKey: string, signal: AbortSignal) => {
    const token = localStorage.getItem('token') || 'mock-auth-token-123';
    const response = await fetch(`${API_BASE_URL}/api/analysis/situation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
      signal
    });

    if (!response.ok) {
      throw new Error(`Failed to retrieve situation analysis: HTTP ${response.status}`);
    }

    const parsed: SituationAnalysisData = await response.json();
    analysisCache[cacheKey] = parsed;
    setData(parsed);
    setIsFallback(parsed.confidence_explanation?.toLowerCase().includes('sandbox') || false);
    setError(null);
  }, []);

  const fetchAnalysis = useCallback(async (forceRefresh = false) => {
    if (!disasterId) return;

    // Check cache
    const cacheKey = `${disasterId}_${riskScore}_${damagedCritical}`;
    if (!forceRefresh && analysisCache[cacheKey]) {
      setData(analysisCache[cacheKey]);
      setIsFallback(analysisCache[cacheKey].confidence_explanation?.toLowerCase().includes('sandbox') || false);
      setError(null);
      return;
    }

    // Cancel previous requests if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Timeout trigger: automatically abort after 12 seconds
    const timeoutId = setTimeout(() => {
      console.warn("Situation analysis request timed out. Aborting fetch...");
      abortController.abort();
    }, 12000);

    setLoading(true);
    setIsStreaming(false);
    setStreamingText('');
    setError(null);

    const payload = {
      disaster_id: disasterId,
      disaster_title: disasterTitle,
      disaster_type: disasterType,
      magnitude: magnitude,
      affected_population: affectedPopulation,
      damaged_critical_facilities: damagedCritical,
      total_critical_facilities: totalCritical,
      risk_score: riskScore,
      resources: resources || []
    };

    const token = localStorage.getItem('token') || 'mock-auth-token-123';
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    if (useStreaming) {
      setIsStreaming(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/analysis/situation/stream`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error(`Streaming failed: HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Streaming body reader is unavailable');
        }

        const decoder = new TextDecoder();
        let accumulatedText = '';
        let doneReading = false;

        while (!doneReading) {
          const { value, done } = await reader.read();
          doneReading = done;
          if (value) {
            const chunk = decoder.decode(value, { stream: !done });
            // SSE parse lines
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataPart = line.substring(6).trim();
                accumulatedText += dataPart;
                setStreamingText(prev => prev + dataPart);
              }
            }
          }
        }

        clearTimeout(timeoutId);

        // Try to parse full accumulated JSON
        try {
          const parsed: SituationAnalysisData = JSON.parse(accumulatedText);
          analysisCache[cacheKey] = parsed;
          setData(parsed);
          setIsFallback(parsed.confidence_explanation?.toLowerCase().includes('sandbox') || false);
        } catch (parseErr) {
          console.warn('Streaming complete, but parsing failed. Retrying standard fetch...', parseErr);
          // Fallback to standard fetch
          await runStandardFetch(payload, cacheKey, abortController.signal);
        }

      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          // If we timed out, try standard fetch instead
          console.warn('Streaming timed out or was aborted, falling back to standard fetch.');
        } else {
          console.warn('Streaming error, falling back to standard API fetch...', err);
        }
        try {
          await runStandardFetch(payload, cacheKey, abortController.signal);
        } catch (subErr: any) {
          setError(subErr.message || 'Disaster Situation Analysis call failed.');
        }
      } finally {
        setIsStreaming(false);
        setLoading(false);
      }
    } else {
      // Standard fetch
      try {
        await runStandardFetch(payload, cacheKey, abortController.signal);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          setError('Disaster Situation Analysis call timed out.');
        } else {
          setError(err.message || 'Disaster Situation Analysis call failed.');
        }
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    }
  }, [
    disasterId,
    disasterTitle,
    disasterType,
    magnitude,
    affectedPopulation,
    damagedCritical,
    totalCritical,
    riskScore,
    resourcesString,
    useStreaming,
    runStandardFetch
  ]);

  useEffect(() => {
    fetchAnalysis();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchAnalysis]);

  return {
    data,
    loading,
    error,
    isFallback,
    isStreaming,
    streamingText,
    refresh: () => fetchAnalysis(true)
  };
}

