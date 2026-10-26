import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { LoadingSpinner, Modal } from '../components/ui/Modal.jsx';
import { StatusBadge, PriorityBadge } from '../components/ui/Badge.jsx';
import {
  CopyCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Filter,
} from 'lucide-react';

export function DuplicateReviewPage() {
  const navigate = useNavigate();
  const { isAuditor } = useAuth();

  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');

  // Review Modal
  const [selectedRel, setSelectedRel] = useState(null);
  const [reviewAction, setReviewAction] = useState('CONFIRMED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRelationships = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/complaint-relationships?status=${statusFilter}`);
      setRelationships(res.data || []);
    } catch (err) {
      console.error('Failed to load relationships:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelationships();
  }, [statusFilter]);

  const handleOpenReview = (rel, action) => {
    setSelectedRel(rel);
    setReviewAction(action);
    setReviewNotes('');
  };

  const handleExecuteReview = async (e) => {
    e.preventDefault();
    if (!selectedRel) return;
    setSubmitting(true);
    try {
      await api.post(`/complaint-relationships/${selectedRel.id}/review`, {
        action: reviewAction,
        reviewNotes,
      });
      setSelectedRel(null);
      fetchRelationships();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <CopyCheck className="w-5 h-5 text-amber-500" />
            <span>Duplicate & Related Case Review Center</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic explainable text and institutional matching queue. Regulatory mandate: Artificial intelligence never automatically merges, rejects, or deletes complaints.
          </p>
        </div>

        {/* Status Tab Selector */}
        <div className="flex rounded-lg border border-slate-200 p-1 bg-white text-xs font-semibold">
          {['PENDING', 'CONFIRMED', 'DISMISSED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Querying candidate duplicate clusters..." />
      ) : relationships.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-2 opacity-80" />
          <h3 className="text-sm font-bold text-slate-800">Queue is clear</h3>
          <p className="text-xs text-slate-500 mt-1">
            No candidate relationships currently flagged under status <span className="font-semibold text-slate-700">{statusFilter}</span>.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {relationships.map((rel) => {
            const scorePercent = Math.round((rel.similarityScore || 0) * 100);
            return (
              <div
                key={rel.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
              >
                {/* Score & Review Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      scorePercent >= 70
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}>
                      {scorePercent}% Composite Match
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{rel.relationshipType}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Detection: {rel.detectionMethod}</span>
                  </div>

                  {!isAuditor && rel.status === 'PENDING' && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenReview(rel, 'DISMISSED')}
                        className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5 text-slate-400" />
                        <span>Dismiss False Positive</span>
                      </button>
                      <button
                        onClick={() => handleOpenReview(rel, 'CONFIRMED')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Duplicate / Related</span>
                      </button>
                    </div>
                  )}

                  {rel.status !== 'PENDING' && (
                    <div className="text-xs text-slate-500">
                      Reviewed as <span className="font-bold text-slate-800">{rel.status}</span> by {rel.reviewedBy?.fullName || 'Administrator'}
                    </div>
                  )}
                </div>

                {/* Side-by-Side Comparison Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Case A (Source) */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-600">{rel.complaint?.complaintNumber}</span>
                      <StatusBadge status={rel.complaint?.status} />
                    </div>
                    <h4 className="font-bold text-slate-900 line-clamp-2">{rel.complaint?.title}</h4>
                    <p className="text-slate-600 font-mono line-clamp-3 leading-relaxed">{rel.complaint?.description}</p>
                    <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between">
                      <span>{rel.complaint?.institution?.institutionName}</span>
                      <button
                        onClick={() => navigate(`/complaints/${rel.complaint?.id}`)}
                        className="text-indigo-600 font-semibold hover:underline flex items-center"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>

                  {/* Case B (Target) */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-600">{rel.relatedComplaint?.complaintNumber}</span>
                      <StatusBadge status={rel.relatedComplaint?.status} />
                    </div>
                    <h4 className="font-bold text-slate-900 line-clamp-2">{rel.relatedComplaint?.title}</h4>
                    <p className="text-slate-600 font-mono line-clamp-3 leading-relaxed">{rel.relatedComplaint?.description}</p>
                    <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between">
                      <span>{rel.relatedComplaint?.institution?.institutionName}</span>
                      <button
                        onClick={() => navigate(`/complaints/${rel.relatedComplaint?.id}`)}
                        className="text-indigo-600 font-semibold hover:underline flex items-center"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>

                {rel.reviewNotes && (
                  <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    Review Decision Notes: "{rel.reviewNotes}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Confirmation Modal */}
      <Modal
        isOpen={!!selectedRel}
        onClose={() => setSelectedRel(null)}
        title={reviewAction === 'CONFIRMED' ? 'Confirm Complaint Duplicate / Relationship' : 'Dismiss Candidate Relationship'}
      >
        <form onSubmit={handleExecuteReview} className="space-y-4 text-xs">
          <p className="text-slate-600">
            {reviewAction === 'CONFIRMED'
              ? 'Confirming marks these two records as related in the regulatory intelligence index. Both complaints are fully preserved in the database without data loss.'
              : 'Dismissing marks this pair as a false positive. Both complaints remain active and independent.'}
          </p>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Officer Review Notes & Justification <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="e.g. Verified identical faculty shortage incident submitted via alternate portal channel..."
              className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
            ></textarea>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setSelectedRel(null)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-1.5 rounded-lg text-white font-semibold shadow-xs ${
                reviewAction === 'CONFIRMED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-800 hover:bg-slate-900'
              }`}
            >
              {submitting ? 'Recording...' : `Confirm ${reviewAction === 'CONFIRMED' ? 'Link' : 'Dismissal'}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
