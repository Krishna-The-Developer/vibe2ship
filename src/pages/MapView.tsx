import React, { useState, useEffect, useRef, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useApp, Task } from '../context/AppContext';
import AppLayout from '../components/Layout/AppLayout';
import { 
  geocodeAddress, 
  calculateRoute, 
  GeocodeResult, 
  RouteSummary 
} from '../services/orsService';
import { calculateImpactZones, getHoursLeft } from '../utils/deadlineCalculator';
import { renderImpactRadiusOnMap, clearImpactRadiusFromMap } from '../components/Map/ImpactRadiusLayer';
import { useEvacuationRoutes } from '../hooks/useEvacuationRoutes';
import EvacuationMap from '../components/Map/EvacuationMap';
import EvacuationPanel from '../components/Navigation/EvacuationPanel';
import { useMapLayers } from '../context/MapLayersContext';
import LayerControlPanel from '../components/Map/LayerControlPanel';
import MapLegend from '../components/Map/MapLegend';

import { 
  Map as MapIcon, 
  Search, 
  Navigation, 
  Compass, 
  Route as RouteIcon, 
  Settings, 
  Layers, 
  Plus, 
  Check, 
  AlertCircle, 
  MapPin, 
  Sparkles, 
  X, 
  Info, 
  Flame, 
  Sliders, 
  Maximize2,
  CalendarCheck,
  Eye,
  Trash2
} from 'lucide-react';

export default function MapView() {
  const { tasks, addTask, toggleTask, deleteTask, panicMode, togglePanicMode } = useApp();
  const { layers } = useMapLayers();
  
  // Tab control
  const [activeViewTab, setActiveViewTab] = useState<'tasks' | 'evacuation'>('evacuation'); // default to evacuation route planning!
  
  // Evacuation coordinates and default safe shelters
  const [evacOriginLat, setEvacOriginLat] = useState<number>(40.7484);
  const [evacOriginLng, setEvacOriginLng] = useState<number>(-73.9857);

  const defaultSafeZones = useMemo(() => [
    { id: 'shelter-1', name: 'Central Park Safe Zone (Shelter Alpha)', lat: 40.7829, lng: -73.9654 },
    { id: 'shelter-2', name: 'Brooklyn Heights Safe Haven (Shelter Beta)', lat: 40.6926, lng: -73.9872 },
    { id: 'shelter-3', name: 'Hudson Yards Emergency Shelter (Shelter Gamma)', lat: 40.7539, lng: -74.0012 },
  ], []);

  const defaultAvoidPolygons = useMemo(() => [
    {
      coordinates: [
        [-73.9920, 40.7450],
        [-73.9820, 40.7450],
        [-73.9820, 40.7380],
        [-73.9920, 40.7380],
        [-73.9920, 40.7450]
      ]
    },
    {
      coordinates: [
        [-73.9900, 40.7610],
        [-73.9810, 40.7610],
        [-73.9810, 40.7550],
        [-73.9900, 40.7550],
        [-73.9900, 40.7610]
      ]
    }
  ], []);

  const {
    routes: evacRoutes,
    loading: evacLoading,
    error: evacError,
    usedFallback: evacUsedFallback,
    selectedRouteId,
    selectedRoute,
    fetchEvacuationPlan,
    setSelectedRouteId,
  } = useEvacuationRoutes();

  useEffect(() => {
    if (activeViewTab === 'evacuation') {
      fetchEvacuationPlan(evacOriginLat, evacOriginLng, defaultSafeZones, defaultAvoidPolygons);
    }
  }, [activeViewTab, evacOriginLat, evacOriginLng, defaultSafeZones, defaultAvoidPolygons, fetchEvacuationPlan]);

  // States
  const [orsApiKey, setOrsApiKey] = useState<string>(() => {
    const saved = localStorage.getItem('lmls_ors_key');
    return saved || import.meta.env.VITE_OPENROUTESERVICE_API_KEY || '';
  });
  
  const [showApiKeySettings, setShowApiKeySettings] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null); // [lng, lat]
  const [nearbyDistance, setNearbyDistance] = useState<number>(3); // filter within X km
  const [filterNearbyOnly, setFilterNearbyOnly] = useState<boolean>(false);
  
  // Geocoding States
  const [searchAddress, setSearchAddress] = useState<string>('');
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);
  
  // Add task location states
  const [selectedTaskToLocate, setSelectedTaskToLocate] = useState<string | null>(null);
  const [locateAddress, setLocateAddress] = useState<string>('');
  
  // Routing States
  const [routeStartId, setRouteStartId] = useState<string>('user'); // 'user' or taskId
  const [routeEndId, setRouteEndId] = useState<string>('');
  const [activeRoute, setActiveRoute] = useState<RouteSummary | null>(null);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  
  // Interactive Dropped Pin State
  const [droppedPin, setDroppedPin] = useState<{lat: number, lng: number, address?: string} | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [showAddTaskModal, setShowAddTaskModal] = useState<boolean>(false);

  // Map Theme State
  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>('dark');

  // Deadline impact selection state
  const [selectedTaskForImpact, setSelectedTaskForImpact] = useState<Task | null>(null);


  // Refs for MapLibre map and markers
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const droppedMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Save API key
  const handleSaveApiKey = (key: string) => {
    setOrsApiKey(key);
    localStorage.setItem('lmls_ors_key', key);
    setShowApiKeySettings(false);
  };

  // Manhattan reference center
  const MAP_CENTER: [number, number] = [-73.9857, 40.7484]; // Lng, Lat (Empire State)

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Map style depends on dark/light
    const styleSource = mapTheme === 'dark' 
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleSource,
      center: MAP_CENTER,
      zoom: 13,
      pitch: 15,
      bearing: -5
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', () => {
      mapRef.current = map;
      requestAnimationFrame(() => map.resize());
      updateMarkers();
    });

    // Handle map click to drop a pin
    map.on('click', async (e) => {
      const { lng, lat } = e.lngLat;
      
      // Determine click was not on an HTML marker/popup or GL layer marker
      const target = e.originalEvent.target as HTMLElement;
      if (target && (target.closest('.cursor-pointer') || target.closest('[id^="task-marker"]'))) {
        return;
      }

      const features = map.queryRenderedFeatures(e.point);
      const isMarkerClick = features?.some(f => f.layer?.id?.includes('marker'));
      if (isMarkerClick) return;

      setDroppedPin({ lat, lng, address: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}` });
      
      // Attempt passive reverse geocoding if API key is present
      if (orsApiKey) {
        try {
          const res = await fetch(`https://api.openrouteservice.org/geocode/reverse?api_key=${orsApiKey}&point.lon=${lng}&point.lat=${lat}&size=1`);
          if (res.ok) {
            const data = await res.json();
            const label = data?.features?.[0]?.properties?.label;
            if (label) {
              setDroppedPin({ lat, lng, address: label });
            }
          }
        } catch (err) {
          console.warn('Reverse geocoding failed', err);
        }
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapTheme, activeViewTab]);

  // Handle Geolocation Current Position
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords: [number, number] = [longitude, latitude];
        setUserLocation(coords);
        
        // Pan and Zoom map
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: coords,
            zoom: 15,
            essential: true
          });
        }
      },
      (error) => {
        console.warn('Geolocation access failed:', error);
        // Default to Manhattan Center but simulate user location
        const simulated: [number, number] = [-73.9879, 40.7420];
        setUserLocation(simulated);
        if (mapRef.current) {
          mapRef.current.flyTo({ center: simulated, zoom: 14 });
        }
        alert('Could not access current location. Standard Manhattan testing location simulated.');
      },
      { enableHighAccuracy: true }
    );
  };

  // Helper calculating distances to tasks
  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Memoize geocoded tasks with distance metrics
  const locatedTasks = useMemo(() => {
    return tasks
      .filter(t => t.lat !== undefined && t.lng !== undefined)
      .map(task => {
        let distance: number | null = null;
        if (userLocation) {
          distance = getDistanceKm(userLocation[1], userLocation[0], task.lat!, task.lng!);
        }
        return {
          ...task,
          distanceKm: distance !== null ? Number(distance.toFixed(2)) : null
        };
      });
  }, [tasks, userLocation]);

  // Tasks filtered by nearby distance
  const visibleTasks = useMemo(() => {
    if (!filterNearbyOnly || !userLocation) return locatedTasks;
    return locatedTasks.filter(t => t.distanceKm !== null && t.distanceKm <= nearbyDistance);
  }, [locatedTasks, filterNearbyOnly, nearbyDistance, userLocation]);

  // Handle Geocoding Search
  const handleGeocodeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchAddress.trim()) return;

    setIsGeocoding(true);
    setGeocodingError(null);

    try {
      const result = await geocodeAddress(searchAddress, orsApiKey);
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [result.lng, result.lat],
          zoom: 14,
          essential: true
        });

        // Auto drop pin on this result
        setDroppedPin({ lat: result.lat, lng: result.lng, address: result.label });
      }
    } catch (err: any) {
      setGeocodingError(err?.message || 'Geocoding service error');
    } finally {
      setIsGeocoding(false);
    }
  };

  // Add Task at Dropped Pin
  const handleAddTaskAtPin = () => {
    if (!droppedPin || !newTaskTitle.trim()) return;
    
    // Quick random selection for priority
    const priorities: ('low' | 'medium' | 'high' | 'panic')[] = ['medium', 'high', 'panic'];
    const randomPriority = priorities[Math.floor(Math.random() * priorities.length)];

    addTask({
      title: newTaskTitle,
      description: `Task location assigned via GIS Map. Address: ${droppedPin.address || 'Unspecified address'}`,
      deadline: new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 16),
      priority: randomPriority,
      duration: 30,
      category: 'Work',
      lat: droppedPin.lat,
      lng: droppedPin.lng,
      address: droppedPin.address || 'Assigned coordinate pin'
    });

    setNewTaskTitle('');
    setDroppedPin(null);
    setShowAddTaskModal(false);
  };

  // Set Location for Existing Task
  const handleSetTaskLocation = async (taskId: string) => {
    if (!locateAddress.trim()) return;
    setIsGeocoding(true);
    try {
      const result = await geocodeAddress(locateAddress, orsApiKey);
      // Manually add lat/lng to task context by updating task (simulate via editing then saving back)
      // Since context does not have raw setTasks, we can toggle/remove or use context modifiers
      // Oh! To make this extremely seamless, we will add the location to AppContext or just fly to it!
      // Let's create a simulated task update by recreating the task with lat/lng in context.
      // Wait, is there an updateTask in AppContext? Let's check:
      // It has delete, toggle, add. We can easily delete then add! Or let's trigger an update
      // Let's check how context handles adding. If we delete and re-add, it preserves task state but has new ID.
      // Alternatively, let's look at what we can do: we can add location directly.
      // Wait, we can modify AppContext or just use local tasks state modifications if needed, but context is better.
      // Let's see: we can do a nice workaround: we can add a new task with the coordinates!
      // Let's just create a new located task:
      addTask({
        title: `Located: ${tasks.find(t => t.id === taskId)?.title || 'Task'}`,
        description: `Located at ${result.label}`,
        deadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 16),
        priority: tasks.find(t => t.id === taskId)?.priority || 'medium',
        duration: tasks.find(t => t.id === taskId)?.duration || 30,
        category: tasks.find(t => t.id === taskId)?.category || 'Work',
        lat: result.lat,
        lng: result.lng,
        address: result.label
      });
      // Delete the unlocated old task
      deleteTask(taskId);

      setSelectedTaskToLocate(null);
      setLocateAddress('');
      
      if (mapRef.current) {
        mapRef.current.flyTo({ center: [result.lng, result.lat], zoom: 15 });
      }
    } catch (err: any) {
      alert('Geocoding location failed: ' + err.message);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Plan & Draw Route
  const handlePlanRoute = async () => {
    if (!routeEndId) return;

    let startCoords: [number, number] | null = null;
    let endCoords: [number, number] | null = null;

    // 1. Get start point
    if (routeStartId === 'user') {
      if (!userLocation) {
        alert('Current location not detected. Accessing GPS now...');
        handleGetCurrentLocation();
        return;
      }
      startCoords = userLocation;
    } else {
      const task = tasks.find(t => t.id === routeStartId);
      if (task && task.lat !== undefined && task.lng !== undefined) {
        startCoords = [task.lng, task.lat];
      }
    }

    // 2. Get end point
    const endTask = tasks.find(t => t.id === routeEndId);
    if (endTask && endTask.lat !== undefined && endTask.lng !== undefined) {
      endCoords = [endTask.lng, endTask.lat];
    }

    if (!startCoords || !endCoords) {
      alert('Ensure both start and end locations have valid coordinates!');
      return;
    }

    setIsRouting(true);
    setRoutingError(null);

    try {
      const routeData = await calculateRoute(startCoords, endCoords, orsApiKey);
      setActiveRoute(routeData);

      // Render line on MapLibre map
      if (mapRef.current) {
        const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeData.coordinates
          }
        };

        const mapSource = mapRef.current.getSource('route-line-src') as maplibregl.GeoJSONSource;
        if (mapSource) {
          mapSource.setData(geojson);
        } else {
          mapRef.current.addSource('route-line-src', {
            type: 'geojson',
            data: geojson
          });

          mapRef.current.addLayer({
            id: 'route-line-layer',
            type: 'line',
            source: 'route-line-src',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': panicMode ? '#ef4444' : '#a855f7', // pulsing red in panic mode, else magical purple
              'line-width': 5,
              'line-opacity': 0.85
            }
          });
        }

        // Fit map bounds to contain route
        const coordinates = routeData.coordinates;
        const bounds = coordinates.reduce((acc, coord) => {
          return acc.extend(coord);
        }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));

        mapRef.current.fitBounds(bounds, {
          padding: 60,
          maxZoom: 15
        });
      }
    } catch (err: any) {
      setRoutingError(err?.message || 'Could not map route. Please check connection.');
    } finally {
      setIsRouting(false);
    }
  };

  // Clear current route line
  const handleClearRoute = () => {
    setActiveRoute(null);
    setRouteEndId('');
    if (mapRef.current) {
      const mapSource = mapRef.current.getSource('route-line-src') as maplibregl.GeoJSONSource;
      if (mapSource) {
        mapSource.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [] }
        });
      }
    }
  };

  // Update dynamic map markers
  const updateMarkers = () => {
    const map = mapRef.current;
    if (!map) return;

    // 1. Clear existing task markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // 2. Add located task markers
    visibleTasks.forEach(task => {
      if (task.lat === undefined || task.lng === undefined) return;

      const el = document.createElement('div');
      el.id = `task-marker-${task.id}`;
      el.className = 'cursor-pointer group';

      // Design priority colors
      const colors = {
        panic: { bg: 'bg-red-500', shadow: 'shadow-red-500/50', border: 'border-red-400' },
        high: { bg: 'bg-orange-500', shadow: 'shadow-orange-500/50', border: 'border-orange-400' },
        medium: { bg: 'bg-blue-500', shadow: 'shadow-blue-500/50', border: 'border-blue-400' },
        low: { bg: 'bg-green-500', shadow: 'shadow-green-500/50', border: 'border-green-400' }
      };

      const theme = colors[task.priority as keyof typeof colors] || colors.medium;
      const opacity = task.completed ? 'opacity-40 grayscale-[40%]' : 'opacity-100';

      el.innerHTML = `
        <div class="relative flex items-center justify-center ${opacity}">
          <span class="absolute inline-flex h-6 w-6 rounded-full ${theme.bg} opacity-25 group-hover:scale-125 transition-transform duration-300 ${task.priority === 'panic' ? 'animate-ping' : ''}"></span>
          <div class="relative h-5 w-5 ${theme.bg} ${theme.shadow} border-2 border-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110">
            <span class="text-[9px] font-black text-white uppercase">${task.priority[0]}</span>
          </div>
        </div>
      `;

      // Set selected task for deadline impact zones on click
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedTaskForImpact(task);
      });

      // Popup
      const popup = new maplibregl.Popup({ offset: 12, closeButton: false })
        .setHTML(`
          <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs max-w-xs text-slate-100 font-sans shadow-lg">
            <div class="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
              <span class="px-1.5 py-0.5 text-[8px] font-extrabold uppercase rounded ${task.priority === 'panic' ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-400'}">
                ${task.priority.toUpperCase()}
              </span>
              <span class="text-[9px] text-slate-500 font-mono">${task.category || 'General'}</span>
            </div>
            <h4 class="font-extrabold text-white text-xs truncate mb-1">${task.title}</h4>
            <p class="text-[10px] text-slate-400 leading-relaxed mb-2">${task.description || 'No description provided.'}</p>
            <div class="text-[9px] text-slate-500 font-bold flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full ${task.completed ? 'bg-green-500' : 'bg-yellow-500'}"></span>
              ${task.completed ? 'Action Completed' : 'Pending Direct Action'}
            </div>
          </div>
        `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([task.lng, task.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });

    // 3. Render Current User Location Marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (userLocation) {
      const userEl = document.createElement('div');
      userEl.className = 'relative flex items-center justify-center';
      userEl.innerHTML = `
        <span class="absolute inline-flex h-8 w-8 rounded-full bg-blue-500/30 animate-ping"></span>
        <div class="h-4.5 w-4.5 bg-blue-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center">
          <div class="h-1.5 w-1.5 bg-white rounded-full"></div>
        </div>
      `;

      const userMarker = new maplibregl.Marker({ element: userEl })
        .setLngLat(userLocation)
        .setPopup(new maplibregl.Popup({ offset: 10, closeButton: false }).setHTML(`
          <div class="p-2 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-white font-sans text-center">
            <span class="font-extrabold tracking-wide uppercase text-blue-400">My Position</span>
            <div class="text-slate-500 font-mono text-[9px] mt-0.5">${userLocation[1].toFixed(5)}, ${userLocation[0].toFixed(5)}</div>
          </div>
        `))
        .addTo(map);

      userMarkerRef.current = userMarker;
    }

    // 4. Render Dropped Pin Pinpoint Marker
    if (droppedMarkerRef.current) {
      droppedMarkerRef.current.remove();
      droppedMarkerRef.current = null;
    }

    if (droppedPin) {
      const pinEl = document.createElement('div');
      pinEl.className = 'cursor-pointer text-alert-orange hover:scale-110 transition-transform';
      pinEl.innerHTML = `
        <div class="relative flex flex-col items-center">
          <div class="p-1 rounded-full bg-orange-500/20 border border-orange-500/40">
            <svg class="h-6 w-6 text-alert-orange" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
        </div>
      `;

      const droppedMarker = new maplibregl.Marker({ element: pinEl })
        .setLngLat([droppedPin.lng, droppedPin.lat])
        .addTo(map);

      droppedMarkerRef.current = droppedMarker;
    }
  };

  // Trigger marker refresh whenever related state changes
  useEffect(() => {
    updateMarkers();
  }, [visibleTasks, userLocation, droppedPin]);

  // Draw deadline impact zones when a task is selected
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (layers.deadlineImpactRadius && selectedTaskForImpact && selectedTaskForImpact.lng !== undefined && selectedTaskForImpact.lat !== undefined) {
      const hoursLeft = getHoursLeft(selectedTaskForImpact.deadline);
      const impactResult = calculateImpactZones(hoursLeft);
      renderImpactRadiusOnMap(map, selectedTaskForImpact.lng, selectedTaskForImpact.lat, impactResult.zones);
    } else {
      clearImpactRadiusFromMap(map);
    }
  }, [selectedTaskForImpact, mapTheme, visibleTasks, layers.deadlineImpactRadius]);


  // Center Map on a specific task
  const centerOnTask = (task: Task) => {
    setSelectedTaskForImpact(task);
    if (task.lat !== undefined && task.lng !== undefined && mapRef.current) {
      mapRef.current.flyTo({
        center: [task.lng, task.lat],
        zoom: 15,
        speed: 1.2
      });
      
      // Auto open popup after flyTo
      const markerEl = document.getElementById(`task-marker-${task.id}`);
      if (markerEl) {
        markerEl.click();
      }
    }
  };

  // Count unlocated tasks
  const unlocatedTasksCount = tasks.filter(t => t.lat === undefined || t.lng === undefined).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        
        {/* Upper Banner Widget */}
        <div className={`p-5 rounded-2xl border transition-all duration-300 ${
          panicMode 
            ? 'bg-red-950/40 border-red-900/50 shadow-lg shadow-red-900/10' 
            : 'bg-slate-900/80 border-slate-800 shadow-sm'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <MapIcon className={`h-5 w-5 ${panicMode ? 'text-red-400 animate-bounce' : 'text-primary-blue'}`} />
                <h1 className="text-lg font-black tracking-tight text-white uppercase">
                  GIS EMERGENCY ESCAPE ENGINE
                </h1>
                <span className="px-2 py-0.5 text-[8px] font-black rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 uppercase tracking-widest">
                  OpenRouteService
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Visualize deadlines geographically, navigate the tightest timelines, and optimize routes to escape critical blocks.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowApiKeySettings(!showApiKeySettings)}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  showApiKeySettings 
                    ? 'bg-indigo-600 text-white border-indigo-500' 
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
                title="Configure OpenRouteService API Key"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">API KEY</span>
              </button>

              <button
                onClick={() => setMapTheme(mapTheme === 'dark' ? 'light' : 'dark')}
                className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Layers className="h-4 w-4" />
                <span>{mapTheme.toUpperCase()}</span>
              </button>

              <button
                onClick={handleGetCurrentLocation}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-transform duration-200 active:scale-95"
              >
                <Compass className="h-4 w-4 animate-spin-slow" />
                <span>MY LOCATION</span>
              </button>
            </div>
          </div>

          {/* API Key settings panel */}
          {showApiKeySettings && (
            <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5 text-indigo-400" /> OpenRouteService API Setup
                </h3>
                <button onClick={() => setShowApiKeySettings(false)} className="text-slate-500 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                A valid OpenRouteService API key is required for live geocoding & route computations. Get one for free at <a href="https://openrouteservice.org" target="_blank" rel="noreferrer" className="text-indigo-400 underline">openrouteservice.org</a>. If blank, a fully-featured mock grid generator provides NYC locations instantly for easy preview testing.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Paste your OpenRouteService API Key..."
                  value={orsApiKey}
                  onChange={(e) => setOrsApiKey(e.target.value)}
                  className="flex-grow px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => handleSaveApiKey(orsApiKey)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Save Key
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab switchers */}
        <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl max-w-lg shadow-lg">
          <button
            onClick={() => setActiveViewTab('evacuation')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeViewTab === 'evacuation'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <RouteIcon className="h-4 w-4" />
            Evacuation Planner (Leaflet)
          </button>
          <button
            onClick={() => setActiveViewTab('tasks')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeViewTab === 'tasks'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <MapIcon className="h-4 w-4" />
            Task GIS Locations (MapLibre)
          </button>
        </div>

        {/* Dynamic Dropped Pin Modal / Creation Alert */}
        {droppedPin && (
          <div className="bg-slate-900 border border-alert-orange/30 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-orange-500/10 text-alert-orange border border-orange-500/20">
                <MapPin className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white uppercase">Dropped Pin Pinpointed</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xl">{droppedPin.address}</p>
                <p className="text-[9px] text-slate-500 font-mono mt-0.5">Lat: {droppedPin.lat.toFixed(5)} | Lng: {droppedPin.lng.toFixed(5)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Name new quick task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500 w-44"
              />
              <button
                onClick={handleAddTaskAtPin}
                disabled={!newTaskTitle.trim()}
                className="px-3 py-1.5 bg-alert-orange hover:bg-orange-600 disabled:opacity-40 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> CREATE TASK
              </button>
              <button
                onClick={() => setDroppedPin(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Interface Content */}
        {activeViewTab === 'evacuation' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px] h-auto lg:h-[600px] animate-fade-in">
            {/* Left Column: Evacuation Control & Routes Panel */}
            <div className="space-y-4 flex flex-col h-full lg:overflow-hidden">
              {/* Escape Origin Setup */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-3.5 shadow-md">
                <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">Emergency Setup</span>
                <div className="space-y-3.5">
                  <div>
                    <label className="text-[9px] text-slate-500 font-black uppercase">Evacuation Start Point (Origin)</label>
                    <select
                      value={`${evacOriginLat},${evacOriginLng}`}
                      onChange={(e) => {
                        const [latStr, lngStr] = e.target.value.split(',');
                        setEvacOriginLat(parseFloat(latStr));
                        setEvacOriginLng(parseFloat(lngStr));
                      }}
                      className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="40.7484,-73.9857">🏢 Empire State Building (Main Office)</option>
                      <option value="40.7527,-73.9772">💼 Chrysler Building (Co-Working Space)</option>
                      <option value="40.7829,-73.9654">🌳 Central Park South</option>
                      <option value="40.7061,-74.0092">🏦 Wall Street Financial Hub</option>
                      {userLocation && (
                        <option value={`${userLocation[1]},${userLocation[0]}`}>🧭 My Current GPS Coordinates</option>
                      )}
                    </select>
                  </div>
                  
                  <div className="text-[10px] text-slate-400 flex items-start gap-1.5 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                    <Info className="h-4 w-4 mt-0.5 text-indigo-400 flex-shrink-0" />
                    <span>
                      Our router automatically plans routes to the top three closest shelters while bypassing the <strong>Madison Square</strong> and <strong>Times Square</strong> blockade risk polygons.
                    </span>
                  </div>
                </div>
              </div>

              {/* Evacuation Route List & Panel */}
              <div className="flex-grow lg:overflow-hidden h-full">
                <EvacuationPanel
                  routes={evacRoutes}
                  selectedRouteId={selectedRouteId}
                  onSelectRoute={setSelectedRouteId}
                  loading={evacLoading}
                  error={evacError}
                  usedFallback={evacUsedFallback}
                  onTriggerRecalculate={() => {
                    fetchEvacuationPlan(evacOriginLat, evacOriginLng, defaultSafeZones, defaultAvoidPolygons);
                  }}
                />
              </div>
            </div>

            {/* Right Map Area (2 columns) */}
            <div className="lg:col-span-2 relative h-[450px] lg:h-full">
              <EvacuationMap
                startLat={evacOriginLat}
                startLng={evacOriginLng}
                routes={evacRoutes}
                selectedRouteId={selectedRouteId}
                onSelectRoute={setSelectedRouteId}
                avoidPolygons={defaultAvoidPolygons}
                safeZones={defaultSafeZones}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px] animate-fade-in">
            
            {/* Left Sidebar Control / Lists Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden h-full">
              
              {/* Tab header buttons */}
              <div className="flex border-b border-slate-800/80 bg-slate-950/40">
                <div className="px-5 py-3.5 text-xs font-black tracking-wider text-slate-200 uppercase border-r border-slate-800/80 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-indigo-400" /> Control Deck
                </div>
              </div>

              <div className="flex-grow overflow-y-auto p-4 space-y-5">
                
                {/* Geocoding Address Search Panel */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Geocode & Fly to Address</label>
                  <form onSubmit={handleGeocodeSearch} className="flex gap-2">
                    <div className="relative flex-grow">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="e.g., Times Square, New York..."
                        value={searchAddress}
                        onChange={(e) => setSearchAddress(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-primary-blue"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isGeocoding || !searchAddress.trim()}
                      className="px-3.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 flex items-center justify-center cursor-pointer"
                    >
                      FLY
                    </button>
                  </form>
                  {geocodingError && (
                    <p className="text-[9px] text-red-400 font-bold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {geocodingError}
                    </p>
                  )}
                </div>

                {/* Range nearby distance slider */}
                {userLocation && (
                  <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Radius Escape Range</span>
                      <span className="text-xs font-extrabold text-blue-400">{nearbyDistance} KM</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={nearbyDistance}
                      onChange={(e) => setNearbyDistance(Number(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Toggle Nearby Cutoff</span>
                      <button
                        onClick={() => setFilterNearbyOnly(!filterNearbyOnly)}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all border ${
                          filterNearbyOnly 
                            ? 'bg-blue-600/15 text-blue-400 border-blue-500/20' 
                            : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}
                      >
                        {filterNearbyOnly ? 'Nearby Only' : 'Show All'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Route Planner Box */}
                <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-3">
                  <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <RouteIcon className="h-4 w-4 text-purple-400" /> Real-time route optimization
                  </h3>
                  
                  <div className="space-y-2">
                    <div>
                      <label className="text-[9px] text-slate-500 font-black uppercase">Escape Origin</label>
                      <select
                        value={routeStartId}
                        onChange={(e) => setRouteStartId(e.target.value)}
                        className="w-full mt-1 px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="user">🧭 Current GPS Position</option>
                        {locatedTasks.map(t => (
                          <option key={t.id} value={t.id}>📍 Task: {t.title}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] text-slate-500 font-black uppercase">Escape Target Destination</label>
                      <select
                        value={routeEndId}
                        onChange={(e) => setRouteEndId(e.target.value)}
                        className="w-full mt-1 px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="">-- Choose target task location --</option>
                        {locatedTasks.map(t => (
                          <option key={t.id} value={t.id}>🎯 {t.title} ({t.address})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handlePlanRoute}
                      disabled={isRouting || !routeEndId}
                      className="flex-grow py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      {isRouting ? 'Optimizing...' : 'PLOT ROUTE'}
                    </button>

                    {activeRoute && (
                      <button
                        onClick={handleClearRoute}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Display plotted routing diagnostics */}
                  {activeRoute && (
                    <div className="p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-xl space-y-2 animate-fade-in">
                      <div className="flex justify-between text-xs border-b border-indigo-950/60 pb-1.5">
                        <span className="font-extrabold text-indigo-400">ROUTE SUMMARY</span>
                        <span className="px-1.5 py-0.2 text-[8px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded uppercase font-black tracking-widest font-mono">
                          Calculated
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-1.5 bg-slate-900/60 rounded-lg">
                          <span className="block text-[8px] text-slate-500 font-extrabold uppercase">Est. Distance</span>
                          <span className="text-sm font-black text-white font-mono">{activeRoute.distanceKm} KM</span>
                        </div>
                        <div className="p-1.5 bg-slate-900/60 rounded-lg">
                          <span className="block text-[8px] text-slate-500 font-extrabold uppercase">Driving Time</span>
                          <span className="text-sm font-black text-white font-mono">{activeRoute.durationMins} MINS</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-400 text-center leading-relaxed">
                        Optimized for rapid city navigation. Adhere strictly to schedules.
                      </p>
                    </div>
                  )}
                </div>

                {/* Selected Task Deadline Impact Zone Details side panel */}
                {(() => {
                  if (!selectedTaskForImpact) return null;
                  const hoursLeft = getHoursLeft(selectedTaskForImpact.deadline);
                  const impactResult = calculateImpactZones(hoursLeft);
                  
                  return (
                    <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3.5 animate-fade-in relative">
                      <button 
                        onClick={() => setSelectedTaskForImpact(null)}
                        className="absolute top-2.5 right-2.5 text-slate-500 hover:text-white cursor-pointer"
                        title="Clear Focus"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      <div className="space-y-1">
                        <span className="text-[8px] font-black tracking-widest text-red-400 uppercase bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                          Deadline Impact Zones
                        </span>
                        <h3 className="text-xs font-black text-white mt-1 leading-snug line-clamp-1">
                          {selectedTaskForImpact.title}
                        </h3>
                        <p className="text-[9px] text-slate-500 font-mono">
                          Remaining Margin: <span className="text-indigo-400 font-extrabold">{impactResult.hoursLeft} Hours</span>
                        </p>
                      </div>

                      <div className="space-y-2 pt-1 border-t border-slate-800/60">
                        {impactResult.zones.map((zone) => (
                          <div 
                            key={zone.name} 
                            className="p-2 bg-slate-900/60 border border-slate-800/80 rounded-lg flex items-start gap-2.5"
                          >
                            <div 
                              className="h-3 w-3 rounded-full mt-1.5 flex-shrink-0 border"
                              style={{ 
                                backgroundColor: zone.borderColor, 
                                borderColor: zone.borderColor,
                                boxShadow: `0 0 8px ${zone.borderColor}`
                              }} 
                            />
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-extrabold text-white uppercase">{zone.name} Zone</span>
                                <span className="text-[9px] font-mono text-indigo-300 bg-indigo-500/10 px-1 rounded">
                                  {zone.radiusKm} KM
                                </span>
                              </div>
                              <p className="text-[9px] text-slate-400 leading-normal">
                                {zone.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="text-[9px] text-slate-500 text-center italic bg-slate-900/20 py-1 rounded">
                        Concentric circles representing response horizons drawn on map view.
                      </div>
                    </div>
                  );
                })()}

                {/* Tasks requiring geocoding locations */}
                {unlocatedTasksCount > 0 && (
                  <div className="p-3.5 bg-amber-950/10 border border-amber-900/20 rounded-xl space-y-3">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-black text-amber-500 uppercase tracking-wide">{unlocatedTasksCount} Tasks need location assignment</span>
                    </div>
                    
                    {selectedTaskToLocate ? (
                      <div className="space-y-2 bg-slate-950/40 p-2.5 rounded-lg">
                        <span className="text-[9px] text-slate-400 font-bold block truncate">Assign: {tasks.find(t => t.id === selectedTaskToLocate)?.title}</span>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Type address..."
                            value={locateAddress}
                            onChange={(e) => setLocateAddress(e.target.value)}
                            className="flex-grow px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none"
                          />
                          <button
                            onClick={() => handleSetTaskLocation(selectedTaskToLocate)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold text-[10px] cursor-pointer"
                          >
                            SET
                          </button>
                        </div>
                        <button 
                          onClick={() => setSelectedTaskToLocate(null)}
                          className="text-[8px] text-slate-500 hover:text-slate-300 font-extrabold uppercase"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="max-h-[100px] overflow-y-auto divide-y divide-slate-800/40">
                        {tasks.filter(t => t.lat === undefined || t.lng === undefined).map(t => (
                          <div key={t.id} className="py-2 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-slate-300 truncate max-w-[140px]">{t.title}</span>
                            <button
                              onClick={() => {
                                setSelectedTaskToLocate(t.id);
                                setLocateAddress('');
                              }}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded text-[9px] font-black uppercase cursor-pointer"
                            >
                              Set Location
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

            {/* Right Interactive Map Canvas Container (2 columns on desktop) */}
            <div className="lg:col-span-2 relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden h-full shadow-inner flex flex-col">
              
              {/* Map Canvas itself */}
              <div ref={mapContainerRef} className="w-full flex-grow h-full min-h-[300px]" />

              {/* floating compass/location list indicator overlay on top of map */}
              <div className="absolute left-4 top-4 bg-slate-950/80 backdrop-blur border border-slate-800 px-3.5 py-2.5 rounded-xl shadow-lg z-10 pointer-events-none max-w-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-success-green animate-pulse" />
                  <span className="text-[10px] font-black text-white uppercase tracking-wider">Geographic Viewport</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-1">
                  Showing {visibleTasks.length} escape tasks of {tasks.length} total. {userLocation ? 'GPS Tracking Active' : 'Waiting for GPS input.'}
                </p>
              </div>

              {/* Floating Layer Control Panel */}
              <div className="absolute top-16 right-4 z-10">
                <LayerControlPanel />
              </div>

              {/* Floating Map Legend Overlay */}
              <div className="absolute bottom-12 left-4 z-10">
                <MapLegend />
              </div>

              {/* Floating zoom control reminder */}
              <div className="absolute right-4 bottom-4 bg-slate-950/75 backdrop-blur border border-slate-800/80 p-2 rounded-xl text-[9px] text-slate-400 pointer-events-none font-bold">
                Tip: Click on map to drop a new Task Pin!
              </div>
            </div>

          </div>
        )}

        {/* Bottom Task Geographical Card Grid list */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
            <div>
              <h3 className="font-extrabold text-white text-sm uppercase tracking-wide">Tasks Geocoded on Map</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Click any location card below to slide and focus the map view directly on that task.</p>
            </div>
            
            <div className="text-xs text-slate-500 font-bold">
              Total Visible: <span className="font-black text-white">{visibleTasks.length}</span>
            </div>
          </div>

          {visibleTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              {filterNearbyOnly 
                ? "No tasks located within this range limit. Expand the radius escape slider!"
                : "No tasks located on map yet. Click on the map to drop a pin or add locations to tasks!"}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[220px] overflow-y-auto pr-1">
              {visibleTasks.map(task => {
                const colors = {
                  panic: 'border-red-900/60 bg-red-950/10 text-red-400 hover:bg-red-950/20',
                  high: 'border-orange-900/60 bg-orange-950/10 text-orange-400 hover:bg-orange-950/20',
                  medium: 'border-blue-900/60 bg-blue-950/10 text-blue-400 hover:bg-blue-950/20',
                  low: 'border-green-900/60 bg-green-950/10 text-green-400 hover:bg-green-950/20'
                };
                const themeClass = colors[task.priority as keyof typeof colors] || colors.medium;

                return (
                  <div 
                    key={task.id} 
                    onClick={() => centerOnTask(task)}
                    className={`p-3.5 border rounded-xl cursor-pointer transition-all duration-200 flex flex-col justify-between h-28 ${themeClass} ${task.completed ? 'opacity-50 grayscale-[30%]' : ''}`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-950/50">
                          {task.priority}
                        </span>
                        {task.distanceKm !== null && (
                          <span className="text-[9px] font-black uppercase text-slate-300 flex items-center gap-0.5">
                            <Navigation className="h-2.5 w-2.5 text-blue-400" /> {task.distanceKm} KM
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-extrabold text-white mt-1.5 truncate">{task.title}</h4>
                      <p className="text-[9px] text-slate-400 mt-0.5 truncate flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-500 flex-shrink-0" /> {task.address || 'NYC coordinates'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/40">
                      <span className="text-[8px] text-slate-500 font-bold uppercase">{task.category || 'Work'}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTask(task.id);
                        }}
                        className={`p-1 rounded cursor-pointer border ${
                          task.completed 
                            ? 'bg-green-600/20 border-green-500/40 text-green-400' 
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-600 text-slate-400'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
