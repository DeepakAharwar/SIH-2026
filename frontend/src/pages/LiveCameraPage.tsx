import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  CameraOff,
  Crosshair,
  Sparkles,
  AlertCircle,
  Download,
  Info
} from 'lucide-react';
import type { Inspection } from '../types';
import { api } from '../services/api';

interface LiveCameraPageProps {
  onInspectionCreated: (inspection: Inspection) => void;
}

export const LiveCameraPage: React.FC<LiveCameraPageProps> = ({ onInspectionCreated }) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);

  // Form metadata
  const [componentId, setComponentId] = useState('WEBCAM-SPECIMEN-001');
  const [operatorName, setOperatorName] = useState('Optical Inspector');

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<Inspection | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera tracks helper
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    setCapturedBlob(null);
    setCapturedUrl(null);
    setAnalysisResult(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Webcam API is not supported in this browser environment.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access permission was denied by the user.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No webcam video capture device was detected on this computer.');
      } else {
        setCameraError(`Unable to start camera: ${err.message || 'Unknown device error'}`);
      }
      setIsCameraActive(false);
    }
  };

  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          setCapturedUrl(URL.createObjectURL(blob));
          stopCamera(); // Auto-stop stream after capturing still image
        }
      },
      'image/jpeg',
      0.95
    );
  };

  const handleAnalyzeCaptured = async () => {
    if (!capturedBlob) return;
    setIsAnalyzing(true);
    setCameraError(null);

    const formData = new FormData();
    formData.append('file', capturedBlob, 'webcam_specimen.jpg');
    formData.append('component_id', componentId);
    formData.append('operator_name', operatorName);
    formData.append('input_source', 'webcam');
    formData.append('material', 'Mild Steel (Optical Scan)');
    formData.append('welding_process', 'Visual Weld Joint Audit');

    try {
      const data = await api.analyzeImage(formData);
      setAnalysisResult(data);
      onInspectionCreated(data);
    } catch (err: any) {
      setCameraError(err.response?.data?.detail || 'Inference on captured frame failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Mandatory Engineering Scope Notice */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3 shadow-sm">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-amber-950 mb-0.5">
            OPTICAL WEBCAM SCOPE & CAPTURE DEVICE NOTICE
          </h4>
          <p className="leading-relaxed">
            The laptop webcam is utilized solely as an optional optical capture device for macro surface weld inspection.
            It does <b>not</b> constitute a high-speed industrial laser sensor, pyrometer, or photodiode. Webcams capture
            surface light only and cannot reliably detect sub-surface porosity or penetration depth without destructive or
            radiographic testing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Camera Viewport */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Live Optical Viewport</h3>
            <div className="flex items-center gap-2">
              {!isCameraActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Start Camera</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white flex items-center gap-1.5 transition-colors"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Stop Camera</span>
                </button>
              )}

              {isCameraActive && (
                <button
                  type="button"
                  onClick={captureFrame}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Capture Still Frame</span>
                </button>
              )}
            </div>
          </div>

          {/* Viewport Screen */}
          <div className="relative bg-slate-950 rounded-xl overflow-hidden min-h-[380px] max-h-[440px] flex items-center justify-center border border-slate-800">
            {isCameraActive && (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />
                {/* Viewfinder crosshairs */}
                <div className="absolute inset-0 pointer-events-none border-2 border-sky-500/20 m-6 rounded-lg flex items-center justify-center">
                  <div className="w-16 h-0.5 bg-sky-400/40"></div>
                  <div className="h-16 w-0.5 bg-sky-400/40 absolute"></div>
                </div>
              </>
            )}

            {!isCameraActive && capturedUrl && (
              <img
                src={capturedUrl}
                alt="Captured Still Frame"
                className="w-full h-full object-contain"
              />
            )}

            {!isCameraActive && !capturedUrl && (
              <div className="text-center p-8">
                <Camera className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-60" />
                <p className="text-xs font-medium text-slate-400">Camera preview inactive</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Click 'Start Camera' above to initialize optical frame acquisition
                </p>
              </div>
            )}
          </div>

          {/* Camera Device Errors */}
          {cameraError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}
        </div>

        {/* Capture Metadata & Action Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Specimen Identifier
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Component Identifier
              </label>
              <input
                type="text"
                value={componentId}
                onChange={(e) => setComponentId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Inspector Name
              </label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleAnalyzeCaptured}
                disabled={!capturedBlob || isAnalyzing}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Analyzing Captured Frame...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze Captured Frame</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Result Summary if Available */}
          {analysisResult && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900">Inspection Summary</span>
                <span className="font-mono text-[10px] text-slate-500">{analysisResult.id}</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Defect Class:</span>
                  <span
                    className={`font-bold ${
                      analysisResult.defect_detected ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {analysisResult.predicted_class}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Confidence:</span>
                  <span className="font-bold text-slate-800">
                    {(analysisResult.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Severity:</span>
                  <span className="font-semibold text-slate-700">
                    {analysisResult.severity || 'None / Not established'}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={api.getPdfUrl(analysisResult.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-1.5 px-3 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg font-semibold flex items-center justify-center gap-1.5 border border-sky-300"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF Certificate</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
