import axios from 'axios';
import type {
  Inspection,
  DashboardStats,
  AnalyticsData,
  ModelMetadata,
  QualityAlert,
} from '../types';

const client = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export const api = {
  getHealth: async () => {
    const res = await client.get('/health');
    return res.data;
  },

  getDashboard: async (): Promise<DashboardStats> => {
    const res = await client.get('/dashboard');
    return res.data;
  },

  analyzeImage: async (formData: FormData): Promise<Inspection> => {
    const res = await client.post('/inspections/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  analyzeVideo: async (formData: FormData): Promise<Inspection> => {
    const res = await client.post('/inspections/video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return res.data;
  },

  getInspections: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    defect_detected?: boolean;
    predicted_class?: string;
    severity?: string;
    review_status?: string;
    input_source?: string;
  }): Promise<{ total: number; page: number; page_size: number; items: Inspection[] }> => {
    const res = await client.get('/inspections', { params });
    return res.data;
  },

  getInspection: async (id: string): Promise<Inspection> => {
    const res = await client.get(`/inspections/${id}`);
    return res.data;
  },

  updateReview: async (
    id: string,
    review_status: 'Approved' | 'Flagged' | 'Rejected' | 'Pending',
    review_notes?: string
  ): Promise<Inspection> => {
    const res = await client.patch(`/inspections/${id}/review`, {
      review_status,
      review_notes,
    });
    return res.data;
  },

  deleteInspection: async (id: string): Promise<{ message: string }> => {
    const res = await client.delete(`/inspections/${id}`);
    return res.data;
  },

  seedDemoData: async (): Promise<{ message: string; seeded_ids: string[] }> => {
    const res = await client.post('/inspections/seed-demo');
    return res.data;
  },

  getAlerts: async (status?: string): Promise<QualityAlert[]> => {
    const res = await client.get('/alerts', { params: status ? { status } : {} });
    return res.data;
  },

  updateAlertStatus: async (alertId: string, status: 'Open' | 'Resolved'): Promise<QualityAlert> => {
    const res = await client.patch(`/alerts/${alertId}`, { status });
    return res.data;
  },

  getAnalytics: async (): Promise<AnalyticsData> => {
    const res = await client.get('/analytics');
    return res.data;
  },

  getModels: async (): Promise<ModelMetadata[]> => {
    const res = await client.get('/models');
    return res.data;
  },

  getPdfUrl: (inspectionId: string) => `/api/reports/${inspectionId}/pdf`,
  getCsvUrl: () => `/api/reports/export/csv`,
};
