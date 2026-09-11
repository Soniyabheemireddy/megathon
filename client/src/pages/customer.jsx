import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { useLiveData } from '../hooks/useLiveData';
import { DataTable, EmptyState, PageHeader, StatCard, StatusBadge, Timeline } from '../components/ui';
import { fmtDate, roleLabel } from '../roles';

function LiveHint({ tick }) {
  return <span className="live-hint">Live · updated {tick > 0 ? 'just now' : '…'}</span>;
}

export function CustomerDashboard() {
  const { user } = useAuth();
  const { data, tick } = useLiveData(() => api('/dashboard'), 4000);

  if (!data) return <p>Loading…</p>;

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(' ')[0]}`}
        subtitle={<><span>Track orders, file returns, and follow refunds. </span><LiveHint tick={tick} /></>}
      />
      <div className="stat-cards">
        <StatCard color="navy" label="Total Orders" value={data.stats.orders} icon="📦" hint="Mock catalog (10)" />
        <StatCard color="teal" label="Active Returns" value={data.stats.activeReturns} icon="↩️" />
        <StatCard color="green" label="Approved Returns" value={data.stats.approvedReturns} icon="✓" />
        <StatCard color="amber" label="Pending Refunds" value={data.stats.pendingRefunds} icon="₹" />
      </div>

      <div className="section-header"><h2>My Orders</h2><Link to="/customer/orders">View all ({data.stats.orders})</Link></div>
      <div className="product-grid">
        {(data.recentOrders || []).map((o) => (
          <div className="product-card" key={o.id}>
            <div className="product-image">{o.icon}</div>
            <div className="product-info">
              <div className="product-name">{o.name}</div>
              <div className="muted">{o.id} · {fmtDate(o.date)}</div>
              <div className="product-price">{o.priceLabel}</div>
              <StatusBadge status={o.status} />
              {o.hasReturn
                ? <button className="btn-return" disabled style={{ opacity: 0.5 }}>Return Filed</button>
                : <Link className="btn-return" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }} to={`/customer/create-return?order=${o.id}`}>Request Return</Link>}
            </div>
          </div>
        ))}
      </div>

      {data.activeReturn ? (
        <>
          <div className="section-header" style={{ marginTop: 28 }}><h2>Active Return</h2><Link to={`/customer/returns/${data.activeReturn.id}`}>Track</Link></div>
          <div className="panel-card">
            <div className="panel-row"><strong>{data.activeReturn.id}</strong> <StatusBadge status={data.activeReturn.customerStatus} /></div>
            <p>{data.activeReturn.product}</p>
            <p className="muted">Expected resolution: {fmtDate(data.activeReturn.expectedResolution)}</p>
            <Link className="btn-primary" style={{ display: 'inline-block', marginTop: 12, textDecoration: 'none' }} to={`/customer/returns/${data.activeReturn.id}`}>Track Return</Link>
          </div>
        </>
      ) : null}
    </>
  );
}

export function CustomerOrders() {
  const { data, tick } = useLiveData(() => api('/orders').then((d) => d.orders), 4000);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const orders = data || [];

  const filtered = useMemo(() => orders.filter((o) => {
    const matchQ = !q || o.name.toLowerCase().includes(q.toLowerCase()) || o.id.toLowerCase().includes(q.toLowerCase());
    const matchS = status === 'all' || o.status === status;
    return matchQ && matchS;
  }), [orders, q, status]);

  return (
    <>
      <PageHeader title="My Orders" subtitle={<><span>10 mock delivered orders · search &amp; request returns. </span><LiveHint tick={tick} /></>} />
      <div className="toolbar">
        <input className="search-input" placeholder="Search orders…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="Delivered">Delivered</option>
        </select>
      </div>
      <div className="orders-list">
        {!filtered.length ? <EmptyState title="No orders" text="No matching orders found." /> : null}
        {filtered.map((o) => (
          <div className="order-card" key={o.id}>
            <div className="order-card-left">
              <div className="order-card-icon">{o.icon}</div>
              <div className="order-card-info">
                <h3>{o.name}</h3>
                <p>{o.id} · Purchased {fmtDate(o.date)} · Delivered {fmtDate(o.deliveredAt)}</p>
                <StatusBadge status={o.status} />
                <p className="muted" style={{ marginTop: 6 }}>{o.returnEligible ? 'Eligible for return' : o.hasReturn ? 'Return already filed' : 'Not eligible'}</p>
              </div>
            </div>
            <div className="order-card-right">
              <span className="order-card-price">{o.priceLabel}</span>
              {o.returnEligible
                ? <Link className="btn-return" style={{ width: 'auto', padding: '8px 16px', textDecoration: 'none' }} to={`/customer/create-return?order=${o.id}`}>Request Return</Link>
                : <button className="btn-return" style={{ width: 'auto', padding: '8px 16px', opacity: 0.5 }} disabled>{o.hasReturn ? 'Return Filed' : 'Unavailable'}</button>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function CreateReturn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preset = params.get('order');
  const [orders, setOrders] = useState([]);
  const [step, setStep] = useState(1);
  const [orderId, setOrderId] = useState(preset || '');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [receiptImage, setReceiptImage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/orders').then((d) => {
      const available = d.orders.filter((o) => o.returnEligible);
      setOrders(available);
      if (preset && available.some((o) => o.id === preset)) {
        setOrderId(preset);
        setStep(2);
      }
    });
  }, [preset]);

  function readFile(file, cb) {
    const reader = new FileReader();
    reader.onload = (ev) => cb(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const data = await api('/returns', {
        method: 'POST',
        body: JSON.stringify({ orderId, reason, description, images, receiptImage })
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const r = result.return;
    return (
      <div className="return-form-container">
        <div className="return-success">
          <h2>Return submitted</h2>
          <p>{result.message || `${r.id} created successfully.`}</p>
          <div className="success-info">
            <div className="success-info-row"><label>Return ID</label><span className="value">{r.id}</span></div>
            <div className="success-info-row"><label>Product</label><span className="value">{r.product}</span></div>
            <div className="success-info-row"><label>Status</label><StatusBadge status={r.customerStatus || r.status} /></div>
          </div>
          <p className="muted">You will receive updates as your return progresses. Internal risk scores are not shown to customers.</p>
          <button className="btn-primary" onClick={() => navigate(`/customer/returns/${r.id}`)}>Track Return</button>
        </div>
      </div>
    );
  }

  const steps = ['Select Order', 'Select Product', 'Return Reason', 'Describe Problem', 'Upload Evidence', 'Submit'];
  const reasons = ['Damaged Product', 'Wrong Product', 'Missing Item', 'Product Not as Described', 'Defective Product', 'Other'];
  const selected = orders.find((o) => o.id === orderId);

  return (
    <div className="return-form-container">
      <h1>New Return</h1>
      <p>Follow the steps to submit a return request.</p>
      <div className="step-indicator">
        {steps.map((label, i) => {
          const n = i + 1;
          const cls = n === step ? 'active' : n < step ? 'done' : '';
          return (
            <div key={label} style={{ display: 'contents' }}>
              <div className={`step-dot ${cls}`}><div className="step-num">{n < step ? '✓' : n}</div><span className="step-label">{label}</span></div>
              {i < steps.length - 1 ? <div className={`step-line ${n < step ? 'done' : ''}`} /> : null}
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <div className="return-step active">
          <h3>1. Select Order</h3>
          {!orders.length ? <EmptyState title="No returnable orders" text="All delivered orders already have returns." /> : (
            <div className="order-options">
              {orders.map((o) => (
                <div key={o.id} className={`order-option ${orderId === o.id ? 'selected' : ''}`} onClick={() => setOrderId(o.id)}>
                  <span className="order-name">{o.icon} {o.id}</span>
                  <span className="order-price">{o.priceLabel}</span>
                </div>
              ))}
            </div>
          )}
          <div className="step-actions">
            <button className="btn-secondary" disabled>Back</button>
            <button className="btn-primary" disabled={!orderId} onClick={() => setStep(2)}>Continue</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="return-step active">
          <h3>2. Select Product</h3>
          <div className="panel-card">
            <div className="product-image" style={{ fontSize: 48 }}>{selected?.icon}</div>
            <h3>{selected?.name}</h3>
            <p>{selected?.id} · {selected?.priceLabel}</p>
            <StatusBadge status={selected?.status} />
          </div>
          <div className="step-actions">
            <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button className="btn-primary" onClick={() => setStep(3)}>Continue</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="return-step active">
          <h3>3. Select Return Reason</h3>
          <div className="reason-options">
            {reasons.map((r) => (
              <label key={r} className={`reason-option ${reason === r ? 'selected' : ''}`} onClick={() => setReason(r)}>
                <input type="radio" checked={reason === r} readOnly />
                <span>{r}</span>
              </label>
            ))}
          </div>
          <div className="step-actions">
            <button className="btn-secondary" onClick={() => setStep(2)}>Back</button>
            <button className="btn-primary" disabled={!reason} onClick={() => setStep(4)}>Continue</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="return-step active">
          <h3>4. Describe Problem</h3>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue in detail (min 10 characters)…" />
          <div className="step-actions">
            <button className="btn-secondary" onClick={() => setStep(3)}>Back</button>
            <button className="btn-primary" disabled={description.trim().length < 10} onClick={() => setStep(5)}>Continue</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="return-step active">
          <h3>5. Upload Evidence</h3>
          <div className="upload-area" onClick={() => document.getElementById('file-input').click()}>
            <p>Product photos</p>
            <span>PNG / JPG — optional video as image placeholder supported</span>
          </div>
          <input id="file-input" type="file" accept="image/*" multiple hidden onChange={(e) => {
            [...e.target.files].forEach((f) => readFile(f, (src) => setImages((imgs) => [...imgs, src].slice(0, 6))));
          }} />
          <div className="image-thumbnails">
            {images.map((src, i) => (
              <div className="thumbnail" key={i}>
                <img src={src} alt="" />
                <button className="thumbnail-remove" type="button" onClick={() => setImages(images.filter((_, idx) => idx !== i))}>✕</button>
              </div>
            ))}
          </div>
          <div className="form-group" style={{ marginTop: 16 }}>
            <label>Receipt / invoice (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && readFile(e.target.files[0], setReceiptImage)} />
            {receiptImage ? <p className="muted">Receipt attached</p> : null}
          </div>
          <div className="step-actions">
            <button className="btn-secondary" onClick={() => setStep(4)}>Back</button>
            <button className="btn-primary" onClick={() => setStep(6)}>Continue</button>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="return-step active">
          <h3>6. Submit Return</h3>
          <div className="review-box">
            <div className="profile-field"><label>Order</label><span className="value">{orderId}</span></div>
            <div className="profile-field"><label>Product</label><span className="value">{selected?.name}</span></div>
            <div className="profile-field"><label>Reason</label><span className="value">{reason}</span></div>
            <div className="profile-field"><label>Evidence</label><span className="value">{images.length} photo(s){receiptImage ? ' + receipt' : ''}</span></div>
            <div className="profile-field"><label>Description</label><span className="value">{description}</span></div>
          </div>
          {error ? <div className="login-error" style={{ marginBottom: 12 }}>{error}</div> : null}
          <div className="step-actions">
            <button className="btn-secondary" onClick={() => setStep(5)}>Back</button>
            <button className="btn-primary" disabled={busy} onClick={submit}>{busy ? 'Submitting…' : 'Submit Return'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CustomerReturns() {
  const navigate = useNavigate();
  const { data, tick } = useLiveData(() => api('/returns').then((d) => d.returns), 4000);
  const returns = data || [];

  return (
    <>
      <PageHeader title="My Returns" subtitle={<><span>Click a return to open the full timeline. </span><LiveHint tick={tick} /></>} />
      {!returns.length ? (
        <EmptyState title="No returns yet" text="Create a return from My Orders." action={<Link className="btn-primary" style={{ display: 'inline-block', marginTop: 16, textDecoration: 'none' }} to="/customer/create-return">New Return</Link>} />
      ) : (
        <DataTable
          columns={[
            { key: 'id', label: 'Return ID' },
            { key: 'product', label: 'Product' },
            { key: 'customerStatus', label: 'Status', render: (r) => <StatusBadge status={r.customerStatus || r.status} /> },
            { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) }
          ]}
          rows={returns}
          onRowClick={(r) => navigate(`/customer/returns/${r.id}`)}
        />
      )}
    </>
  );
}

export function CustomerReturnDetail() {
  const { id } = useParams();
  const { data, reload } = useLiveData(() => api(`/returns/${id}`), 4000, [id]);
  const [images, setImages] = useState([]);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');

  async function uploadEvidence() {
    await api(`/returns/${id}/evidence`, {
      method: 'POST',
      body: JSON.stringify({ images, description: note })
    });
    setMsg('Evidence uploaded — agent will review shortly.');
    setImages([]);
    setNote('');
    reload?.();
  }

  if (!data) return <p>Loading…</p>;
  const r = data.return;

  return (
    <>
      <PageHeader title={r.id} subtitle={`${r.product} · ${r.orderId} · Live tracking`} />
      <div className="panel-card">
        <StatusBadge status={r.customerStatus || r.status} />
        <p style={{ marginTop: 8 }}>{r.reason}</p>
        <p className="muted">{r.description}</p>
        <p className="muted">Expected resolution: {fmtDate(r.expectedResolution)}</p>
      </div>
      <h3 style={{ marginTop: 24 }}>Return Timeline</h3>
      <Timeline steps={r.timeline || []} />
      {r.verificationRequested ? (
        <div className="panel-card" style={{ marginTop: 20 }}>
          <h3>Additional evidence required</h3>
          <p>{(r.verificationItems || []).join(', ')}</p>
          <textarea placeholder="Add notes…" value={note} onChange={(e) => setNote(e.target.value)} />
          <input type="file" accept="image/*" multiple onChange={(e) => {
            [...e.target.files].forEach((f) => {
              const reader = new FileReader();
              reader.onload = (ev) => setImages((imgs) => [...imgs, ev.target.result]);
              reader.readAsDataURL(f);
            });
          }} />
          <button className="btn-primary" style={{ marginTop: 12 }} onClick={uploadEvidence}>Upload Evidence</button>
          {msg ? <p className="muted">{msg}</p> : null}
        </div>
      ) : null}
    </>
  );
}

export function CustomerRefunds() {
  const { data, tick } = useLiveData(
    () => api('/returns').then((d) => d.returns.filter((r) => r.refundStatus && r.refundStatus !== 'Not Started')),
    4000
  );
  const returns = data || [];

  return (
    <>
      <PageHeader title="Refunds" subtitle={<><span>Refund amount, method, status, and reference. </span><LiveHint tick={tick} /></>} />
      {!returns.length ? <EmptyState title="No refunds yet" text="Approved returns appear here once refunds complete." /> : (
        <DataTable
          columns={[
            { key: 'id', label: 'Return' },
            { key: 'refundLabel', label: 'Amount' },
            { key: 'refundMethod', label: 'Method' },
            { key: 'refundStatus', label: 'Status', render: (r) => <StatusBadge status={r.refundStatus} /> },
            { key: 'refundDate', label: 'Date', render: (r) => r.refundDate || '—' },
            { key: 'refundTxn', label: 'Reference', render: (r) => r.refundTxn || '—' }
          ]}
          rows={returns}
        />
      )}
    </>
  );
}

export function HelpPage() {
  return (
    <>
      <PageHeader title="Help & Support" subtitle="How returns work on ReturnShield AI." />
      <div className="panel-card">
        <h3>Return process</h3>
        <ol className="help-list">
          <li>Open My Orders and choose an eligible delivered order.</li>
          <li>Submit reason, description, and evidence.</li>
          <li>Service agents review your case; high-risk claims go to fraud analysts.</li>
          <li>Track progress on My Returns — you only see customer-facing status.</li>
          <li>Approved returns move to pickup and refund.</li>
        </ol>
        <p className="muted">Need help? Email support@returnshield.ai (demo).</p>
      </div>
    </>
  );
}

export function NotificationsPage() {
  const [list, setList] = useState([]);
  const ctx = useOutletContext();
  useEffect(() => {
    api('/notifications').then(async (d) => {
      setList(d.notifications);
      await api('/notifications/read', { method: 'POST' });
      ctx?.refreshUnread?.();
    });
  }, []);

  return (
    <>
      <PageHeader title="Notifications" subtitle="Updates on returns, verification, and refunds." />
      {!list.length ? <EmptyState title="No notifications" text="You're all caught up." /> : null}
      {list.map((n) => (
        <div className="notification-item" key={n.id}>
          <div className={`notif-icon ${n.icon}`}>🔔</div>
          <div className="notif-content">
            <h4>{n.title}</h4>
            <p>{n.msg}</p>
            <div className="notif-time">{fmtDate(n.time)}</div>
          </div>
        </div>
      ))}
    </>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title="Profile" subtitle="Your account details." />
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">{user.name.charAt(0).toUpperCase()}</div>
          <div><h2>{user.name}</h2><p>{user.email}</p></div>
        </div>
        <div className="profile-field"><label>Full Name</label><span className="value">{user.name}</span></div>
        <div className="profile-field"><label>Email</label><span className="value">{user.email}</span></div>
        <div className="profile-field"><label>Phone</label><span className="value">{user.phone || '—'}</span></div>
        <div className="profile-field"><label>Address</label><span className="value">{user.address || '—'}</span></div>
        <div className="profile-field"><label>Role</label><span className="value">{roleLabel(user.role)}</span></div>
        <div className="profile-field"><label>Status</label><StatusBadge status={user.status} /></div>
      </div>
    </>
  );
}
