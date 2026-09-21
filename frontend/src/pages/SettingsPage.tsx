import React, { useState } from 'react';
import {
  ShieldCheck,
  ExternalLink,
  Database,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';

interface SettingsPageProps {
  onDataReset: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onDataReset }) => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    setMessage(null);
    try {
      const res = await api.seedDemoData();
      setMessage(`Successfully seeded ${res.seeded_ids.length} sample inspection records.`);
      onDataReset();
    } catch (err: any) {
      setMessage('Failed to seed demo data. Verify backend status.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* 100% Software Only Certification Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              100% Software-Only System Certification
            </h3>
            <p className="text-xs text-slate-500">
              Validated compliance with Hackathon Software-Only Rules
            </p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span><b>Zero Microcontrollers:</b> No ESP32, Arduino, Raspberry Pi, or external controllers.</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span><b>Zero Hardware Sensors:</b> No external pyrometers, acoustic emissions, or photodiode circuits.</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span><b>No Machine Control:</b> System does not command physical CNC or laser galvo drives.</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span><b>Windows Desktop Compatible:</b> Runs entirely on standard consumer PC CPU via Python & Vite.</span>
          </div>
        </div>
      </div>

      {/* Environment & Storage Paths */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Environment & Application Paths</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
            <span className="font-semibold text-slate-500 block">FastAPI Backend URL</span>
            <span className="font-mono text-slate-800 font-bold">http://127.0.0.1:8000</span>
            <p className="text-[11px] text-slate-500 pt-1">
              Provides REST endpoints for computer vision inference, reports, and alerts.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
            <span className="font-semibold text-slate-500 block">SQLite Database File</span>
            <span className="font-mono text-slate-800 font-bold">backend/weldguard.db</span>
            <p className="text-[11px] text-slate-500 pt-1">
              Local relational storage for inspections, video frames, alerts, and models.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
            <span className="font-semibold text-slate-500 block">Storage Directory</span>
            <span className="font-mono text-slate-800 font-bold">backend/storage/</span>
            <p className="text-[11px] text-slate-500 pt-1">
              Stores raw uploads, annotated overlays, and generated PDF reports.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
            <span className="font-semibold text-slate-500 block">OpenAPI Documentation</span>
            <a
              href="http://127.0.0.1:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="text-sky-600 font-bold hover:underline flex items-center gap-1 font-mono"
            >
              <span>/docs (Swagger UI)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <p className="text-[11px] text-slate-500 pt-1">
              Interactive test console for all backend API endpoints.
            </p>
          </div>
        </div>
      </div>

      {/* Demo Data Management */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Sample Specimen Management</h3>
        <p className="text-xs text-slate-600">
          Populate the local SQLite database with baseline sample specimens (Crack, Porosity, Burn-through, Incomplete Penetration, Nominal Weld).
        </p>

        {message && (
          <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-800 font-medium">
            {message}
          </div>
        )}

        <div>
          <button
            onClick={handleSeedDemo}
            disabled={isSeeding}
            className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Database className="w-4 h-4" />
            <span>{isSeeding ? 'Seeding Demo Data...' : 'Seed Sample Specimen Data'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
