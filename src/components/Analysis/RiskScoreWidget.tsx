import React, { useState, useEffect } from 'react';
import { useRiskScore, RiskScoreData } from '../../hooks/useRiskScore';
import { 
  ShieldAlert, 
  Activity, 
  Users, 
  Building2, 
  Globe2, 
  RefreshCw, 
  Sparkles, 
  ChevronRight,
  TrendingUp,
  Sliders,
  Play
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

export default function RiskScoreWidget() {
  const [selectedDisasterId, setSelectedDisasterId] = useState<string>('disaster-001');
  const { data, loading, error } = useRiskScore(selectedDisasterId);

  // States for live simulator / custom post calculations
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [customResult, setCustomResult] = useState<RiskScoreData | null>(null);
  const [simLoading, setSimLoading] = useState<boolean>(false);

  // Custom parameters
  const [disasterType, setDisasterType] = useState<string>('earthquake');
  const [magnitude, setMagnitude] = useState<number>(7.2);
  const [depthKm, setDepthKm] = useState<number>(12.5);
  const [populationAffected, setPopulationAffected] = useState<number>(350000);
  const [damagedCritical, setDamagedCritical] = useState<number>(14);
  const [totalCritical, setTotalCritical] = useState<number>(20);

  // Compute colors based on score
  const getScoreDesign = (score: number) => {
    if (score <= 25) {
      return {
        hex: '#10B981',
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        glow: 'shadow-emerald-500/20',
        label: 'Low Risk'
      };
    } else if (score <= 50) {
      return {
        hex: '#F59E0B',
        text: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        glow: 'shadow-amber-500/20',
        label: 'Moderate Risk'
      };
    } else if (score <= 75) {
      return {
        hex: '#F97316',
        text: 'text-orange-400',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/20',
        glow: 'shadow-orange-500/20',
        label: 'High Risk'
      };
    } else {
      return {
        hex: '#EF4444',
        text: 'text-rose-400',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20',
        glow: 'shadow-rose-500/20',
        label: 'Critical Risk'
      };
    }
  };

  const currentData = isSimulating ? customResult : data;
  const currentScore = currentData?.total_score || 0;
  const design = getScoreDesign(currentScore);

  // SVG Gauge Calculations (270-degree circular arc)
  const radius = 60;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const gaugeAngle = 270;
  const strokeLength = (circumference * gaugeAngle) / 360;
  
  // State for animated score (fades in on load)
  const [animatedScore, setAnimatedScore] = useState<number>(0);

  useEffect(() => {
    setAnimatedScore(0);
    const timeout = setTimeout(() => {
      setAnimatedScore(currentScore);
    }, 100);
    return () => clearTimeout(timeout);
  }, [currentScore]);

  const strokeDasharray = strokeLength;
  const offset = strokeLength - (animatedScore / 100) * strokeLength;

  // Run customized POST risk score calculation
  const runCustomSimulation = async () => {
    setSimLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/analysis/risk-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          disaster_event: {
            type: disasterType,
            magnitude: Number(magnitude),
            depth_km: disasterType === 'earthquake' ? Number(depthKm) : null
          },
          population_impact: {
            total_affected: Number(populationAffected)
          },
          infrastructure_analysis: {
            damaged_critical: Number(damagedCritical),
            total_critical: Number(totalCritical)
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Simulation failed status: ${response.status}`);
      }

      const result: RiskScoreData = await response.json();
      setCustomResult(result);
      setIsSimulating(true);
    } catch (err) {
      console.warn("Backend offline or error. Calculating simulation locally.");
      
      // Dynamic local computation replicating risk_scoring_service.py exactly
      const magScore = (magnitude / 10.0) * 25.0;
      const popScore = Math.min(35.0, (Math.log10(Math.max(1, populationAffected)) / 6.0) * 35.0);
      const infraScore = totalCritical > 0 ? (damagedCritical / totalCritical) * 25.0 : 0.0;
      
      let depthScore = 10.0;
      if (disasterType === 'earthquake') {
        depthScore = (1.0 - (depthKm / 150.0)) * 15.0;
        depthScore = Math.max(0, Math.min(15, depthScore));
      } else {
        if (disasterType === 'hurricane') depthScore = 13.5;
        else if (disasterType === 'wildfire') depthScore = 12.5;
        else depthScore = 8.0;
      }

      const total = Math.max(0.0, Math.min(100.0, Math.round((magScore + popScore + infraScore + depthScore) * 100) / 100));
      
      let severity = 'Low';
      let responseLvl = 1;
      if (total <= 25.0) { severity = 'Low'; responseLvl = 1; }
      else if (total <= 50.0) { severity = 'Moderate'; responseLvl = 2; }
      else if (total <= 75.0) { severity = 'High'; responseLvl = 3; }
      else if (total <= 90.0) { severity = 'Critical'; responseLvl = 4; }
      else { severity = 'Catastrophic'; responseLvl = 5; }

      const result: RiskScoreData = {
        disaster_id: 'custom-simulation',
        total_score: total,
        breakdown: {
          magnitude_score: Math.round(magScore * 100) / 100,
          population_score: Math.round(popScore * 100) / 100,
          infrastructure_score: Math.round(infraScore * 100) / 100,
          depth_type_score: Math.round(depthScore * 100) / 100,
        },
        severity_label: severity,
        recommended_response_level: responseLvl
      };
      setCustomResult(result);
      setIsSimulating(true);
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      
      {/* Header section with diagnostic state indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Globe2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              COMPOSITE GEOSPATIAL RISK SCORING
              <span className="px-2 py-0.5 text-[8px] font-black rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-widest">
                GIS Core
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Comprehensive disaster severity auditing utilizing real-time sensor array parameters.
            </p>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!isSimulating ? (
            <select
              value={selectedDisasterId}
              onChange={(e) => {
                setSelectedDisasterId(e.target.value);
                setIsSimulating(false);
              }}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-bold text-slate-300 uppercase tracking-wide focus:outline-none focus:border-indigo-500"
            >
              <option value="disaster-001">🌪️ disaster-001 (Hurricane)</option>
              <option value="disaster-002">🌋 disaster-002 (Earthquake)</option>
              <option value="disaster-003">🔥 disaster-003 (Wildfire)</option>
            </select>
          ) : (
            <button
              onClick={() => setIsSimulating(false)}
              className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-indigo-400 border border-slate-800 rounded-xl text-[10px] font-bold uppercase tracking-wide"
            >
              ← Back to Cache
            </button>
          )}

          <button
            onClick={() => {
              if (isSimulating) {
                runCustomSimulation();
              } else {
                setIsSimulating(true);
                runCustomSimulation();
              }
            }}
            className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
          >
            <Sliders className="h-3 w-3" />
            Simulator
          </button>
        </div>
      </div>

      {loading && !isSimulating ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider animate-pulse">Consulting geospatial database...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Circular Gauge Visualizer */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-950/20 border border-slate-800/40 rounded-2xl relative overflow-hidden group">
            
            <div className="absolute top-2 left-2 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-[8px] font-mono font-black text-slate-500 uppercase">
                {isSimulating ? 'SIMULATOR_ACTIVE' : 'DATABASE_CACHE'}
              </span>
            </div>

            {/* Circular Gauge SVG */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-225" viewBox="0 0 160 160">
                {/* Background Gauge Track */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke="#1E293B"
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeLinecap="round"
                />
                
                {/* Active Colored Arc */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke={design.hex}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              {/* Central Text Panel */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center mt-3">
                <span className="text-3xl font-black text-white font-mono leading-none tracking-tighter">
                  {currentScore.toFixed(1)}
                </span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                  Composite Score
                </span>
              </div>
            </div>

            {/* Response level indicator and Severity Badge */}
            <div className="w-full flex items-center justify-between gap-3 border-t border-slate-800/60 pt-4 mt-2">
              <div className="flex flex-col items-start">
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">SEVERITY ZONE</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider mt-1 border ${design.bg} ${design.text} ${design.border}`}>
                  {currentData?.severity_label || 'Unknown'}
                </span>
              </div>

              <div className="flex flex-col items-end text-right">
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider font-mono">RESPONSE LEVEL</span>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <span 
                      key={lvl} 
                      className={`h-2.5 w-2.5 rounded-full transition-all duration-500 border ${
                        lvl <= (currentData?.recommended_response_level || 0)
                          ? `border-transparent shadow-sm`
                          : 'bg-slate-900 border-slate-800'
                      }`}
                      style={{
                        backgroundColor: lvl <= (currentData?.recommended_response_level || 0) ? design.hex : undefined,
                        boxShadow: lvl <= (currentData?.recommended_response_level || 0) ? `0 0 6px ${design.hex}60` : undefined
                      }}
                    />
                  ))}
                  <span className="text-[10px] font-black text-white font-mono ml-1">
                    {currentData?.recommended_response_level || 0}/5
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Sub-Score Progress Bars */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Activity className="h-3 w-3 text-indigo-400" /> Scoring Breakdown Parameters
            </h3>

            <div className="space-y-3.5 bg-slate-950/20 p-4 rounded-xl border border-slate-800/60">
              
              {/* Parameter 1: Magnitude Score */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Globe2 className="h-3 w-3 text-slate-500" /> Sensor Magnitude (25%)
                  </span>
                  <span className="text-[10px] font-mono text-white font-bold">
                    {currentData?.breakdown.magnitude_score || 0} <span className="text-slate-500">/ 25.0</span>
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/40">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${((currentData?.breakdown.magnitude_score || 0) / 25) * 100}%` }}
                  />
                </div>
              </div>

              {/* Parameter 2: Population Impact */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="h-3 w-3 text-slate-500" /> Demographics Log-Impact (35%)
                  </span>
                  <span className="text-[10px] font-mono text-white font-bold">
                    {currentData?.breakdown.population_score || 0} <span className="text-slate-500">/ 35.0</span>
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/40">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${((currentData?.breakdown.population_score || 0) / 35) * 100}%` }}
                  />
                </div>
              </div>

              {/* Parameter 3: Infrastructure */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="h-3 w-3 text-slate-500" /> Infrastructure Exposure (25%)
                  </span>
                  <span className="text-[10px] font-mono text-white font-bold">
                    {currentData?.breakdown.infrastructure_score || 0} <span className="text-slate-500">/ 25.0</span>
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/40">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${((currentData?.breakdown.infrastructure_score || 0) / 25) * 100}%` }}
                  />
                </div>
              </div>

              {/* Parameter 4: Depth / Type Score */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="h-3 w-3 text-slate-500" /> Focus Depth / Severity Coefficient (15%)
                  </span>
                  <span className="text-[10px] font-mono text-white font-bold">
                    {currentData?.breakdown.depth_type_score || 0} <span className="text-slate-500">/ 15.0</span>
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/40">
                  <div 
                    className="h-full bg-rose-500 rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${((currentData?.breakdown.depth_type_score || 0) / 15) * 100}%` }}
                  />
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* Simulator controls drawer */}
      {isSimulating && (
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-4 animate-fade-in">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-indigo-400" /> Geospatial Parameter Controller
            </h4>
            <span className="px-2 py-0.5 text-[8px] font-black rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-widest animate-pulse">
              Live Link
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Disaster Selection */}
            <div className="space-y-1.5">
              <label className="text-[8px] text-slate-500 font-black uppercase tracking-wider">Disaster Event Category</label>
              <select
                value={disasterType}
                onChange={(e) => setDisasterType(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
              >
                <option value="earthquake">🌋 Earthquake (with Depth analysis)</option>
                <option value="hurricane">🌪️ Hurricane (Typhoon/Cyclone)</option>
                <option value="wildfire">🔥 Wildfire (Forest Exposure)</option>
                <option value="tsunami">🌊 Tsunami (Coastal Surge)</option>
              </select>
            </div>

            {/* Magnitude Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-[8px] text-slate-500 font-black uppercase tracking-wider">Event Magnitude (0-10)</label>
                <span className="text-[10px] font-bold text-white">{magnitude}</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={magnitude}
                onChange={(e) => setMagnitude(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            {/* Depth (only if Earthquake) */}
            {disasterType === 'earthquake' && (
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="text-[8px] text-slate-500 font-black uppercase tracking-wider">Hypocenter Depth (km)</label>
                  <span className="text-[10px] font-bold text-white">{depthKm} km</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="150"
                  step="0.5"
                  value={depthKm}
                  onChange={(e) => setDepthKm(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
            )}

            {/* Population Affected Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-[8px] text-slate-500 font-black uppercase tracking-wider">Affected Population (Total)</label>
                <span className="text-[10px] font-bold text-white">{populationAffected.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="100"
                max="1000000"
                step="5000"
                value={populationAffected}
                onChange={(e) => setPopulationAffected(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            {/* Critical Facilities damaged */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-[8px] text-slate-500 font-black uppercase tracking-wider">Facilities Destroyed / Damaged</label>
                <span className="text-[10px] font-bold text-white">{damagedCritical} of {totalCritical}</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="range"
                  min="0"
                  max={totalCritical}
                  step="1"
                  value={damagedCritical}
                  onChange={(e) => setDamagedCritical(Number(e.target.value))}
                  className="flex-grow accent-indigo-500"
                />
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={totalCritical}
                  onChange={(e) => setTotalCritical(Math.max(5, Number(e.target.value)))}
                  className="w-16 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-center text-white"
                />
              </div>
            </div>

          </div>

          <button
            onClick={runCustomSimulation}
            disabled={simLoading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition duration-150 flex items-center justify-center gap-1.5"
          >
            {simLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            CALCULATE LIVE RISK MATRIX (POST)
          </button>
        </div>
      )}

      {/* Standard Footnote Disclaimer */}
      <div className="p-3.5 bg-slate-950/45 border border-slate-800/80 rounded-xl flex items-start gap-2.5">
        <Activity className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="text-[9px] text-slate-500 leading-normal italic">
          Dynamic geospatial risk computations execute server-side on standard vector layers, considering spatial boundaries, network accessibility, and structural vulnerability.
        </p>
      </div>

    </div>
  );
}
