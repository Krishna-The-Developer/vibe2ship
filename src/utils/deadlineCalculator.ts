// Utility for calculating critical escape zones around tasks based on deadline urgency

export interface ImpactZone {
  name: 'Critical' | 'High' | 'Medium';
  radiusKm: number;
  color: string;
  borderColor: string;
  opacity: number;
  description: string;
}

export interface ImpactZonesResult {
  hoursLeft: number;
  zones: ImpactZone[];
}

/**
 * Calculates dynamic concentric impact zones around a task coordinate
 * based on how close its deadline is.
 * Lower hours remaining shrink the escape window, reflecting higher localized stress.
 */
export function calculateImpactZones(hoursLeft: number): ImpactZonesResult {
  // Clamp hours left to a realistic scale
  const hours = Math.max(0.1, hoursLeft);

  // Dynamic radius coefficients: as hours remaining shrink, the zones shrink 
  // representing a compressed reaction/escape threshold.
  const baseRadius = Math.min(5, Math.max(0.5, hours * 0.5));

  const zones: ImpactZone[] = [
    {
      name: 'Critical',
      radiusKm: Number((baseRadius * 0.4).toFixed(2)),
      color: 'rgba(239, 68, 68, 0.15)', // Red
      borderColor: 'rgba(239, 68, 68, 0.85)',
      opacity: 0.15,
      description: 'Immediate action range. Extreme latency penalties apply.'
    },
    {
      name: 'High',
      radiusKm: Number((baseRadius * 0.8).toFixed(2)),
      color: 'rgba(249, 115, 22, 0.12)', // Orange
      borderColor: 'rgba(249, 115, 22, 0.70)',
      opacity: 0.12,
      description: 'Secondary warning boundary. Prepare detours.'
    },
    {
      name: 'Medium',
      radiusKm: Number((baseRadius * 1.5).toFixed(2)),
      color: 'rgba(234, 179, 8, 0.08)', // Yellow
      borderColor: 'rgba(234, 179, 8, 0.55)',
      opacity: 0.08,
      description: 'Outer situational awareness threshold.'
    }
  ];

  return {
    hoursLeft: Number(hours.toFixed(1)),
    zones
  };
}

/**
 * Calculates remaining hours from a deadline string (ISO or custom text).
 */
export function getHoursLeft(deadlineStr: string): number {
  if (!deadlineStr) return 4.0;
  
  const parsed = Date.parse(deadlineStr);
  if (!isNaN(parsed)) {
    const diffMs = parsed - Date.now();
    return Math.max(0.1, diffMs / (3600 * 1000));
  }
  
  // Quick fallback parsers for duration texts like "2 hours", "30 mins", etc.
  const hoursRegex = /(\d+(?:\.\d+)?)\s*hour/i;
  const minsRegex = /(\d+(?:\.\d+)?)\s*min/i;
  const daysRegex = /(\d+(?:\.\d+)?)\s*day/i;
  
  const hMatch = deadlineStr.match(hoursRegex);
  if (hMatch) return parseFloat(hMatch[1]);
  
  const mMatch = deadlineStr.match(minsRegex);
  if (mMatch) return parseFloat(mMatch[1]) / 60;
  
  const dMatch = deadlineStr.match(daysRegex);
  if (dMatch) return parseFloat(dMatch[1]) * 24;

  // Standard fallback default if string is unparsable
  return 4.0;
}
