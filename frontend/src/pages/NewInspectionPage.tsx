import React, { useState, useRef } from 'react';
import {
  Upload,
  Layers,
  Sparkles,
  AlertCircle,
  Download,
  CheckCircle,
  Info,
  Camera,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { Inspection, ProcessParameters } from '../types';
import { api } from '../services/api';
import type { NavTab } from '../components/Sidebar';

interface NewInspectionPageProps {
  onInspectionCreated: (inspection: Inspection) => void;
  onNavigate: (tab: NavTab) => void;
}

const SAMPLE_OPTIONS = [
  { key: 'crack', label: 'Crack Specimen', desc: 'Severe longitudinal thermal fissure', tag: 'Crack' },
  { key: 'porosity', label: 'Gas Porosity Specimen', desc: 'Shielding gas trapped bubble cluster', tag: 'Porosity' },
  { key: 'burnthrough', label: 'Burn-through Specimen', desc: 'Excess heat penetration void', tag: 'Burn-through' },
  { key: 'incomplete_penetration', label: 'Incomplete Penetration', desc: 'Lack of root joint fusion', tag: 'Incomplete Penetration' },
  { key: 'good_weld', label: 'Good Weld (No Defect)', desc: 'Uniform ripple bead geometry', tag: 'Nominal' },
];

export const NewInspectionPage: React.FC<NewInspectionPageProps> = ({
  onInspectionCreated,
  onNavigate,
}) => {
  const [inputMode, setInputMode] = useState<'upload' | 'sample'>('sample');
  const [selectedSample, setSelectedSample] = useState<string>('crack');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>('/samples/sample_crack.jpg');

  // Metadata Form
  const [componentId, setComponentId] = useState('WELD-COMP-001');
  const [operatorName, setOperatorName] = useState('Quality Inspector');
  const [material, setMaterial] = useState('316L Stainless Steel');
  const [weldingProcess, setWeldingProcess] = useState('Fiber Laser Welding');
  const [notes, setNotes] = useState('');

  // Process Parameters Accordion
  const [showParams, setShowParams] = useState(false);
  const [laserPower, setLaserPower] = useState<string>('3200');
  const [weldingSpeed, setWeldingSpeed] = useState<string>('1500');
  const [shieldingGas, setShieldingGas] = useState<string>('18');
  const [focusOffset, setFocusOffset] = useState<string>('-0.5');
  const [isSimulated, setIsSimulated] = useState(true);

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<Inspection | null>(null);
  const [viewMode, setViewMode] = useState<'annotated' | 'original'>('annotated');

  // Human Review State
  const [reviewStatus, setReviewStatus] = useState<'Approved' | 'Flagged' | 'Rejected' | 'Pending'>('Pending');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [reviewSavedSuccess, setReviewSavedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMessage(null);
    }
  };

  const handleSelectSample = (sampleKey: string) => {
    setSelectedSample(sampleKey);
    setPreviewUrl(`/samples/sample_${sampleKey}.jpg`);
    setErrorMessage(null);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setResult(null);

    const formData = new FormData();
    if (inputMode === 'upload') {
      if (!uploadedFile) {
        setErrorMessage('Please choose or drag-and-drop an image file to analyze.');
        setIsAnalyzing(false);
        return;
      }
      formData.append('file', uploadedFile);
      formData.append('input_source', 'upload');
    } else {
      formData.append('sample_key', selectedSample);
      formData.append('input_source', 'demo');
    }

    formData.append('component_id', componentId || 'WELD-COMP-001');
    formData.append('operator_name', operatorName || 'Quality Inspector');
    formData.append('material', material || '316L Stainless Steel');
    formData.append('welding_process', weldingProcess || 'Fiber Laser Welding');
    if (notes) formData.append('notes', notes);

    // Optional Process Parameters
    if (showParams) {
      const paramsObj: ProcessParameters = {
        laser_power_w: laserPower ? parseFloat(laserPower) : undefined,
        welding_speed_mmpm: weldingSpeed ? parseFloat(weldingSpeed) : undefined,
        shielding_gas_flow_lpm: shieldingGas ? parseFloat(shieldingGas) : undefined,
        focus_position_mm: focusOffset ? parseFloat(focusOffset) : undefined,
        is_simulated: isSimulated,
      };
      formData.append('process_params', JSON.stringify(paramsObj));
    }

    try {
      const data = await api.analyzeImage(formData);
      setResult(data);
      setReviewStatus(data.review_status);
      setReviewNotes(data.review_notes || '');
      onInspectionCreated(data);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Inference failed. Please check file format or server status.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveReview = async () => {
    if (!result) return;
    setIsSavingReview(true);
    setReviewSavedSuccess(false);
    try {
      const updated = await api.updateReview(result.id, reviewStatus, reviewNotes);
      setResult(updated);
      setReviewSavedSuccess(true);
      setTimeout(() => setReviewSavedSuccess(false), 3000);
    } catch (err: any) {
      alert('Failed to update human review disposition.');
    } finally {
      setIsSavingReview(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Workflow Box */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">1. Select Specimen Input Source</h3>
            <p className="text-xs text-slate-500">Choose a pre-generated weld specimen or upload a macrograph image</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setInputMode('sample');
                setPreviewUrl(`/samples/sample_${selectedSample}.jpg`);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                inputMode === 'sample'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Sample Specimens</span>
            </button>

            <button
              onClick={() => {
                setInputMode('upload');
                setPreviewUrl(uploadedFile ? URL.createObjectURL(uploadedFile) : null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                inputMode === 'upload'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Image</span>
            </button>

            <button
              onClick={() => onNavigate('camera')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Webcam Capture</span>
            </button>
          </div>
        </div>

        {/* Mode Selector Content */}
        {inputMode === 'sample' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Calibrated Test Specimen:
              </span>
              <span className="text-[11px] text-amber-700 font-mono font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                TAGGED: DEMO SAMPLE
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {SAMPLE_OPTIONS.map((sample) => {
                const isSelected = selectedSample === sample.key;
                return (
                  <button
                    key={sample.key}
                    type="button"
                    onClick={() => handleSelectSample(sample.key)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50/60 ring-2 ring-sky-500/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">{sample.label}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          sample.tag === 'Crack'
                            ? 'bg-rose-100 text-rose-700'
                            : sample.tag === 'Porosity'
                            ? 'bg-amber-100 text-amber-700'
                            : sample.tag === 'Nominal'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-sky-100 text-sky-700'
                        }`}
                      >
                        {sample.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">{sample.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-sky-500 bg-slate-50 hover:bg-sky-50/30 rounded-xl p-8 text-center cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.bmp"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">
              {uploadedFile ? uploadedFile.name : 'Click to select or drag & drop weld image'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Supported formats: JPG, PNG, WEBP, BMP (up to 20MB)</p>
          </div>
        )}

        {/* Specimen Preview & Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 pt-6 border-t border-slate-100">
          {/* Preview Box */}
          <div className="lg:col-span-5 flex flex-col">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Specimen Preview
            </label>
            <div className="flex-1 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center min-h-[200px] relative">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Specimen preview"
                  className="max-h-[240px] w-full object-contain"
                />
              ) : (
                <p className="text-xs text-slate-500">No image chosen</p>
              )}
            </div>
          </div>

          {/* Metadata Inputs */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Component Identifier</label>
                <input
                  type="text"
                  value={componentId}
                  onChange={(e) => setComponentId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  placeholder="e.g. WELD-JOINT-A102"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Inspector / Operator</label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  placeholder="e.g. John Doe (NDT-II)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Base Material</label>
                <input
                  type="text"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Welding Process</label>
                <input
                  type="text"
                  value={weldingProcess}
                  onChange={(e) => setWeldingProcess(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Inspection Notes (Optional)</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none"
                placeholder="Observed optical conditions, joint prep details..."
              />
            </div>

            {/* Optional Process Parameters Toggle */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowParams(!showParams)}
                className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  <span>Optional Laser Process Parameters</span>
                  {showParams && (
                    <span className="ml-2 text-[10px] font-mono text-amber-600 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                      SIMULATED DATA
                    </span>
                  )}
                </span>
                {showParams ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showParams && (
                <div className="p-3 bg-white space-y-3 text-xs border-t border-slate-200">
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Laser Power (W)</label>
                      <input
                        type="number"
                        value={laserPower}
                        onChange={(e) => setLaserPower(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Speed (mm/min)</label>
                      <input
                        type="number"
                        value={weldingSpeed}
                        onChange={(e) => setWeldingSpeed(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Gas Flow (L/min)</label>
                      <input
                        type="number"
                        value={shieldingGas}
                        onChange={(e) => setShieldingGas(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Focus Offset (mm)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={focusOffset}
                        onChange={(e) => setFocusOffset(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                    <input
                      type="checkbox"
                      id="simulatedCheck"
                      checked={isSimulated}
                      onChange={(e) => setIsSimulated(e.target.checked)}
                      className="rounded text-sky-600"
                    />
                    <label htmlFor="simulatedCheck">
                      Label these parameters as <b>SIMULATED</b> (Not from real-time physical PLC sensors)
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Run Analysis Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Executing Computer Vision Defect Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run AI Defect Inspection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Post-Analysis Inspection Results Panel */}
      {result && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Inspection Analysis Record</h3>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                  {result.id}
                </span>
                {result.is_demo && (
                  <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                    DEMO DATA
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated by {result.model_name} v{result.model_version} on{' '}
                {new Date(result.created_at).toLocaleString()}
              </p>
            </div>

            <div className="flex items-center gap-2 mt-3 md:mt-0">
              <a
                href={api.getPdfUrl(result.id)}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-300 flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF Report</span>
              </a>
            </div>
          </div>

          {/* Classification & Severity Status Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
              <p className="text-xs font-semibold text-slate-500 uppercase">Predicted Class</p>
              <p
                className={`text-lg font-bold mt-1 ${
                  result.defect_detected ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {result.predicted_class}
              </p>
              <p className="text-[11px] text-slate-500">
                {result.defect_detected ? 'Defect identified' : 'Nominal seam'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
              <p className="text-xs font-semibold text-slate-500 uppercase">Model Confidence</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {(result.confidence * 100).toFixed(1)}%
              </p>
              <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
                <div
                  className="bg-sky-600 h-1.5 rounded-full"
                  style={{ width: `${result.confidence * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
              <p className="text-xs font-semibold text-slate-500 uppercase">Defensible Severity</p>
              <p className="text-lg font-bold mt-1">
                {result.severity ? (
                  <span
                    className={
                      result.severity === 'High'
                        ? 'text-rose-600'
                        : result.severity === 'Medium'
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }
                  >
                    {result.severity}
                  </span>
                ) : (
                  <span className="text-slate-500 text-sm font-medium">Severity not established</span>
                )}
              </p>
              <p className="text-[11px] text-slate-500">ISO 5817 Geometric Rubric</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
              <p className="text-xs font-semibold text-slate-500 uppercase">Review Status</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                <span
                  className={`px-2 py-0.5 text-xs rounded font-bold ${
                    result.review_status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : result.review_status === 'Flagged'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {result.review_status}
                </span>
              </p>
              <p className="text-[11px] text-slate-500">Human quality gate</p>
            </div>
          </div>

          {/* Defect Localization Image Viewer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Defect Localization & Visual Evidence
              </h4>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => setViewMode('annotated')}
                  className={`px-2.5 py-1 rounded font-medium ${
                    viewMode === 'annotated'
                      ? 'bg-white shadow text-sky-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Annotated Seam View
                </button>
                <button
                  onClick={() => setViewMode('original')}
                  className={`px-2.5 py-1 rounded font-medium ${
                    viewMode === 'original'
                      ? 'bg-white shadow text-sky-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Raw Specimen
                </button>
              </div>
            </div>

            <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 p-2 flex items-center justify-center min-h-[320px] max-h-[460px]">
              <img
                src={
                  viewMode === 'annotated' && result.annotated_image_url
                    ? result.annotated_image_url
                    : result.original_image_url
                }
                alt="Inspection Output"
                className="max-h-[440px] w-auto object-contain rounded"
              />
            </div>

            {/* Bounding Box Information */}
            {result.defect_boxes && result.defect_boxes.length > 0 && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <p className="font-bold text-slate-700 mb-1.5">
                  Detected Defect Coordinates ({result.defect_boxes.length} bounding zones):
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.defect_boxes.map((b, idx) => (
                    <div
                      key={idx}
                      className="px-2 py-1 rounded bg-white border border-slate-300 font-mono text-[11px] text-slate-700"
                    >
                      Zone {idx + 1}: x={b.x}, y={b.y}, w={b.w}, h={b.h} (Conf: {(b.confidence * 100).toFixed(0)}%)
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Defensible Severity Methodology Callout */}
          {result.severity_method && (
            <div className="p-4 rounded-lg bg-sky-50 border border-sky-200 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-sky-900 font-bold">
                <Info className="w-4 h-4 text-sky-600" />
                <span>Defensible Severity Assessment Rationale (ISO 5817 Level B Standard)</span>
              </div>
              <p className="text-sky-800 leading-relaxed pl-5">{result.severity_method}</p>
            </div>
          )}

          {/* Advisory Recommendations Section */}
          {result.recommendations && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Engineering Advisory Recommendations
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h5 className="font-bold text-slate-800 mb-2">Possible Contributing Factors</h5>
                  <ul className="space-y-1.5 list-disc list-inside text-slate-600">
                    {result.recommendations.contributing_factors.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h5 className="font-bold text-slate-800 mb-2">Suggested Verifications</h5>
                  <ul className="space-y-1.5 list-disc list-inside text-slate-600">
                    {result.recommendations.suggested_verifications.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h5 className="font-bold text-slate-800 mb-2">Recommended Corrective Actions</h5>
                  <ul className="space-y-1.5 list-disc list-inside text-slate-600">
                    {result.recommendations.corrective_actions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                <b>Advisory Note:</b> {result.recommendations.disclaimer}
              </p>
            </div>
          )}

          {/* Human Review Sign-Off Box */}
          <div className="p-4 rounded-xl border border-slate-300 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Quality Inspector Disposition & Sign-off
              </h4>
              {reviewSavedSuccess && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Disposition updated successfully</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Human Decision</label>
                <select
                  value={reviewStatus}
                  onChange={(e: any) => setReviewStatus(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="Approved">Approved (Release to next operation)</option>
                  <option value="Flagged">Flagged (Requires senior NDT check)</option>
                  <option value="Rejected">Rejected (Scrap or rework)</option>
                  <option value="Pending">Pending Evaluation</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Engineering Notes</label>
                <input
                  type="text"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Record verification method, root cause comment, or repair log..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleSaveReview}
                  disabled={isSavingReview}
                  className="w-full py-2 px-3 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSavingReview ? 'Saving...' : 'Update Disposition'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
