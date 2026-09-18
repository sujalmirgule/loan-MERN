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
import { ApplyLoanPage } from '@/pages/customer/ApplyLoanPage';
import { CustomerLoansPage } from '@/pages/customer/CustomerLoansPage';
import { CustomerLoanDetailPage } from '@/pages/customer/CustomerLoanDetailPage';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { AdminLogin } from '@/pages/admin/AdminLogin';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminKycList } from '@/pages/admin/AdminKycList';
import { AdminKycDetail } from '@/pages/admin/AdminKycDetail';
import { AdminLoansPage } from '@/pages/admin/AdminLoansPage';
import { AdminLoanDetailPage } from '@/pages/admin/AdminLoanDetailPage';
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
                <Route path="loans" element={<CustomerLoansPage />} />
                <Route path="loans/:id" element={<CustomerLoanDetailPage />} />
                <Route path="applications" element={<CustomerLoansPage />} />
                <Route path="applications/:id" element={<CustomerLoanDetailPage />} />
                <Route path="apply" element={<ApplyLoanPage />} />
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
                <Route path="loans" element={<AdminLoansPage />} />
                <Route path="loans/:id" element={<AdminLoanDetailPage />} />
                <Route path="applications" element={<AdminLoansPage />} />
                <Route path="applications/:id" element={<AdminLoanDetailPage />} />
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
