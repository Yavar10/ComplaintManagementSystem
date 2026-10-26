import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { api } from '../../services/api.js';
import { ErrorBoundary } from '../ErrorBoundary.jsx';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  CopyCheck,
  Building2,
  BarChart3,
  Users,
  History,
  Bell,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';

export function AppLayout() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res?.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s poll
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id, complaintId) => {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      fetchNotifications();
      if (complaintId) {
        navigate(`/complaints/${complaintId}`);
        setShowNotifDrawer(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all', {});
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const navItems = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Complaint Registry', to: '/complaints', icon: FileText },
    { name: 'Register Complaint', to: '/complaints/new', icon: PlusCircle, highlight: true },
    { name: 'Duplicate Review Center', to: '/duplicate-review', icon: CopyCheck },
    { name: 'Institution Directory', to: '/institutions', icon: Building2 },
    { name: 'Analytics & Reports', to: '/analytics', icon: BarChart3 },
  ];

  if (hasRole('SYSTEM_ADMIN')) {
    navItems.push({ name: 'User Management', to: '/admin/users', icon: Users });
  }

  if (hasRole('SYSTEM_ADMIN', 'ADMINISTRATOR', 'READ_ONLY_AUDITOR')) {
    navItems.push({ name: 'Audit Trail', to: '/audit-trail', icon: History });
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Regulatory Header Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1 px-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-slate-200">SIH26264</span>
          <span className="text-slate-500">|</span>
          <span>Integrated Institution Complaint Management & Intelligence System</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-slate-400">Jurisdiction: National Regulatory Framework</span>
          <span className="inline-flex items-center px-2 py-0.2 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
            System Online
          </span>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 hidden md:flex">
          <div>
            {/* Brand Logo */}
            <div className="p-5 border-b border-slate-100 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200">
                AI
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">AICTE / REGULATORY</h2>
                <p className="text-[10px] text-slate-500 font-medium tracking-wide">COMPLAINT INTELLIGENCE</p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                      } ${item.highlight ? 'border border-indigo-200/60 bg-indigo-50/40 text-indigo-700' : ''}`
                    }
                  >
                    <Icon className={`w-4 h-4 mr-3 ${item.highlight ? 'text-indigo-600' : 'text-slate-500'}`} />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* User Profile Mini Card in Sidebar */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/60">
            <div className="flex items-center justify-between mb-3">
              <div className="truncate mr-2">
                <p className="text-xs font-semibold text-slate-900 truncate">{user?.fullName}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.departmentName || 'National Operations'}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-indigo-100 text-indigo-700 shrink-0">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          </div>
        </aside>

        {/* Main Application Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30 shadow-2xs">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-base font-semibold text-slate-800 hidden sm:block">
                Institution Regulatory & Grievance Console
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications Button */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifDrawer(!showNotifDrawer)}
                  className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Drawer */}
                {showNotifDrawer && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Bell className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-sm font-semibold text-slate-800">Regulatory Alerts</h4>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs">
                          No notifications at this time
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleMarkAsRead(n.id, n.complaintId)}
                            className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                              !n.readAt ? 'bg-indigo-50/40' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                              {!n.readAt && (
                                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1"></span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {new Date(n.createdAt).toLocaleDateString()} at{' '}
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar */}
              <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-semibold text-slate-900">{user?.fullName}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{user?.role}</p>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content Body */}
          <main className="flex-1 p-6 overflow-y-auto">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </div>
  );
}
