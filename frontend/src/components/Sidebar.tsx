import React from 'react';
import {
  LayoutDashboard,
  ScanLine,
  Camera,
  Video,
  History,
  BarChart3,
  Layers,
  Settings,
  ShieldCheck,
  Cpu
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'new_inspection'
  | 'camera'
  | 'video'
  | 'history'
  | 'analytics'
  | 'models'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  openAlertsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  openAlertsCount,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'new_inspection', label: 'New Inspection', icon: ScanLine },
    { id: 'camera', label: 'Live Camera', icon: Camera },
    { id: 'video', label: 'Video Inspection', icon: Video },
    { id: 'history', label: 'Inspection History', icon: History },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'models', label: 'Dataset & Models', icon: Layers },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col flex-shrink-0 h-screen sticky top-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white tracking-wide flex items-center gap-1.5">
              WeldGuard <span className="text-sky-400 font-semibold">AI</span>
            </h1>
            <p className="text-[11px] text-slate-400">Laser Welding Quality System</p>
          </div>
        </div>

        {/* Prototype Certification Badge */}
        <div className="mt-3 px-2.5 py-1.5 rounded bg-slate-800/80 border border-slate-700/60 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[10px] font-mono tracking-wider font-semibold text-slate-300">
            100% SOFTWARE ONLY
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">
          Inspection Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.id === 'overview' && openAlertsCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {openAlertsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Engine Status Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
          <Cpu className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold text-slate-300">CV-Precision v2.4</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-snug">
          Optical Seam Gradient Extractor (CPU Inference Ready)
        </p>
      </div>
    </aside>
  );
};
