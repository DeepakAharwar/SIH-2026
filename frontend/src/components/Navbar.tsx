import React from 'react';
import type { NavTab } from './Sidebar';
import { Bell, RefreshCw, Database } from 'lucide-react';

interface NavbarProps {
  activeTab: NavTab;
  hasDemoData: boolean;
  openAlertsCount: number;
  onRefresh: () => void;
  onLoadDemo: () => void;
  isSeeding: boolean;
}

const tabTitles: Record<NavTab, { title: string; subtitle: string }> = {
  overview: {
    title: 'Executive Quality Overview',
    subtitle: 'Live manufacturing inspection metrics and alert status',
  },
  new_inspection: {
    title: 'Weld Defect Inspection',
    subtitle: 'Upload specimen image, select demo sample, or capture from webcam',
  },
  camera: {
    title: 'Optical Webcam Image Capture',
    subtitle: 'Browser-based still image acquisition for surface visual analysis',
  },
  video: {
    title: 'Video Seam Frame Analysis',
    subtitle: 'Sample and analyze laser weld frames across video duration',
  },
  history: {
    title: 'Traceability & Inspection History',
    subtitle: 'Searchable audit log with disposition records and PDF exports',
  },
  analytics: {
    title: 'Quality Analytics & Correlation',
    subtitle: 'Defect distribution, trends, and exploratory parameter observations',
  },
  models: {
    title: 'Model Registry & Dataset Specifications',
    subtitle: 'Computer vision engine parameters, limitations, and supported classes',
  },
  settings: {
    title: 'System Settings & Architecture',
    subtitle: 'Storage directories, software certification, and environment configuration',
  },
};

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  hasDemoData,
  openAlertsCount,
  onRefresh,
  onLoadDemo,
  isSeeding,
}) => {
  const meta = tabTitles[activeTab];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">{meta.title}</h2>
        <p className="text-xs text-slate-500">{meta.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {hasDemoData && (
          <span className="px-2.5 py-1 text-xs font-bold font-mono tracking-wider rounded bg-amber-50 text-amber-700 border border-amber-300">
            DEMO DATA LOADED
          </span>
        )}

        <button
          onClick={onLoadDemo}
          disabled={isSeeding}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors disabled:opacity-50"
          title="Seed realistic sample inspection records"
        >
          <Database className="w-3.5 h-3.5 text-slate-500" />
          <span>{isSeeding ? 'Seeding...' : 'Load Demo Specimen'}</span>
        </button>

        <button
          onClick={onRefresh}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
          <Bell className="w-3.5 h-3.5 text-slate-400" />
          <span>Alerts:</span>
          <span
            className={`font-bold ${
              openAlertsCount > 0 ? 'text-rose-600' : 'text-slate-600'
            }`}
          >
            {openAlertsCount}
          </span>
        </div>
      </div>
    </header>
  );
};
