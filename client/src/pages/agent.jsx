import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useLiveData } from '../hooks/useLiveData';
import { DataTable, EmptyState, PageHeader, RiskBadge, RiskBars, StatCard, StatusBadge } from '../components/ui';
import { fmtDate } from '../roles';

function CaseActions({ id, onDone, showReject = false, requireReason = false }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState('Additional photos, Receipt, Product serial number');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function act(path, body) {
    setBusy(path);
    setError('');
    try {
      await api(`/returns/${id}/${path}`, { method: 'POST', body: JSON.stringify(body || {}) });
      onDone?.();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="action-panel">
      <h3>Actions</h3>
      {error ? <div className="login-error">{error}</div> : null}
      {(requireReason || showReject) ? (
        <div className="form-group">
          <label>Decision reason {requireReason ? '*' : ''}</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Required before final decision…" />
        </div>
      ) : null}
      <div className="action-row">
        <button className="btn-primary" disabled={!!busy || (requireReason && !reason.trim())} onClick={() => act('approve', { reason })}>
          {busy === 'approve' ? '…' : 'Approve'}
        </button>
        <button className="btn-secondary" disabled={!!busy} onClick={() => act('verify', { items: items.split(',').map((s) => s.trim()).filter(Boolean) })}>
          Request Verification
        </button>
        <button className="btn-secondary" disabled={!!busy} onClick={() => act('escalate', { reason })}>
          Escalate
        </button>
        {showReject ? (
          <>
            <button className="btn-danger" disabled={!!busy || !reason.trim()} onClick={() => act('reject', { reason })}>Reject</button>
            <button className="btn-danger" disabled={!!busy || !reason.trim()} onClick={() => act('reject', { reason, fraudConfirmed: true })}>Confirm Fraud</button>
          </>
        ) : null}
      </div>
      <div className="form-group" style={{ marginTop: 12 }}>
        <label>Verification items</label>
        <input value={items} onChange={(e) => setItems(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Add internal note</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal notes…" />
        <button
          className="btn-secondary"
          style={{ marginTop: 8 }}
          disabled={!note.trim() || !!busy}
          onClick={async () => {
            if (await act('note', { text: note })) setNote('');
          }}
        >
          Add Note
        </button>
      </div>
    </div>
  );
}

export function AgentDashboard() {
  const { data } = useLiveData(() => api('/dashboard'), 4000);
  const navigate = useNavigate();
  if (!data) return <p>Loading…</p>;

  return (
    <>
      <PageHeader title="Service Agent Dashboard" subtitle="First-level return operations · live queue." />
      <div className="stat-cards">
        <StatCard color="teal" label="New Returns" value={data.stats.newReturns} icon="📥" />
        <StatCard color="amber" label="Pending Reviews" value={data.stats.pendingReviews} icon="⏳" />
        <StatCard color="navy" label="Verification Required" value={data.stats.verificationRequired} icon="🔍" />
        <StatCard color="error" label="Escalated Cases" value={data.stats.escalated} icon="🚨" />
        <StatCard color="green" label="Approved Today" value={data.stats.approvedToday} icon="✓" />
        <StatCard color="error" label="Rejected Today" value={data.stats.rejectedToday} icon="✕" />
      </div>
      <div className="section-header"><h2>Return Queue</h2><Link to="/agent/returns">View all</Link></div>
      <DataTable
        columns={[
          { key: 'id', label: 'Return' },
          { key: 'customerName', label: 'Customer' },
          { key: 'product', label: 'Product' },
          { key: 'riskScore', label: 'AI Risk', render: (r) => <><RiskBadge risk={r.risk} /> {r.riskScore}</> },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
        ]}
        rows={data.queue}
        onRowClick={(r) => navigate(`/agent/returns/${r.id}`)}
      />
    </>
  );
}

function AgentQueue({ title, subtitle, queue }) {
  const { data } = useLiveData(() => {
    const q = queue ? `?queue=${queue}` : '';
    return api(`/returns${q}`).then((d) => d.returns);
  }, 4000, [queue]);
  const rows = data || [];
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      {!rows.length ? <EmptyState title="Empty queue" text="No cases in this view." /> : (
        <DataTable
          columns={[
            { key: 'id', label: 'Return' },
            { key: 'customerName', label: 'Customer' },
            { key: 'product', label: 'Product' },
            { key: 'riskScore', label: 'AI Risk', render: (r) => <><RiskBadge risk={r.risk} /> {r.riskScore}</> },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) }
          ]}
          rows={rows}
          onRowClick={(r) => navigate(`/agent/returns/${r.id}`)}
        />
      )}
    </>
  );
}

export function AgentReturns() {
  return <AgentQueue title="Return Requests" subtitle="All active returns in the agent queue." />;
}
export function AgentPending() {
  return <AgentQueue title="Pending Reviews" subtitle="Cases waiting for agent decision." queue="pending" />;
}
export function AgentVerification() {
  return <AgentQueue title="Verification Requests" subtitle="Waiting on customer evidence." queue="verification" />;
}
export function AgentEscalated() {
  return <AgentQueue title="Escalated Cases" subtitle="Sent to fraud / admin." queue="escalated" />;
}

export function AgentCaseDetail() {
  const { id } = useParams();
  const { data, reload } = useLiveData(() => api(`/returns/${id}`), 4000, [id]);
  if (!data) return <p>Loading…</p>;
  const r = data.return;
  const s = data.customerStats || {};

  return (
    <>
      <PageHeader title={r.id} subtitle={`${r.product} · ${r.orderId}`} />
      <div className="detail-grid">
        <div className="panel-card">
          <h3>Customer Information</h3>
          <p><strong>{r.customerName}</strong></p>
          <p className="muted">{r.customerEmail} · {r.customerPhone}</p>
          <p>Previous Returns: {r.previousReturns} · Previous Refunds: {r.previousRefunds}</p>
          <p>Account age: ~{s.accountAgeDays || '—'} days · Orders: {s.orders ?? '—'} · Return rate: {s.returnRate ?? '—'}%</p>
        </div>
        <div className="panel-card">
          <h3>Order Information</h3>
          <p>Order ID: {r.orderId}</p>
          <p>Product: {r.product}</p>
          <p>Price: {r.refundLabel}</p>
          <p>Filed: {fmtDate(r.date)}</p>
        </div>
        <div className="panel-card">
          <h3>Customer Claim</h3>
          <p><strong>{r.reason}</strong></p>
          <p>{r.description}</p>
          <div className="image-thumbnails">
            {(r.images || []).map((src, i) => <div className="thumbnail" key={i}><img src={src} alt="" /></div>)}
          </div>
        </div>
        <div className="panel-card">
          <h3>AI Risk Summary</h3>
          <p>Risk Score: <strong>{r.riskScore}/100</strong> <RiskBadge risk={r.risk} /></p>
          <ul>{(r.riskReasons || []).map((x) => <li key={x}>{x}</li>)}</ul>
          <RiskBars breakdown={r.riskBreakdown} />
        </div>
      </div>
      <CaseActions id={r.id} onDone={reload} />
      <div className="panel-card" style={{ marginTop: 16 }}>
        <h3>Notes & History</h3>
        {(r.notes || []).map((n, i) => <p key={i}><strong>{n.by}</strong>: {n.text}</p>)}
        {(r.history || []).map((h, i) => <p key={`h${i}`} className="muted">{h.text}</p>)}
      </div>
    </>
  );
}

export function AgentCustomers() {
  const [users, setUsers] = useState([]);
  useEffect(() => { api('/users?role=customer').then((d) => setUsers(d.users)); }, []);
  return (
    <>
      <PageHeader title="Customers" subtitle="Customer accounts visible to agents." />
      <DataTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'orders', label: 'Orders' },
          { key: 'returns', label: 'Returns' },
          { key: 'status', label: 'Status', render: (u) => <StatusBadge status={u.status} /> }
        ]}
        rows={users}
      />
    </>
  );
}

export function AgentOrders() {
  const [orders, setOrders] = useState([]);
  useEffect(() => { api('/orders').then((d) => setOrders(d.orders)); }, []);
  return (
    <>
      <PageHeader title="Orders" subtitle="Platform orders." />
      <DataTable
        columns={[
          { key: 'id', label: 'Order' },
          { key: 'name', label: 'Product' },
          { key: 'priceLabel', label: 'Price' },
          { key: 'status', label: 'Status', render: (o) => <StatusBadge status={o.status} /> },
          { key: 'date', label: 'Date', render: (o) => fmtDate(o.date) }
        ]}
        rows={orders}
      />
    </>
  );
}

export function AgentReports() {
  const [a, setA] = useState(null);
  useEffect(() => { api('/analytics').then(setA); }, []);
  if (!a) return <p>Loading…</p>;
  return (
    <>
      <PageHeader title="Reports" subtitle="Basic operational metrics." />
      <div className="stat-cards">
        <StatCard color="navy" label="Total Returns" value={a.totalReturns} icon="↩️" />
        <StatCard color="green" label="Approved" value={a.approved} icon="✓" />
        <StatCard color="error" label="Rejected" value={a.rejected} icon="✕" />
        <StatCard color="amber" label="Pending" value={a.pendingInvestigations} icon="⏳" />
      </div>
    </>
  );
}

export { CaseActions };
