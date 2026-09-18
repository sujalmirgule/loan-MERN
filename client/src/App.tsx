import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LandingPage } from '@/pages/LandingPage';
import { CustomerLogin } from '@/pages/customer/CustomerLogin';
import { CustomerHome } from '@/pages/customer/CustomerHome';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { AdminLogin } from '@/pages/admin/AdminLogin';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
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
      <BrowserRouter>
        <Routes>
          {/* Landing / Gateway */}
          <Route path="/" element={<LandingPage />} />

          {/* Customer Auth */}
          <Route path="/customer/login" element={<CustomerLogin />} />
          <Route path="/customer/register" element={<CustomerLogin />} />

          {/* Customer Portal */}
          <Route path="/customer" element={<CustomerLayout />}>
            <Route index element={<Navigate to="/customer/dashboard" replace />} />
            <Route path="dashboard" element={<CustomerHome />} />
            <Route path="loans" element={<CustomerHome />} />
            <Route path="apply" element={<CustomerHome />} />
            <Route path="payments" element={<CustomerHome />} />
            <Route path="documents" element={<CustomerHome />} />
            <Route path="notifications" element={<CustomerHome />} />
            <Route path="support" element={<CustomerHome />} />
            <Route path="profile" element={<CustomerHome />} />
          </Route>

          {/* Admin Auth */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin Console */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="customers" element={<AdminDashboard />} />
            <Route path="loans" element={<AdminDashboard />} />
            <Route path="documents" element={<AdminDashboard />} />
            <Route path="payments" element={<AdminDashboard />} />
            <Route path="disbursements" element={<AdminDashboard />} />
            <Route path="reports" element={<AdminDashboard />} />
            <Route path="audit" element={<AdminDashboard />} />
            <Route path="settings" element={<AdminDashboard />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
