import React, { useState, useEffect } from 'react';
import { useDisaster } from '../context/DisasterContext';
import AppLayout from '../components/Layout/AppLayout';
import RiskForecastChart from '../components/AI/RiskForecastChart';
import ScenarioCard from '../components/AI/ScenarioCard';
import Skeleton from '../components/UI/Skeleton';
import EmptyState from '../components/UI/EmptyState';
import { 
  TrendingUp, 
  Sparkles, 
  RefreshCw, 
  AlertTriangle, 
  ShieldAlert, 
  Users, 
  Building2, 
  Clock, 
  Zap, 
  CheckCircle,
  MapPin,
  Flame,
  Globe,
  Waves,
  Activity
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

/*
EXAMPLE FORECAST JSON RETURNED BY THE API:
{
  "forecast_timeline": [
    {"hour": "Current", "risk_score": 62.5, "uncertainty_low": 60.5, "uncertainty_high": 64.5},
    {"hour": "+6 Hours", "risk_score": 68.0, "uncertainty_low": 61.0, "uncertainty_high": 75.0},
    {"hour": "+12 Hours", "risk_score": 74.5, "uncertainty_low": 65.0, "uncertainty_high": 84.0},
    {"hour": "+24 Hours", "risk_score": 81.0, "uncertainty_low": 68.0, "uncertainty_high": 94.0}
  ],
  "escalation_triggers": [
    {
      "trigger": "Sustained dry high-velocity winds shifting Westward",
      "impact": "Expands wildfire hazard boundary into heavy fuel density areas, raising speed of perimeter growth.",
      "severity": "High"
    },
    {
      "trigger": "Loss of telemetry or telemetry systems at power sub-stations",
      "impact": "Triggers complete diagnostic blindness across residential fire hydrants and critical pumps.",
      "severity": "Critical"
    }
  ],
  "scenarios": [
    {
      "type": "Most Likely",
      "probability": "65%",
      "description": "Gradual progression of active perimeter lines. Localized spotting is mitigated successfully by active response crews.",
      "key_indicators": "Humidity remaining static, light gust speed below 20 mph.",
      "recommended_response": "Continue deploying standard active perimeter lines; maintain level 2 alert status."
    },
    {
      "type": "Worst Case",
      "probability": "25%",
      "description": "Extreme wind gusts blow burning embers over active containment lines, sparking wild secondary zones.",
      "key_indicators": "Winds exceeding 35 mph, relative humidity plunging below 12%.",
      "recommended_response": "Trigger rapid automated alarms; initiate Phase 3 mandatory evacuations."
    }
  ],
  "recommended_actions": [
    {
      "action": "Pre-stage physical evacuation routes with rescue coordinators",
      "priority": "High",
      "timeframe": "Within 6 hours",
      "rationale": "Prevents gridlocks on the primary motorway if secondary boundaries break."
    },
    {
      "action": "Issue a red flag danger warning to all localized municipal water plants",
      "priority": "Critical",
      "timeframe": "Immediate",
      "rationale": "Ensures uninterrupted backup fuel flow for active hydraulic station fire engines."
    }
  ]
}
*/

const DISASTER_ICONS = {
  earthquake: <Activity className="h-5 w-5 text-amber-400" />,
  hurricane: <Globe className="h-5 w-5 text-sky-400" />,
  flood: <Waves className="h-5 w-5 text-blue-400" />,
  wildfire: <Flame className="h-5 w-5 text-red-400" />,
  tsunami: <Waves className="h-5 w-5 text-teal-400" />,
};

export default function PredictiveForecast() {
  const { disasters, loading: disastersLoading, error: disastersError } = useDisaster();
  
  const [selectedDisaster, setSelectedDisaster] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auto-select first disaster
  useEffect(() => {
    if (disasters.length > 0 && !selectedDisaster) {
      setSelectedDisaster(disasters[0]);
    }
  }, [disasters, selectedDisaster]);

  // Fetch forecast whenever selected disaster changes
  useEffect(() => {
    if (selectedDisaster) {
      fetchRiskForecast(selectedDisaster);
    }
  }, [selectedDisaster]);

  const fetchRiskForecast = async (disaster) => {
    if (!disaster) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/analysis/forecast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          disaster_id: disaster.id || 'unknown',
          disaster_title: disaster.title,
          disaster_type: disaster.type || 'wildfire',
          magnitude: disaster.magnitude || 0.0,
          affected_population: disaster.population_affected || 0,
          damaged_critical_facilities: disaster.damaged_critical || 0,
          total_critical_facilities: disaster.total_critical || 0,
          risk_score: disaster.total_score || 50.0,
          current_analysis: null // can optionally be fed from hooks or Firestore
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned error status: ${response.status}`);
      }

      const data = await response.json();
      setForecast(data);
    } catch (err) {
      console.error("Failed to load risk forecast:", err);
      setError("Offline telemetry profiles are active. Live Gemini analysis is temporarily unavailable.");
      
      // Fallback local mock forecast to guarantee functionality
      setForecast({
        forecast_timeline: [
          { hour: "Current", risk_score: disaster.total_score || 50.0, uncertainty_low: (disaster.total_score || 50.0) - 2, uncertainty_high: (disaster.total_score || 50.0) + 2 },
          { hour: "+6 Hours", risk_score: (disaster.total_score || 50.0) + 4, uncertainty_low: (disaster.total_score || 50.0) + 1, uncertainty_high: (disaster.total_score || 50.0) + 8 },
          { hour: "+12 Hours", risk_score: (disaster.total_score || 50.0) + 8, uncertainty_low: (disaster.total_score || 50.0) + 3, uncertainty_high: (disaster.total_score || 50.0) + 14 },
          { hour: "+24 Hours", risk_score: (disaster.total_score || 50.0) + 12, uncertainty_low: (disaster.total_score || 50.0) + 5, uncertainty_high: (disaster.total_score || 50.0) + 22 }
        ],
        escalation_triggers: [
          { trigger: "Sustained Dry Air Shift", impact: "Fires escalate past tactical containment vectors into high fuel sectors.", severity: "High" },
          { trigger: "Critical Grid Disconnect", impact: "Local pumping houses freeze up, resulting in extreme drops in water line pressure.", severity: "Critical" }
        ],
        scenarios: [
          {
            type: "Most Likely",
            probability: "65%",
            description: "Containment lines hold at current sectors with steady backup deployments preventing expansion.",
            key_indicators: "Gusts under 18 mph, persistent localized humidity rates.",
            recommended_response: "Deploy standard secondary containment support squads."
          },
          {
            type: "Worst Case",
            probability: "25%",
            description: "High winds shift rapidly toward the residential sectors, throwing blazing debris over active barriers.",
            key_indicators: "Humidity dropping below 12%, winds scaling past 35 mph.",
            recommended_response: "Activate alarm systems and commence immediate evacuations."
          }
        ],
        recommended_actions: [
          { action: "Pre-position water supplies at Sector Delta Hangar", priority: "High", timeframe: "Within 6 hours", rationale: "Mitigates logistic blockages if roadways close." },
          { action: "Issue Red Flag warning to local utility centers", priority: "Critical", timeframe: "Immediate", rationale: "Prevents pressure failure across critical perimeter hydrants." }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshForecast = () => {
    if (selectedDisaster) {
      fetchRiskForecast(selectedDisaster);
    }
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'high': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'medium': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse';
      case 'high': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <AppLayout>
      <div id="predictive-forecast-root" className="flex flex-col gap-6 text-slate-100">
        
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Predictive Risk Forecasting
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 uppercase tracking-widest animate-pulse">
                  Gemini-Engineered
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Identify compounding triggers, comparative scenarios, and recommended preemptive maneuvers.
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <select
                id="forecast-disaster-select"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500/50"
                value={selectedDisaster?.id || ''}
                onChange={(e) => {
                  const found = disasters.find(d => d.id === e.target.value);
                  if (found) setSelectedDisaster(found);
                }}
              >
                {disasters.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.type?.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <button
              id="refresh-forecast-btn"
              onClick={handleRefreshForecast}
              disabled={isLoading || !selectedDisaster}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 text-white disabled:text-slate-500 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Forecast
            </button>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">GEMINI ENGINE MODELING COMPLICATING TRIGGERS...</span>
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
              </div>
              <Skeleton variant="chart" />
              <Skeleton variant="card" />
            </div>
            <div className="lg:col-span-1 space-y-6">
              <Skeleton variant="list" lines={4} />
              <Skeleton variant="card" />
            </div>
          </div>
        )}

        {/* No Disasters registered */}
        {!disastersLoading && disasters.length === 0 && (
          <EmptyState 
            title="No Disaster Incidents Registered" 
            message="There are no active disasters registered in the system. Go to Map View or drop a coordinate pin to activate real-time telemetry analytics." 
          />
        )}

        {/* Disasters General Loading State */}
        {disastersLoading && !isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton variant="chart" />
              <Skeleton variant="card" />
            </div>
            <div className="lg:col-span-1 space-y-6">
              <Skeleton variant="list" lines={3} />
            </div>
          </div>
        )}

        {/* Error notification */}
        {!isLoading && error && (
          <div id="forecast-error" className="flex items-start gap-3 bg-amber-950/20 border border-amber-800/40 text-amber-400 p-4 rounded-xl text-xs">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-extrabold">Notice</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Core content grid */}
        {!isLoading && forecast && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column (Span 2): Chart + Comparative Scenarios */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Score Chart Panel */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80">
                  <Clock className="h-5 w-5 text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Risk Score Progression</h3>
                    <p className="text-[10px] text-slate-500">Predicted trend progression over 24-hour command interval</p>
                  </div>
                </div>

                <RiskForecastChart timelineData={forecast.forecast_timeline} />
              </div>

              {/* Comparative Scenario Blocks */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80">
                  <ShieldAlert className="h-5 w-5 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Comparative Scenario Modeling</h3>
                    <p className="text-[10px] text-slate-500">Contrast most-likely outcomes vs worst-case development arcs</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {forecast.scenarios?.map((scenario, index) => (
                    <ScenarioCard key={index} scenario={scenario} />
                  ))}
                </div>
              </div>

            </div>

            {/* Right Column (Span 1): Escalation Triggers + Recommended Preemptive Moves */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              
              {/* Compounding Escalation Triggers */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80">
                  <Zap className="h-5 w-5 text-amber-400 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Escalation Triggers</h3>
                    <p className="text-[10px] text-slate-500">Compounding environmental and logistical factors</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {forecast.escalation_triggers?.map((trig, idx) => (
                    <div 
                      key={idx}
                      id={`trigger-block-${idx}`}
                      className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-2 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-extrabold text-slate-200">
                          {trig.trigger}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getSeverityBadgeClass(trig.severity)}`}>
                          {trig.severity?.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 leading-relaxed font-sans border-t border-slate-900 pt-1.5">
                        <span className="font-semibold text-slate-500 block uppercase text-[9px] mb-0.5 tracking-wider">Projected Impact</span>
                        {trig.impact}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Preemptive Actions */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Preemptive Actions</h3>
                    <p className="text-[10px] text-slate-500">Prioritized tactical mitigations before escalation triggers hit</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {forecast.recommended_actions?.map((act, idx) => (
                    <div 
                      key={idx}
                      id={`action-block-${idx}`}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-2.5 hover:border-emerald-500/20 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-bold text-white leading-snug">
                          {act.action}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border shrink-0 ${getPriorityBadgeClass(act.priority)}`}>
                          {act.priority?.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex flex-col gap-1 text-[11px] font-sans">
                        <div className="flex justify-between border-t border-slate-900 pt-1.5 mt-0.5">
                          <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Timeframe:</span>
                          <span className="text-emerald-400 font-mono font-bold">{act.timeframe}</span>
                        </div>
                        <div className="mt-1 bg-slate-900/40 rounded p-2 border border-slate-850 text-slate-400 leading-relaxed">
                          <span className="font-bold text-slate-500 block uppercase text-[8px] tracking-wider mb-0.5">RATIONALE</span>
                          {act.rationale}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </AppLayout>
  );
}
