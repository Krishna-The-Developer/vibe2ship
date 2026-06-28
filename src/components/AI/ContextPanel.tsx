import React from 'react';
import { 
  Shield, 
  Users, 
  Building2, 
  Flame, 
  Activity, 
  AlertTriangle,
  Globe,
  Waves,
  TrendingUp,
  MapPin
} from 'lucide-react';

interface Disaster {
  id?: string;
  title: string;
  type: 'earthquake' | 'hurricane' | 'flood' | 'wildfire' | 'tsunami' | string;
  magnitude?: number;
  depth_km?: number;
  population_affected: number;
  damaged_critical: number;
  total_critical: number;
  status: 'active' | 'monitored' | 'resolved' | string;
  total_score: number;
  severity_label: string;
  recommended_response_level: number;
}

interface ContextPanelProps {
  activeDisaster: Disaster | null;
  disasters: Disaster[];
  onSelectDisaster: (disaster: Disaster) => void;
}

const DISASTER_ICONS: Record<string, React.ReactNode> = {
  earthquake: <Activity className="h-5 w-5 text-amber-400" />,
  hurricane: <Globe className="h-5 w-5 text-sky-400" />,
  flood: <Waves className="h-5 w-5 text-blue-400" />,
  wildfire: <Flame className="h-5 w-5 text-red-400" />,
  tsunami: <Waves className="h-5 w-5 text-teal-400" />,
};

export default function ContextPanel({ activeDisaster, disasters, onSelectDisaster }: ContextPanelProps) {
  const getSeverityColor = (label: string) => {
    switch (label?.toLowerCase()) {
      case 'low': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'moderate': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'high': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'critical': return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'catastrophic': return 'bg-red-500/10 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse';
      case 'monitored': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      case 'resolved': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    }
  };

  return (
    <div id="context-panel" className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-5 h-full overflow-y-auto shadow-xl text-slate-200">
      <div className="flex flex-col gap-1 border-b border-slate-800 pb-4">
        <h3 className="text-sm font-semibold tracking-wide text-slate-400 uppercase flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-400" />
          Active Context Target
        </h3>
        <p className="text-xs text-slate-500">
          Load a disaster profile below to feed live intelligence context to the command model.
        </p>
      </div>

      {/* Selector */}
      <div id="disaster-selector-container" className="flex flex-col gap-2">
        <label className="text-xs font-medium text-slate-400">Select Active Disaster</label>
        <select
          id="disaster-select"
          className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
          value={activeDisaster?.id || ''}
          onChange={(e) => {
            const selected = disasters.find(d => d.id === e.target.value);
            if (selected) onSelectDisaster(selected);
          }}
        >
          <option value="" disabled>-- Choose a disaster --</option>
          {disasters.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title} ({d.type?.toUpperCase()})
            </option>
          ))}
        </select>
      </div>

      {activeDisaster ? (
        <div id="disaster-detail-container" className="flex flex-col gap-5 mt-2">
          {/* Header info */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div id="disaster-icon" className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                {DISASTER_ICONS[activeDisaster.type?.toLowerCase()] || <AlertTriangle className="h-5 w-5 text-amber-400" />}
              </div>
              <div>
                <h4 id="disaster-title" className="text-base font-semibold text-slate-100">{activeDisaster.title}</h4>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400 capitalize">
                  <MapPin className="h-3 w-3 text-slate-500" />
                  <span>{activeDisaster.type}</span>
                  {activeDisaster.magnitude !== undefined && (
                    <span className="font-mono text-slate-300">
                      • Mag: {activeDisaster.magnitude}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 items-end shrink-0">
              <span id="disaster-status" className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(activeDisaster.status)}`}>
                {activeDisaster.status?.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Risk Level Gauge */}
          <div id="risk-score-container" className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                Composite Risk Score
              </span>
              <span id="disaster-severity-label" className={`text-xs font-bold px-2.5 py-0.5 rounded border ${getSeverityColor(activeDisaster.severity_label)}`}>
                {activeDisaster.severity_label}
              </span>
            </div>
            
            <div className="flex items-end gap-3">
              <div id="disaster-risk-score" className="text-3xl font-extrabold tracking-tight text-slate-100 font-mono">
                {activeDisaster.total_score?.toFixed(1)}
              </div>
              <div className="flex-1 pb-1.5">
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div 
                    id="risk-progress-bar"
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.max(0, activeDisaster.total_score))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Impact Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div id="stat-population" className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 flex flex-col gap-1">
              <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-blue-400" />
                Affected Pop.
              </div>
              <span id="disaster-population" className="text-sm font-bold text-slate-200 font-mono">
                {activeDisaster.population_affected?.toLocaleString() || '0'}
              </span>
            </div>

            <div id="stat-infrastructure" className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 flex flex-col gap-1">
              <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-amber-400" />
                Critical Infra
              </div>
              <span id="disaster-infra" className="text-sm font-bold text-slate-200 font-mono">
                {activeDisaster.damaged_critical} / {activeDisaster.total_critical}
              </span>
            </div>
          </div>

          {/* Response level indicator */}
          <div id="response-level-box" className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-1.5">
            <div className="text-xs font-semibold text-slate-400 flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              Recommended Response Level
            </div>
            <div className="flex gap-1.5 mt-1">
              {[1, 2, 3, 4, 5].map((lvl) => {
                const isActive = lvl <= activeDisaster.recommended_response_level;
                return (
                  <div
                    key={lvl}
                    id={`resp-level-dot-${lvl}`}
                    className={`flex-1 text-center font-mono font-bold text-xs py-1 rounded transition-all border ${
                      isActive 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' 
                        : 'bg-slate-900 text-slate-600 border-slate-800/50'
                    }`}
                  >
                    L{lvl}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div id="no-context-message" className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-950/20 border border-dashed border-slate-800 rounded-xl">
          <AlertTriangle className="h-8 w-8 text-slate-600 mb-3" />
          <p className="text-sm text-slate-400 font-medium">No Context Target Loaded</p>
          <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
            Please select an active disaster profile from the dropdown to load operational intelligence.
          </p>
        </div>
      )}
    </div>
  );
}
