import React, { useState } from 'react';
import { useMapLayers } from '../../context/MapLayersContext';
import { Info, Minimize2, Maximize2 } from 'lucide-react';

interface LegendItemProps {
  colorClass: string;
  label: string;
  styleDesc: string;
}

const LegendItem: React.FC<LegendItemProps> = ({ colorClass, label, styleDesc }) => (
  <div className="flex items-center justify-between gap-3 text-[9px] uppercase font-mono tracking-wider text-slate-300 py-1 border-b border-slate-800/40 last:border-0">
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full border border-white/20 ${colorClass}`} />
      <span className="font-extrabold text-slate-200">{label}</span>
    </div>
    <span className="text-[8px] text-slate-500 font-bold lowercase italic">{styleDesc}</span>
  </div>
);

export default function MapLegend() {
  const { layers } = useMapLayers();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Count active visible layers
  const activeCount = Object.values(layers).filter(Boolean).length;

  if (activeCount === 0) return null;

  if (isCollapsed) {
    return (
      <div id="map-legend" className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl w-44 shadow-xl select-none text-slate-200 pointer-events-auto">
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-800/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-[10px] font-black tracking-widest text-white uppercase">Legend</span>
          </div>
          <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <div id="map-legend" className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3.5 rounded-2xl w-64 shadow-xl select-none text-slate-200 pointer-events-auto">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-[10px] font-black tracking-widest text-white uppercase">Live GIS Layer Legend</span>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
          title="Minimize legend"
        >
          <Minimize2 className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-0.5">
        {layers.activeDisasters && (
          <LegendItem 
            colorClass="bg-red-500 animate-pulse" 
            label="Active Disaster Center" 
            styleDesc="pulsing danger beacon" 
          />
        )}
        {layers.hazardRisks && (
          <LegendItem 
            colorClass="bg-orange-500/20 border-orange-500" 
            label="Hazard Risk Plume" 
            styleDesc="translucent perimeter" 
          />
        )}
        {layers.deadlineImpactRadius && (
          <LegendItem 
            colorClass="bg-purple-600/35 border-purple-500" 
            label="Impact Threshold" 
            styleDesc="concentric safety rings" 
          />
        )}
        {layers.populationHeatmap && (
          <LegendItem 
            colorClass="bg-yellow-500/40" 
            label="Civ Density Grid" 
            styleDesc="population density scale" 
          />
        )}
        {layers.criticalInfrastructure && (
          <LegendItem 
            colorClass="bg-blue-500" 
            label="Critical Asset" 
            styleDesc="blue status beacons" 
          />
        )}
        {layers.evacuationRoutes && (
          <LegendItem 
            colorClass="bg-emerald-500" 
            label="Evacuation Path" 
            styleDesc="solid green transit line" 
          />
        )}
        {layers.checkpoints && (
          <LegendItem 
            colorClass="bg-amber-600" 
            label="Checkpoint / Block" 
            styleDesc="amber status nodes" 
          />
        )}
        {layers.emergencyShelters && (
          <LegendItem 
            colorClass="bg-teal-500" 
            label="Emergency Shelter" 
            styleDesc="secure shelter marker" 
          />
        )}
        {layers.tacticalDepots && (
          <LegendItem 
            colorClass="bg-indigo-500" 
            label="Strategic Depot" 
            styleDesc="logistics depot node" 
          />
        )}
        {layers.dispatchRoutes && (
          <LegendItem 
            colorClass="bg-fuchsia-500" 
            label="Supply Convoy Route" 
            styleDesc="flowing dispatch link" 
          />
        )}
      </div>

      <div className="text-[7.5px] font-bold text-slate-500 mt-2 text-center uppercase tracking-wider">
        Rendering {activeCount} layer indicators
      </div>
    </div>
  );
}
