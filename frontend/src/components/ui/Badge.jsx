import React from 'react';

const statusStyles = {
  SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-600/20',
  UNDER_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20',
  ASSIGNED: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-600/20',
  IN_PROGRESS: 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-600/20',
  AWAITING_INFORMATION: 'bg-orange-50 text-orange-700 border-orange-200 ring-orange-600/20',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20',
  CLOSED: 'bg-slate-100 text-slate-700 border-slate-300 ring-slate-600/20',
  REOPENED: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/20',
  REJECTED: 'bg-red-50 text-red-700 border-red-200 ring-red-600/20',
};

const priorityStyles = {
  CRITICAL: 'bg-red-50 text-red-700 border-red-300 ring-red-600/20 font-semibold',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200 ring-orange-600/20',
  MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-600/20',
  LOW: 'bg-slate-100 text-slate-600 border-slate-200 ring-slate-600/20',
};

export function StatusBadge({ status }) {
  const style = statusStyles[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  const label = status ? status.replace(/_/g, ' ') : 'UNKNOWN';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-xs ${style}`}>
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-70"></span>
      {label}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const style = priorityStyles[priority] || 'bg-gray-100 text-gray-700';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border shadow-2xs ${style}`}>
      {priority}
    </span>
  );
}
