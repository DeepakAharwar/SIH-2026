import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  FileCheck,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import type { DashboardStats, Inspection } from '../types';
import type { NavTab } from '../components/Sidebar';

interface OverviewPageProps {
  stats: DashboardStats | null;
  loading: boolean;
  onNavigate: (tab: NavTab) => void;
  onSelectInspection: (inspection: Inspection) => void;
  onResolveAlert: (alertId: string) => void;
  onLoadDemo: () => void;
}

const DEFECT_COLORS: Record<string, string> = {
  Crack: '#ef4444',
  'Burn-through': '#f97316',
  Porosity: '#f59e0b',
  'Incomplete Penetration': '#0284c7',
  Underfill: '#0d9488',
  'Weld Discontinuity': '#eab308',
  'Good Weld (No Defect)': '#22c55e',
};

export const OverviewPage: React.FC<OverviewPageProps> = ({
  stats,
  loading,
  onNavigate,
  onSelectInspection,
  onResolveAlert,
  onLoadDemo,
}) => {
  if (loading && !stats) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium text-slate-600">Loading manufacturing inspection metrics...</p>
        </div>
      </div>
    );
  }

  const isEmpty = !stats || stats.total_inspections === 0;

  if (isEmpty) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-sky-100">
            <FileCheck className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Inspection Records Found</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
            The inspection database is currently empty. You can inspect a new weld specimen image or load pre-analyzed demo specimens.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => onNavigate('new_inspection')}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm"
            >
              Start New Inspection
            </button>
            <button
              onClick={onLoadDemo}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300"
            >
              Load Demo Specimen Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prepped data for charts
  const pieData = stats.defect_distribution.map((d) => ({
    name: d.class_name,
    value: d.count,
    color: DEFECT_COLORS[d.class_name] || '#64748b',
  }));

  return (
    <div className="p-8 space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Scans</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total_inspections}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Recorded in SQLite</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Pass Rate */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pass Rate</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.pass_rate_percentage}%</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Without defects</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Defects Found */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Defects Identified</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{stats.defects_detected}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Flagged anomalies</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Flagged for Review */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Review Required</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.flagged_for_review}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Pending inspector sign-off</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Active Engine */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Engine</p>
            <p className="text-sm font-bold text-slate-900 mt-1 truncate max-w-[130px]" title={stats.active_model.name}>
              {stats.active_model.name}
            </p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">CPU Ready v2.4.1</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Defect Distribution Donut */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h4 className="text-sm font-bold text-slate-900 mb-1">Defect Classification Breakdown</h4>
          <p className="text-xs text-slate-500 mb-3">Relative frequency of detected weld anomalies</p>
          <div className="h-64 flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${value} scans`, 'Count']}
                    contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">No defect data</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                <span>{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Inspection Volume Trend */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <h4 className="text-sm font-bold text-slate-900 mb-1">Inspection Volume & Outcomes</h4>
          <p className="text-xs text-slate-500 mb-3">Daily completed scans categorized by clean vs defect detected</p>
          <div className="h-64">
            {stats.inspection_trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.inspection_trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" />
                  <YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="clean" name="Good Welds" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="defects" name="Defects Found" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Insufficient trend records
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Inspections & Alerts Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Inspections Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Recent Inspection Records</h4>
              <p className="text-xs text-slate-500">Latest visual scans submitted to the inference engine</p>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <span>View All Records</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Inspection ID</th>
                  <th className="py-2.5 px-3 font-semibold">Component</th>
                  <th className="py-2.5 px-3 font-semibold">Classification</th>
                  <th className="py-2.5 px-3 font-semibold">Severity</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recent_inspections.map((insp) => (
                  <tr key={insp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                      {insp.id}
                      {insp.is_demo && (
                        <span className="ml-1.5 px-1.5 py-0.2 text-[9px] bg-amber-100 text-amber-700 font-bold rounded">
                          DEMO
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 font-medium">{insp.component_id || 'N/A'}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`font-semibold ${
                          insp.defect_detected ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {insp.predicted_class}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {insp.severity ? (
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            insp.severity === 'High'
                              ? 'bg-rose-100 text-rose-700'
                              : insp.severity === 'Medium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {insp.severity}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                          insp.review_status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : insp.review_status === 'Flagged'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {insp.review_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onSelectInspection(insp)}
                        className="text-xs font-semibold text-sky-600 hover:text-sky-800 underline"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quality Alerts Feed */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Active Quality Alerts</h4>
              <p className="text-xs text-slate-500">Real-time alerts requiring review</p>
            </div>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-50 text-rose-600 border border-rose-200">
              {stats.open_alerts_count} Open
            </span>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[300px] pr-1">
            {stats.open_alerts_count === 0 ? (
              <div className="text-center py-10">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No Open Quality Alerts</p>
                <p className="text-[11px] text-slate-500">All current inspections are within nominal parameters</p>
              </div>
            ) : (
              stats.recent_inspections
                .flatMap((i) => i.alerts || [])
                .filter((a) => a.status === 'Open')
                .slice(0, 5)
                .map((alt) => (
                  <div
                    key={alt.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{alt.category}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          alt.severity === 'High'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {alt.severity}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-snug">{alt.message}</p>
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-mono">{alt.id}</span>
                      <button
                        onClick={() => onResolveAlert(alt.id)}
                        className="text-[11px] font-semibold text-sky-600 hover:text-sky-800"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
