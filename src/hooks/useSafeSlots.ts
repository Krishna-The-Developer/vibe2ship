import { useState, useCallback } from 'react';

export interface SafeSlot {
  start_time: string;
  end_time: string;
  score: number;
  label: string;
  description: string;
}

export interface SafeSlotsResponse {
  deadline: string;
  slots: SafeSlot[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

export function useSafeSlots() {
  const [slots, setSlots] = useState<SafeSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSafeSlots = useCallback(async (deadline: string) => {
    if (!deadline) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/safe-slots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deadline }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: SafeSlotsResponse = await response.json();
      setSlots(data.slots);
    } catch (err: any) {
      console.error('Error fetching safe slots from FastAPI:', err);
      setError(err?.message || 'Failed to fetch safe slots');
    } finally {
      setLoading(false);
    }
  }, []);

  return { slots, loading, error, fetchSafeSlots };
}
