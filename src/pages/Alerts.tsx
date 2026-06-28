import React, { useState, useEffect } from 'react';
import AppLayout from '../components/Layout/AppLayout';
import { motion, AnimatePresence } from 'motion/react';
import Skeleton from '../components/UI/Skeleton';
import EmptyState from '../components/UI/EmptyState';
import { 
  subscribeToAlerts, 
  updateAlertAcknowledgment, 
  addAlert, 
  subscribeToDisasters,
  FirestoreAlert,
  FirestoreDisaster 
} from '../services/firestoreService';
import { 
  Bell, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  MapPin, 
  Send, 
  Activity, 
  X, 
  Plus, 
  Trash2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

type SeverityFilter = 'all' | 'emergency' | 'critical' | 'high' | 'moderate' | 'info';

export default function Alerts() {
  // Real-time states
  const [alerts, setAlerts] = useState<FirestoreAlert[]>([]);
  const [disasters, setDisasters] = useState<FirestoreDisaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Selected UI states
  const [filter, setFilter] = useState<SeverityFilter>('all');
  const [selectedAlert, setSelectedAlert] = useState<FirestoreAlert | null>(null);
  const [actionCheckedStates, setActionCheckedStates] = useState<Record<string, boolean>>({});

  // Form state for custom alert generator
  const [selectedDisasterId, setSelectedDisasterId] = useState<string>('custom');
  const [customDisasterTitle, setCustomDisasterTitle] = useState('');
  const [disasterType, setDisasterType] = useState<'wildfire' | 'hurricane' | 'flood' | 'earthquake' | 'tsunami'>('wildfire');
  const [riskScore, setRiskScore] = useState<number>(75);
  const [affectedArea, setAffectedArea] = useState('');
  const [customHeadline, setCustomHeadline] = useState('');
  const [customSummary, setCustomSummary] = useState('');
  const [customActions, setCustomActions] = useState<string>('');
  const [generatingAlert, setGeneratingAlert] = useState(false);
  const [generationSuccess, setGenerationSuccess] = useState(false);

  // Subscriptions to Firestore
  useEffect(() => {
    setLoading(true);
    const unsubscribeAlerts = subscribeToAlerts(
      (syncedAlerts) => {
        setAlerts(syncedAlerts);
        setLoading(false);
      },
      (err) => {
        console.error("Alert subscription error:", err);
        setError("Failed to load live alerts from database.");
        setLoading(false);
      }
    );

    const unsubscribeDisasters = subscribeToDisasters(
      (syncedDisasters) => {
        setDisasters(syncedDisasters);
      },
      (err) => {
        console.error("Disasters subscription error:", err);
      }
    );

    return () => {
      unsubscribeAlerts();
      unsubscribeDisasters();
    };
  }, []);

  // Update selected alert when list refreshes
  useEffect(() => {
    if (selectedAlert) {
      const refreshed = alerts.find(a => a.id === selectedAlert.id);
      if (refreshed) {
        setSelectedAlert(refreshed);
      }
    }
  }, [alerts]);

  // Reset checked action steps when alert changes
  useEffect(() => {
    if (selectedAlert) {
      const initialStates: Record<string, boolean> = {};
      selectedAlert.recommendedActions.forEach((_, idx) => {
        initialStates[`${selectedAlert.id}-${idx}`] = false;
      });
      setActionCheckedStates(initialStates);
    }
  }, [selectedAlert]);

  // Handle alert generation via backend
  const handleGenerateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingAlert(true);
    setGenerationSuccess(false);

    try {
      // Determine disaster metadata
      let disasterId = selectedDisasterId;
      let disasterTitle = customDisasterTitle;
      let typeOfDisaster = disasterType;

      if (selectedDisasterId !== 'custom') {
        const matchingDisaster = disasters.find(d => d.id === selectedDisasterId);
        if (matchingDisaster) {
          disasterTitle = matchingDisaster.title;
          typeOfDisaster = matchingDisaster.type;
        }
      } else if (!disasterTitle.trim()) {
        disasterTitle = `Simulated ${typeOfDisaster.charAt(0).toUpperCase() + typeOfDisaster.slice(1)} Event`;
      }

      // 1. Send call to FastAPI backend router to run structured alert generation rules
      const payload = {
        disaster_id: disasterId,
        disaster_title: disasterTitle,
        risk_score: Number(riskScore),
        disaster_type: typeOfDisaster,
        affected_area: affectedArea.trim() ? affectedArea : undefined,
        custom_headline: customHeadline.trim() ? customHeadline : undefined,
        custom_summary: customSummary.trim() ? customSummary : undefined,
        custom_actions: customActions.trim() ? customActions.split('\n').filter(a => a.trim()) : undefined
      };

      const response = await fetch(`${API_BASE_URL}/api/alerts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`FastAPI responded with status: ${response.status}`);
      }

      const generatedData = await response.json();

      // 2. Write the fully compiled alert payload from FastAPI backend directly to user's Firestore collection
      await addAlert({
        disasterId: generatedData.disaster_id,
        disasterTitle: generatedData.disaster_title,
        disasterType: generatedData.disaster_type,
        severity: generatedData.severity,
        headline: generatedData.headline,
        summary: generatedData.summary,
        affectedArea: generatedData.affected_area,
        recommendedActions: generatedData.recommended_actions,
        acknowledged: false,
        issuedAt: generatedData.issued_at,
        expiresAt: generatedData.expires_at
      });

      setGenerationSuccess(true);
      // Reset form overrides
      setCustomHeadline('');
      setCustomSummary('');
      setCustomActions('');
      setAffectedArea('');
      setCustomDisasterTitle('');

      // Auto clear success indicator
      setTimeout(() => setGenerationSuccess(false), 3000);
    } catch (err: any) {
      console.error("Generation failed:", err);
      alert(`Alert generation failed: ${err.message || err}`);
    } finally {
      setGeneratingAlert(false);
    }
  };

  const handleToggleAcknowledge = async (alertId: string, currentState: boolean) => {
    try {
      await updateAlertAcknowledgment(alertId, !currentState);
    } catch (err) {
      console.error("Acknowledgment update failed:", err);
    }
  };

  // Helper formatting for relative/human timestamps
  const getRelativeTimeString = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHrs < 24) return `${diffHrs}h ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Recently';
    }
  };

  const getExpiryString = (isoString: string) => {
    try {
      const expiry = new Date(isoString);
      const diffMs = expiry.getTime() - Date.now();
      if (diffMs <= 0) return 'Expired';
      
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMins / 60);

      if (diffMins < 60) return `Expires in ${diffMins}m`;
      return `Expires in ${diffHrs}h ${diffMins % 60}m`;
    } catch (e) {
      return '';
    }
  };

  // Metric Computations
  const now = new Date();
  const nonExpiredAlerts = alerts.filter(a => new Date(a.expiresAt) > now);
  const unacknowledgedActive = nonExpiredAlerts.filter(a => !a.acknowledged);
  const emergencyCount = nonExpiredAlerts.filter(a => a.severity === 'emergency').length;
  const criticalCount = nonExpiredAlerts.filter(a => a.severity === 'critical').length;
  const highCount = nonExpiredAlerts.filter(a => a.severity === 'high').length;

  const filteredAlerts = alerts.filter(alert => {
    const isExpired = new Date(alert.expiresAt) <= now;
    if (filter === 'all') return true;
    return alert.severity === filter;
  });

  // Get visual styling classes by severity
  const getSeverityStyles = (severity: string, acknowledged: boolean) => {
    if (acknowledged) {
      return {
        card: "border-slate-800 bg-slate-900/40 opacity-70",
        badge: "bg-slate-900 text-slate-400 border-slate-800",
        iconText: "text-slate-500",
        accentLine: "bg-slate-700",
        beacon: null
      };
    }

    switch (severity) {
      case 'emergency':
        return {
          card: "border-rose-500/50 bg-rose-950/20 shadow-lg shadow-rose-950/20",
          badge: "bg-rose-900/30 text-rose-400 border-rose-500/30",
          iconText: "text-rose-400",
          accentLine: "bg-gradient-to-b from-rose-500 to-rose-700",
          beacon: "bg-rose-500"
        };
      case 'critical':
        return {
          card: "border-amber-500/50 bg-amber-950/15 shadow-md shadow-amber-950/10",
          badge: "bg-amber-900/30 text-amber-400 border-amber-500/30",
          iconText: "text-amber-400",
          accentLine: "bg-amber-500",
          beacon: "bg-amber-500"
        };
      case 'high':
        return {
          card: "border-orange-500/30 bg-orange-950/5",
          badge: "bg-orange-900/20 text-orange-400 border-orange-500/20",
          iconText: "text-orange-400",
          accentLine: "bg-orange-500",
          beacon: null
        };
      case 'moderate':
        return {
          card: "border-blue-500/30 bg-blue-950/5",
          badge: "bg-blue-900/20 text-blue-400 border-blue-500/20",
          iconText: "text-blue-400",
          accentLine: "bg-blue-500",
          beacon: null
        };
      default:
        return {
          card: "border-slate-800 bg-slate-900/60",
          badge: "bg-slate-800 text-slate-300 border-slate-700",
          iconText: "text-slate-400",
          accentLine: "bg-slate-600",
          beacon: null
        };
    }
  };

  return (
    <AppLayout>
      <div id="alerts-workspace" className="space-y-8">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/60 pb-6">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">
              Emergency Alert System
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Geospatial disaster warning broadcasts and interactive protective action checklists.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
              Live Network Active
            </span>
          </div>
        </div>

        {/* Real-time Metrics Board */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Unacknowledged</span>
              <span className="text-3xl font-black text-white mt-1 block">{unacknowledgedActive.length}</span>
            </div>
            <div className={`p-3 rounded-xl bg-slate-800/50 ${unacknowledgedActive.length > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`}>
              <Bell className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Emergency Tier</span>
              <span className="text-3xl font-black text-rose-400 mt-1 block">{emergencyCount}</span>
            </div>
            <div className={`p-3 rounded-xl ${emergencyCount > 0 ? 'bg-rose-950/30 text-rose-400' : 'bg-slate-800/50 text-slate-500'}`}>
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Critical Hazard</span>
              <span className="text-3xl font-black text-amber-400 mt-1 block">{criticalCount}</span>
            </div>
            <div className={`p-3 rounded-xl ${criticalCount > 0 ? 'bg-amber-950/30 text-amber-400' : 'bg-slate-800/50 text-slate-500'}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Tracked Alerts</span>
              <span className="text-3xl font-black text-slate-200 mt-1 block">{alerts.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/50 text-slate-400">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Main Work Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: Live Alerts Feed (2 Columns wide) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Filter controls */}
            <div className="bg-slate-900/40 p-1.5 rounded-xl border border-slate-850 flex flex-wrap gap-1">
              {(['all', 'emergency', 'critical', 'high', 'moderate', 'info'] as SeverityFilter[]).map((severity) => (
                <button
                  key={severity}
                  onClick={() => setFilter(severity)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
                    filter === severity 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/50'
                  }`}
                >
                  {severity}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-4">
                <Skeleton variant="list" lines={3} />
              </div>
            ) : filteredAlerts.length === 0 ? (
              <EmptyState 
                title="All Systems Normal" 
                message="No active emergency warning signals match your selected filter. System monitoring active satellite telemetry streams." 
              />
            ) : (
              <div className="space-y-4">
                {filteredAlerts.map((alert) => {
                  const isExpired = new Date(alert.expiresAt) <= now;
                  const styles = getSeverityStyles(alert.severity, alert.acknowledged);
                  
                  return (
                    <motion.div
                      id={`alert-card-${alert.id}`}
                      key={alert.id}
                      layoutId={`alert-card-wrapper-${alert.id}`}
                      onClick={() => setSelectedAlert(alert)}
                      className={`relative overflow-hidden border p-5 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] flex gap-4 ${styles.card}`}
                    >
                      {/* Left color bar */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${styles.accentLine}`} />

                      {/* Flashing beacon for unacknowledged Emergency alert */}
                      {styles.beacon && (
                        <div className="absolute right-4 top-4 flex h-3 w-3">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${styles.beacon}`}></span>
                          <span className={`relative inline-flex rounded-full h-3 w-3 ${styles.beacon}`}></span>
                        </div>
                      )}

                      {/* Content column */}
                      <div className="flex-grow space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase border tracking-wider ${styles.badge}`}>
                            {alert.severity}
                          </span>
                          <span className="text-slate-500 text-[10px] font-bold flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getRelativeTimeString(alert.issuedAt)}
                          </span>
                          {isExpired ? (
                            <span className="px-1.5 py-0.5 bg-slate-800 text-[9px] text-slate-500 font-extrabold uppercase rounded">
                              EXPIRED
                            </span>
                          ) : (
                            <span className="text-indigo-400 text-[10px] font-bold uppercase">
                              {getExpiryString(alert.expiresAt)}
                            </span>
                          )}
                          {alert.acknowledged && (
                            <span className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-800/30 text-[9px] text-emerald-400 font-black uppercase rounded flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Acknowledged
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-black text-white tracking-tight leading-snug">
                            {alert.headline}
                          </h4>
                          <p className="text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                            {alert.summary}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider pt-1 border-t border-slate-800/40">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {alert.affectedArea}
                          </span>
                          <span className="ml-auto flex items-center gap-1.5 hover:text-indigo-400 transition-colors">
                            View details &rarr;
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: Alert Simulator / Admin Panel (1 Column wide) */}
          <div className="space-y-6">
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-5">
              <div className="border-b border-slate-800/60 pb-3.5">
                <h3 className="font-black text-white text-xs uppercase tracking-wider flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-400" /> Alert Operations Hub
                </h3>
                <p className="text-slate-500 text-[10px] mt-1">
                  Trigger and broadcast newly configured alerts across the emergency platform instantly.
                </p>
              </div>

              <form onSubmit={handleGenerateAlert} className="space-y-4">
                
                {/* Disaster Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Disaster Event Link
                  </label>
                  <select
                    value={selectedDisasterId}
                    onChange={(e) => {
                      setSelectedDisasterId(e.target.value);
                      if (e.target.value !== 'custom') {
                        const matching = disasters.find(d => d.id === e.target.value);
                        if (matching) {
                          setDisasterType(matching.type);
                          setRiskScore(Math.round(matching.total_score || 50));
                        }
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="custom">No Connection (Simulate Mock Event)</option>
                    {disasters.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.title} ({d.type.toUpperCase()}) - Score: {Math.round(d.total_score)}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDisasterId === 'custom' && (
                  <>
                    {/* Custom Disaster Event Title */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Custom Event Title
                      </label>
                      <input
                        type="text"
                        value={customDisasterTitle}
                        onChange={(e) => setCustomDisasterTitle(e.target.value)}
                        placeholder="e.g. Sector A Mountain Wildfire"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Disaster Type selection */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Hazard Category
                      </label>
                      <select
                        value={disasterType}
                        onChange={(e: any) => setDisasterType(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="wildfire">WILDFIRE</option>
                        <option value="hurricane">HURRICANE</option>
                        <option value="flood">FLOOD</option>
                        <option value="earthquake">EARTHQUAKE</option>
                        <option value="tsunami">TSUNAMI</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Risk score slider */}
                <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/40">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Geospatial Risk Score
                    </label>
                    <span className="text-[11px] font-black text-indigo-400">{riskScore}/100</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={riskScore}
                    onChange={(e) => setRiskScore(Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-800 h-1 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-slate-500 font-bold uppercase tracking-widest pt-1">
                    <span>Low (&lt;30)</span>
                    <span>Moderate (&lt;50)</span>
                    <span>High (&lt;70)</span>
                    <span>Critical (&lt;90)</span>
                    <span>Emergency</span>
                  </div>
                </div>

                {/* Affected Area input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Affected Sector / Area Bounds
                  </label>
                  <input
                    type="text"
                    value={affectedArea}
                    onChange={(e) => setAffectedArea(e.target.value)}
                    placeholder="e.g. residential grids 12 to 18"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Collapsible Advanced Override Section */}
                <div className="border-t border-slate-800/40 pt-3.5 space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Override Defaults (Optional API Overrides)
                  </h4>
                  
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={customHeadline}
                      onChange={(e) => setCustomHeadline(e.target.value)}
                      placeholder="Custom Headline Override"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <textarea
                      value={customSummary}
                      onChange={(e) => setCustomSummary(e.target.value)}
                      placeholder="Custom Summary Override"
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <textarea
                      value={customActions}
                      onChange={(e) => setCustomActions(e.target.value)}
                      placeholder="Custom Actions (One item per line)"
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Broadcast Button */}
                <button
                  type="submit"
                  disabled={generatingAlert}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    generationSuccess
                      ? 'bg-emerald-600 text-white shadow-lg'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold shadow-md hover:shadow-indigo-500/20'
                  }`}
                >
                  {generatingAlert ? (
                    <>
                      <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                      <span>Synthesizing Payload...</span>
                    </>
                  ) : generationSuccess ? (
                    <>
                      <CheckCircle2 className="h-4.5 w-4.5" />
                      <span>Warning Broadcasted!</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Broadcast Alert via API</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

        </div>

        {/* Detailed Modal/Drawer Overlay (AnimatePresence) */}
        <AnimatePresence>
          {selectedAlert && (
            <div className="fixed inset-0 z-50 flex items-center justify-end">
              
              {/* Overlay Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedAlert(null)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              />

              {/* Drawer Container */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative h-full w-full max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col z-10"
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="absolute top-5 right-5 p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-950 transition-colors cursor-pointer z-20"
                >
                  <X className="h-4.5 w-4.5" />
                </button>

                {/* Dynamic Banner Indicator */}
                <div className={`h-40 p-6 flex flex-col justify-end relative overflow-hidden ${
                  selectedAlert.acknowledged 
                    ? 'bg-slate-800' 
                    : selectedAlert.severity === 'emergency' 
                      ? 'bg-gradient-to-tr from-rose-950/90 to-rose-900/80' 
                      : selectedAlert.severity === 'critical'
                        ? 'bg-gradient-to-tr from-amber-950/90 to-amber-900/80'
                        : selectedAlert.severity === 'high'
                          ? 'bg-gradient-to-tr from-orange-950/90 to-orange-900/80'
                          : 'bg-gradient-to-tr from-blue-950/90 to-blue-900/80'
                }`}>
                  <div className="absolute top-6 left-6 flex h-2.5 w-2.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      selectedAlert.acknowledged 
                        ? 'bg-slate-500' 
                        : selectedAlert.severity === 'emergency' 
                          ? 'bg-rose-500' 
                          : 'bg-amber-500'
                    }`}></span>
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      selectedAlert.acknowledged 
                        ? 'bg-slate-500' 
                        : selectedAlert.severity === 'emergency' 
                          ? 'bg-rose-500' 
                          : 'bg-amber-500'
                    }`}></span>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">
                    Live Broadcast Feed
                  </span>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight mt-1 leading-tight">
                    {selectedAlert.headline}
                  </h3>
                </div>

                {/* Scrollable Body Content */}
                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                  
                  {/* Status Badges Group */}
                  <div className="flex flex-wrap gap-2.5">
                    <div className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-slate-300">
                      <ShieldAlert className="h-3.5 w-3.5 text-indigo-500" />
                      Severity: <span className="font-black text-white">{selectedAlert.severity}</span>
                    </div>
                    <div className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-slate-300">
                      <Clock className="h-3.5 w-3.5 text-indigo-500" />
                      {getRelativeTimeString(selectedAlert.issuedAt)}
                    </div>
                    <div className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-slate-300">
                      <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                      Sector: <span className="font-black text-white">{selectedAlert.affectedArea}</span>
                    </div>
                  </div>

                  {/* Summary Segment */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Threat Assessment Summary
                    </h4>
                    <p className="text-slate-300 text-xs leading-relaxed font-medium bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                      {selectedAlert.summary}
                    </p>
                  </div>

                  {/* Checklist of Recommended Actions */}
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Designated Safety Checkpoints
                      </h4>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        Check to track progress
                      </span>
                    </div>

                    <div className="space-y-2">
                      {selectedAlert.recommendedActions.map((action, index) => {
                        const key = `${selectedAlert.id}-${index}`;
                        const isChecked = actionCheckedStates[key] || false;
                        return (
                          <div
                            key={index}
                            onClick={() => setActionCheckedStates(prev => ({ ...prev, [key]: !prev[key] }))}
                            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all select-none ${
                              isChecked 
                                ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-400' 
                                : 'bg-slate-950/40 border-slate-850 hover:border-slate-800 text-slate-200'
                            }`}
                          >
                            <div className="mt-0.5">
                              {isChecked ? (
                                <CheckCircle className="h-4 w-4 text-emerald-400 fill-emerald-900/20" />
                              ) : (
                                <div className="h-4 w-4 rounded border border-slate-700 bg-slate-950" />
                              )}
                            </div>
                            <span className="text-xs font-semibold leading-normal">{action}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* Action footer */}
                <div className="p-6 border-t border-slate-800/80 bg-slate-950/30 flex gap-3">
                  <button
                    onClick={() => handleToggleAcknowledge(selectedAlert.id!, selectedAlert.acknowledged)}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      selectedAlert.acknowledged
                        ? 'bg-slate-800 hover:bg-slate-750 text-slate-400'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-lg shadow-emerald-950/20'
                    }`}
                  >
                    {selectedAlert.acknowledged ? (
                      <>
                        <RefreshCw className="h-4.5 w-4.5" />
                        <span>Mark as Unresolved</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4.5 w-4.5" />
                        <span>Acknowledge Order</span>
                      </>
                    )}
                  </button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </AppLayout>
  );
}
