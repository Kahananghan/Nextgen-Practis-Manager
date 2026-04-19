
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, ChatProvider, TimerProvider } from './context';
import DashboardLayout from './components/DashboardLayout';
import ProposalClientView from './components/proposal/ProposalClientView';
import {
  Login,
  ForgotPassword,
  VerifyEmail,
  ResetPassword,
  Dashboard,
  CreateJob,
  EditJob,
  JobDetails,
  Templates,
  Clients,
  Proposals,
  CalendarView,
  UserManagement,
  Roles,
  Permissions,
  ClientPortal,
  DocumentRequests,
  Settings,
  Profile,
  AddClient,
  AddContact,
  TimeTracking,
  Reports
} from './pages';

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366f1] mx-auto mb-4'></div>
          <p className='text-gray-600'>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/portal/:portalToken" element={<ClientPortal />} />
      <Route path="/proposal/:token" element={<ProposalClientView />} />
      {user ? (
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-job" element={<CreateJob />} />
          <Route path="/edit-job/:id" element={<EditJob />} />
          <Route path="/job/:id" element={<JobDetails />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/proposals" element={<Proposals />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/users/roles" element={<Roles />} />
          <Route path="/users/permissions" element={<Permissions />} />
          <Route path="/client-portal" element={<ClientPortal />} />
          <Route path="/document-requests/:id" element={<DocumentRequests />} />
          <Route path="/time-tracking" element={<TimeTracking />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/add-client" element={<AddClient />} />
          <Route path="/add-contact" element={<AddContact />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
          {/* Default dashboard redirect if authenticated */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <ChatProvider>
          <TimerProvider>
            <AppRoutes />
          </TimerProvider>
        </ChatProvider>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;
