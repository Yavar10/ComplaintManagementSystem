import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { LoadingSpinner, StatCard } from '../components/ui/Modal.jsx';
import {
  BarChart3,
  FileSpreadsheet,
  TrendingUp,
  Clock,
  ShieldCheck,
  Building2,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e'];

export function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [slaData, setSlaData] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [deptData, setDeptData] = useState([]);
  const [instTrends, setInstTrends] = useState([]);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        const [slaRes, catRes, deptRes, instRes] = await Promise.all([
          api.get('/analytics/sla-performance'),
          api.get('/analytics/complaints-by-category'),
          api.get('/analytics/complaints-by-department'),
          api.get('/analytics/institution-trends'),
        ]);

        setSlaData(slaRes.data);
        setCategoryData(catRes.data || []);
        setDeptData(deptRes.data || []);
        setInstTrends(instRes.data || []);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  const handleExportCsv = async () => {
    try {
      const blob = await api.get('/analytics/export');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `regulatory_complaint_intelligence_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export CSV report');
    }
  };

  if (loading) {
    return <LoadingSpinner text="Computing cross-institutional analytics..." />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <span>Institutional Grievance Intelligence & SLA Metrics</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated metrics computed from PostgreSQL database tables with zero mock assumptions
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-2 transition-all self-start"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Complete Dataset (CSV)</span>
        </button>
      </div>

      {/* SLA Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Avg Resolution Time"
          value={`${slaData?.avgResolutionHours || 0} Hours`}
          subtitle="From intake to formal closure"
          icon={Clock}
          color="indigo"
        />
        <StatCard
          title="SLA Compliance Rate"
          value={`${slaData?.slaCompliancePercent || 100}%`}
          subtitle="Cases resolved within target SLA"
          icon={ShieldCheck}
          color="emerald"
        />
        <StatCard
          title="Concluded Investigations"
          value={slaData?.totalResolvedCases || 0}
          subtitle="Validated remedial directives executed"
          icon={TrendingUp}
          color="blue"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Repeat Offender Institutions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Highest Grievance Frequency Institutions</h3>
            <p className="text-xs text-slate-500">Colleges with the highest volume of registered allegations</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={instTrends} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="code" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip
                  formatter={(value, name, item) => [`${value} Complaints`, item.payload.name]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="complaintCount" fill="#f43f5e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Distribution by Grievance Taxonomy</h3>
            <p className="text-xs text-slate-500">Relative volume across violation categories</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={3}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} Complaints`, name]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
