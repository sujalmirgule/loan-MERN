import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { CustomerRoute, AdminRoute, PublicOnlyRoute } from '@/routes/RouteGuards';
import { LandingPage } from '@/pages/LandingPage';
import { CustomerLogin } from '@/pages/customer/CustomerLogin';
import { CustomerRegister } from '@/pages/customer/CustomerRegister';
import { CustomerHome } from '@/pages/customer/CustomerHome';
import { CustomerProfile } from '@/pages/customer/CustomerProfile';
import { CustomerDocuments } from '@/pages/customer/CustomerDocuments';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { AdminLogin } from '@/pages/admin/AdminLogin';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminKycList } from '@/pages/admin/AdminKycList';
import { AdminKycDetail } from '@/pages/admin/AdminKycDetail';
import { AdminLayout } from '@/layouts/AdminLayout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Landing / Gateway */}
            <Route path="/" element={<LandingPage />} />

            {/* Public Customer Authentication (Redirects if already signed in) */}
            <Route
              path="/customer/login"
              element={
                <PublicOnlyRoute>
                  <CustomerLogin />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/customer/register"
              element={
                <PublicOnlyRoute>
                  <CustomerRegister />
                </PublicOnlyRoute>
              }
            />

            {/* Protected Customer Portal */}
            <Route element={<CustomerRoute />}>
              <Route path="/customer" element={<CustomerLayout />}>
                <Route index element={<Navigate to="/customer/dashboard" replace />} />
                <Route path="dashboard" element={<CustomerHome />} />
                <Route path="loans" element={<CustomerHome />} />
                <Route path="apply" element={<CustomerHome />} />
                <Route path="payments" element={<CustomerHome />} />
                <Route path="documents" element={<CustomerDocuments />} />
                <Route path="notifications" element={<CustomerHome />} />
                <Route path="support" element={<CustomerHome />} />
                <Route path="profile" element={<CustomerProfile />} />
              </Route>
            </Route>

            {/* Public Admin Authentication (Redirects if already signed in) */}
            <Route
              path="/admin/login"
              element={
                <PublicOnlyRoute>
                  <AdminLogin />
                </PublicOnlyRoute>
              }
            />

            {/* Protected Admin Console */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="customers" element={<AdminDashboard />} />
                <Route path="loans" element={<AdminDashboard />} />
                <Route path="documents" element={<AdminKycList />} />
                <Route path="kyc" element={<AdminKycList />} />
                <Route path="kyc/:customerId" element={<AdminKycDetail />} />
                <Route path="payments" element={<AdminDashboard />} />
                <Route path="disbursements" element={<AdminDashboard />} />
                <Route path="reports" element={<AdminDashboard />} />
                <Route path="audit" element={<AdminDashboard />} />
                <Route path="settings" element={<AdminDashboard />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
