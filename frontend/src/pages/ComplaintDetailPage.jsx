import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { StatusBadge, PriorityBadge } from '../components/ui/Badge.jsx';
import { Modal, LoadingSpinner } from '../components/ui/Modal.jsx';
import {
  FileText,
  Building2,
  Calendar,
  Clock,
  User,
  Users,
  Send,
  Upload,
  AlertTriangle,
  CheckCircle2,
  ArrowRightLeft,
  Share2,
  Lock,
  RotateCcw,
  History,
  FileCheck,
  ShieldCheck,
  Download,
  CopyCheck,
} from 'lucide-react';

export function ComplaintDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasRole, isAuditor } = useAuth();

  const [complaint, setComplaint] = useState(null);
  const [history, setHistory] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [departmentOfficers, setDepartmentOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notes'); // 'notes', 'evidence', 'duplicates', 'timeline'

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isCollaborateModalOpen, setIsCollaborateModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);

  // Form states
  const [newComment, setNewComment] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [assignDeptId, setAssignDeptId] = useState('');
  const [assignOfficerId, setAssignOfficerId] = useState('');
  const [assignReason, setAssignReason] = useState('');
  const [transferDeptId, setTransferDeptId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [collabDeptId, setCollabDeptId] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [closureReason, setClosureReason] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [actionError, setActionError] = useState('');

  const fetchComplaintDetails = async () => {
    try {
      setLoading(true);
      const [compRes, histRes, deptRes] = await Promise.all([
        api.get(`/complaints/${id}`),
        api.get(`/complaints/${id}/history`),
        api.get('/departments'),
      ]);
      setComplaint(compRes.data);
      setHistory(histRes.data);
      setDepartments(deptRes.data || []);
      if (compRes.data?.assignedDepartmentId) {
        setAssignDeptId(compRes.data.assignedDepartmentId);
        loadOfficersForDepartment(compRes.data.assignedDepartmentId);
      }
    } catch (err) {
      console.error('Failed to load complaint:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOfficersForDepartment = async (deptId) => {
    try {
      const res = await api.get(`/users?departmentId=${deptId}`);
      setDepartmentOfficers(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchComplaintDetails();
  }, [id]);

  // 1. Post Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await api.post(`/complaints/${id}/comments`, { content: newComment });
      setNewComment('');
      fetchComplaintDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  // 2. Upload Attachment
  const handleUploadAttachment = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      await api.post(`/complaints/${id}/attachments`, formData);
      setSelectedFile(null);
      fetchComplaintDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  // 3. Quick Status Transition
  const handleTransition = async (targetStatus) => {
    try {
      await api.post(`/complaints/${id}/transition`, { targetStatus });
      fetchComplaintDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  // 4. Assign Officer / Dept
  const handleAssign = async (e) => {
    e.preventDefault();
    setActionError('');
    try {
      await api.post(`/complaints/${id}/assign`, {
        departmentId: assignDeptId,
        officerId: assignOfficerId || null,
        reason: assignReason,
      });
      setIsAssignModalOpen(false);
      fetchComplaintDetails();
    } catch (err) {
      setActionError(err.message);
    }
  };

  // 5. Transfer Department
  const handleTransfer = async (e) => {
    e.preventDefault();
    setActionError('');
    try {
      await api.post(`/complaints/${id}/transfer`, {
        targetDepartmentId: transferDeptId,
        reason: transferReason,
      });
      setIsTransferModalOpen(false);
      fetchComplaintDetails();
    } catch (err) {
      setActionError(err.message);
    }
  };

  // 6. Add Collaborator
  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    setActionError('');
    try {
      await api.post(`/complaints/${id}/collaborators`, {
        departmentId: collabDeptId,
        relationshipType: 'COLLABORATING',
      });
      setIsCollaborateModalOpen(false);
      fetchComplaintDetails();
    } catch (err) {
      setActionError(err.message);
    }
  };

  // 7. Resolve
  const handleResolve = async (e) => {
    e.preventDefault();
    setActionError('');
    try {
      await api.post(`/complaints/${id}/resolve`, { resolutionSummary });
      setIsResolveModalOpen(false);
      fetchComplaintDetails();
    } catch (err) {
      setActionError(err.message);
    }
  };

  // 8. Close
  const handleClose = async (e) => {
    e.preventDefault();
    setActionError('');
    try {
      await api.post(`/complaints/${id}/close`, { closureReason });
      setIsCloseModalOpen(false);
      fetchComplaintDetails();
    } catch (err) {
      setActionError(err.message);
    }
  };

  // 9. Reopen
  const handleReopen = async (e) => {
    e.preventDefault();
    setActionError('');
    try {
      await api.post(`/complaints/${id}/reopen`, { reopenReason });
      setIsReopenModalOpen(false);
      fetchComplaintDetails();
    } catch (err) {
      setActionError(err.message);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Retrieving case records and audit trail..." />;
  }

  if (!complaint) {
    return (
      <div className="py-16 text-center text-slate-500">
        <p className="font-semibold text-lg">Case record not found or access restricted.</p>
      </div>
    );
  }

  const isTerminal = ['CLOSED', 'REJECTED'].includes(complaint.status);
  const isPastDue = complaint.dueAt && new Date(complaint.dueAt) < new Date() && !['RESOLVED', 'CLOSED', 'REJECTED'].includes(complaint.status);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Registration Success Banner */}
      {location.state?.newRegistered && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Grievance Registered Successfully</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Official reference <span className="font-mono font-bold">{location.state.complaintNumber}</span> has been created with automated departmental routing and audit timestamping.
              </p>
            </div>
          </div>
          {location.state.hasDuplicateMatch && (
            <span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-800 font-semibold text-[11px] border border-amber-200">
              Potential Duplicate Flagged ({Math.round((location.state.matchScore || 0) * 100)}% match)
            </span>
          )}
        </div>
      )}

      {/* Top Banner / Case Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center space-x-3 mb-1.5">
              <span className="font-mono text-base font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                {complaint.complaintNumber}
              </span>
              <StatusBadge status={complaint.status} />
              <PriorityBadge priority={complaint.priority} />
              {isPastDue && (
                <span className="inline-flex items-center text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full animate-pulse">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  SLA OVERDUE
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-2">{complaint.title}</h1>
            <p className="text-xs text-slate-500 mt-1 flex items-center space-x-2">
              <span className="font-semibold text-slate-700">{complaint.category?.name}</span>
              <span>•</span>
              <span>Submitted {new Date(complaint.submittedAt).toLocaleDateString()}</span>
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          {!isAuditor && !isTerminal && (
            <div className="flex flex-wrap items-center gap-2">
              {complaint.status === 'SUBMITTED' && (
                <button
                  onClick={() => handleTransition('UNDER_REVIEW')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  Accept Intake
                </button>
              )}

              {(hasRole('SYSTEM_ADMIN', 'ADMINISTRATOR', 'DEPARTMENT_HEAD')) && (
                <button
                  onClick={() => setIsAssignModalOpen(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Assign / Reassign</span>
                </button>
              )}

              {complaint.status === 'ASSIGNED' && (
                <button
                  onClick={() => handleTransition('IN_PROGRESS')}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  Start Investigation
                </button>
              )}

              {(hasRole('SYSTEM_ADMIN', 'ADMINISTRATOR')) && (
                <button
                  onClick={() => setIsTransferModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Transfer</span>
                </button>
              )}

              <button
                onClick={() => setIsCollaborateModalOpen(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Collaborate</span>
              </button>

              {(complaint.status === 'IN_PROGRESS' || complaint.status === 'AWAITING_INFORMATION') && (
                <button
                  onClick={() => setIsResolveModalOpen(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Propose Resolution</span>
                </button>
              )}

              {complaint.status === 'RESOLVED' && hasRole('SYSTEM_ADMIN', 'ADMINISTRATOR') && (
                <button
                  onClick={() => setIsCloseModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  Execute Formal Closure
                </button>
              )}
            </div>
          )}

          {/* Reopen Action for Resolved/Closed */}
          {!isAuditor && (complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') && hasRole('SYSTEM_ADMIN', 'ADMINISTRATOR') && (
            <button
              onClick={() => setIsReopenModalOpen(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reopen Case</span>
            </button>
          )}
        </div>

        {/* Quick Context Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Institution Under Scrutiny</span>
            <span className="font-semibold text-slate-900 block mt-0.5">{complaint.institution?.institutionName}</span>
            <span className="text-[10px] text-slate-500 font-mono">{complaint.institution?.institutionCode} ({complaint.institution?.state})</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Primary Regulatory Custody</span>
            <span className="font-semibold text-slate-900 block mt-0.5">{complaint.assignedDepartment?.name || 'Unassigned Intake'}</span>
            <span className="text-[10px] text-slate-500">{complaint.assignedOfficer?.fullName || 'Pending Officer Assignment'}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">SLA Resolution Target</span>
            <span className={`font-semibold block mt-0.5 ${isPastDue ? 'text-red-600 font-bold' : 'text-slate-900'}`}>
              {complaint.dueAt ? new Date(complaint.dueAt).toLocaleDateString() : 'Unscheduled'}
            </span>
            <span className="text-[10px] text-slate-500">
              {complaint.dueAt ? `${new Date(complaint.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Collaboration Coordinates</span>
            <span className="font-semibold text-slate-900 block mt-0.5">
              {complaint.departments?.length > 0
                ? `${complaint.departments.length} Collaborating Division(s)`
                : 'Sole Departmental Jurisdiction'}
            </span>
          </div>
        </div>
      </div>

      {/* Case Resolution Findings Highlight (if resolved or closed) */}
      {complaint.resolutionSummary && (
        <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200">
          <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Formal Regulatory Resolution Findings</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-mono mt-1">
            {complaint.resolutionSummary}
          </p>
          {complaint.resolvedAt && (
            <p className="text-[10px] text-emerald-700 mt-2 font-medium">
              Concluded on {new Date(complaint.resolvedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Tabbed Investigation Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50">
          {[
            { id: 'notes', label: `Investigation Notes (${complaint.comments?.length || 0})`, icon: FileText },
            { id: 'evidence', label: `Evidence Files (${complaint.attachments?.length || 0})`, icon: Upload },
            { id: 'duplicates', label: `Related Cases (${complaint.sourceRelationships?.length || 0})`, icon: CopyCheck },
            { id: 'timeline', label: 'Audit Trail & Assignments', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3.5 px-4 font-semibold text-xs border-b-2 flex items-center space-x-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* TAB 1: Notes & Statement */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              {/* Detailed Statement */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <h4 className="font-bold text-slate-900 mb-1.5 uppercase tracking-wider text-[11px]">Original Grievance Statement:</h4>
                <p className="text-slate-700 font-mono leading-relaxed whitespace-pre-wrap">{complaint.description}</p>
              </div>

              {/* Comments Thread */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Investigation Dialogue & Officer Notes</h4>
                <div className="space-y-3">
                  {complaint.comments?.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 italic">No notes recorded yet.</p>
                  ) : (
                    complaint.comments.map((comment) => (
                      <div key={comment.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-slate-900">{comment.author?.fullName} ({comment.author?.role?.name?.replace('_', ' ')})</span>
                          <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">{comment.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Note Form */}
                {!isAuditor && !isTerminal && (
                  <form onSubmit={handleAddComment} className="mt-4 flex gap-2">
                    <input
                      type="text"
                      required
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add an internal note or record inspection findings..."
                      className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Post Note</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Evidence Files */}
          {activeTab === 'evidence' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {complaint.attachments?.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 italic col-span-2 text-center">No documentary evidence uploaded yet.</p>
                ) : (
                  complaint.attachments.map((att) => (
                    <div key={att.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
                      <div className="truncate mr-3">
                        <p className="font-semibold text-slate-800 truncate">{att.originalFilename}</p>
                        <p className="text-[10px] text-slate-400">
                          {Math.round(att.fileSize / 1024)} KB • Uploaded by {att.uploadedBy?.fullName} on {new Date(att.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <a
                        href={`http://localhost:5000/api/v1/attachments/${att.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center space-x-1 shrink-0 font-medium"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </a>
                    </div>
                  ))
                )}
              </div>

              {!isAuditor && !isTerminal && (
                <form onSubmit={handleUploadAttachment} className="border-t border-slate-100 pt-4 flex items-center gap-3">
                  <input
                    type="file"
                    required
                    onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                    className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  <button
                    type="submit"
                    disabled={!selectedFile}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Attachment</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: Candidate Duplicates & Related Cases */}
          {activeTab === 'duplicates' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500">
                  Heuristic algorithm signals potential duplicates based on institution, title bigrams, and TF-IDF terms. Human review is mandatory.
                </p>
                <button
                  onClick={async () => {
                    await api.post(`/complaints/${id}/detect-related`);
                    fetchComplaintDetails();
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Re-run Detection Engine
                </button>
              </div>

              <div className="space-y-3">
                {complaint.sourceRelationships?.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No related or duplicate complaints identified for this record.
                  </div>
                ) : (
                  complaint.sourceRelationships.map((rel) => {
                    const matchPercent = Math.round((rel.similarityScore || 0) * 100);
                    return (
                      <div key={rel.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-indigo-600">{rel.relatedComplaint?.complaintNumber}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              matchPercent >= 70 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {matchPercent}% Similarity ({rel.relationshipType})
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500">Status: {rel.status}</span>
                          </div>
                          <p className="font-medium text-slate-800 mt-1">{rel.relatedComplaint?.title}</p>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() => navigate(`/complaints/${rel.relatedComplaint?.id}`)}
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors"
                          >
                            Inspect Pair
                          </button>
                          {rel.status === 'PENDING' && !isAuditor && (
                            <button
                              onClick={() => navigate('/duplicate-review')}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-2xs transition-colors"
                            >
                              Review in Center
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Audit Trail Timeline */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Immutable Historical Custody & Transition Log</h4>
              <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 text-xs">
                {history?.auditLogs?.map((log) => (
                  <div key={log.id} className="relative">
                    <span className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-indigo-600 border-2 border-white shadow-xs"></span>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-700">{log.action}</span>
                        <span className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-600 mt-1">
                        By: <span className="font-semibold text-slate-800">{log.actor?.fullName || 'System Automated Job'}</span> ({log.actor?.role?.name || 'SYSTEM'})
                      </p>
                      {log.reason && (
                        <p className="text-[11px] text-slate-500 mt-1 italic">Reason: "{log.reason}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Assign / Reassign */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign / Reassign Complaint">
        <form onSubmit={handleAssign} className="space-y-4 text-xs">
          {actionError && <p className="text-red-600 font-semibold">{actionError}</p>}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Regulatory Department</label>
            <select
              required
              value={assignDeptId}
              onChange={(e) => {
                setAssignDeptId(e.target.value);
                loadOfficersForDepartment(e.target.value);
              }}
              className="w-full p-2 border border-slate-300 rounded-lg"
            >
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Assigned Investigating Officer</label>
            <select
              value={assignOfficerId}
              onChange={(e) => setAssignOfficerId(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
            >
              <option value="">Select Officer (Optional)</option>
              {departmentOfficers.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Assignment Directive / Instructions</label>
            <textarea
              rows={3}
              value={assignReason}
              onChange={(e) => setAssignReason(e.target.value)}
              placeholder="Provide context or specific guidelines for the investigating officer..."
              className="w-full p-2 border border-slate-300 rounded-lg font-mono"
            ></textarea>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold"
            >
              Confirm Assignment
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Transfer Department */}
      <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="Formal Jurisdictional Transfer">
        <form onSubmit={handleTransfer} className="space-y-4 text-xs">
          {actionError && <p className="text-red-600 font-semibold">{actionError}</p>}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">New Handling Department</label>
            <select
              required
              value={transferDeptId}
              onChange={(e) => setTransferDeptId(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
            >
              <option value="">Select Destination Department</option>
              {departments
                .filter((d) => d.id !== complaint.assignedDepartmentId)
                .map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mandatory Jurisdictional Transfer Justification</label>
            <textarea
              required
              rows={3}
              minLength={5}
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="Explain why this case falls outside current department jurisdiction..."
              className="w-full p-2 border border-slate-300 rounded-lg font-mono"
            ></textarea>
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={() => setIsTransferModalOpen(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold">Execute Transfer</button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Collaborate */}
      <Modal isOpen={isCollaborateModalOpen} onClose={() => setIsCollaborateModalOpen(false)} title="Add Collaborating Department">
        <form onSubmit={handleAddCollaborator} className="space-y-4 text-xs">
          {actionError && <p className="text-red-600 font-semibold">{actionError}</p>}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Collaborating Division</label>
            <select
              required
              value={collabDeptId}
              onChange={(e) => setCollabDeptId(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
            >
              <option value="">Select Department to Co-Investigate</option>
              {departments
                .filter((d) => d.id !== complaint.assignedDepartmentId)
                .map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
            </select>
          </div>
          <p className="text-[11px] text-slate-500">
            Collaborating officers gain access to review notes, inspect evidence, and contribute findings without duplicating complaint records.
          </p>
          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={() => setIsCollaborateModalOpen(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold">Add Division</button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: Resolve */}
      <Modal isOpen={isResolveModalOpen} onClose={() => setIsResolveModalOpen(false)} title="Conclude Investigation & Submit Resolution">
        <form onSubmit={handleResolve} className="space-y-4 text-xs">
          {actionError && <p className="text-red-600 font-semibold">{actionError}</p>}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Resolution Findings & Remedial Directives <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              minLength={15}
              value={resolutionSummary}
              onChange={(e) => setResolutionSummary(e.target.value)}
              placeholder="Detail findings of the investigation, sanctions applied, corrective actions ordered, and institutional affidavits verified..."
              className="w-full p-2 border border-slate-300 rounded-lg font-mono"
            ></textarea>
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={() => setIsResolveModalOpen(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold">Mark Case Resolved</button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: Close */}
      <Modal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} title="Formal Regulatory Closure">
        <form onSubmit={handleClose} className="space-y-4 text-xs">
          {actionError && <p className="text-red-600 font-semibold">{actionError}</p>}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mandatory Closure Reason & Legal Confirmation</label>
            <textarea
              required
              rows={3}
              minLength={5}
              value={closureReason}
              onChange={(e) => setClosureReason(e.target.value)}
              placeholder="e.g. Institutional compliance verified and penalty acknowledged; case finalized."
              className="w-full p-2 border border-slate-300 rounded-lg"
            ></textarea>
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={() => setIsCloseModalOpen(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-1.5 bg-slate-800 text-white rounded-lg font-semibold">Execute Final Closure</button>
          </div>
        </form>
      </Modal>

      {/* MODAL 6: Reopen */}
      <Modal isOpen={isReopenModalOpen} onClose={() => setIsReopenModalOpen(false)} title="Reopen Resolved/Closed Case">
        <form onSubmit={handleReopen} className="space-y-4 text-xs">
          {actionError && <p className="text-red-600 font-semibold">{actionError}</p>}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mandatory Reopening Justification</label>
            <textarea
              required
              rows={3}
              minLength={10}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Detail new evidence or appeal grounds mandating fresh investigation..."
              className="w-full p-2 border border-slate-300 rounded-lg font-mono"
            ></textarea>
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={() => setIsReopenModalOpen(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-1.5 bg-rose-600 text-white rounded-lg font-semibold">Reopen Investigation</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
