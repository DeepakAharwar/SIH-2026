import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import type { Inspection } from '../types';
import { api } from '../services/api';

export const HistoryPage: React.FC = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [defectFilter, setDefectFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Inspection Drawer
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'annotated' | 'original'>('annotated');
  const [modalStatus, setModalStatus] = useState<'Approved' | 'Flagged' | 'Rejected' | 'Pending'>('Pending');
  const [modalNotes, setModalNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadInspections = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        page_size: pageSize,
      };
      if (search) params.search = search;
      if (defectFilter !== 'all') params.defect_detected = defectFilter === 'defects';
      if (severityFilter !== 'all') params.severity = severityFilter;
      if (statusFilter !== 'all') params.review_status = statusFilter;

      const res = await api.getInspections(params);
      setInspections(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load inspections', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInspections();
  }, [page, pageSize, defectFilter, severityFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadInspections();
  };

  const handleOpenDetail = (insp: Inspection) => {
    setSelectedInspection(insp);
    setModalStatus(insp.review_status);
    setModalNotes(insp.review_notes || '');
    setActiveViewMode('annotated');
  };

  const handleUpdateDisposition = async () => {
    if (!selectedInspection) return;
    setIsUpdating(true);
    try {
      const updated = await api.updateReview(selectedInspection.id, modalStatus, modalNotes);
      setSelectedInspection(updated);
      setInspections((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (err) {
      alert('Failed to update review status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete inspection ${id}?`)) return;
    try {
      await api.deleteInspection(id);
      setSelectedInspection(null);
      loadInspections();
    } catch (err) {
      alert('Failed to delete inspection.');
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Search and Filters Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="w-full md:w-96 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, component, operator, defect..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
            />
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <a
              href={api.getCsvUrl()}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export History (CSV)</span>
            </a>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold">Filters:</span>
          </div>

          <select
            value={defectFilter}
            onChange={(e) => {
              setDefectFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none"
          >
            <option value="all">All Outcomes</option>
            <option value="defects">Defects Only</option>
            <option value="clean">Good Welds Only</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="High">High Severity</option>
            <option value="Medium">Medium Severity</option>
            <option value="Low">Low Severity</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none"
          >
            <option value="all">All Dispositions</option>
            <option value="Approved">Approved</option>
            <option value="Flagged">Flagged</option>
            <option value="Rejected">Rejected</option>
            <option value="Pending">Pending</option>
          </select>

          <span className="text-slate-400 text-xs ml-auto">
            Showing {inspections.length} of {total} records
          </span>
        </div>
      </div>

      {/* History Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Inspection ID</th>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Component ID</th>
                <th className="py-3 px-4 font-semibold">Classification</th>
                <th className="py-3 px-4 font-semibold">Confidence</th>
                <th className="py-3 px-4 font-semibold">Severity</th>
                <th className="py-3 px-4 font-semibold">Source</th>
                <th className="py-3 px-4 font-semibold">Disposition</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading records from SQLite...
                  </td>
                </tr>
              ) : inspections.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    No inspection records found matching your filters.
                  </td>
                </tr>
              ) : (
                inspections.map((insp) => (
                  <tr key={insp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      {insp.id}
                      {insp.is_demo && (
                        <span className="ml-1.5 px-1 py-0.2 text-[9px] bg-amber-100 text-amber-700 font-bold rounded">
                          DEMO
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(insp.created_at).toLocaleDateString()}{' '}
                      <span className="text-[10px] text-slate-400">
                        {new Date(insp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{insp.component_id || 'N/A'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          insp.defect_detected ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {insp.predicted_class}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {(insp.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4">
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
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 uppercase text-[10px] font-mono text-slate-500">
                      {insp.input_source}
                    </td>
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenDetail(insp)}
                        className="text-xs font-semibold text-sky-600 hover:text-sky-800"
                      >
                        View
                      </button>
                      <a
                        href={api.getPdfUrl(insp.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                        title="Download PDF"
                      >
                        PDF
                      </a>
                      <button
                        onClick={() => handleDelete(insp.id)}
                        className="text-xs text-rose-500 hover:text-rose-700"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Page <span className="font-bold text-slate-800">{page}</span> of{' '}
            <span className="font-bold text-slate-800">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2.5 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Inspection Detail Modal / Drawer */}
      {selectedInspection && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Inspection Specimen: {selectedInspection.id}
                  </h3>
                  {selectedInspection.is_demo && (
                    <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                      DEMO SPECIMEN
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {selectedInspection.component_id} | {selectedInspection.material} |{' '}
                  {new Date(selectedInspection.created_at).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={api.getPdfUrl(selectedInspection.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-300 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </a>
                <button
                  onClick={() => setSelectedInspection(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Specimen Visual Viewer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Specimen Visual Output:</span>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200">
                  <button
                    onClick={() => setActiveViewMode('annotated')}
                    className={`px-2 py-0.5 rounded font-medium ${
                      activeViewMode === 'annotated'
                        ? 'bg-white shadow text-sky-700 font-semibold'
                        : 'text-slate-600'
                    }`}
                  >
                    Annotated
                  </button>
                  <button
                    onClick={() => setActiveViewMode('original')}
                    className={`px-2 py-0.5 rounded font-medium ${
                      activeViewMode === 'original'
                        ? 'bg-white shadow text-sky-700 font-semibold'
                        : 'text-slate-600'
                    }`}
                  >
                    Raw Frame
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center max-h-[360px] border border-slate-800">
                <img
                  src={
                    activeViewMode === 'annotated' && selectedInspection.annotated_image_url
                      ? selectedInspection.annotated_image_url
                      : selectedInspection.original_image_url
                  }
                  alt="Specimen"
                  className="max-h-[340px] w-auto object-contain"
                />
              </div>
            </div>

            {/* Diagnostics Summary Grid */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-slate-500 block text-[11px]">Classification</span>
                <span
                  className={`font-bold text-sm ${
                    selectedInspection.defect_detected ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {selectedInspection.predicted_class}
                </span>
                <span className="text-slate-500 block text-[11px] mt-0.5">
                  Confidence: {(selectedInspection.confidence * 100).toFixed(1)}%
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-slate-500 block text-[11px]">Defensible Severity</span>
                <span className="font-bold text-sm text-slate-800">
                  {selectedInspection.severity || 'Not established'}
                </span>
                <span className="text-slate-500 block text-[11px] mt-0.5 truncate" title={selectedInspection.severity_method}>
                  {selectedInspection.severity_method || 'Nominal seam'}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-slate-500 block text-[11px]">Engine Model</span>
                <span className="font-bold text-sm text-slate-800">
                  {selectedInspection.model_name}
                </span>
                <span className="text-slate-500 block text-[11px] mt-0.5">
                  v{selectedInspection.model_version}
                </span>
              </div>
            </div>

            {/* Inspector Disposition Form */}
            <div className="p-4 rounded-xl border border-slate-300 bg-slate-50/70 space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider">
                Human Review Disposition Decision
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={modalStatus}
                    onChange={(e: any) => setModalStatus(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="Approved">Approved</option>
                    <option value="Flagged">Flagged</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleUpdateDisposition}
                    disabled={isUpdating}
                    className="w-full py-2 px-3 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isUpdating ? 'Updating...' : 'Save Decision'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
