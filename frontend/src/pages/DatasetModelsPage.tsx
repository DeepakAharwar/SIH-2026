import React, { useState, useEffect } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import type { ModelMetadata } from '../types';
import { api } from '../services/api';

export const DatasetModelsPage: React.FC = () => {
  const [models, setModels] = useState<ModelMetadata[]>([]);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await api.getModels();
        setModels(res);
      } catch (err) {
        console.error('Failed to load models', err);
      }
    };
    fetchModels();
  }, []);

  const activeModel = models[0];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Active Model Specification Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {activeModel?.name || 'WeldGuard-CV-Precision'}
                </h3>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                  Active Model
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Version {activeModel?.version || '2.4.1'} | {activeModel?.model_type || 'Computer Vision Seam Extractor'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-300">
              Weights: {activeModel?.weights_status || 'Active (Algorithmic / Built-in)'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider">Engine Description & Architecture</h4>
            <p className="text-slate-600 leading-relaxed">
              {activeModel?.description ||
                'Adaptive Computer Vision Engine utilizing CLAHE contrast enhancement, bilateral edge-preserving filtering, morphological gradient void detection, and contour geometry profiling calibrated for laser seam surface defect localization.'}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Documented Physical Limitations</span>
            </h4>
            <p className="text-slate-600 leading-relaxed">
              {activeModel?.limitations ||
                'Analyzes only visible top-surface weld bead geometry and seam discontinuities. Cannot detect subsurface porosity or root lack-of-fusion without X-ray/radiographic NDT. Designed for optical macro-inspection.'}
            </p>
          </div>
        </div>
      </div>

      {/* Supported Classes Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Supported Laser Welding Defect Classes</h3>
          <p className="text-xs text-slate-500">
            Validated classification capabilities and geometric detection parameters
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              name: 'Crack',
              aspect: 'Aspect ratio >= 3.2, dark crevice depth',
              severity: 'High (ISO 5817 Level B Critical Tier 1)',
              desc: 'Thermal hot cracks and termination craters along joint axis.',
            },
            {
              name: 'Porosity',
              aspect: 'Circularity >= 0.40, bounded area <= 900px',
              severity: 'Evaluated via Defect / Seam Area Ratio (<2% Low, 2-8% Med, >8% High)',
              desc: 'Shielding gas entrapment or surface contamination gas bubbles.',
            },
            {
              name: 'Burn-through',
              aspect: 'Deep void low intensity (<50 mean), area > 350px',
              severity: 'High (Complete loss of joint containment)',
              desc: 'Excessive laser heat input causing molten keyhole collapse.',
            },
            {
              name: 'Incomplete Penetration',
              aspect: 'Aspect ratio 2.0 - 3.2, joint axis depression',
              severity: 'Medium to High based on defect span length',
              desc: 'Insufficient continuous-wave laser power or root gap mismatch.',
            },
            {
              name: 'Underfill',
              aspect: 'Concave bead depression below parent surface',
              severity: 'Medium',
              desc: 'Excessive metal vaporization or joint gap opening.',
            },
            {
              name: 'Good Weld (No Defect)',
              aspect: 'Uniform chevron solidification ripples, low gradient',
              severity: 'Nominal / None',
              desc: 'Nominal laser weld profile meeting acceptance criteria.',
            },
          ].map((cls) => (
            <div key={cls.name} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{cls.name}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-slate-600">{cls.desc}</p>
              <div className="pt-1.5 border-t border-slate-200/80 space-y-0.5 text-[11px]">
                <p className="text-slate-500 font-mono">
                  <b className="text-slate-700">Metrics:</b> {cls.aspect}
                </p>
                <p className="text-slate-500">
                  <b className="text-slate-700">Severity:</b> {cls.severity}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Integration Guide for External Weights */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-sky-600" />
          <h3 className="text-sm font-bold text-slate-900">Custom Model Weights Integration Guide</h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          WeldGuard AI features a modular <code>BaseWeldDetector</code> architecture. You can plug in external trained
          PyTorch or YOLO weights (e.g. <code>yolov8n-weld.pt</code>) by implementing the abstract method:
        </p>

        <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto">
          <pre>{`from app.ai.base import BaseWeldDetector, WeldInspectionResult

class CustomYOLOWeldDetector(BaseWeldDetector):
    def __init__(self, weights_path: str = "storage/models/weld_best.pt"):
        # Load weights safely with CPU fallback
        from ultralytics import YOLO
        self.model = YOLO(weights_path)

    def predict(self, image_path: str) -> WeldInspectionResult:
        results = self.model(image_path)
        # Map detected bounding boxes and class names into WeldInspectionResult
        return WeldInspectionResult(...)`}</pre>
        </div>

        <p className="text-[11px] text-slate-500">
          The built-in Computer Vision Seam Extractor runs by default on any CPU without external GPU dependencies.
        </p>
      </div>
    </div>
  );
};
