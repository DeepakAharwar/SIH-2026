export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  confidence: number;
  area_ratio?: number;
}

export interface ProcessParameters {
  laser_power_w?: number;
  welding_speed_mmpm?: number;
  shielding_gas_flow_lpm?: number;
  focus_position_mm?: number;
  material_thickness_mm?: number;
  is_simulated?: boolean;
}

export interface AdvisoryRecommendation {
  defect_class: string;
  contributing_factors: string[];
  suggested_verifications: string[];
  corrective_actions: string[];
  disclaimer: string;
}

export interface VideoFrame {
  id: number;
  frame_number: number;
  timestamp_sec: number;
  file_path: string;
  annotated_path?: string;
  defect_detected: boolean;
  predicted_class: string;
  confidence: number;
  defect_boxes: BoundingBox[];
}

export interface QualityAlert {
  id: string;
  inspection_id?: string;
  category: string;
  severity: string;
  message: string;
  status: 'Open' | 'Resolved';
  created_at: string;
  resolved_at?: string;
}

export interface Inspection {
  id: string;
  created_at: string;
  component_id?: string;
  operator_name?: string;
  material?: string;
  welding_process?: string;
  input_source: 'upload' | 'webcam' | 'video' | 'demo';
  original_image_url: string;
  annotated_image_url?: string;
  defect_detected: boolean;
  predicted_class: string;
  confidence: number;
  defect_boxes: BoundingBox[];
  severity?: 'Low' | 'Medium' | 'High' | 'Severity not established';
  severity_method?: string;
  review_status: 'Pending' | 'Approved' | 'Flagged' | 'Rejected';
  review_notes?: string;
  process_params?: ProcessParameters;
  is_demo: boolean;
  model_name: string;
  model_version: string;
  recommendations?: AdvisoryRecommendation;
  frames?: VideoFrame[];
  alerts?: QualityAlert[];
}

export interface DashboardStats {
  total_inspections: number;
  inspections_completed: number;
  defects_detected: number;
  flagged_for_review: number;
  pass_rate_percentage: number;
  has_demo_data: boolean;
  recent_inspections: Inspection[];
  defect_distribution: { class_name: string; count: number }[];
  inspection_trends: { date: string; total: number; defects: number; clean: number }[];
  open_alerts_count: number;
  active_model: {
    name: string;
    type: string;
    version: string;
    status: string;
    modality: string;
  };
}

export interface AnalyticsData {
  defect_class_counts: Record<string, number>;
  review_status_counts: Record<string, number>;
  source_distribution: Record<string, number>;
  daily_volume: { date: string; inspections: number }[];
  process_param_correlations: {
    id: string;
    component_id?: string;
    laser_power_w?: number;
    welding_speed_mmpm?: number;
    shielding_gas_flow_lpm?: number;
    defect_detected: boolean;
    predicted_class: string;
    is_simulated: boolean;
  }[];
  correlation_disclaimer: string;
  total_records: number;
}

export interface ModelMetadata {
  id: string;
  name: string;
  version: string;
  model_type: string;
  weights_status: string;
  supported_classes: string[];
  description: string;
  limitations: string;
  is_active: boolean;
}
