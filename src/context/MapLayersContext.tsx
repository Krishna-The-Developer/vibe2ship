import React, { createContext, useContext, useState, useEffect } from 'react';

export interface LayerState {
  activeDisasters: boolean;
  hazardRisks: boolean;
  deadlineImpactRadius: boolean;
  populationHeatmap: boolean;
  criticalInfrastructure: boolean;
  evacuationRoutes: boolean;
  checkpoints: boolean;
  emergencyShelters: boolean;
  tacticalDepots: boolean;
  dispatchRoutes: boolean;
}

export type LayerKey = keyof LayerState;

export interface SectionInfo {
  id: 'hazards' | 'analysis' | 'navigation' | 'resources';
  label: string;
  layers: { key: LayerKey; label: string; shortcut: string; color: string; desc: string }[];
}

export const SECTIONS: SectionInfo[] = [
  {
    id: 'hazards',
    label: 'Hazards & Incidents',
    layers: [
      { key: 'activeDisasters', label: 'Active Disasters', shortcut: 'Alt + 1', color: 'bg-red-500', desc: 'Live disasters, fires, floods & earth movements' },
      { key: 'hazardRisks', label: 'Hazard Risks & Plumes', shortcut: 'Alt + 2', color: 'bg-orange-500', desc: 'Predicted risk perimeters and localized plumes' },
    ]
  },
  {
    id: 'analysis',
    label: 'Analysis Layers',
    layers: [
      { key: 'deadlineImpactRadius', label: 'Deadline Impact Zones', shortcut: 'Alt + 3', color: 'bg-purple-500', desc: 'Concentric critical, high, & medium impact rings' },
      { key: 'populationHeatmap', label: 'Population Heatmap', shortcut: 'Alt + 4', color: 'bg-yellow-500', desc: 'Civilian density grids across target regions' },
      { key: 'criticalInfrastructure', label: 'Critical Infrastructure', shortcut: 'Alt + 5', color: 'bg-blue-500', desc: 'Power hubs, hospitals, and communication nodes' },
    ]
  },
  {
    id: 'navigation',
    label: 'Navigation & Safety',
    layers: [
      { key: 'evacuationRoutes', label: 'Evacuation Routes', shortcut: 'Alt + 6', color: 'bg-emerald-500', desc: 'Active primary & secondary safe transit paths' },
      { key: 'checkpoints', label: 'Checkpoints & Obstacles', shortcut: 'Alt + 7', color: 'bg-amber-600', desc: 'Roadblocks, safety nodes, and transit checks' },
      { key: 'emergencyShelters', label: 'Emergency Shelters', shortcut: 'Alt + 8', color: 'bg-teal-500', desc: 'Active civilian rescue camps and shelters' },
    ]
  },
  {
    id: 'resources',
    label: 'Resource Management',
    layers: [
      { key: 'tacticalDepots', label: 'Tactical Depots', shortcut: 'Alt + 9', color: 'bg-indigo-500', desc: 'Supply depots, equipment hubs, and logistics units' },
      { key: 'dispatchRoutes', label: 'Dispatch Routes', shortcut: 'Alt + 0', color: 'bg-fuchsia-500', desc: 'Active logistics convoys and rescue delivery lines' },
    ]
  }
];

const DEFAULT_LAYERS: LayerState = {
  activeDisasters: true,
  hazardRisks: true,
  deadlineImpactRadius: true,
  populationHeatmap: false,
  criticalInfrastructure: true,
  evacuationRoutes: true,
  checkpoints: true,
  emergencyShelters: true,
  tacticalDepots: true,
  dispatchRoutes: true,
};

interface MapLayersContextType {
  layers: LayerState;
  toggleLayer: (key: LayerKey) => void;
  setLayerVisibility: (key: LayerKey, visible: boolean) => void;
  setSectionVisibility: (sectionId: SectionInfo['id'], visible: boolean) => void;
  resetLayers: () => void;
}

const MapLayersContext = createContext<MapLayersContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'disaster_intel_map_layers_v1';

export const MapLayersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [layers, setLayers] = useState<LayerState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_LAYERS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to read map layer preferences from localStorage:', e);
    }
    return DEFAULT_LAYERS;
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(layers));
    } catch (e) {
      console.error('Failed to save map layer preferences to localStorage:', e);
    }
  }, [layers]);

  const toggleLayer = (key: LayerKey) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setLayerVisibility = (key: LayerKey, visible: boolean) => {
    setLayers((prev) => ({ ...prev, [key]: visible }));
  };

  const setSectionVisibility = (sectionId: SectionInfo['id'], visible: boolean) => {
    const section = SECTIONS.find(s => s.id === sectionId);
    if (!section) return;
    setLayers((prev) => {
      const updated = { ...prev };
      section.layers.forEach(layer => {
        updated[layer.key] = visible;
      });
      return updated;
    });
  };

  const resetLayers = () => {
    setLayers(DEFAULT_LAYERS);
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input, textarea, or select field
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      if (e.altKey) {
        let matched = true;
        switch (e.key) {
          case '1':
            toggleLayer('activeDisasters');
            break;
          case '2':
            toggleLayer('hazardRisks');
            break;
          case '3':
            toggleLayer('deadlineImpactRadius');
            break;
          case '4':
            toggleLayer('populationHeatmap');
            break;
          case '5':
            toggleLayer('criticalInfrastructure');
            break;
          case '6':
            toggleLayer('evacuationRoutes');
            break;
          case '7':
            toggleLayer('checkpoints');
            break;
          case '8':
            toggleLayer('emergencyShelters');
            break;
          case '9':
            toggleLayer('tacticalDepots');
            break;
          case '0':
            toggleLayer('dispatchRoutes');
            break;
          case 'r':
          case 'R':
            resetLayers();
            break;
          default:
            matched = false;
            break;
        }

        if (matched) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <MapLayersContext.Provider
      value={{
        layers,
        toggleLayer,
        setLayerVisibility,
        setSectionVisibility,
        resetLayers,
      }}
    >
      {children}
    </MapLayersContext.Provider>
  );
};

export const useMapLayers = () => {
  const context = useContext(MapLayersContext);
  if (!context) {
    throw new Error('useMapLayers must be used within a MapLayersProvider');
  }
  return context;
};
