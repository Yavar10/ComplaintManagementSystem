import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { ShieldCheck, Lock, Mail, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { role: 'SYSTEM_ADMIN', email: 'sysadmin@aicte.gov.in', label: 'System Admin', desc: 'Full configuration & user privileges' },
  { role: 'ADMINISTRATOR', email: 'admin@aicte.gov.in', label: 'Administrator', desc: 'Intake, duplicate review & SLA control' },
  { role: 'DEPARTMENT_HEAD', email: 'head.academic@aicte.gov.in', label: 'Dept Head (Academic)', desc: 'Assigns officers & monitors caseload' },
  { role: 'COMPLAINT_OFFICER', email: 'officer.academic@aicte.gov.in', label: 'Complaint Officer', desc: 'Investigates & drafts resolutions' },
  { role: 'READ_ONLY_AUDITOR', email: 'auditor@aicte.gov.in', label: 'Auditor (Read-Only)', desc: 'Inspection of audit trail & exports' },
];

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickFill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password@123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.25),rgba(255,255,255,0))] pointer-events-none"></div>

      <div className="w-full max-w-4xl grid md:grid-cols-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative z-10">
        {/* Left Side: Brand & Context */}
        <div className="bg-slate-900 p-8 flex flex-col justify-between text-white border-r border-slate-800">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-md shadow-indigo-500/30">
                AI
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-white">AICTE / REGULATORY</h2>
                <p className="text-[11px] text-indigo-400 font-mono tracking-wider">COMPLAINT INTELLIGENCE</p>
              </div>
            </div>

            <div className="mt-8">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-400 border border-indigo-800">
                SIH26264 Integrated Platform
              </span>
              <h1 className="text-2xl font-bold mt-3 leading-snug text-slate-100">
                Integrated Grievance Monitoring & Institutional Intelligence
              </h1>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                Centralized regulatory command dashboard for tracking technical institution complaints, coordinated multi-departmental inquiries, explainable duplicate detection, and proactive deadline escalation.
              </p>
            </div>
          </div>

          {/* Demo Credentials Quick-Select Pill Area */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center">
              <UserCheck className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              Quick-Fill Evaluation Accounts:
            </p>
            <div className="space-y-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleQuickFill(acc.email)}
                  className="w-full text-left p-2 rounded-lg bg-slate-800/80 hover:bg-indigo-950/70 border border-slate-700/60 hover:border-indigo-600/50 transition-all text-xs flex items-center justify-between group"
                >
                  <div>
                    <span className="font-semibold text-slate-200 group-hover:text-indigo-300">{acc.label}</span>
                    <span className="text-[10px] text-slate-400 block">{acc.desc}</span>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">Select &rarr;</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-2 italic text-center">Default Password: Password@123</p>
          </div>
        </div>

        {/* Right Side: Sign-in Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center bg-white">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Sign in to console</h2>
            <p className="text-xs text-slate-500 mt-1">Authorized regulatory personnel only</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@aicte.gov.in"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Security Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-md shadow-indigo-200 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 mt-2"
            >
              <span>{submitting ? 'Verifying Credentials...' : 'Authenticate & Enter'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-slate-100 text-[11px] text-slate-400 text-center flex items-center justify-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>256-Bit SSL Encrypted & Session-Monitored</span>
          </div>
        </div>
      </div>
    </div>
  );
}
