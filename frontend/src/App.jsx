import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthContext.jsx';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { ComplaintRegistryPage } from './pages/ComplaintRegistryPage.jsx';
import { ComplaintCreatePage } from './pages/ComplaintCreatePage.jsx';
import { ComplaintDetailPage } from './pages/ComplaintDetailPage.jsx';
import { DuplicateReviewPage } from './pages/DuplicateReviewPage.jsx';
import { InstitutionDirectoryPage } from './pages/InstitutionDirectoryPage.jsx';
import { AnalyticsPage } from './pages/AnalyticsPage.jsx';
import { UserAdminPage } from './pages/UserAdminPage.jsx';
import { AuditTrailPage } from './pages/AuditTrailPage.jsx';
import { LoadingSpinner } from './components/ui/Modal.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <LoadingSpinner text="Authenticating regulatory session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasRole(...allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Authentication Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Application Workspace */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="complaints">
                <Route index element={<ComplaintRegistryPage />} />
                <Route path="new" element={<ComplaintCreatePage />} />
                <Route path=":id" element={<ComplaintDetailPage />} />
              </Route>
              <Route path="duplicate-review" element={<DuplicateReviewPage />} />
              <Route path="institutions" element={<InstitutionDirectoryPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route
                path="admin/users"
                element={
                  <ProtectedRoute allowedRoles={['SYSTEM_ADMIN']}>
                    <UserAdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="audit-trail"
                element={
                  <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'ADMINISTRATOR', 'READ_ONLY_AUDITOR']}>
                    <AuditTrailPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
