import React from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer
} from 'recharts';

/**
 * RiskForecastChart
 * Renders Recharts composed visualization for current and projected risk.
 */
export default function RiskForecastChart({ timelineData }) {
  // Ensure data exists and is properly formatted
  const data = timelineData || [
    { hour: 'Current', risk_score: 50, uncertainty_low: 48, uncertainty_high: 52 },
    { hour: '+6 Hours', risk_score: 55, uncertainty_low: 50, uncertainty_high: 60 },
    { hour: '+12 Hours', risk_score: 65, uncertainty_low: 58, uncertainty_high: 72 },
    { hour: '+24 Hours', risk_score: 75, uncertainty_low: 65, uncertainty_high: 85 }
  ];

  // Map low and high values into a range key for Area chart compatibility if needed
  const chartData = data.map(item => ({
    ...item,
    // Provide a range representation for custom tooltips
    uncertainty_range: [item.uncertainty_low, item.uncertainty_high]
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const riskVal = payload.find(p => p.dataKey === 'risk_score')?.value;
      const lowVal = payload[0]?.payload?.uncertainty_low;
      const highVal = payload[0]?.payload?.uncertainty_high;

      return (
        <div className="bg-slate-950/95 border border-slate-800 p-3.5 rounded-xl shadow-2xl text-xs font-sans text-slate-200">
          <p className="font-extrabold text-white text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Timeline: {label}
          </p>
          <div className="flex flex-col gap-1 font-mono">
            <div className="flex justify-between gap-6">
              <span className="text-slate-400">Projected Risk:</span>
              <span className="font-bold text-slate-100">{riskVal?.toFixed(1)}%</span>
            </div>
            {lowVal !== undefined && highVal !== undefined && (
              <div className="flex justify-between gap-6 border-t border-slate-800/60 pt-1 mt-1">
                <span className="text-slate-500">Confidence Band:</span>
                <span className="text-emerald-400 font-semibold">
                  {lowVal.toFixed(1)}% - {highVal.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="risk-forecast-chart-container" className="w-full h-[320px] bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Predicted Score Progression
        </span>
        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 bg-emerald-500/20 border border-emerald-500/40 rounded" />
            Uncertainty Band
          </span>
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-3 border-t-2 border-dashed border-emerald-400" />
            Projected Trend
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
          >
            <defs>
              <linearGradient id="uncertaintyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.18}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="hour" 
              stroke="#64748b" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              domain={[0, 100]} 
              stroke="#64748b" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
              ticks={[0, 20, 40, 60, 80, 100]}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Color-Coded Risk Zones Backgrounds */}
            <ReferenceArea y1={0} y2={30} fill="rgba(16, 185, 129, 0.015)" />
            <ReferenceArea y1={30} y2={50} fill="rgba(59, 130, 246, 0.015)" />
            <ReferenceArea y1={50} y2={70} fill="rgba(245, 158, 11, 0.015)" />
            <ReferenceArea y1={70} y2={90} fill="rgba(239, 68, 68, 0.015)" />
            <ReferenceArea y1={90} y2={100} fill="rgba(220, 38, 38, 0.03)" />

            {/* Time Marker for Current Moment */}
            <ReferenceLine 
              x="Current" 
              stroke="#ef4444" 
              strokeWidth={1.5}
              strokeDasharray="4 4" 
              label={{ value: 'INCIDENT START', fill: '#f87171', fontSize: 8, fontWeight: 'bold', position: 'insideTopRight', offset: 10 }} 
            />

            {/* Uncertainty bands Area */}
            <Area
              type="monotone"
              dataKey="uncertainty_high"
              stroke="none"
              fill="url(#uncertaintyGrad)"
              name="Uncertainty Max"
            />
            <Area
              type="monotone"
              dataKey="uncertainty_low"
              stroke="none"
              fill="#020617"
              fillOpacity={0.8}
              name="Uncertainty Min"
            />

            {/* Solid line for current value, dashed line for projected future */}
            <Line
              type="monotone"
              dataKey="risk_score"
              stroke="#10b981"
              strokeWidth={2.5}
              strokeDasharray="4 4"
              dot={{ r: 4, stroke: '#10b981', strokeWidth: 1, fill: '#020617' }}
              activeDot={{ r: 6, stroke: '#34d399', strokeWidth: 2, fill: '#020617' }}
              name="Composite Risk"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
