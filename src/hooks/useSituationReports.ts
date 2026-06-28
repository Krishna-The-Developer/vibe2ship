import { useState, useEffect, useCallback } from 'react';
import { 
  FirestoreSituationReport, 
  addSituationReport, 
  subscribeToSituationReports 
} from '../services/firestoreService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

export interface GenerateReportOptions {
  disasterId: string;
  disasterTitle: string;
  disasterType: string;
  magnitude: number;
  affectedPopulation: number;
  damagedCritical: number;
  totalCritical: number;
  riskScore: number;
  resources: any[];
  situationAnalysis?: any;
}

export function useSituationReports() {
  const [reports, setReports] = useState<FirestoreSituationReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to reports from Firestore
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToSituationReports(
      (data) => {
        // Sort reports descending by createdAt
        const sorted = [...data].sort((a, b) => {
          const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
          const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });
        setReports(sorted);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to subscribe to reports:", err);
        setError("Could not sync reports from security center.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Generate a new Situation Report via backend and save to Firestore
  const generateReport = useCallback(async (options: GenerateReportOptions) => {
    setGenerating(true);
    setError(null);

    try {
      // Find previous reports for this disaster to enable delta analysis
      const prevReports = reports
        .filter(r => r.disasterId === options.disasterId)
        .map(r => ({
          title: r.title,
          content: r.content,
          createdAt: r.createdAt
        }));

      const payload = {
        disaster_id: options.disasterId,
        disaster_title: options.disasterTitle,
        disaster_type: options.disasterType,
        magnitude: options.magnitude,
        affected_population: options.affectedPopulation,
        damaged_critical_facilities: options.damagedCritical,
        total_critical_facilities: options.totalCritical,
        risk_score: options.riskScore,
        resources: options.resources || [],
        situation_analysis: options.situationAnalysis || null,
        previous_reports: prevReports
      };

      const response = await fetch(`${API_BASE_URL}/api/analysis/situation-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server returned status code ${response.status}`);
      }

      const result = await response.json();

      // Now save the report to Firestore
      const savedReport = await addSituationReport({
        disasterId: options.disasterId,
        disasterTitle: options.disasterTitle,
        title: result.title,
        content: result.report_content,
        riskScore: options.riskScore,
        affectedPopulation: options.affectedPopulation,
        damagedFacilities: options.damagedCritical,
        totalFacilities: options.totalCritical
      });

      return savedReport;
    } catch (err: any) {
      console.error("Failed to generate report:", err);
      setError(err.message || "Failed to generate AI situation report.");
      throw err;
    } finally {
      setGenerating(false);
    }
  }, [reports]);

  return {
    reports,
    loading,
    generating,
    error,
    generateReport
  };
}
