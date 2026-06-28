import React, { useState } from 'react';
import { useMapLayers, SECTIONS, SectionInfo, LayerKey } from '../../context/MapLayersContext';
import { 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Keyboard,
  Info,
  Sliders,
  Flame,
  ShieldAlert,
  Activity,
  Compass,
  Home,
  Truck,
  Grid,
  Milestone,
  Disc,
  Minimize2,
  Maximize2
} from 'lucide-react';

// Map keys to specific styling icons
const LAYER_ICONS: Record<string, React.ComponentType<any>> = {
  activeDisasters: Flame,
  hazardRisks: ShieldAlert,
  deadlineImpactRadius: Disc,
  populationHeatmap: Grid,
  criticalInfrastructure: Activity,
  evacuationRoutes: Compass,
  checkpoints: Milestone,
  emergencyShelters: Home,
  tacticalDepots: Truck,
  dispatchRoutes: Compass // fallback or custom route icon
};

export default function LayerControlPanel() {
  const { layers, toggleLayer, setSectionVisibility, resetLayers } = useMapLayers();
  
  // Track open/collapsed state of sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    hazards: false,
    analysis: false,
    navigation: false,
    resources: false,
  });

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSectionCollapse = (id: string) => {
    setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Check if all layers in a section are visible
  const isSectionFullyVisible = (section: SectionInfo) => {
    return section.layers.every(l => layers[l.key]);
  };

  // Check if any layers in a section are visible
  const isSectionPartiallyVisible = (section: SectionInfo) => {
    const visibleCount = section.layers.filter(l => layers[l.key]).length;
    return visibleCount > 0 && visibleCount < section.layers.length;
  };

  const handleSectionToggle = (section: SectionInfo) => {
    const fullyVisible = isSectionFullyVisible(section);
    // If fully visible, turn all off. Otherwise, turn all on.
    setSectionVisibility(section.id, !fullyVisible);
  };

  if (isCollapsed) {
    return (
      <div id="layer-control-panel" className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl w-56 text-slate-100 shadow-xl overflow-hidden font-sans select-none pointer-events-auto">
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-slate-800/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-400" />
            <span className="text-[10px] font-black tracking-widest text-white uppercase">Platform Layers</span>
          </div>
          <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <div id="layer-control-panel" className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl w-80 text-slate-100 shadow-xl overflow-hidden font-sans select-none pointer-events-auto">
      {/* Panel Header */}
      <div className="px-4 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2">
          <Layers className="h-4.5 w-4.5 text-indigo-400" />
          <h2 className="text-xs font-black tracking-widest text-white uppercase">
            Platform Layer Control
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
            title="Minimize layer control"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>

          {/* Keyboard Shortcuts Toggle Button */}
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              showShortcuts 
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' 
                : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-white'
            }`}
            title="Keyboard Shortcuts"
          >
            <Keyboard className="h-3.5 w-3.5" />
          </button>

          {/* Reset button */}
          <button
            onClick={resetLayers}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer flex items-center justify-center"
            title="Reset to default visibility preset"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts Reference Box */}
      {showShortcuts && (
        <div className="p-3 bg-indigo-950/20 border-b border-slate-800/50 text-[10px] text-indigo-300 font-medium space-y-1">
          <div className="flex items-center gap-1.5 font-bold mb-1 uppercase tracking-wider text-indigo-400">
            <Info className="h-3.5 w-3.5" /> Keyboard Shortcuts Map
          </div>
          <p className="leading-relaxed text-slate-400">
            Press the shortcut combinations on your keyboard anytime to instantly toggle visibility across the dashboard:
          </p>
          <div className="grid grid-cols-2 gap-1.5 pt-1.5 font-mono text-[9px]">
            <div className="flex items-center justify-between bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/40">
              <span>Disasters:</span>
              <kbd className="bg-slate-900 px-1 rounded text-white border border-slate-700">Alt+1</kbd>
            </div>
            <div className="flex items-center justify-between bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/40">
              <span>Risks:</span>
              <kbd className="bg-slate-900 px-1 rounded text-white border border-slate-700">Alt+2</kbd>
            </div>
            <div className="flex items-center justify-between bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/40">
              <span>Impact Rings:</span>
              <kbd className="bg-slate-900 px-1 rounded text-white border border-slate-700">Alt+3</kbd>
            </div>
            <div className="flex items-center justify-between bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/40">
              <span>Heatmap:</span>
              <kbd className="bg-slate-900 px-1 rounded text-white border border-slate-700">Alt+4</kbd>
            </div>
            <div className="flex items-center justify-between bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/40">
              <span>Infrastructure:</span>
              <kbd className="bg-slate-900 px-1 rounded text-white border border-slate-700">Alt+5</kbd>
            </div>
            <div className="flex items-center justify-between bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/40">
              <span>Routes:</span>
              <kbd className="bg-slate-900 px-1 rounded text-white border border-slate-700">Alt+6</kbd>
            </div>
            <div className="flex items-center justify-between bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/40">
              <span>Checkpoints:</span>
              <kbd className="bg-slate-900 px-1 rounded text-white border border-slate-700">Alt+7</kbd>
            </div>
            <div className="flex items-center justify-between bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/40">
              <span>Shelters:</span>
              <kbd className="bg-slate-900 px-1 rounded text-white border border-slate-700">Alt+8</kbd>
            </div>
            <div className="flex items-center justify-between bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/40">
              <span>Depots:</span>
              <kbd className="bg-slate-900 px-1 rounded text-white border border-slate-700">Alt+9</kbd>
            </div>
            <div className="flex items-center justify-between bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/40">
              <span>Convoys:</span>
              <kbd className="bg-slate-900 px-1 rounded text-white border border-slate-700">Alt+0</kbd>
            </div>
            <div className="col-span-2 flex items-center justify-between bg-slate-950 px-2 py-0.5 rounded border border-slate-800/40">
              <span>Reset all layers to default:</span>
              <kbd className="bg-slate-900 px-1.5 rounded text-indigo-400 font-bold border border-slate-700">Alt+R</kbd>
            </div>
          </div>
        </div>
      )}

      {/* Layer Sections */}
      <div className="divide-y divide-slate-800/50 max-h-[420px] overflow-y-auto">
        {SECTIONS.map((section) => {
          const isCollapsed = collapsedSections[section.id];
          const isAllVisible = isSectionFullyVisible(section);
          const isPartiallyVisible = isSectionPartiallyVisible(section);
          
          return (
            <div key={section.id} className="p-1">
              {/* Section Header */}
              <div className="flex items-center justify-between p-2 hover:bg-slate-800/30 rounded-xl transition-all">
                <button
                  onClick={() => toggleSectionCollapse(section.id)}
                  className="flex items-center gap-1.5 text-left flex-1 cursor-pointer"
                >
                  {isCollapsed ? (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                  )}
                  <span className="text-[10px] font-black tracking-wider text-slate-300 uppercase">
                    {section.label}
                  </span>
                </button>

                {/* Section Toggle Eye Master */}
                <button
                  onClick={() => handleSectionToggle(section)}
                  className={`p-1 rounded-lg hover:bg-slate-950/80 transition-colors cursor-pointer ${
                    isAllVisible 
                      ? 'text-indigo-400' 
                      : (isPartiallyVisible ? 'text-indigo-400/50' : 'text-slate-500 hover:text-slate-300')
                  }`}
                  title={`${isAllVisible ? 'Hide' : 'Show'} Entire Section`}
                >
                  {isAllVisible ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              {/* Section Content Layers */}
              {!isCollapsed && (
                <div className="px-2 pb-2 space-y-1">
                  {section.layers.map((layer) => {
                    const isVisible = layers[layer.key];
                    const IconComp = LAYER_ICONS[layer.key] || Sliders;
                    
                    return (
                      <div
                        key={layer.key}
                        onClick={() => toggleLayer(layer.key)}
                        className={`group flex items-center justify-between px-2.5 py-2 rounded-xl transition-all cursor-pointer border ${
                          isVisible 
                            ? 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700/80' 
                            : 'bg-transparent border-transparent hover:bg-slate-800/20 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Colored category dot with icon overlay */}
                          <div className={`mt-0.5 h-4.5 w-4.5 rounded-lg flex items-center justify-center text-white ${
                            isVisible ? layer.color : 'bg-slate-800 text-slate-500'
                          }`}>
                            <IconComp className="h-2.5 w-2.5" />
                          </div>

                          <div className="space-y-0.5 text-left">
                            <span className="text-[10px] font-bold block uppercase tracking-wide">
                              {layer.label}
                            </span>
                            <p className="text-[9px] text-slate-500 font-medium leading-relaxed max-w-[190px]">
                              {layer.desc}
                            </p>
                          </div>
                        </div>

                        {/* Visibility check eye status */}
                        <div className="flex flex-col items-end gap-1 font-mono">
                          {isVisible ? (
                            <Eye className="h-3.5 w-3.5 text-indigo-400 transition-transform group-hover:scale-105" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5 text-slate-600 transition-transform group-hover:scale-105" />
                          )}
                          <span className="text-[7px] text-slate-600 tracking-wider font-extrabold uppercase bg-slate-950 px-1 py-0.2 rounded border border-slate-900">
                            {layer.shortcut.split(' + ')[1]}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Panel Footer */}
      <div className="p-2.5 bg-slate-950/50 border-t border-slate-800/60 text-center text-[8px] font-black tracking-wider text-slate-500 uppercase">
        Alt + Keys toggle layers instantly
      </div>
    </div>
  );
}
