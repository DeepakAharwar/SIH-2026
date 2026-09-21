import React, { useState, useRef } from 'react';
import {
  Video,
  Sparkles,
  AlertCircle,
  Download,
  Info,
  Layers
} from 'lucide-react';
import type { Inspection, VideoFrame } from '../types';
import { api } from '../services/api';

interface VideoInspectionPageProps {
  onInspectionCreated: (inspection: Inspection) => void;
}

export const VideoInspectionPage: React.FC<VideoInspectionPageProps> = ({
  onInspectionCreated,
}) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [frameInterval, setFrameInterval] = useState<number>(1.0);
  const [maxFrames, setMaxFrames] = useState<number>(20);

  const [componentId, setComponentId] = useState('WELD-SEAM-VIDEO-01');
  const [operatorName, setOperatorName] = useState('Video Quality Tech');

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inspectionResult, setInspectionResult] = useState<Inspection | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<VideoFrame | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      setVideoPreviewUrl(URL.createObjectURL(file));
      setErrorMessage(null);
      setInspectionResult(null);
      setSelectedFrame(null);
    }
  };

  const handleProcessVideo = async () => {
    if (!videoFile) {
      setErrorMessage('Please select an MP4 or WebM video file to process.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSelectedFrame(null);

    const formData = new FormData();
    formData.append('file', videoFile);
    formData.append('frame_interval_sec', frameInterval.toString());
    formData.append('max_frames', maxFrames.toString());
    formData.append('component_id', componentId);
    formData.append('operator_name', operatorName);

    try {
      const data = await api.analyzeVideo(formData);
      setInspectionResult(data);
      if (data.frames && data.frames.length > 0) {
        setSelectedFrame(data.frames[0]);
      }
      onInspectionCreated(data);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Video processing failed. Verify video codec and frame count.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Scope Disclaimer */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-3 shadow-sm">
        <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-slate-900 mb-0.5">
            VIDEO FRAME SAMPLING & EXTRACTION ARCHITECTURE
          </h4>
          <p className="leading-relaxed text-slate-600">
            OpenCV backend extracts discrete keyframes at user-configured sampling intervals. Analyzing sampled frames
            demonstrates automated offline inspection capability; it does not claim to guarantee detection of sub-millisecond
            transient anomalies occurring between sampled intervals.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload & Video Configuration Panel */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900">1. Video Input & Sampling</h3>

          {/* Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-sky-500 bg-slate-50 hover:bg-sky-50/20 rounded-xl p-6 text-center cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.webm,.avi,.mov"
              onChange={handleVideoChange}
              className="hidden"
            />
            <Video className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">
              {videoFile ? videoFile.name : 'Click to select weld video file'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">MP4, WebM, AVI (up to 100MB)</p>
          </div>

          {/* Video Preview Player */}
          {videoPreviewUrl && (
            <div className="bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
              <video
                src={videoPreviewUrl}
                controls
                className="w-full max-h-[220px] object-contain"
              />
            </div>
          )}

          {/* Frame Extraction Settings */}
          <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Sampling Interval:</span>
                <span className="font-mono text-sky-600 font-bold">{frameInterval} sec / frame</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.5"
                value={frameInterval}
                onChange={(e) => setFrameInterval(parseFloat(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Sampled Frames Cap
              </label>
              <select
                value={maxFrames}
                onChange={(e) => setMaxFrames(parseInt(e.target.value))}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500"
              >
                <option value={10}>10 Frames (Fastest)</option>
                <option value={20}>20 Frames (Recommended)</option>
                <option value={35}>35 Frames (Dense sampling)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Component ID</label>
                <input
                  type="text"
                  value={componentId}
                  onChange={(e) => setComponentId(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Inspector</label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleProcessVideo}
              disabled={!videoFile || isProcessing}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
            >
              {isProcessing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Extracting & Inspecting Video Frames...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Extract & Inspect Video Frames</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Frame-by-frame Results Grid */}
        <div className="lg:col-span-7 space-y-4">
          {inspectionResult ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Video Seam Analysis Summary ({inspectionResult.id})
                  </h4>
                  <p className="text-xs text-slate-500">
                    Primary defect identified:{' '}
                    <span
                      className={`font-bold ${
                        inspectionResult.defect_detected ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {inspectionResult.predicted_class}
                    </span>
                  </p>
                </div>

                <a
                  href={api.getPdfUrl(inspectionResult.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-300 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Report</span>
                </a>
              </div>

              {/* Selected Frame Detail Box */}
              {selectedFrame && (
                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      Frame #{selectedFrame.frame_number} @ {selectedFrame.timestamp_sec}s
                    </span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        selectedFrame.defect_detected
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {selectedFrame.predicted_class} ({(selectedFrame.confidence * 100).toFixed(0)}%)
                    </span>
                  </div>

                  <div className="bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center max-h-[280px]">
                    <img
                      src={selectedFrame.annotated_path || selectedFrame.file_path}
                      alt={`Frame ${selectedFrame.frame_number}`}
                      className="max-h-[260px] w-auto object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Filmstrip of sampled frames */}
              <div>
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Sampled Frame Sequence ({inspectionResult.frames?.length || 0} frames analyzed):
                </h5>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {inspectionResult.frames?.map((frame) => {
                    const isSelected = selectedFrame?.id === frame.id;
                    return (
                      <button
                        key={frame.id}
                        onClick={() => setSelectedFrame(frame)}
                        className={`flex-shrink-0 w-28 rounded-lg overflow-hidden border text-left transition-all ${
                          isSelected
                            ? 'border-sky-500 ring-2 ring-sky-500/20'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="h-16 bg-slate-900 flex items-center justify-center overflow-hidden">
                          <img
                            src={frame.annotated_path || frame.file_path}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-1.5 bg-white text-[10px] space-y-0.5">
                          <div className="flex justify-between font-mono text-slate-500">
                            <span>#{frame.frame_number}</span>
                            <span>{frame.timestamp_sec}s</span>
                          </div>
                          <p
                            className={`font-semibold truncate ${
                              frame.defect_detected ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {frame.predicted_class}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm h-full flex flex-col items-center justify-center">
              <Layers className="w-12 h-12 text-slate-400 mb-3 opacity-60" />
              <h4 className="text-sm font-bold text-slate-800">No Video Inspected Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Upload a video file on the left and click 'Extract & Inspect Video Frames' to run offline seam analysis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
