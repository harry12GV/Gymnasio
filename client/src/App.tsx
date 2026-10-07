import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import AppShell from '@/pages/AppShell';
import HomePage from '@/pages/HomePage';
import DashboardPage from '@/pages/DashboardPage';
import MembersPage from '@/pages/MembersPage';
import MemberFormPage from '@/pages/MemberFormPage';
import MemberDetailPage from '@/pages/MemberDetailPage';
import PlansPage from '@/pages/PlansPage';
import QuickSalePage from '@/pages/QuickSalePage';
import CashPage from '@/pages/CashPage';
import CheckInPage from '@/pages/CheckInPage';
import PortalPage from '@/pages/PortalPage';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/members/new" element={<MemberFormPage />} />
          <Route path="/members/:id" element={<MemberDetailPage />} />
          <Route path="/members/:id/edit" element={<MemberFormPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/quick-sale" element={<QuickSalePage />} />
          <Route path="/cash" element={<CashPage />} />
          <Route path="/checkin" element={<CheckInPage />} />
          <Route path="/portal" element={<PortalPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
