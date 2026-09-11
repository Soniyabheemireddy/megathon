import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { CaseActions } from './agent';
import { useLiveData } from '../hooks/useLiveData';
import { DataTable, EmptyState, PageHeader, RiskBadge, RiskBars, StatCard, StatusBadge } from '../components/ui';
import { fmtDate } from '../roles';

export function FraudDashboard() {
  const { data } = useLiveData(() => api('/dashboard'), 4000);
  const navigate = useNavigate();
  if (!data) return <p>Loading…</p>;

  return (
    <>
      <PageHeader title="Fraud Analyst" subtitle="Investigate high-risk returns and decide outcomes." />
      <div className="stat-cards">
        <StatCard color="amber" label="Fraud Queue" value={data.stats.totalFlagged} icon="🚩" />
        <StatCard color="error" label="High Risk" value={data.stats.highRisk} icon="🔴" />
        <StatCard color="error" label="Confirmed Fraud" value={data.stats.confirmedFraud} icon="⚠" />
        <StatCard color="navy" label="Fraud Prevented" value={data.stats.fraudPrevented} icon="🛡️" />
        <StatCard color="teal" label="Pending" value={data.stats.pendingInvestigations} icon="🔎" />
      </div>
      <div className="section-header"><h2>Fraud Queue</h2><Link to="/fraud/queue">Open queue</Link></div>
      <div className="fraud-queue-list">
        {(data.queue || []).map((r) => (
          <button key={r.id} type="button" className={`fraud-queue-item risk-${r.risk?.toLowerCase()}`} onClick={() => navigate(`/fraud/investigate/${r.id}`)}>
            <span className="score">{r.riskScore >= 71 ? '🔴' : r.riskScore >= 31 ? '🟠' : '🟢'} {r.riskScore}</span>
            <span>{r.id} · {r.product} · {r.customerName}</span>
            <StatusBadge status={r.status} />
          </button>
        ))}
        {!data.queue?.length ? <EmptyState title="Queue clear" text="No escalated or high-risk cases right now." /> : null}
      </div>
    </>
  );
}

function FraudList({ title, subtitle, queue, risk }) {
  const { data } = useLiveData(() => {
    const params = new URLSearchParams();
    if (queue) params.set('queue', queue);
    if (risk) params.set('risk', risk);
    return api(`/returns?${params}`).then((d) => d.returns);
  }, 4000, [queue, risk]);
  const rows = data || [];
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      {!rows.length ? <EmptyState title="No cases" text="Nothing in this view." /> : (
        <DataTable
          columns={[
            { key: 'riskScore', label: 'Score', render: (r) => <strong>{r.riskScore}</strong> },
            { key: 'id', label: 'Return' },
            { key: 'product', label: 'Product' },
            { key: 'customerName', label: 'Customer' },
            { key: 'risk', label: 'Risk', render: (r) => <RiskBadge risk={r.risk} /> },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
          ]}
          rows={rows}
          onRowClick={(r) => navigate(`/fraud/investigate/${r.id}`)}
        />
      )}
    </>
  );
}

export function FraudQueue() {
  return <FraudList title="Fraud Queue" subtitle="Escalated and high-risk cases — click to investigate." />;
}
export function FraudHighRisk() {
  return <FraudList title="High Risk Cases" subtitle="Score 71–100." risk="High" />;
}
export function FraudHistory() {
  return <FraudList title="Case History" subtitle="Closed investigation outcomes." queue="history" />;
}

export function FraudInvestigate() {
  const { id } = useParams();
  const { data, reload } = useLiveData(() => api(`/returns/${id}`).then(async (d) => {
    let network = null;
    if (d.return?.customerId) {
      try { network = await api(`/network/${d.return.customerId}`); } catch { /* ignore */ }
    }
    return { ...d, network };
  }), 5000, [id]);

  if (!data) return <p>Loading…</p>;
  const r = data.return;
  const s = data.customerStats || {};
  const rc = r.receiptChecks || {};
  const network = data.network;

  return (
    <>
      <PageHeader title={`Investigate · ${r.id}`} subtitle={`${r.orderId} · ${r.product} · ${r.reason}`} />
      <div className="panel-card">
        <p>AI Risk Score: <strong>{r.riskScore}/100</strong> <RiskBadge risk={r.risk} /></p>
        <ul>{(r.riskReasons || []).map((x) => <li key={x}>{x}</li>)}</ul>
      </div>

      <h3 style={{ marginTop: 20 }}>Risk Breakdown</h3>
      <RiskBars breakdown={r.riskBreakdown} />

      <div className="detail-grid" style={{ marginTop: 20 }}>
        <div className="panel-card">
          <h3>Image Analysis</h3>
          <p>Similarity: <strong>{r.imageSimilarity}%</strong></p>
          {r.similarClaimCode ? <p>Similar claim: {r.similarClaimCode}</p> : <p>No near-duplicate.</p>}
          <div className="image-thumbnails">
            {(r.images || []).map((src, i) => <div className="thumbnail" key={i}><img src={src} alt="" /></div>)}
          </div>
        </div>
        <div className="panel-card">
          <h3>Receipt Check</h3>
          <p>Product: {rc.product ? '✓' : '✗'} · Order: {rc.orderId ? '✓' : '✗'} · Date: {rc.date ? '✓' : '✗'}</p>
          <p>Price: {rc.price ? '✓ Match' : `✗ Original ₹${(rc.priceOriginal || 0).toLocaleString('en-IN')} vs Receipt ₹${(rc.priceReceipt || 0).toLocaleString('en-IN')}`}</p>
        </div>
        <div className="panel-card">
          <h3>Customer Behavior</h3>
          <p>Orders {s.orders} · Returns {s.returns} · Rate {s.returnRate}%</p>
          <p>Fraud flags: {s.previousFraudFlags} · Account age: {s.accountAgeDays}d</p>
        </div>
        <div className="panel-card">
          <h3>Fraud Network</h3>
          {network ? (
            <div className="network-tree">
              <div className="net-node center">{network.center.name}</div>
              <div className="net-branches">
                {(network.relatedCustomers || []).map((c) => <div className="net-node" key={c.id}>{c.name}</div>)}
                {(network.claims || []).map((c) => <div className="net-node muted" key={c.id}>{c.id}</div>)}
              </div>
            </div>
          ) : <p className="muted">No linked accounts.</p>}
        </div>
      </div>

      <CaseActions id={r.id} onDone={reload} showReject requireReason />

      <div className="panel-card" style={{ marginTop: 16 }}>
        <h3>Notes & History</h3>
        {(r.notes || []).map((n, i) => <p key={i}><strong>{n.by}</strong>: {n.text}</p>)}
        {(r.history || []).map((h, i) => <p key={`h${i}`} className="muted">{fmtDate(h.at)} — {h.text}</p>)}
      </div>
    </>
  );
}
