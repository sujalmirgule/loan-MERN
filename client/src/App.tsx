import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { BrandingProvider } from '@/contexts/BrandingContext';
import { CustomerRoute, AdminRoute, PublicOnlyRoute } from '@/routes/RouteGuards';

// Public Pages
import { LandingPage } from '@/pages/LandingPage';

// Customer Pages
import { CustomerLogin } from '@/pages/customer/CustomerLogin';
import { CustomerRegister } from '@/pages/customer/CustomerRegister';
import { CustomerHome } from '@/pages/customer/CustomerHome';
import { CustomerProfile } from '@/pages/customer/CustomerProfile';
import { CustomerDocuments } from '@/pages/customer/CustomerDocuments';
import { CustomerKycPage } from '@/pages/customer/CustomerKycPage';
import { CustomerPaymentPage } from '@/pages/customer/CustomerPaymentPage';
import { CustomerAgreementPage } from '@/pages/customer/CustomerAgreementPage';
import { CustomerNotificationsPage } from '@/pages/customer/CustomerNotificationsPage';
import { CustomerSupportPage } from '@/pages/customer/CustomerSupportPage';
import { ApplyLoanPage } from '@/pages/customer/ApplyLoanPage';
import { CustomerLoansPage } from '@/pages/customer/CustomerLoansPage';
import { CustomerLoanDetailPage } from '@/pages/customer/CustomerLoanDetailPage';
import { CustomerLayout } from '@/layouts/CustomerLayout';

// Admin Pages
import { AdminLogin } from '@/pages/admin/AdminLogin';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminCustomersPage } from '@/pages/admin/AdminCustomersPage';
import { AdminCustomerDetailPage } from '@/pages/admin/AdminCustomerDetailPage';
import { AdminLoansPage } from '@/pages/admin/AdminLoansPage';
import { AdminLoanDetailPage } from '@/pages/admin/AdminLoanDetailPage';
import { AdminKycList } from '@/pages/admin/AdminKycList';
import { AdminKycDetail } from '@/pages/admin/AdminKycDetail';
import { AdminPaymentsPage } from '@/pages/admin/AdminPaymentsPage';
import { AdminDisbursementsPage } from '@/pages/admin/AdminDisbursementsPage';
import { AdminReportsPage } from '@/pages/admin/AdminReportsPage';
import { AdminAuditLogsPage } from '@/pages/admin/AdminAuditLogsPage';
import { AdminSupportPage } from '@/pages/admin/AdminSupportPage';
import { AdminNotificationsPage } from '@/pages/admin/AdminNotificationsPage';
import { AdminBrandingSettings } from '@/pages/admin/AdminBrandingSettings';
import { AdminEmailSettings } from '@/pages/admin/AdminEmailSettings';
import { AdminWhatsAppSettings } from '@/pages/admin/AdminWhatsAppSettings';
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
        <BrandingProvider>
          <BrowserRouter>
            <Routes>
              {/* Landing / Gateway */}
              <Route path="/" element={<LandingPage />} />

              {/* Public Customer Authentication */}
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
                  <Route path="loans/:id/agreement" element={<CustomerAgreementPage />} />
                  <Route path="agreement/:loanId" element={<CustomerAgreementPage />} />
                  <Route path="applications" element={<CustomerLoansPage />} />
                  <Route path="applications/:id" element={<CustomerLoanDetailPage />} />
                  <Route path="apply" element={<ApplyLoanPage />} />
                  <Route path="payments" element={<CustomerPaymentPage />} />
                  <Route path="payments/:loanId" element={<CustomerPaymentPage />} />
                  <Route path="payment/:loanId" element={<CustomerPaymentPage />} />
                  <Route path="documents" element={<CustomerDocuments />} />
                  <Route path="kyc" element={<CustomerKycPage />} />
                  <Route path="notifications" element={<CustomerNotificationsPage />} />
                  <Route path="support" element={<CustomerSupportPage />} />
                  <Route path="profile" element={<CustomerProfile />} />
                </Route>
              </Route>

              {/* Public Admin Authentication */}
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
                  <Route path="customers" element={<AdminCustomersPage />} />
                  <Route path="customers/:id" element={<AdminCustomerDetailPage />} />
                  <Route path="loans" element={<AdminLoansPage />} />
                  <Route path="loans/:id" element={<AdminLoanDetailPage />} />
                  <Route path="applications" element={<AdminLoansPage />} />
                  <Route path="applications/:id" element={<AdminLoanDetailPage />} />
                  <Route path="documents" element={<AdminKycList />} />
                  <Route path="kyc" element={<AdminKycList />} />
                  <Route path="kyc/:customerId" element={<AdminKycDetail />} />
                  <Route path="payments" element={<AdminPaymentsPage />} />
                  <Route path="disbursements" element={<AdminDisbursementsPage />} />
                  <Route path="reports" element={<AdminReportsPage />} />
                  <Route path="audit" element={<AdminAuditLogsPage />} />
                  <Route path="audit-logs" element={<AdminAuditLogsPage />} />
                  <Route path="support" element={<AdminSupportPage />} />
                  <Route path="notifications" element={<AdminNotificationsPage />} />
                  <Route path="settings" element={<Navigate to="/admin/settings/branding" replace />} />
                  <Route path="settings/branding" element={<AdminBrandingSettings />} />
                  <Route path="settings/email" element={<AdminEmailSettings />} />
                  <Route path="settings/whatsapp" element={<AdminWhatsAppSettings />} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </BrandingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
