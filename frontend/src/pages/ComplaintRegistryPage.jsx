import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { StatusBadge, PriorityBadge } from '../components/ui/Badge.jsx';
import { LoadingSpinner } from '../components/ui/Modal.jsx';
import {
  Search,
  Filter,
  Plus,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';

export function ComplaintRegistryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [complaints, setComplaints] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [priority, setPriority] = useState(searchParams.get('priority') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') || '');
  const [departmentId, setDepartmentId] = useState(searchParams.get('departmentId') || '');
  const [isOverdue, setIsOverdue] = useState(searchParams.get('isOverdue') === 'true');
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Load filter lookup options once
  useEffect(() => {
    async function loadLookups() {
      try {
        const [catRes, deptRes] = await Promise.all([
          api.get('/categories'),
          api.get('/departments'),
        ]);
        setCategories(catRes.data || []);
        setDepartments(deptRes.data || []);
      } catch (err) {
        console.error('Failed to load filter lookups:', err);
      }
    }
    loadLookups();
  }, []);

  // Fetch complaints on filter change
  useEffect(() => {
    async function fetchComplaints() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', '15');
        if (search) params.set('search', search);
        if (status) params.set('status', status);
        if (priority) params.set('priority', priority);
        if (categoryId) params.set('categoryId', categoryId);
        if (departmentId) params.set('departmentId', departmentId);
        if (isOverdue) params.set('isOverdue', 'true');

        const res = await api.get(`/complaints?${params.toString()}`);
        setComplaints(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } catch (err) {
        console.error('Failed to fetch complaints:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchComplaints();
  }, [search, status, priority, categoryId, departmentId, isOverdue, page]);

  const handlePageChange = (newPage) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', newPage.toString());
    setSearchParams(next);
  };

  const handleExportCsv = async () => {
    try {
      const blob = await api.get('/analytics/export');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `complaints_registry_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('CSV export failed');
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">National Complaint Registry</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete database of technical education grievances and investigation files
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs flex items-center space-x-1.5 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => navigate('/complaints/new')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register Complaint</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference number, keywords, college name..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="py-1.5 px-3 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="AWAITING_INFORMATION">Awaiting Info</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
            <option value="REOPENED">Reopened</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="py-1.5 px-3 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Secondary Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter */}
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="py-1 px-2.5 text-xs border border-slate-200 rounded-md bg-slate-50 text-slate-700"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Department Filter */}
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="py-1 px-2.5 text-xs border border-slate-200 rounded-md bg-slate-50 text-slate-700"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* Overdue Checkbox */}
            <label className="flex items-center space-x-1.5 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isOverdue}
                onChange={(e) => setIsOverdue(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500"
              />
              <span className="text-red-700 font-semibold flex items-center">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                Overdue Cases Only
              </span>
            </label>
          </div>

          {(search || status || priority || categoryId || departmentId || isOverdue) && (
            <button
              onClick={() => {
                setSearch('');
                setStatus('');
                setPriority('');
                setCategoryId('');
                setDepartmentId('');
                setIsOverdue(false);
              }}
              className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Loading registry records..." />
        ) : complaints.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Filter className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-700">No complaints match your filters</p>
            <p className="text-xs text-slate-400 mt-1">Try broadening your search query or reset filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-semibold bg-slate-50/70">
                  <th className="py-3 px-4">Complaint #</th>
                  <th className="py-3 px-4">Title & Grievance</th>
                  <th className="py-3 px-4">Institution</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Dept / Officer</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map((c) => {
                  const isPastDue = c.dueAt && new Date(c.dueAt) < new Date() && !['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/complaints/${c.id}`)}
                      className="hover:bg-slate-50/90 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                        {c.complaintNumber}
                      </td>
                      <td className="py-3.5 px-4 max-w-sm">
                        <p className="font-semibold text-slate-900 truncate">{c.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">{c.category?.name}</p>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-700">
                        <span className="font-medium text-slate-800">{c.institution?.institutionName}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">{c.institution?.institutionCode} ({c.institution?.state})</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <PriorityBadge priority={c.priority} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        <span className="block font-medium text-slate-800">{c.assignedDepartment?.name || 'Unassigned'}</span>
                        <span className="text-[10px] text-slate-400">{c.assignedOfficer?.fullName || 'No Officer'}</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {c.dueAt ? (
                          <span className={`inline-flex items-center ${isPastDue ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                            {isPastDue && <AlertTriangle className="w-3 h-3 mr-1 text-red-600" />}
                            {new Date(c.dueAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/complaints/${c.id}`);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Open Case File"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-900">{complaints.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}</span> to{' '}
            <span className="font-semibold text-slate-900">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
            <span className="font-semibold text-slate-900">{pagination.total}</span> complaints
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-800">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
