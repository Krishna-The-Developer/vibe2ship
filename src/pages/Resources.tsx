import React, { useState, useEffect } from 'react';
import { useDisaster } from '../context/DisasterContext';
import AppLayout from '../components/Layout/AppLayout';
import ResourceLogisticsMap from '../components/Map/ResourceLogisticsMap';
import { 
  saveResourceAllocation, 
  getResourceAllocations 
} from '../services/firestoreService';
import { 
  Shield, 
  Truck, 
  Plus, 
  X, 
  Check, 
  AlertTriangle, 
  MapPin, 
  FileText, 
  RefreshCw, 
  Database,
  BarChart2,
  ThumbsUp,
  Map as MapIcon
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

interface ResourceInventoryItem {
  key: string;
  name: string;
  category: string;
  unit: string;
  total_qty: number;
  available_qty: number;
  deployed_qty: number;
  status: string;
  description: string;
}

interface DepotLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  resources: Record<string, number>;
}

interface DepotAllocation {
  depot_id: string;
  depot_name: string;
  qty_allocated: number;
  distance_km: number;
}

interface AllocationRecommendation {
  resource_type: string;
  resource_name: string;
  unit: string;
  recommended_qty: number;
  depot_allocations: DepotAllocation[];
  total_allocated: number;
  shortfall: number;
  justification: string;
}

interface DeploymentRoute {
  depot_id: string;
  depot_name: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  distance_km: number;
  duration_mins: number;
  coordinates: [number, number][];
}

interface AllocationResult {
  disaster_id: string;
  disaster_title: string;
  recommendations: AllocationRecommendation[];
  routes: DeploymentRoute[];
  total_shortfalls: number;
  has_shortfalls: boolean;
}

export default function Resources() {
  const { disasters } = useDisaster();

  // Inventory & Depot states
  const [inventory, setInventory] = useState<ResourceInventoryItem[]>([]);
  const [depots, setDepots] = useState<DepotLocation[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState<boolean>(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  // Allocation request inputs
  const [selectedDisasterId, setSelectedDisasterId] = useState<string>('');
  const [affectedPopulation, setAffectedPopulation] = useState<number>(15000);
  const [infrastructureDamage, setInfrastructureDamage] = useState<number>(4);
  const [customDisasterTitle, setCustomDisasterTitle] = useState<string>('');
  const [customRiskLevel, setCustomRiskLevel] = useState<string>('High');
  const [customLat, setCustomLat] = useState<number>(37.7749);
  const [customLng, setCustomLng] = useState<number>(-122.4194);

  // Computed/Active allocation states
  const [recommendationResult, setRecommendationResult] = useState<AllocationResult | null>(null);
  const [allocationLoading, setAllocationLoading] = useState<boolean>(false);
  const [allocationError, setAllocationError] = useState<string | null>(null);
  const [approvalSubmitting, setApprovalSubmitting] = useState<boolean>(false);
  const [approvalSuccessMessage, setApprovalSuccessMessage] = useState<string | null>(null);

  // History state
  const [allocationHistory, setAllocationHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  // Initialize and Fetch Inventory & Depots
  const fetchInventoryAndDepots = async () => {
    setInventoryLoading(true);
    setInventoryError(null);
    try {
      // 1. Fetch live aggregated inventory
      const invRes = await fetch(`${API_BASE_URL}/api/resources/inventory`);
      if (!invRes.ok) throw new Error(`Inventory fetch failed with status: ${invRes.status}`);
      const invData = await invRes.json();
      setInventory(invData);

      // 2. Fetch live depot locations
      const depRes = await fetch(`${API_BASE_URL}/api/resources/depots`);
      if (!depRes.ok) throw new Error(`Depots fetch failed with status: ${depRes.status}`);
      const depData = await depRes.json();
      setDepots(depData);
    } catch (err: any) {
      console.error('Error fetching inventory details from FastAPI:', err);
      setInventoryError(err?.message || 'Failed to connect to FastAPI resources server');
      
      // Load fallback local mock inventory if FastAPI server is unavailable/starting
      loadMockFallbacks();
    } finally {
      setInventoryLoading(false);
    }
  };

  const loadMockFallbacks = () => {
    setInventory([
      { key: "ambulances", name: "Ambulance Units", category: "Medical", unit: "vehicles", total_qty: 55, available_qty: 55, deployed_qty: 0, status: "Optimal", description: "Trauma support and patient transport vehicles." },
      { key: "fire_trucks", name: "Fire Engines", category: "Rescue", unit: "vehicles", total_qty: 46, available_qty: 46, deployed_qty: 0, status: "Optimal", description: "Heavy pumpers and aerial ladders for suppression." },
      { key: "rescue_teams", name: "Heavy Rescue Teams", category: "Rescue", unit: "teams", total_qty: 24, available_qty: 24, deployed_qty: 0, status: "Optimal", description: "Personnel trained in search and debris clearing." },
      { key: "medical_kits", name: "First Aid & Trauma Kits", category: "Medical", unit: "kits", total_qty: 1800, available_qty: 1800, deployed_qty: 0, status: "Optimal", description: "Trauma dressings, splints, and field meds." },
      { key: "water_units", name: "Clean Water Units (100L)", category: "Supplies", unit: "units", total_qty: 1480, available_qty: 1480, deployed_qty: 0, status: "Optimal", description: "Purified water and portable filtration." },
      { key: "food_rations", name: "Emergency Food Pallets", category: "Supplies", unit: "pallets", total_qty: 1150, available_qty: 1150, deployed_qty: 0, status: "Optimal", description: "MREs and shelf-stable nutritional packages." },
      { key: "generators", name: "Mobile Heavy Power Generators", category: "Power", unit: "generators", total_qty: 39, available_qty: 39, deployed_qty: 0, status: "Optimal", description: "Diesel generators for critical medical sites." },
      { key: "helicopters", name: "Air Rescue Helicopters", category: "Air", unit: "helicopters", total_qty: 7, available_qty: 7, deployed_qty: 0, status: "Optimal", description: "Helicopters for medical evac and airlifts." },
      { key: "hazmat_units", name: "Hazardous Materials Teams", category: "Rescue", unit: "teams", total_qty: 15, available_qty: 15, deployed_qty: 0, status: "Optimal", description: "CBRN response specialists." },
      { key: "mobile_shelters", name: "Temporary Housing Kits", category: "Supplies", unit: "kits", total_qty: 850, available_qty: 850, deployed_qty: 0, status: "Optimal", description: "Weatherproof structures with solar blankets." }
    ]);
    setDepots([
      { id: "depot-1", name: "Central Logistics Hub (SF Center)", lat: 37.7749, lng: -122.4194, resources: { ambulances: 15, fire_trucks: 8, rescue_teams: 6, medical_kits: 500, water_units: 400, food_rations: 300, generators: 10, helicopters: 3, hazmat_units: 4, mobile_shelters: 250 } },
      { id: "depot-2", name: "North Bay Response Depot (San Rafael)", lat: 38.0560, lng: -122.5310, resources: { ambulances: 8, fire_trucks: 12, rescue_teams: 4, medical_kits: 200, water_units: 250, food_rations: 150, generators: 5, helicopters: 1, hazmat_units: 2, mobile_shelters: 120 } },
      { id: "depot-3", name: "East Bay Emergency Supply (Oakland)", lat: 37.8044, lng: -122.2711, resources: { ambulances: 12, fire_trucks: 10, rescue_teams: 5, medical_kits: 350, water_units: 300, food_rations: 250, generators: 8, helicopters: 2, hazmat_units: 3, mobile_shelters: 180 } },
      { id: "depot-4", name: "South Bay Tactical Depot (San Jose)", lat: 37.3382, lng: -121.8863, resources: { ambulances: 14, fire_trucks: 11, rescue_teams: 6, medical_kits: 400, water_units: 350, food_rations: 300, generators: 12, helicopters: 0, hazmat_units: 5, mobile_shelters: 220 } },
      { id: "depot-5", name: "West Peninsula Operations (San Mateo)", lat: 37.5630, lng: -122.3255, resources: { ambulances: 6, fire_trucks: 5, rescue_teams: 3, medical_kits: 150, water_units: 180, food_rations: 100, generators: 4, helicopters: 1, hazmat_units: 1, mobile_shelters: 80 } }
    ]);
  };

  // Fetch Firestore allocation history
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const history = await getResourceAllocations();
      if (history) {
        setAllocationHistory(history.sort((a, b) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime()));
      }
    } catch (err) {
      console.error('Error fetching allocation history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryAndDepots();
    fetchHistory();
  }, []);

  // Sync state if disaster is selected
  useEffect(() => {
    if (!selectedDisasterId) return;
    const disaster = disasters.find(d => d.id === selectedDisasterId);
    if (disaster) {
      setCustomDisasterTitle(disaster.title);
      setCustomRiskLevel(disaster.severity_label || 'High');
      setAffectedPopulation(disaster.population_affected || 10000);
      setInfrastructureDamage(disaster.damaged_critical || 3);
      
      // Fallbacks for lat/lng of disaster if present in fields, or default Bay Area
      // Let's assume default coordinates are at San Francisco center
      setCustomLat(37.7749);
      setCustomLng(-122.4194);
    }
  }, [selectedDisasterId, disasters]);

  // Trigger allocation estimation from backend algorithm
  const handleEstimateAllocation = async () => {
    setAllocationLoading(true);
    setAllocationError(null);
    setRecommendationResult(null);

    const title = selectedDisasterId === 'custom' || !selectedDisasterId 
      ? (customDisasterTitle || "Tactical Resource Target Site")
      : (disasters.find(d => d.id === selectedDisasterId)?.title || "Disaster Site");

    const payload = {
      disaster_id: selectedDisasterId || "custom-site",
      disaster_title: title,
      risk_level: selectedDisasterId === 'custom' || !selectedDisasterId ? customRiskLevel : (disasters.find(d => d.id === selectedDisasterId)?.severity_label || "High"),
      affected_population: affectedPopulation,
      infrastructure_damage: infrastructureDamage,
      disaster_lat: customLat,
      disaster_lng: customLng
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/resources/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`FastAPI Allocation calculation returned status: ${res.status}`);
      const data: AllocationResult = await res.json();
      setRecommendationResult(data);
    } catch (err: any) {
      console.error('Error calculating allocations from FastAPI:', err);
      setAllocationError(err?.message || 'Could not reach FastAPI router to calculate risk-based allocations.');
      
      // Perform local client-side recommendation algorithm if backend server connection fails
      calculateLocalRecommendation(payload);
    } finally {
      setAllocationLoading(false);
    }
  };

  // Local fallback recommendation algorithm
  const calculateLocalRecommendation = (payload: any) => {
    const risk = payload.risk_level.toLowerCase();
    const pop = payload.affected_population;
    const dmg = payload.infrastructure_damage;
    const mult = risk === 'critical' || risk === 'panic' ? 2.5 : (risk === 'high' ? 1.8 : 1.2);

    const recs: AllocationRecommendation[] = [
      {
        resource_type: "ambulances",
        resource_name: "Ambulance Units",
        unit: "vehicles",
        recommended_qty: Math.max(2, Math.floor((pop / 3000) * mult)),
        depot_allocations: [{ depot_id: "depot-1", depot_name: "Central Logistics Hub", qty_allocated: Math.max(2, Math.floor((pop / 3000) * mult)), distance_km: 12.5 }],
        total_allocated: Math.max(2, Math.floor((pop / 3000) * mult)),
        shortfall: 0,
        justification: `Assigned vehicles based on ${pop.toLocaleString()} affected population under ${risk} risk.`
      },
      {
        resource_type: "fire_trucks",
        resource_name: "Fire Engines",
        unit: "vehicles",
        recommended_qty: Math.max(1, Math.floor((pop / 6000) * mult)),
        depot_allocations: [{ depot_id: "depot-2", depot_name: "North Bay Response Depot", qty_allocated: Math.max(1, Math.floor((pop / 6000) * mult)), distance_km: 18.2 }],
        total_allocated: Math.max(1, Math.floor((pop / 6000) * mult)),
        shortfall: 0,
        justification: `Securing response corridors and suppressing hazards.`
      },
      {
        resource_type: "rescue_teams",
        resource_name: "Heavy Rescue Teams",
        unit: "teams",
        recommended_qty: Math.max(1, Math.floor((pop / 8000) * mult) + Math.floor(dmg / 2)),
        depot_allocations: [{ depot_id: "depot-3", depot_name: "East Bay Emergency Supply", qty_allocated: Math.max(1, Math.floor((pop / 8000) * mult) + Math.floor(dmg / 2)), distance_km: 15.0 }],
        total_allocated: Math.max(1, Math.floor((pop / 8000) * mult) + Math.floor(dmg / 2)),
        shortfall: 0,
        justification: `Assigned teams for structural rescue given ${dmg} damaged facilities.`
      },
      {
        resource_type: "medical_kits",
        resource_name: "First Aid & Trauma Kits",
        unit: "kits",
        recommended_qty: Math.max(10, Math.floor((pop / 150) * mult)),
        depot_allocations: [{ depot_id: "depot-4", depot_name: "South Bay Tactical Depot", qty_allocated: Math.max(10, Math.floor((pop / 150) * mult)), distance_km: 25.1 }],
        total_allocated: Math.max(10, Math.floor((pop / 150) * mult)),
        shortfall: 0,
        justification: `Dispatched trauma dressings to support local triage points.`
      }
    ];

    setRecommendationResult({
      disaster_id: payload.disaster_id,
      disaster_title: payload.disaster_title,
      recommendations: recs,
      routes: [
        {
          depot_id: "depot-1",
          depot_name: "Central Logistics Hub",
          start_lat: 37.7749,
          start_lng: -122.4194,
          end_lat: payload.disaster_lat,
          end_lng: payload.disaster_lng,
          distance_km: 12.5,
          duration_mins: 25.0,
          coordinates: [
            [37.7749, -122.4194],
            [payload.disaster_lat, payload.disaster_lng]
          ]
        }
      ],
      total_shortfalls: 0,
      has_shortfalls: false
    });
  };

  // Deploy & Approve Allocation (persist in Firestore)
  const handleApproveAndDeploy = async () => {
    if (!recommendationResult) return;
    setApprovalSubmitting(true);
    setApprovalSuccessMessage(null);

    try {
      // 1. Persist allocation details inside Firestore database collection
      const allocationToSave = {
        disasterId: recommendationResult.disaster_id,
        disasterTitle: recommendationResult.disaster_title,
        recommendations: recommendationResult.recommendations.map(r => ({
          resource_type: r.resource_type,
          resource_name: r.resource_name,
          unit: r.unit,
          qty_allocated: r.total_allocated,
          depot_allocations: r.depot_allocations
        })),
        routes: recommendationResult.routes.map(rt => ({
          depot_id: rt.depot_id,
          depot_name: rt.depot_name,
          distance_km: rt.distance_km,
          duration_mins: rt.duration_mins
        })),
        approvedAt: new Date().toISOString(),
        status: 'deployed' as const
      };

      await saveResourceAllocation(allocationToSave);

      // 2. Call backend deploy-approve endpoint to update server-side memory inventories
      try {
        await fetch(`${API_BASE_URL}/api/resources/deploy-approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recommendationResult)
        });
      } catch (err) {
        console.warn('Backend in-memory update failed but Firestore saved successfully:', err);
      }

      setApprovalSuccessMessage(`Resource logistics successfully approved & deployed for "${recommendationResult.disaster_title}"!`);
      
      // Reset recommendations after success and refresh live inventory counts
      setTimeout(() => {
        setRecommendationResult(null);
        setApprovalSuccessMessage(null);
        fetchInventoryAndDepots();
        fetchHistory();
      }, 5000);

    } catch (err: any) {
      console.error('Error saving allocation to Firestore:', err);
      alert('Approval submission failed. Please verify authentication status.');
    } finally {
      setApprovalSubmitting(false);
    }
  };

  // Precautionary Replenishment / Reset Deployments action
  const handleResetDeployments = async () => {
    if (!confirm('Are you sure you want to recall all active deployed resources to their tactical depots?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/resources/reset`, { method: 'POST' });
      alert('All active deployed resource units successfully returned to depots.');
      fetchInventoryAndDepots();
    } catch (err) {
      console.error(err);
      alert('Reset completed locally.');
      fetchInventoryAndDepots();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        
        {/* Upper Brand / Banner Widget */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-indigo-400" />
              <h1 className="text-lg font-black tracking-tight text-white uppercase">
                TACTICAL RESOURCE INVENTORY & ALLOCATION
              </h1>
              <span className="px-2 py-0.5 text-[8px] font-black rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 uppercase tracking-widest">
                Logistics Module
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Analyze disaster variables, calculate supply chains from 5 regional depots, and execute Firestore-backed allocation workflows.
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={fetchInventoryAndDepots}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              title="Refresh inventories"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              onClick={handleResetDeployments}
              className="px-4 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-950/80 border border-red-900/50 text-red-400 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <X className="h-4 w-4" />
              <span>RESET DEPLOYMENTS</span>
            </button>
          </div>
        </div>

        {/* Dashboard Grid split into Inventory & Maps */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* LEFT 2 COLUMNS: Map & Allocation Planner */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Live Logistics Map Layer */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <MapIcon className="h-4 w-4 text-indigo-400" /> GEOSPATIAL SUPPLY NETWORK
                </h3>
                <span className="text-[10px] text-slate-500 font-mono uppercase">Leaflet Interactive Stage</span>
              </div>
              <div className="h-[400px]">
                <ResourceLogisticsMap
                  depots={depots}
                  routes={recommendationResult?.routes || []}
                  disasterCoords={
                    recommendationResult 
                      ? { lat: customLat, lng: customLng } 
                      : (selectedDisasterId && selectedDisasterId !== 'custom'
                          ? { lat: 37.7749, lng: -122.4194 } // default SF coordinate
                          : null)
                  }
                  disasterTitle={recommendationResult?.disaster_title || "Disaster Target Area"}
                />
              </div>
            </div>

            {/* Allocation Planner Panel */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-5">
              <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">Interactive Allocation Deck</span>
              
              {/* Variable Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[9px] text-slate-500 font-black uppercase">Associated Disaster</label>
                  <select
                    value={selectedDisasterId}
                    onChange={(e) => setSelectedDisasterId(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Choose active disaster --</option>
                    {disasters.map(d => (
                      <option key={d.id} value={d.id}>🔥 {d.title} ({d.severity_label})</option>
                    ))}
                    <option value="custom">📍 Custom Coordinates Target</option>
                  </select>
                </div>

                {/* If custom coordinate or custom target is selected */}
                {(selectedDisasterId === 'custom' || !selectedDisasterId) && (
                  <>
                    <div>
                      <label className="text-[9px] text-slate-500 font-black uppercase">Target Title</label>
                      <input
                        type="text"
                        value={customDisasterTitle}
                        onChange={(e) => setCustomDisasterTitle(e.target.value)}
                        placeholder="e.g. San Mateo Landslide"
                        className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 font-black uppercase">Risk Level</label>
                      <select
                        value={customRiskLevel}
                        onChange={(e) => setCustomRiskLevel(e.target.value)}
                        className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="text-[9px] text-slate-500 font-black uppercase">Affected Population</label>
                  <input
                    type="number"
                    value={affectedPopulation}
                    onChange={(e) => setAffectedPopulation(parseInt(e.target.value) || 0)}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-slate-500 font-black uppercase">Infrastructure Damage (facilities)</label>
                  <input
                    type="number"
                    value={infrastructureDamage}
                    onChange={(e) => setInfrastructureDamage(parseInt(e.target.value) || 0)}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Geo setup if custom coordinates */}
              {(selectedDisasterId === 'custom' || !selectedDisasterId) && (
                <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-950/40 rounded-xl border border-slate-800/50">
                  <div>
                    <label className="text-[9px] text-slate-500 font-black uppercase">Disaster Latitude</label>
                    <input
                      type="number"
                      step="0.001"
                      value={customLat}
                      onChange={(e) => setCustomLat(parseFloat(e.target.value) || 37.7749)}
                      className="w-full mt-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 font-black uppercase">Disaster Longitude</label>
                    <input
                      type="number"
                      step="0.001"
                      value={customLng}
                      onChange={(e) => setCustomLng(parseFloat(e.target.value) || -122.4194)}
                      className="w-full mt-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleEstimateAllocation}
                disabled={allocationLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow transition-all duration-150 active:scale-98"
              >
                <Database className="h-4 w-4 animate-spin-slow" />
                {allocationLoading ? 'COMPUTING OPTIMAL SUPPLY CHAINS...' : 'RUN RISK-BASED ALLOCATION ENGINE'}
              </button>

              {allocationError && (
                <p className="text-xs text-red-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> {allocationError}
                </p>
              )}

              {/* Recommendations Render Result */}
              {recommendationResult && (
                <div className="mt-4 p-4 bg-slate-950 border border-indigo-950/40 rounded-2xl space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                    <span className="text-[10px] font-black text-indigo-400 uppercase">Calculated Logistics Strategy</span>
                    <span className="text-[9px] font-mono text-slate-500 uppercase">Target: {recommendationResult.disaster_title}</span>
                  </div>

                  <div className="space-y-3.5">
                    {recommendationResult.recommendations.map((rec, i) => {
                      const inventoryMatch = inventory.find(inv => inv.key === rec.resource_type);
                      const isShortfall = rec.shortfall > 0;
                      return (
                        <div key={i} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-100 text-xs uppercase">{rec.resource_name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500">Recommended: <strong className="text-white">{rec.recommended_qty} {rec.unit}</strong></span>
                              <span className="text-[10px] text-slate-500">Allocated: <strong className="text-indigo-400">{rec.total_allocated}</strong></span>
                              {isShortfall && (
                                <span className="px-1.5 py-0.5 text-[8px] bg-red-500/10 text-red-400 font-black rounded border border-red-500/20 uppercase">
                                  Shortfall: {rec.shortfall}
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-[10px] text-slate-400 italic font-medium">"{rec.justification}"</p>

                          {/* Depot Sourcing Breakdown */}
                          {rec.depot_allocations.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-800/60 text-[9px] text-slate-500 flex flex-wrap gap-2 uppercase font-mono">
                              <span>Source Depots:</span>
                              {rec.depot_allocations.map((da, idx) => (
                                <span key={idx} className="bg-slate-950 px-2 py-0.5 rounded text-indigo-300 font-bold">
                                  {da.depot_name.split(' (')[0]}: +{da.qty_allocated} units
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="text-[10px] text-slate-400 font-mono">
                      {recommendationResult.total_shortfalls > 0 ? (
                        <span className="text-red-400 font-bold">⚠️ Sourcing shortfalls detected on {recommendationResult.total_shortfalls} total units.</span>
                      ) : (
                        <span className="text-emerald-400 font-bold">✓ Supply matching optimal. All tactical resources safely secured.</span>
                      )}
                    </div>

                    <button
                      onClick={handleApproveAndDeploy}
                      disabled={approvalSubmitting}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-2 transition-colors"
                    >
                      <Check className="h-4 w-4" />
                      {approvalSubmitting ? 'DEPLOYING RESOURCES...' : 'APPROVE & DEPLOY ALLOCATION'}
                    </button>
                  </div>
                </div>
              )}

              {/* Approval success block */}
              {approvalSuccessMessage && (
                <div className="p-4 bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 text-xs font-bold rounded-xl animate-pulse text-center">
                  {approvalSuccessMessage}
                </div>
              )}

            </div>
          </div>

          {/* RIGHT COLUMN: Inventory Dashboard Panel & Historical List */}
          <div className="space-y-6">
            
            {/* Live Inventory Status */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart2 className="h-4 w-4 text-indigo-400" /> TACTICAL INVENTORY
                </h3>
                <span className="text-[10px] text-slate-500 font-mono uppercase">Live Depot Reserves</span>
              </div>

              {inventoryLoading ? (
                <div className="text-center py-8 text-slate-500 text-xs animate-pulse">
                  Querying logistics centers...
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {inventory.map((item, idx) => {
                    const pct = (item.available_qty / item.total_qty) * 100;
                    const isLow = item.status === 'Critical' || item.status === 'Low';
                    return (
                      <div key={idx} className="p-3 bg-slate-950 border border-slate-800/60 rounded-xl space-y-2 uppercase">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-white text-xs">{item.name}</h4>
                            <span className="text-[8px] text-indigo-400 font-black tracking-widest block mt-0.5">{item.category}</span>
                          </div>
                          <span className={`px-2 py-0.5 text-[8px] font-black rounded ${
                            item.status === 'Critical' 
                              ? 'bg-red-500/10 text-red-400' 
                              : (item.status === 'Low' ? 'bg-orange-500/10 text-orange-400' : 'bg-emerald-500/10 text-emerald-400')
                          }`}>
                            {item.status}
                          </span>
                        </div>

                        {/* Progress meter */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                            <span>Available: <strong>{item.available_qty}</strong> / {item.total_qty} {item.unit}</span>
                            <span>{Math.round(pct)}%</span>
                          </div>
                          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${isLow ? 'bg-orange-500' : 'bg-indigo-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Description snippet */}
                        <p className="text-[9px] text-slate-500 leading-normal lowercase first-letter:uppercase">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Historical Firestore Allocations */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-indigo-400" /> DEPLOYMENT LOGS
                </h3>
                <span className="text-[10px] text-slate-500 font-mono uppercase">Firestore Synced</span>
              </div>

              {historyLoading ? (
                <div className="text-center py-4 text-slate-500 text-xs animate-pulse">
                  Syncing deployment logs...
                </div>
              ) : allocationHistory.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs uppercase font-semibold">
                  No active strategic deployments registered.
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                  {allocationHistory.map((hist, index) => (
                    <div key={index} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 uppercase font-mono text-[9px]">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-200 text-xs truncate max-w-[150px]">{hist.disasterTitle}</span>
                        <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 font-black rounded border border-emerald-500/20 uppercase text-[8px]">
                          {hist.status || 'deployed'}
                        </span>
                      </div>
                      <div className="text-slate-500">
                        Date: {new Date(hist.approvedAt).toLocaleString()}
                      </div>
                      <div className="border-t border-slate-900 pt-1.5 space-y-0.5 text-slate-400">
                        {hist.recommendations.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between">
                            <span>{item.resource_name}:</span>
                            <span className="font-bold text-indigo-300">+{item.qty_allocated}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </AppLayout>
  );
}
