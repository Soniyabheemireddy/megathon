import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { roleLabel } from '../roles';

const NAV = {
  customer: [
    { to: '/customer', end: true, label: 'Dashboard' },
    { to: '/customer/orders', label: 'My Orders' },
    { to: '/customer/returns', label: 'My Returns' },
    { to: '/customer/create-return', label: 'New Return' },
    { to: '/customer/refunds', label: 'Refunds' },
    { to: '/customer/notifications', label: 'Notifications' },
    { to: '/customer/profile', label: 'Profile' },
    { to: '/customer/help', label: 'Help & Support' }
  ],
  service_agent: [
    { to: '/agent', end: true, label: 'Dashboard' },
    { to: '/agent/returns', label: 'Return Requests' },
    { to: '/agent/pending', label: 'Pending Reviews' },
    { to: '/agent/verification', label: 'Verification Requests' },
    { to: '/agent/customers', label: 'Customers' },
    { to: '/agent/orders', label: 'Orders' },
    { to: '/agent/escalated', label: 'Escalated Cases' },
    { to: '/agent/reports', label: 'Reports' },
    { to: '/agent/notifications', label: 'Notifications' },
    { to: '/agent/profile', label: 'Profile' }
  ],
  fraud_analyst: [
    { to: '/fraud', end: true, label: 'Dashboard' },
    { to: '/fraud/queue', label: 'Fraud Queue' },
    { to: '/fraud/high-risk', label: 'High Risk Cases' },
    { to: '/fraud/history', label: 'Case History' },
    { to: '/fraud/notifications', label: 'Notifications' },
    { to: '/fraud/profile', label: 'Profile' }
  ],
  admin: [
    { to: '/admin', end: true, label: 'Dashboard' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/customers', label: 'Customers' },
    { to: '/admin/agents', label: 'Service Agents' },
    { to: '/admin/analysts', label: 'Fraud Analysts' },
    { to: '/admin/returns', label: 'Return Management' },
    { to: '/admin/analytics', label: 'Fraud Analytics' },
    { to: '/admin/reports', label: 'Reports' },
    { to: '/admin/settings', label: 'System Settings' },
    { to: '/admin/profile', label: 'Profile' }
  ]
};

export default function DashboardLayout({ role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const items = NAV[role] || [];
  const base = role === 'service_agent' ? '/agent' : role === 'fraud_analyst' ? '/fraud' : `/${role}`;

  useEffect(() => {
    function loadUnread() {
      api('/notifications').then((d) => setUnread(d.unread || 0)).catch(() => {});
    }
    loadUnread();
    const timer = setInterval(loadUnread, 15000);
    return () => clearInterval(timer);
  }, []);

  function onLogout() {
    logout();
    navigate('/');
  }

  function refreshUnread() {
    return api('/notifications').then((d) => setUnread(d.unread || 0));
  }

  return (
    <div className="app-shell" style={{ display: 'flex' }}>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span>ReturnShield <span style={{ color: '#14B8A6' }}>AI</span></span>
        </div>
        <nav className="sidebar-nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button type="button" className="nav-item nav-logout" onClick={onLogout} style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }}>
          <span>Logout</span>
        </button>
      </aside>
      {open ? <div className="sidebar-overlay active" onClick={() => setOpen(false)} /> : null}
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-toggle" onClick={() => setOpen(true)} type="button">☰</button>
            <div className="topbar-title">{roleLabel(role)} Portal</div>
          </div>
          <div className="topbar-right">
            <button className="topbar-icon-btn" type="button" onClick={() => navigate(`${base}/notifications`)}>
              🔔
              {unread > 0 ? <span className="notif-badge">{unread > 9 ? '9+' : unread}</span> : null}
            </button>
            <div className="topbar-divider" />
            <div className="topbar-user">
              <div className="user-avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
              <span className="user-name">{user?.name}</span>
            </div>
          </div>
        </header>
        <main className="content">
          <Outlet context={{ refreshUnread }} />
        </main>
      </div>
    </div>
  );
}
