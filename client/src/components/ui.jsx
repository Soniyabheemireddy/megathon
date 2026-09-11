export function StatusBadge({ status }) {
  const map = {
    Delivered: 'success', Approved: 'success', Completed: 'success', 'Picked Up': 'success', Active: 'success',
    'Refund Processed': 'success',
    Rejected: 'error', Flagged: 'error', Suspended: 'error', 'On Hold': 'error', 'Fraud Confirmed': 'error',
    'Under Review': 'warning', Pending: 'warning', 'Pending Review': 'warning', 'Awaiting Pickup': 'warning',
    'Awaiting Review': 'warning', 'Verification Required': 'warning', 'Additional Evidence Required': 'warning',
    Assigned: 'navy', 'In Transit': 'navy', 'Pickup Scheduled': 'navy', Escalated: 'error',
    'Fraud Queue': 'error', 'Escalated to Admin': 'error', Initiated: 'navy', Denied: 'error'
  };
  return <span className={`status-badge status-${map[status] || 'warning'}`}>{status}</span>;
}

export function RiskBadge({ risk }) {
  const map = { Low: 'success', Medium: 'warning', High: 'error' };
  return <span className={`risk-badge risk-${map[risk] || 'warning'}`}>{risk}</span>;
}

export function StatCard({ icon, color, label, value, hint }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div className="stat-info">
        <label>{label}</label>
        <span className="stat-value">{value}</span>
        {hint ? <span className="stat-trend neutral">{hint}</span> : null}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle }) {
  return (
    <div className="page-greeting">
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Timeline({ steps = [] }) {
  return (
    <div className="rs-timeline">
      {steps.map((s, i) => (
        <div key={s.key || i} className={`rs-timeline-step ${s.state}`}>
          <div className="rs-timeline-marker">{s.state === 'done' ? '✓' : s.state === 'active' ? '●' : '○'}</div>
          <div className="rs-timeline-body">
            <strong>{s.label}</strong>
            {s.at ? <span className="muted">{new Date(s.at).toLocaleString('en-IN')}</span> : null}
          </div>
          {i < steps.length - 1 ? <div className="rs-timeline-line" /> : null}
        </div>
      ))}
    </div>
  );
}

export function RiskBars({ breakdown = {} }) {
  const rows = [
    ['Image Analysis', breakdown.image, 'image'],
    ['Receipt Verification', breakdown.receipt, 'receipt'],
    ['Customer Behavior', breakdown.customer, 'customer'],
    ['Delivery Evidence', breakdown.delivery, 'delivery'],
    ['Claim Analysis', breakdown.claim, 'claim']
  ];
  return (
    <div className="risk-bars">
      {rows.map(([label, score]) => {
        const n = Number(score) || 0;
        const tone = n >= 71 ? 'high' : n >= 31 ? 'med' : 'low';
        return (
          <div className="risk-bar-row" key={label}>
            <span className="risk-bar-label">{label}</span>
            <div className="risk-bar-track"><div className={`risk-bar-fill ${tone}`} style={{ width: `${n}%` }} /></div>
            <span className={`risk-bar-score ${tone}`}>{n}/100</span>
          </div>
        );
      })}
    </div>
  );
}

export function DataTable({ columns, rows, onRowClick }) {
  if (!rows?.length) return null;
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id || row._id} onClick={() => onRowClick?.(row)} className={onRowClick ? 'clickable' : ''}>
              {columns.map((c) => <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
