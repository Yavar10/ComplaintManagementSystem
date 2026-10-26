import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { StatCard, LoadingSpinner } from '../components/ui/Modal.jsx';
import { StatusBadge, PriorityBadge } from '../components/ui/Badge.jsx';
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CopyCheck,
  TrendingUp,
  Building2,
  ArrowRight,
  ShieldAlert,
  Download,
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

const STATUS_COLORS = {
  SUBMITTED: '#3b82f6',
  UNDER_REVIEW: '#f59e0b',
  ASSIGNED: '#6366f1',
  IN_PROGRESS: '#8b5cf6',
  AWAITING_INFORMATION: '#f97316',
  RESOLVED: '#10b981',
  CLOSED: '#64748b',
  REOPENED: '#f43f5e',
  REJECTED: '#ef4444',
};

const CHART_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [statusData, setStatusData] = useState([]);
  const [deptData, setDeptData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [criticalComplaints, setCriticalComplaints] = useState([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [ovRes, stRes, dpRes, ctRes, compRes] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/analytics/complaints-by-status'),
          api.get('/analytics/complaints-by-department'),
          api.get('/analytics/complaints-by-category'),
          api.get('/complaints?limit=5&priority=CRITICAL'),
        ]);

        setOverview(ovRes.data);
        setStatusData(stRes.data || []);
        setDeptData(dpRes.data || []);
        setCategoryData(ctRes.data || []);
        setCriticalComplaints(compRes.data || []);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Compiling executive intelligence..." />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome & Context Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900">
              Welcome, {user?.fullName}
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Department Scope:{' '}
            <span className="font-semibold text-slate-700">
              {user?.departmentName || 'National Operations (All Jurisdictions)'}
            </span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/complaints/new')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center space-x-2 transition-all"
          >
            <span>+ Register Complaint</span>
          </button>
          <button
            onClick={() => navigate('/duplicate-review')}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-2 transition-all"
          >
            <CopyCheck className="w-4 h-4 text-amber-500" />
            <span>Duplicate Center</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatCard
          title="Total Cases"
          value={overview?.totalComplaints}
          icon={FileText}
          color="indigo"
          onClick={() => navigate('/complaints')}
        />
        <StatCard
          title="Open Intake"
          value={overview?.openComplaints}
          icon={Clock}
          color="blue"
          onClick={() => navigate('/complaints?status=SUBMITTED')}
        />
        <StatCard
          title="In Progress"
          value={overview?.inProgressComplaints}
          icon={TrendingUp}
          color="purple"
          onClick={() => navigate('/complaints?status=IN_PROGRESS')}
        />
        <StatCard
          title="Overdue"
          value={overview?.overdueComplaints}
          icon={AlertTriangle}
          color="red"
          onClick={() => navigate('/complaints?isOverdue=true')}
        />
        <StatCard
          title="Resolved"
          value={overview?.resolvedComplaints}
          icon={CheckCircle2}
          color="emerald"
          onClick={() => navigate('/complaints?status=RESOLVED')}
        />
        <StatCard
          title="Pending Dups"
          value={overview?.pendingDuplicates}
          icon={CopyCheck}
          color="amber"
          onClick={() => navigate('/duplicate-review')}
        />
        <StatCard
          title="SLA Compliance"
          value={`${overview?.complianceRate || 100}%`}
          icon={ShieldAlert}
          color="emerald"
          subtitle="Target: ≥ 90%"
        />
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Workload Bar Chart */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Departmental Caseload Distribution</h3>
              <p className="text-xs text-slate-500">Active assigned grievances across regulatory divisions</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis dataKey="code" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value, name, item) => [`${value} Cases`, item.payload.name]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Complaint Lifecycle Breakdown</h3>
            <p className="text-xs text-slate-500">Current status proportion</p>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} Complaints`, name.replace(/_/g, ' ')]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Critical & Urgent Cases Table */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold text-slate-900">Priority & Critical Attention Queue</h3>
          </div>
          <button
            onClick={() => navigate('/complaints')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
          >
            <span>View All Registry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 font-semibold bg-slate-50/50">
                <th className="py-2.5 px-3">Reference</th>
                <th className="py-2.5 px-3">Title & Summary</th>
                <th className="py-2.5 px-3">Institution</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {criticalComplaints.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No critical complaints currently active.
                  </td>
                </tr>
              ) : (
                criticalComplaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-indigo-600">{c.complaintNumber}</td>
                    <td className="py-3 px-3 max-w-xs truncate font-medium text-slate-800">{c.title}</td>
                    <td className="py-3 px-3 text-slate-600 truncate">{c.institution?.institutionName}</td>
                    <td className="py-3 px-3"><PriorityBadge priority={c.priority} /></td>
                    <td className="py-3 px-3"><StatusBadge status={c.status} /></td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => navigate(`/complaints/${c.id}`)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded font-medium transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
