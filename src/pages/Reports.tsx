import React, { useState, useEffect, useMemo } from 'react';
import { useRealtimeDisasters, MergedDisaster } from '../hooks/useRealtimeDisasters';
import { useSituationReports, GenerateReportOptions } from '../hooks/useSituationReports';
import { useSituationAnalysis } from '../hooks/useSituationAnalysis';
import AppLayout from '../components/Layout/AppLayout';
import Markdown from 'react-markdown';
import { 
  FileText, 
  Plus, 
  Download, 
  Clipboard, 
  Check, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  Activity, 
  Sparkles, 
  CheckSquare, 
  FileSpreadsheet, 
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

interface Section {
  title: string;
  content: string;
}

export default function Reports() {
  const { disasters, loading: disastersLoading } = useRealtimeDisasters();
  const { reports, loading: reportsLoading, generating, error: reportsError, generateReport } = useSituationReports();

  const [selectedDisasterId, setSelectedDisasterId] = useState<string>('');
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [incorporateAnalysis, setIncorporateAnalysis] = useState<boolean>(true);
  
  // Accordion open states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<number>(0);

  // Active Disaster Selected
  const activeDisaster = useMemo(() => {
    return disasters.find(d => d.id === selectedDisasterId) || null;
  }, [disasters, selectedDisasterId]);

  // If selected disaster has change, default selectedDisasterId to the first active disaster
  useEffect(() => {
    if (disasters.length > 0 && !selectedDisasterId) {
      const firstActive = disasters.find(d => d.status === 'active') || disasters[0];
      setSelectedDisasterId(firstActive.id);
    }
  }, [disasters, selectedDisasterId]);

  // Fetch optional AI situation analysis context for the active disaster
  const analysisOptions = useMemo(() => {
    if (!activeDisaster) return null;
    return {
      disasterId: activeDisaster.id,
      disasterTitle: activeDisaster.title,
      disasterType: activeDisaster.type,
      magnitude: activeDisaster.magnitude,
      affectedPopulation: activeDisaster.population_affected,
      damagedCritical: activeDisaster.damaged_critical,
      totalCritical: activeDisaster.total_critical,
      riskScore: activeDisaster.total_score,
      resources: [
        { name: "Emergency Medical Kits", available: 120, gap: 180, needed: 300, status: "Low", mitigation_plan: "Sourcing from regional center" },
        { name: "Search & Rescue Teams", available: 15, gap: 45, needed: 60, status: "Critical", mitigation_plan: "Deploying backup volunteer taskforces" },
        { name: "Drinking Water Supply", available: 800, gap: 1200, needed: 2000, status: "Low", mitigation_plan: "Rerouting water purification trucks" }
      ],
      useStreaming: false
    };
  }, [activeDisaster]);

  const { data: situationAnalysis, loading: analysisLoading } = useSituationAnalysis(
    analysisOptions || {
      disasterId: '',
      disasterTitle: '',
      disasterType: 'unknown',
      magnitude: 0,
      affectedPopulation: 0,
      damagedCritical: 0,
      totalCritical: 0,
      riskScore: 0
    }
  );

  // Active Report Selected
  const activeReport = useMemo(() => {
    if (selectedReportId) {
      return reports.find(r => r.id === selectedReportId) || null;
    }
    return reports[0] || null;
  }, [reports, selectedReportId]);

  // Automatically select the newly generated report
  useEffect(() => {
    if (reports.length > 0 && !selectedReportId) {
      setSelectedReportId(reports[0].id || '');
    }
  }, [reports, selectedReportId]);

  // Parse markdown into accordion sections
  const parsedSections = useMemo(() => {
    if (!activeReport) return { intro: '', sections: [] as Section[] };
    
    const content = activeReport.content;
    const sectionsList: Section[] = [];
    const parts = content.split(/\n## /);
    const intro = parts[0] || '';
    
    for (let i = 1; i < parts.length; i++) {
      const lines = parts[i].split('\n');
      const rawTitle = lines[0].trim();
      const contentBody = lines.slice(1).join('\n').trim();
      sectionsList.push({ title: rawTitle, content: contentBody });
    }
    
    return { intro, sections: sectionsList };
  }, [activeReport]);

  // Default all sections to expanded on report change
  useEffect(() => {
    if (parsedSections.sections.length > 0) {
      const defaults: Record<string, boolean> = {};
      parsedSections.sections.forEach(s => {
        defaults[s.title] = true;
      });
      setOpenSections(defaults);
    }
  }, [parsedSections]);

  // Generation step animation
  useEffect(() => {
    if (generating) {
      setGenerationStep(1);
      const timer1 = setTimeout(() => setGenerationStep(2), 1500);
      const timer2 = setTimeout(() => setGenerationStep(3), 3200);
      const timer3 = setTimeout(() => setGenerationStep(4), 5000);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    } else {
      setGenerationStep(0);
    }
  }, [generating]);

  const toggleSection = (title: string) => {
    setOpenSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    parsedSections.sections.forEach(s => {
      next[s.title] = true;
    });
    setOpenSections(next);
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    parsedSections.sections.forEach(s => {
      next[s.title] = false;
    });
    setOpenSections(next);
  };

  const handleCopy = () => {
    if (!activeReport) return;
    navigator.clipboard.writeText(activeReport.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!activeReport) return;
    const blob = new Blob([activeReport.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeReport.title.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async () => {
    if (!activeDisaster) return;
    
    try {
      const opt: GenerateReportOptions = {
        disasterId: activeDisaster.id,
        disasterTitle: activeDisaster.title,
        disasterType: activeDisaster.type,
        magnitude: activeDisaster.magnitude,
        affectedPopulation: activeDisaster.population_affected,
        damagedCritical: activeDisaster.damaged_critical,
        totalCritical: activeDisaster.total_critical,
        riskScore: activeDisaster.total_score,
        resources: [
          { name: "Emergency Medical Kits", available: 120, gap: 180, needed: 300, status: "Low", mitigation_plan: "Sourcing from regional center" },
          { name: "Search & Rescue Teams", available: 15, gap: 45, needed: 60, status: "Critical", mitigation_plan: "Deploying backup volunteer taskforces" },
          { name: "Drinking Water Supply", available: 800, gap: 1200, needed: 2000, status: "Low", mitigation_plan: "Rerouting water purification trucks" }
        ],
        situationAnalysis: incorporateAnalysis ? situationAnalysis : undefined
      };
      const report = await generateReport(opt);
      if (report && report.id) {
        setSelectedReportId(report.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Helper to format timestamps
  const formatTime = (createdAt: any) => {
    if (!createdAt) return 'Just now';
    if (createdAt.seconds) {
      return new Date(createdAt.seconds * 1000).toLocaleString();
    }
    return new Date(createdAt).toLocaleString();
  };

  // Determine Composite Badge Class
  const getRiskBadgeClass = (score: number) => {
    if (score >= 75) return "bg-red-500/15 text-red-400 border border-red-500/30";
    if (score >= 50) return "bg-orange-500/15 text-orange-400 border border-orange-500/30";
    if (score >= 25) return "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30";
    return "bg-green-500/15 text-green-400 border border-green-500/30";
  };

  return (
    <AppLayout>
      <div className="space-y-8" id="situation-reports-page">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                <FileText className="h-5 w-5" />
              </span>
              <span className="text-xs uppercase tracking-widest text-indigo-400 font-extrabold">National Command</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase">
              Situation Reports
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Official FEMA-Standard incident briefings and delta intelligence records.
            </p>
          </div>

          {/* Action Trigger Card */}
          <div className="flex items-center gap-3">
            <select
              value={selectedDisasterId}
              onChange={(e) => setSelectedDisasterId(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              id="disaster-select-dropdown"
            >
              <option value="" disabled>Select Active Disaster</option>
              {disasters.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.status === 'active' ? '🚨' : '⚡'} {d.title} (Score: {Math.round(d.total_score)})
                </option>
              ))}
            </select>

            <button
              onClick={handleGenerate}
              disabled={generating || !selectedDisasterId}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/10 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              id="generate-sitrep-button"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-white" />
                  <span>Generate AI SitRep</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Generate options bar */}
        {activeDisaster && (
          <div className="p-3.5 bg-slate-900/40 border border-slate-800/60 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 text-slate-400">
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">Active Blueprint Context:</span>
              <span>Magnitude: <strong className="text-white">{activeDisaster.magnitude}</strong></span>
              <span>Affected: <strong className="text-white">{activeDisaster.population_affected.toLocaleString()}</strong></span>
              <span>Facilities Offline: <strong className="text-white">{activeDisaster.damaged_critical}/{activeDisaster.total_critical}</strong></span>
              <span>Risk Score: <strong className="text-white">{Math.round(activeDisaster.total_score)}/100</strong></span>
            </div>
            <label className="flex items-center gap-2 text-slate-300 font-bold cursor-pointer hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={incorporateAnalysis}
                onChange={(e) => setIncorporateAnalysis(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
              />
              <span>Incorporate live AI Situation Analysis context</span>
            </label>
          </div>
        )}

        {/* Live Step-By-Step Generation Progress */}
        {generating && (
          <div className="p-6 bg-slate-900 border border-indigo-500/20 rounded-2xl space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                <span className="text-xs font-black uppercase tracking-wider text-indigo-400">DIEP-AI Compilation Process Active</span>
              </div>
              <span className="text-xs font-bold text-slate-500">Step {generationStep} of 4</span>
            </div>

            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-500" 
                style={{ width: `${(generationStep / 4) * 100}%` }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold">
              <div className={`p-3 rounded-xl border ${generationStep >= 1 ? 'border-indigo-500/30 bg-indigo-950/20 text-indigo-300' : 'border-slate-800 text-slate-500'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`h-2 w-2 rounded-full ${generationStep >= 1 ? 'bg-indigo-400' : 'bg-slate-700'}`} />
                  <span>1. Aggregating Telemetry</span>
                </div>
                <span className="text-[10px] block font-medium opacity-80">Loading magnitude, affected zones, & offline assets.</span>
              </div>

              <div className={`p-3 rounded-xl border ${generationStep >= 2 ? 'border-indigo-500/30 bg-indigo-950/20 text-indigo-300' : 'border-slate-800 text-slate-500'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`h-2 w-2 rounded-full ${generationStep >= 2 ? 'bg-indigo-400' : 'bg-slate-700'}`} />
                  <span>2. Mapping Logistics Gaps</span>
                </div>
                <span className="text-[10px] block font-medium opacity-80">Retrieving resource constraints and shortages.</span>
              </div>

              <div className={`p-3 rounded-xl border ${generationStep >= 3 ? 'border-indigo-500/30 bg-indigo-950/20 text-indigo-300' : 'border-slate-800 text-slate-500'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`h-2 w-2 rounded-full ${generationStep >= 3 ? 'bg-indigo-400' : 'bg-slate-700'}`} />
                  <span>3. Model Posture Analysis</span>
                </div>
                <span className="text-[10px] block font-medium opacity-80">Compiling secondary cascaded hazards vectors.</span>
              </div>

              <div className={`p-3 rounded-xl border ${generationStep >= 4 ? 'border-indigo-500/30 bg-indigo-950/20 text-indigo-300' : 'border-slate-800 text-slate-500'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`h-2 w-2 rounded-full ${generationStep >= 4 ? 'bg-indigo-400' : 'bg-slate-700'}`} />
                  <span>4. FEMA Structuring</span>
                </div>
                <span className="text-[10px] block font-medium opacity-80">Formatting complete markdown into unified briefing.</span>
              </div>
            </div>
          </div>
        )}

        {/* Main Grid View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT PANEL: Briefings Directory */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <span className="text-xs uppercase tracking-widest text-slate-400 font-extrabold flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-indigo-400" /> Intelligence Briefings ({reports.length})
              </span>
              {reports.length > 0 && (
                <span className="text-[10px] bg-slate-900 border border-slate-800 rounded-md px-2 py-0.5 text-slate-400 font-bold uppercase">
                  Real-time Synced
                </span>
              )}
            </div>

            {reportsLoading ? (
              <div className="p-8 text-center bg-slate-900/30 border border-slate-800/50 rounded-2xl space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mx-auto" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Syncing Document Database...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/30 border border-slate-800/50 rounded-2xl space-y-4">
                <ShieldAlert className="h-10 w-10 text-slate-600 mx-auto" />
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">No Briefings Generated Yet</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Select an active incident from the dropdown menu and generate your first formal FEMA Situation Report.
                  </p>
                </div>
                {selectedDisasterId && (
                  <button
                    onClick={handleGenerate}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Create Report Now</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2" id="historical-sitreps-container">
                {reports.map((report) => {
                  const isActive = activeReport?.id === report.id;
                  const score = report.riskScore || 50;
                  const offlineRatio = report.totalFacilities > 0 
                    ? Math.round((report.damagedFacilities / report.totalFacilities) * 100) 
                    : 0;

                  return (
                    <div
                      key={report.id}
                      onClick={() => setSelectedReportId(report.id || '')}
                      className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                        isActive 
                          ? 'bg-slate-900 border-indigo-500/60 shadow-lg shadow-indigo-500/5' 
                          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
                      }`}
                      id={`sitrep-card-${report.id}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-sm text-white tracking-tight line-clamp-1">
                            {report.title}
                          </h4>
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                            {report.disasterTitle}
                          </p>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${getRiskBadgeClass(score)}`}>
                          Risk {Math.round(score)}
                        </span>
                      </div>

                      {/* Summary Metrics */}
                      <div className="grid grid-cols-2 gap-2 p-2 bg-slate-950/45 rounded-lg border border-slate-800/40 text-[10px] text-slate-400 font-bold mb-3">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-slate-500" />
                          <span>Pop: <strong className="text-white">{(report.affectedPopulation || 0).toLocaleString()}</strong></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3 text-slate-500" />
                          <span>Grid Offline: <strong className="text-white">{offlineRatio}%</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold uppercase">
                        <span>{formatTime(report.createdAt)}</span>
                        {isActive && <span className="text-indigo-400">ACTIVE VIEW</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Active Briefing Reader View */}
          <div className="lg:col-span-8 space-y-6">
            {!activeReport ? (
              <div className="p-16 text-center bg-slate-900/25 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-4">
                <FileText className="h-12 w-12 text-slate-700" />
                <div className="max-w-md">
                  <h3 className="text-base font-extrabold text-white uppercase tracking-wider">Operational Overview Awaiting</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Select any generated Situation Report from the briefings panel on the left to review metrics, tactical agendas, or download logs.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-900/95 border border-slate-800 rounded-2xl space-y-6 shadow-xl" id="sitrep-reader-container">
                {/* Header controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">
                      {activeReport.title}
                    </h2>
                    <span className="text-xs text-slate-400 font-bold flex items-center gap-2 mt-1">
                      <span>Generated: <strong>{formatTime(activeReport.createdAt)}</strong></span>
                      <span className="text-slate-600">|</span>
                      <span className="text-indigo-400 font-extrabold uppercase tracking-wider">{activeReport.disasterTitle}</span>
                    </span>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="px-3.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Copy Markdown to Clipboard"
                      id="sitrep-copy-button"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-green-400" />
                          <span className="text-green-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Clipboard className="h-3.5 w-3.5 text-slate-400" />
                          <span>Copy markdown</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownload}
                      className="px-3.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Download markdown document"
                      id="sitrep-download-button"
                    >
                      <Download className="h-3.5 w-3.5 text-slate-400" />
                      <span>Download .md</span>
                    </button>
                  </div>
                </div>

                {/* Introductory Narrative */}
                {parsedSections.intro && (
                  <div className="p-4 bg-slate-950/40 border border-slate-800/50 rounded-xl text-slate-300 text-xs leading-relaxed font-medium">
                    <Markdown>{parsedSections.intro}</Markdown>
                  </div>
                )}

                {/* Collapsible Section Header Controls */}
                <div className="flex items-center justify-between border-b border-slate-800/40 pb-2">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Incident Commander Briefing Sections</span>
                  <div className="flex items-center gap-3 text-[10px] font-black text-indigo-400 uppercase tracking-wider">
                    <button onClick={expandAll} className="hover:text-indigo-300 cursor-pointer">Expand All</button>
                    <span className="text-slate-700">|</span>
                    <button onClick={collapseAll} className="hover:text-indigo-300 cursor-pointer">Collapse All</button>
                  </div>
                </div>

                {/* Accordion / Collapsible Sections */}
                <div className="space-y-4" id="sitrep-collapsible-sections">
                  {parsedSections.sections.map((sec, index) => {
                    const isOpen = !!openSections[sec.title];
                    return (
                      <div 
                        key={index} 
                        className="border border-slate-850 bg-slate-900/50 rounded-xl overflow-hidden transition-all duration-200"
                        id={`sitrep-section-${index}`}
                      >
                        {/* Section Trigger header */}
                        <button
                          onClick={() => toggleSection(sec.title)}
                          className="w-full flex items-center justify-between px-5 py-4 bg-slate-900 hover:bg-slate-800/70 text-left transition-colors font-extrabold text-sm text-slate-200 cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            {sec.title}
                          </span>
                          {isOpen ? (
                            <ChevronUp className="h-4 w-4 text-slate-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-500" />
                          )}
                        </button>

                        {/* Section Content Pane */}
                        {isOpen && (
                          <div className="px-6 py-5 bg-slate-950/30 border-t border-slate-800/40 text-xs text-slate-300 leading-relaxed font-medium space-y-3 prose prose-invert max-w-none">
                            <Markdown>{sec.content}</Markdown>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
