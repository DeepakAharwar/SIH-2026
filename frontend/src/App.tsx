import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import type { NavTab } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { OverviewPage } from './pages/OverviewPage';
import { NewInspectionPage } from './pages/NewInspectionPage';
import { LiveCameraPage } from './pages/LiveCameraPage';
import { VideoInspectionPage } from './pages/VideoInspectionPage';
import { HistoryPage } from './pages/HistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DatasetModelsPage } from './pages/DatasetModelsPage';
import { SettingsPage } from './pages/SettingsPage';
import type { DashboardStats, Inspection } from './types';
import { api } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboard();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleResolveAlert = async (alertId: string) => {
    try {
      await api.updateAlertStatus(alertId, 'Resolved');
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to resolve alert', err);
    }
  };

  const handleLoadDemo = async () => {
    setIsSeeding(true);
    try {
      await api.seedDemoData();
      await fetchDashboardData();
    } catch (err) {
      alert('Failed to seed demo data. Please verify that the backend is running.');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleInspectionCreated = (_newInsp: Inspection) => {
    fetchDashboardData();
  };

  const handleSelectInspection = (_insp: Inspection) => {
    setActiveTab('history');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openAlertsCount={stats?.open_alerts_count || 0}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Navbar
          activeTab={activeTab}
          hasDemoData={stats?.has_demo_data || false}
          openAlertsCount={stats?.open_alerts_count || 0}
          onRefresh={fetchDashboardData}
          onLoadDemo={handleLoadDemo}
          isSeeding={isSeeding}
        />

        <main className="flex-1 overflow-y-auto bg-slate-100">
          {activeTab === 'overview' && (
            <OverviewPage
              stats={stats}
              loading={loading}
              onNavigate={setActiveTab}
              onSelectInspection={handleSelectInspection}
              onResolveAlert={handleResolveAlert}
              onLoadDemo={handleLoadDemo}
            />
          )}

          {activeTab === 'new_inspection' && (
            <NewInspectionPage
              onInspectionCreated={handleInspectionCreated}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'camera' && (
            <LiveCameraPage onInspectionCreated={handleInspectionCreated} />
          )}

          {activeTab === 'video' && (
            <VideoInspectionPage onInspectionCreated={handleInspectionCreated} />
          )}

          {activeTab === 'history' && <HistoryPage />}

          {activeTab === 'analytics' && <AnalyticsPage />}

          {activeTab === 'models' && <DatasetModelsPage />}

          {activeTab === 'settings' && (
            <SettingsPage onDataReset={fetchDashboardData} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
