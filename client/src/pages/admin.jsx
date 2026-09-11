import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { DataTable, EmptyState, PageHeader, RiskBadge, StatCard, StatusBadge } from '../components/ui';
import { roleLabel } from '../roles';

export function AdminDashboard() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();
  useEffect(() => { api('/dashboard').then(setData); }, []);
  if (!data) return <p>Loading…</p>;

  return (
    <>
      <PageHeader title="Admin Dashboard" subtitle="Platform-wide control for ReturnShield AI." />
      <div className="stat-cards">
        <StatCard color="navy" label="Total Users" value={data.stats.totalUsers.toLocaleString('en-IN')} icon="👥" />
        <StatCard color="teal" label="Total Returns" value={data.stats.totalReturns} icon="↩️" />
        <StatCard color="amber" label="Flagged Returns" value={data.stats.flaggedReturns} icon="🚩" />
        <StatCard color="error" label="Confirmed Fraud" value={data.stats.confirmedFraud} icon="⚠" />
        <StatCard color="green" label="Fraud Prevented" value={data.stats.fraudPrevented} icon="🛡️" />
        <StatCard color="amber" label="Pending Investigations" value={data.stats.pendingInvestigations} icon="⏳" />
      </div>
      <div className="section-header"><h2>Recent Returns</h2></div>
      <DataTable
        columns={[
          { key: 'id', label: 'Return' },
          { key: 'customerName', label: 'Customer' },
          { key: 'product', label: 'Product' },
          { key: 'riskScore', label: 'Risk', render: (r) => <><RiskBadge risk={r.risk} /> {r.riskScore}</> },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
        ]}
        rows={data.recentReturns}
        onRowClick={(r) => navigate(`/admin/returns`)}
      />
    </>
  );
}

function UsersManager({ roleFilter, title, subtitle }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: roleFilter || 'customer', status: 'Active' });
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');

  function load() {
    const qs = roleFilter ? `?role=${roleFilter}` : '';
    api(`/users${qs}`).then((d) => setUsers(d.users));
  }
  useEffect(load, [roleFilter]);

  async function createUser(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api('/users', { method: 'POST', body: JSON.stringify(form) });
      setMsg('User created.');
      setForm({ name: '', email: '', phone: '', password: '', role: roleFilter || 'customer', status: 'Active' });
      load();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function toggle(id) {
    await api(`/users/${id}/toggle-status`, { method: 'POST' });
    load();
  }

  const filtered = users.filter((u) => !q || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      {!roleFilter ? (
        <form className="panel-card" onSubmit={createUser} style={{ marginBottom: 20 }}>
          <h3>Create User</h3>
          <div className="form-row-2">
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="customer">Customer</option>
              <option value="service_agent">Service Agent</option>
              <option value="fraud_analyst">Fraud Analyst</option>
              <option value="admin">Admin</option>
            </select>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
          <button className="btn-primary" type="submit" style={{ marginTop: 12 }}>Create User</button>
          {msg ? <p className="muted">{msg}</p> : null}
        </form>
      ) : null}

      <div className="toolbar">
        <input className="search-input" placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <DataTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role', render: (u) => roleLabel(u.role) },
          { key: 'status', label: 'Status', render: (u) => <StatusBadge status={u.status} /> },
          { key: 'orders', label: 'Orders' },
          {
            key: 'actions',
            label: 'Actions',
            render: (u) => (
              <button className="btn-secondary" type="button" onClick={(e) => { e.stopPropagation(); toggle(u.id); }}>
                {u.status === 'Active' ? 'Deactivate' : 'Activate'}
              </button>
            )
          }
        ]}
        rows={filtered}
      />
    </>
  );
}

export function AdminUsers() {
  return <UsersManager title="Users" subtitle="Create, search, activate/deactivate, and change roles." />;
}
export function AdminCustomers() {
  return <UsersManager roleFilter="customer" title="Customers" subtitle="Customer accounts." />;
}
export function AdminAgents() {
  return <UsersManager roleFilter="service_agent" title="Service Agents" subtitle="First-level reviewers." />;
}
export function AdminAnalysts() {
  return <UsersManager roleFilter="fraud_analyst" title="Fraud Analysts" subtitle="Investigation specialists." />;
}

export function AdminReturns() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api('/returns').then((d) => setRows(d.returns)); }, []);
  return (
    <>
      <PageHeader title="Return Management" subtitle="All platform returns." />
      {!rows.length ? <EmptyState title="No returns" text="Returns will appear here." /> : (
        <DataTable
          columns={[
            { key: 'id', label: 'Return' },
            { key: 'customerName', label: 'Customer' },
            { key: 'product', label: 'Product' },
            { key: 'riskScore', label: 'Risk', render: (r) => <><RiskBadge risk={r.risk} /> {r.riskScore}</> },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'refundLabel', label: 'Amount' }
          ]}
          rows={rows}
        />
      )}
    </>
  );
}

export function AdminAnalytics() {
  const [a, setA] = useState(null);
  useEffect(() => { api('/analytics').then(setA); }, []);
  if (!a) return <p>Loading…</p>;
  return (
    <>
      <PageHeader title="Fraud Analytics" subtitle="Returns, fraud, refunds, and risk mix." />
      <div className="stat-cards">
        <StatCard color="teal" label="Total Returns" value={a.totalReturns} icon="↩️" />
        <StatCard color="amber" label="Flagged" value={a.flaggedReturns} icon="🚩" />
        <StatCard color="error" label="Confirmed Fraud" value={a.confirmedFraud} icon="⚠" />
        <StatCard color="green" label="Fraud Prevented" value={a.fraudPrevented} icon="🛡️" />
        <StatCard color="navy" label="Refunds" value={a.totalRefunds} icon="₹" />
        <StatCard color="amber" label="Pending" value={a.pendingInvestigations} icon="⏳" />
      </div>
      <div className="panel-card" style={{ marginTop: 16 }}>
        <h3>Risk distribution</h3>
        <p>Low {a.riskDistribution.low}% · Medium {a.riskDistribution.medium}% · High {a.riskDistribution.high}%</p>
        <div className="dist-bar">
          <span className="low" style={{ width: `${a.riskDistribution.low}%` }} />
          <span className="med" style={{ width: `${a.riskDistribution.medium}%` }} />
          <span className="high" style={{ width: `${a.riskDistribution.high}%` }} />
        </div>
      </div>
      <div className="panel-card" style={{ marginTop: 16 }}>
        <h3>Fraud by category</h3>
        {(a.byReason || []).map((r) => (
          <div key={r.name} className="profile-field"><label>{r.name}</label><span className="value">{r.count}</span></div>
        ))}
      </div>
    </>
  );
}

export function AdminReports() {
  return <AdminAnalytics />;
}

export function AdminSettings() {
  return (
    <>
      <PageHeader title="System Settings" subtitle="Platform defaults for ReturnShield AI." />
      <div className="panel-card">
        <h3>Environment</h3>
        <p>API: MongoDB-backed ReturnShield service</p>
        <p>Auth: JWT · Roles: Customer, Service Agent, Fraud Analyst, Admin</p>
        <p className="muted">Risk scoring runs automatically on each return submission.</p>
      </div>
    </>
  );
}
