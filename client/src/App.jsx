import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { roleHome } from './roles';
import {
  CreateReturn,
  CustomerDashboard,
  CustomerOrders,
  CustomerRefunds,
  CustomerReturnDetail,
  CustomerReturns,
  HelpPage,
  NotificationsPage,
  ProfilePage
} from './pages/customer';
import {
  AgentCaseDetail,
  AgentCustomers,
  AgentDashboard,
  AgentEscalated,
  AgentOrders,
  AgentPending,
  AgentReports,
  AgentReturns,
  AgentVerification
} from './pages/agent';
import {
  FraudDashboard,
  FraudHighRisk,
  FraudHistory,
  FraudInvestigate,
  FraudQueue
} from './pages/fraud';
import {
  AdminAgents,
  AdminAnalytics,
  AdminAnalysts,
  AdminCustomers,
  AdminDashboard,
  AdminReports,
  AdminReturns,
  AdminSettings,
  AdminUsers
} from './pages/admin';

function Protected({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="content"><p>Loading…</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={roleHome(user.role)} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route path="/customer" element={<Protected role="customer"><DashboardLayout role="customer" /></Protected>}>
        <Route index element={<CustomerDashboard />} />
        <Route path="orders" element={<CustomerOrders />} />
        <Route path="create-return" element={<CreateReturn />} />
        <Route path="returns" element={<CustomerReturns />} />
        <Route path="returns/:id" element={<CustomerReturnDetail />} />
        <Route path="refunds" element={<CustomerRefunds />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="/agent" element={<Protected role="service_agent"><DashboardLayout role="service_agent" /></Protected>}>
        <Route index element={<AgentDashboard />} />
        <Route path="returns" element={<AgentReturns />} />
        <Route path="returns/:id" element={<AgentCaseDetail />} />
        <Route path="pending" element={<AgentPending />} />
        <Route path="verification" element={<AgentVerification />} />
        <Route path="customers" element={<AgentCustomers />} />
        <Route path="orders" element={<AgentOrders />} />
        <Route path="escalated" element={<AgentEscalated />} />
        <Route path="reports" element={<AgentReports />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="/fraud" element={<Protected role="fraud_analyst"><DashboardLayout role="fraud_analyst" /></Protected>}>
        <Route index element={<FraudDashboard />} />
        <Route path="queue" element={<FraudQueue />} />
        <Route path="high-risk" element={<FraudHighRisk />} />
        <Route path="investigate/:id" element={<FraudInvestigate />} />
        <Route path="history" element={<FraudHistory />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="/admin" element={<Protected role="admin"><DashboardLayout role="admin" /></Protected>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="agents" element={<AdminAgents />} />
        <Route path="analysts" element={<AdminAnalysts />} />
        <Route path="returns" element={<AdminReturns />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="/delivery/*" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
