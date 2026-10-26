import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { LoadingSpinner } from '../components/ui/Modal.jsx';
import {
  FileText,
  Building2,
  AlertTriangle,
  Upload,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  CopyCheck,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

export function ComplaintCreatePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [source, setSource] = useState('PORTAL');
  const [file, setFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [catRes, instRes] = await Promise.all([
        api.get('/categories'),
        api.get('/institutions?limit=100'),
      ]);

      const catList = Array.isArray(catRes?.data) ? catRes.data : [];
      const instList = Array.isArray(instRes?.data) ? instRes.data : [];

      setCategories(catList);
      setInstitutions(instList);

      if (catList.length > 0) setCategoryId(catList[0].id);
      if (instList.length > 0) setInstitutionId(instList[0].id);
    } catch (err) {
      console.error('Failed to load initial form data:', err);
      setError(err.message || 'Failed to connect to backend server or load initial institution data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!institutionId) {
      setError('Please select a target technical institution.');
      return;
    }
    if (!categoryId) {
      setError('Please select a grievance category.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Submit complaint
      const res = await api.post('/complaints', {
        title,
        description,
        categoryId,
        institutionId,
        priority,
        source,
      });

      const newComplaint = res.data;

      // 2. Upload attachment if attached
      if (file && newComplaint?.id) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          await api.post(`/complaints/${newComplaint.id}/attachments`, formData);
        } catch (uploadErr) {
          console.warn('File upload warning:', uploadErr);
        }
      }

      // Navigate to new complaint details
      navigate(`/complaints/${newComplaint.id}`, {
        state: {
          newRegistered: true,
          complaintNumber: newComplaint.complaintNumber,
          hasDuplicateMatch: Boolean(newComplaint?.relatedSuggestions?.length > 0 && newComplaint.relatedSuggestions[0]?.similarityScore >= 0.70),
          matchScore: newComplaint?.relatedSuggestions?.[0]?.similarityScore,
        },
      });
    } catch (err) {
      setError(err.message || 'Failed to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16">
        <LoadingSpinner text="Retrieving regulatory institutions & grievance categories..." />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/complaints')}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1 mb-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Complaint Registry</span>
          </button>
          <h2 className="text-xl font-bold text-slate-900">Official Grievance Registration</h2>
          <p className="text-xs text-slate-500 mt-1">
            Lodge an institutional complaint against technical institutions. Concurrency-safe reference generation and explainable duplicate analysis are triggered automatically upon submission.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-md font-medium text-[11px] flex items-center space-x-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Grievance Summary / Allegation Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            minLength={5}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Critical faculty shortage in CSE Department and ghost professor records"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>

        {/* Institution & Category Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Technical Institution <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            >
              <option value="" disabled>-- Select Technical Institution --</option>
              {Array.isArray(institutions) && institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.institutionName} ({inst.institutionCode} - {inst.state})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Grievance Category <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            >
              <option value="" disabled>-- Select Grievance Category --</option>
              {Array.isArray(categories) && categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Priority & Channel Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assessed Severity / Priority <span className="text-red-500">*</span>
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            >
              <option value="CRITICAL">Critical (Immediate safety, ragging, major fraud — 72h SLA)</option>
              <option value="HIGH">High (Severe faculty deficiency, unapproved courses — 7d SLA)</option>
              <option value="MEDIUM">Medium (Standard compliance, fee irregularities — 15d SLA)</option>
              <option value="LOW">Low (Routine administrative inquiries — 30d SLA)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Intake Channel / Source
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            >
              <option value="PORTAL">Online Citizen / Student Portal</option>
              <option value="EMAIL">Formal Email Grievance</option>
              <option value="WRITTEN">Written / Physical Affidavit</option>
              <option value="INSPECTION">Surprise Regulatory Inspection Finding</option>
            </select>
          </div>
        </div>

        {/* Detailed Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Detailed Statement of Grievance <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={5}
            minLength={15}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide specific dates, departments, names of personnel, student batches affected, and exact allegations..."
            className="w-full p-3 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono leading-relaxed"
          ></textarea>
        </div>

        {/* Supporting Evidence File Upload */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Supporting Documentary Evidence (Optional)
          </label>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-indigo-400 transition-colors bg-slate-50/50">
            <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-slate-700">
              {file ? file.name : 'Select PDF, JPEG, PNG, or DOCX document (Max 10MB)'}
            </p>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0] || null)}
              className="mt-2 text-xs text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>
        </div>

        {/* Submit & Cancel Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-400 flex items-center">
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-slate-400" />
            Audited & Timestamped in Compliance Log
          </p>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => navigate('/complaints')}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-200 flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              <span>{submitting ? 'Registering...' : 'Submit & Route Complaint'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
