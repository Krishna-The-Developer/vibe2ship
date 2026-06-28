import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRealtimeDisasters, MergedDisaster } from '../hooks/useRealtimeDisasters';

interface DisasterContextType {
  disasters: MergedDisaster[];
  loading: boolean;
  error: string | null;
  isLiveFlashing: boolean;
  connectionStatus: 'connected' | 'reconnecting' | 'offline';
  lastUpdatedTime: Date;
  triggerLiveFlash: () => void;
}

const DisasterContext = createContext<DisasterContextType | undefined>(undefined);

export const DisasterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { disasters, loading, error, registerOnNewData } = useRealtimeDisasters();
  const [isLiveFlashing, setIsLiveFlashing] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'offline'>('connected');
  const [lastUpdatedTime, setLastUpdatedTime] = useState<Date>(new Date());

  // Handle client online/offline status natively
  useEffect(() => {
    const handleOnline = () => setConnectionStatus('connected');
    const handleOffline = () => setConnectionStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerLiveFlash = () => {
    setIsLiveFlashing(true);
    setLastUpdatedTime(new Date());
    const timer = setTimeout(() => {
      setIsLiveFlashing(false);
    }, 4000); // Flash visual effect for 4 seconds
    return () => clearTimeout(timer);
  };

  // Register real-time flash trigger on new data arrival from Firestore
  useEffect(() => {
    if (registerOnNewData) {
      registerOnNewData(() => {
        triggerLiveFlash();
      });
    }
  }, [registerOnNewData]);

  // Also trigger flash when the list length changes or timestamps update
  useEffect(() => {
    if (disasters.length > 0) {
      triggerLiveFlash();
    }
  }, [disasters.length]);

  return (
    <DisasterContext.Provider value={{
      disasters,
      loading,
      error,
      isLiveFlashing,
      connectionStatus,
      lastUpdatedTime,
      triggerLiveFlash
    }}>
      {children}
    </DisasterContext.Provider>
  );
};

export const useDisaster = () => {
  const context = useContext(DisasterContext);
  if (context === undefined) {
    throw new Error('useDisaster must be used within a DisasterProvider');
  }
  return context;
};
