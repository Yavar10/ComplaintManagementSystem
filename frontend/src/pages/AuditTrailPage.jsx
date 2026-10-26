import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { LoadingSpinner } from '../components/ui/Modal.jsx';
import { History, Search, ShieldCheck, ChevronDown, ChevronRight } from 'lucide-react';

export function AuditTrailPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true);
        const query = actionFilter ? `?action=${actionFilter}` : '';
        const res = await api.get(`/audit-logs${query}`);
        setLogs(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [actionFilter]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <History className="w-5 h-5 text-indigo-600" />
            <span>Immutable Regulatory Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Complete cryptographic audit trail of all custody changes, status transitions, and administrative operations
          </p>
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="py-1.5 px-3 text-xs border border-slate-300 rounded-lg bg-white text-slate-700"
        >
          <option value="">All Audit Events</option>
          <option value="COMPLAINT_CREATED">Complaint Created</option>
          <option value="STATUS_TRANSITION">Status Transition</option>
          <option value="COMPLAINT_ASSIGNED">Complaint Assigned</option>
          <option value="COMPLAINT_TRANSFERRED">Complaint Transferred</option>
          <option value="COMPLAINT_RESOLVED">Complaint Resolved</option>
          <option value="COMPLAINT_CLOSED">Complaint Closed</option>
          <option value="USER_LOGIN">User Login</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner text="Retrieving verified audit logs..." />
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400 text-xs">
          No audit logs recorded for this filter.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-semibold bg-slate-50/70">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-700">
                          {log.action}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {log.entityType} ({log.entityId?.slice(0, 8)}...)
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-sans">
                          {log.actor?.fullName || 'SYSTEM AUTOMATION'}
                          {log.actor?.role?.name && (
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {log.actor.role.name}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-600 max-w-xs truncate">
                          {log.reason || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="p-1 text-slate-500 hover:text-indigo-600 rounded"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-900 text-slate-200">
                          <td colSpan={6} className="p-4 text-[10px] space-y-2 font-mono">
                            <div>
                              <p className="text-slate-400 font-bold uppercase">Event Payload Inspection:</p>
                              <pre className="mt-1 bg-slate-950 p-3 rounded-lg overflow-x-auto text-emerald-400">
                                {JSON.stringify(
                                  {
                                    id: log.id,
                                    action: log.action,
                                    previousValues: log.previousValues,
                                    newValues: log.newValues,
                                    ipAddress: log.ipAddress,
                                    actor: log.actor?.email,
                                  },
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
