import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ScatterChart,
  Scatter
} from 'recharts';
import { Info } from 'lucide-react';
import type { AnalyticsData } from '../types';
import { api } from '../services/api';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setLoading(true);
      try {
        const res = await api.getAnalytics();
        setData(res);
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalyticsData();
  }, []);

  if (loading || !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium text-slate-600">Aggregating quality statistics from database...</p>
        </div>
      </div>
    );
  }

  // Format data for Defect Frequency
  const defectChartData = Object.entries(data.defect_class_counts).map(([name, count]) => ({
    name,
    count,
  }));

  // Format data for Review Statuses
  const reviewChartData = Object.entries(data.review_status_counts).map(([name, count]) => ({
    name,
    count,
    color:
      name === 'Approved'
        ? '#22c55e'
        : name === 'Flagged'
        ? '#f59e0b'
        : name === 'Rejected'
        ? '#ef4444'
        : '#94a3b8',
  }));

  // Format data for Source Distribution
  const sourceChartData = Object.entries(data.source_distribution).map(([name, count]) => ({
    name: name.toUpperCase(),
    count,
  }));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Mandatory Non-Causal Analytics Disclaimer */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3 shadow-sm">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-amber-950 mb-0.5">
            EXPLORATORY DATA NOTICE & METALLURGICAL CORRELATION LIMITATION
          </h4>
          <p className="leading-relaxed">
            {data.correlation_disclaimer ||
              'Visual defect classifications and process parameters displayed here are observational and exploratory. They do not demonstrate physical metallurgical causation or predictive sensor fusion. Any simulated process data is explicitly labeled as simulated.'}
          </p>
        </div>
      </div>

      {/* Grid of Main Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Defect Class Frequency */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Defect Category Occurrence Frequency</h3>
          <p className="text-xs text-slate-500 mb-4">Total detected counts across all stored inspection records</p>
          <div className="h-72">
            {defectChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={defectChartData} layout="vertical" margin={{ left: 40, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" fontSize={11} stroke="#94a3b8" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" fontSize={11} stroke="#64748b" width={110} />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                  <Bar dataKey="count" name="Inspections" fill="#0284c7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No defect data available
              </div>
            )}
          </div>
        </div>

        {/* Human Review Status Disposition */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Human Review Disposition Status</h3>
          <p className="text-xs text-slate-500 mb-4">Quality sign-off distribution recorded by inspectors</p>
          <div className="h-72 flex items-center justify-center">
            {reviewChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reviewChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {reviewChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No review status data</div>
            )}
          </div>
        </div>
      </div>

      {/* Input Source Distribution and Parameter Mapping */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Source Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Input Source Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Origin of inspected specimens</p>
          <div className="h-64">
            {sourceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
                  <YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                  <Bar dataKey="count" name="Count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No source records
              </div>
            )}
          </div>
        </div>

        {/* Exploratory Process Parameter Scatter Plot */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Exploratory Process Parameter Mapping (Laser Power vs. Speed)
            </h3>
            <p className="text-xs text-slate-500">
              Observational distribution of recorded process parameters (labeled with defect outcomes).
            </p>
          </div>

          <div className="h-64">
            {data.process_param_correlations.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    dataKey="welding_speed_mmpm"
                    name="Speed"
                    unit=" mm/min"
                    fontSize={11}
                    stroke="#94a3b8"
                  />
                  <YAxis
                    type="number"
                    dataKey="laser_power_w"
                    name="Power"
                    unit=" W"
                    fontSize={11}
                    stroke="#94a3b8"
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => {
                      if (!payload || !payload.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow text-xs space-y-1">
                          <p className="font-bold text-slate-800">{item.component_id || item.id}</p>
                          <p className="text-slate-600">Power: {item.laser_power_w} W</p>
                          <p className="text-slate-600">Speed: {item.welding_speed_mmpm} mm/min</p>
                          <p
                            className={`font-semibold ${
                              item.defect_detected ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            Result: {item.predicted_class}
                          </p>
                          {item.is_simulated && (
                            <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-700 px-1 py-0.2 rounded">
                              SIMULATED
                            </span>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Scatter
                    name="Inspections"
                    data={data.process_param_correlations}
                    fill="#0ea5e9"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No process parameter data logged yet. Enable process parameters during image inspection.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
