import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import CommunityLayout from './layouts/CommunityLayout';
import AdminLayout from './layouts/AdminLayout';

// Community pages
import CommunityDashboard from './pages/community/Dashboard';
import CommunityAlerts from './pages/community/Alerts';
import CommunityHistory from './pages/community/History';

// Admin pages
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminDevices from './pages/admin/Devices';
import AdminAlerts from './pages/admin/Alerts';
import AdminSettings from './pages/admin/Settings';
import AdminUsers from './pages/admin/Users';

/**
 * Route guard — redirects to login if not authenticated as admin.
 */
function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return isAdmin ? children : <Navigate to="/admin/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Community (public) routes */}
          <Route element={<CommunityLayout />}>
            <Route path="/" element={<CommunityDashboard />} />
            <Route path="/alerts" element={<CommunityAlerts />} />
            <Route path="/history" element={<CommunityHistory />} />
          </Route>

          {/* Admin login (standalone, no layout) */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin (protected) routes */}
          <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/devices" element={<AdminDevices />} />
            <Route path="/admin/alerts" element={<AdminAlerts />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/users" element={<AdminUsers />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
