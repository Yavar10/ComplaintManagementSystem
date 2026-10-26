import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner, Modal } from '../components/ui/Modal.jsx';
import { StatusBadge, PriorityBadge } from '../components/ui/Badge.jsx';
import {
  Building2,
  Search,
  MapPin,
  Mail,
  Phone,
  FileText,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export function InstitutionDirectoryPage() {
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedInst, setSelectedInst] = useState(null);
  const [instComplaints, setInstComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  useEffect(() => {
    async function loadInstitutions() {
      try {
        setLoading(true);
        const res = await api.get(`/institutions?search=${search}&limit=50`);
        setInstitutions(res.data || []);
      } catch (err) {
        console.error('Failed to load institutions:', err);
      } finally {
        setLoading(false);
      }
    }

    loadInstitutions();
  }, [search]);

  const handleOpenInstitution = async (inst) => {
    setSelectedInst(inst);
    try {
      setLoadingComplaints(true);
      const res = await api.get(`/institutions/${inst.id}/complaints`);
      setInstComplaints(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComplaints(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span>Technical Institution Compliance Directory</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Registry of AICTE-approved colleges, universities, and compliance profiles
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by college name, code, state..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Retrieving institutional records..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {institutions.map((inst) => {
            const complaintCount = inst._count?.complaints ?? 0;
            return (
              <div
                key={inst.id}
                onClick={() => handleOpenInstitution(inst)}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {inst.institutionCode}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                      {inst.institutionType}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug">
                    {inst.institutionName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                    <span>{inst.district}, {inst.state}</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-800">{complaintCount}</span>
                    <span className="text-slate-400">Total Cases</span>
                  </div>
                  <span className="text-indigo-600 font-semibold hover:underline flex items-center text-[11px]">
                    Inspect History &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Institution Complaints Modal */}
      <Modal
        isOpen={!!selectedInst}
        onClose={() => setSelectedInst(null)}
        title={selectedInst ? `${selectedInst.institutionName} (${selectedInst.institutionCode})` : 'Institution Complaints'}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 space-y-1">
            <p><span className="font-semibold text-slate-800">Address:</span> {selectedInst?.address}</p>
            <p><span className="font-semibold text-slate-800">Contact:</span> {selectedInst?.contactEmail || 'N/A'} • {selectedInst?.contactPhone || 'N/A'}</p>
          </div>

          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
            Historical Grievance Log ({instComplaints.length})
          </h4>

          {loadingComplaints ? (
            <LoadingSpinner text="Fetching case files..." />
          ) : instComplaints.length === 0 ? (
            <p className="py-6 text-center text-slate-400 italic">No complaints on file for this institution.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {instComplaints.map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/complaints/${c.id}`)}
                  className="p-3 rounded-lg border border-slate-200 hover:bg-indigo-50/50 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div className="truncate mr-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-indigo-600">{c.complaintNumber}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="font-semibold text-slate-800 mt-1 truncate">{c.title}</p>
                  </div>
                  <PriorityBadge priority={c.priority} />
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
