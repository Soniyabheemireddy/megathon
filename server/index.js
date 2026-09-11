import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User, Order, ReturnClaim, Notification, AuditLog, SystemConfig } from './models.js';
import {
  ensureSeed, nextId, formatINR, scoreReturnRisk, notify, audit,
  publicUser, mapReturn, mapOrder, getConfig, defaultTimeline, setTimeline, roleHome
} from './seed.js';
import { authRequired, requireRole, signToken } from './auth.js';

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '8mb' }));

let ready;
async function connectDb() {
  if (mongoose.connection.readyState === 1) return;
  if (!MONGODB_URI) throw new Error('MONGODB_URI is required. Set it to your MongoDB Atlas connection string.');
  if (!ready) {
    ready = mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 }).then(async () => {
      console.log('Connected to MongoDB');
      await ensureSeed();
    });
  }
  await ready;
}

app.use(async (_req, _res, next) => {
  try {
    await connectDb();
    next();
  } catch (err) {
    next(err);
  }
});

async function loadReturn(code) {
  return ReturnClaim.findOne({ code })
    .populate('customer')
    .populate('assignedAgent', 'name email')
    .populate('assignedAnalyst', 'name email');
}

function staffRoles(...roles) {
  return requireRole(...roles);
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'ReturnShield API', db: 'mongodb' }));

/* ===================== AUTH ===================== */
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, phone, password, address, role } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: 'Full name is required' });
    if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });
    if (!phone?.trim()) return res.status(400).json({ error: 'Phone is required' });
    if (!password) return res.status(400).json({ error: 'Password is required' });
    if (!address?.trim()) return res.status(400).json({ error: 'Address is required' });
    if (role && role !== 'customer') {
      return res.status(403).json({ error: 'Only customer accounts can self-register. Staff accounts are admin-managed.' });
    }
    if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!/^[0-9]{10}$/.test(String(phone))) return res.status(400).json({ error: 'Enter a valid 10-digit phone number' });

    const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    const user = await User.create({
      email: String(email).toLowerCase().trim(),
      password: bcrypt.hashSync(password, 10),
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      role: 'customer',
      status: 'Active',
      seeded: false
    });

    const products = [
      ['iPhone 15', '📱', 70000],
      ['Sony WH-1000XM5', '🎧', 29990],
      ['Nike Air Max', '👟', 12999],
      ['Samsung Galaxy Buds', '🎵', 8999],
      ['Kindle Paperwhite', '📚', 14999],
      ['Logitech MX Master 3S', '🖱️', 9995],
      ['Apple Watch SE', '⌚', 29900],
      ['Dyson Airwrap', '💨', 44900],
      ['Levi\'s Denim Jacket', '🧥', 4999],
      ['Instant Pot Duo', '🍲', 7999]
    ];
    for (const [pname, icon, price] of products) {
      await Order.create({
        code: await nextId('ord'),
        customer: user._id,
        productName: pname,
        productIcon: icon,
        price,
        address: address.trim(),
        status: 'Delivered',
        deliveredAt: new Date()
      });
    }
    await notify(user._id, 'teal', 'Welcome to ReturnShield', 'Your account is ready. Sample orders were added — try creating a return.');
    const admin = await User.findOne({ role: 'admin' });
    if (admin) await notify(admin._id, 'navy', 'New Customer Registered', `${user.name} signed up.`);
    await audit(user.name, 'customer', 'Customer signed up', '', user.email);

    res.status(201).json({ token: signToken(user), user: publicUser(user), home: roleHome(user.role) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body || {};
    if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });
    if (!password) return res.status(400).json({ error: 'Password is required' });
    if (!role) return res.status(400).json({ error: 'Role is required' });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (user.role !== role) {
      return res.status(401).json({ error: `That account is registered as ${user.role.replace('_', ' ')}. Select the correct role.` });
    }
    if (user.status === 'Suspended' && user.role !== 'admin') {
      return res.status(403).json({ error: 'This account is suspended' });
    }
    res.json({ token: signToken(user), user: publicUser(user), home: roleHome(user.role) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', authRequired, (req, res) => {
  res.json({ user: publicUser(req.user), home: roleHome(req.user.role) });
});

/* ===================== ORDERS ===================== */
app.get('/api/orders', authRequired, async (req, res) => {
  let query = {};
  if (req.user.role === 'customer') query = { customer: req.user._id };
  else if (!['admin', 'service_agent'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (req.query.customerId && req.user.role !== 'customer') query.customer = req.query.customerId;

  const orders = await Order.find(query).sort({ createdAt: -1 });
  const returns = await ReturnClaim.find(
    req.user.role === 'customer' ? { customer: req.user._id } : {}
  ).select('orderCode');
  const returned = new Set(returns.map((r) => r.orderCode));
  res.json({ orders: orders.map((o) => mapOrder(o, returned.has(o.code))) });
});

app.get('/api/orders/:id', authRequired, async (req, res) => {
  const order = await Order.findOne({ code: req.params.id }).populate('customer', 'name email');
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (req.user.role === 'customer' && String(order.customer._id || order.customer) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const hasReturn = !!(await ReturnClaim.findOne({ orderCode: order.code }));
  res.json({ order: mapOrder(order, hasReturn) });
});

/* ===================== RETURNS ===================== */
app.get('/api/returns', authRequired, async (req, res) => {
  let query = {};
  const { queue, status, risk } = req.query;

  if (req.user.role === 'customer') {
    query = { customer: req.user._id };
  } else if (req.user.role === 'service_agent') {
    if (queue === 'pending') query = { status: { $in: ['Pending Review', 'Under Review'] } };
    else if (queue === 'verification') query = { status: 'Verification Required' };
    else if (queue === 'escalated') query = { escalated: true };
    else query = { status: { $nin: ['Refund Processed', 'Rejected', 'Fraud Confirmed'] } };
  } else if (req.user.role === 'fraud_analyst') {
    if (queue === 'high') query = { risk: 'High' };
    else if (queue === 'history') query = { status: { $in: ['Approved', 'Rejected', 'Fraud Confirmed', 'Refund Processed'] } };
    else query = { $or: [{ escalated: true }, { status: { $in: ['Fraud Queue', 'Escalated', 'Flagged'] } }, { risk: 'High' }] };
  }
  if (status) query.status = status;
  if (risk) query.risk = risk;

  const rows = await ReturnClaim.find(query)
    .populate('customer')
    .populate('assignedAgent', 'name email')
    .populate('assignedAnalyst', 'name email')
    .sort({ riskScore: -1, createdAt: -1 });

  const hideRisk = req.user.role === 'customer';
  res.json({ returns: rows.map((r) => mapReturn(r, { hideRisk })) });
});

app.get('/api/returns/:id', authRequired, async (req, res) => {
  const r = await loadReturn(req.params.id);
  if (!r) return res.status(404).json({ error: 'Return not found' });
  if (req.user.role === 'customer' && String(r.customer._id) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const hideRisk = req.user.role === 'customer';
  const payload = { return: mapReturn(r, { hideRisk }) };
  if (!hideRisk) {
    const orders = await Order.countDocuments({ customer: r.customer._id });
    const returns = await ReturnClaim.countDocuments({ customer: r.customer._id });
    payload.customerStats = {
      orders,
      returns,
      returnRate: orders ? Math.round((returns / orders) * 1000) / 10 : 0,
      previousFraudFlags: r.customer.fraudFlags || 0,
      accountAgeDays: Math.max(1, Math.floor((Date.now() - new Date(r.customer.createdAt).getTime()) / 86400000))
    };
  }
  res.json(payload);
});

app.post('/api/returns', authRequired, requireRole('customer'), async (req, res) => {
  try {
    const { orderId, reason, description, images, receiptImage, videoUrl } = req.body || {};
    if (!orderId) return res.status(400).json({ error: 'Order is required' });
    if (!reason) return res.status(400).json({ error: 'Reason is required' });
    if (!description || String(description).trim().length < 10) {
      return res.status(400).json({ error: 'Description is required (min 10 characters)' });
    }

    const order = await Order.findOne({ code: orderId, customer: req.user._id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'Delivered') return res.status(400).json({ error: 'Order is not eligible for return' });

    const existing = await ReturnClaim.findOne({ orderCode: orderId });
    if (existing) return res.status(409).json({ error: 'A return already exists for this order' });

    const priorCount = await ReturnClaim.countDocuments({ customer: req.user._id });
    const imageList = Array.isArray(images) ? images.slice(0, 6) : [];
    const scored = await scoreReturnRisk(req.user, priorCount, reason, description || '', imageList.length, order.price);

    let status = 'Pending Review';
    let customerStatus = 'Under Review';
    let pickupStatus = 'Awaiting Review';
    let escalated = false;
    let assignedAnalyst = null;
    const agent = await User.findOne({ role: 'service_agent', status: 'Active' }).sort({ createdAt: 1 });
    const analyst = await User.findOne({ role: 'fraud_analyst', status: 'Active' }).sort({ createdAt: 1 });
    const admin = await User.findOne({ role: 'admin' });

    const timeline = defaultTimeline({
      requested: 'done',
      evidence: imageList.length || receiptImage ? 'done' : 'active',
      ai: 'done',
      agent: 'active'
    });

    if (scored.risk === 'High') {
      status = 'Fraud Queue';
      customerStatus = 'Under Review';
      pickupStatus = 'On Hold';
      escalated = true;
      assignedAnalyst = analyst?._id || null;
      setTimeline({ timeline }, { agent: 'done', fraud: 'active' });
      // timeline mutated in place
    }

    const code = await nextId('ret');
    const expected = new Date();
    expected.setDate(expected.getDate() + (scored.risk === 'High' ? 10 : scored.risk === 'Medium' ? 5 : 3));

    const claim = await ReturnClaim.create({
      code,
      order: order._id,
      orderCode: order.code,
      customer: req.user._id,
      productName: order.productName,
      reason,
      description: description || '',
      images: imageList,
      receiptImage: receiptImage || '',
      videoUrl: videoUrl || '',
      status,
      customerStatus,
      risk: scored.risk,
      riskScore: scored.score,
      riskBreakdown: scored.breakdown,
      riskReasons: scored.reasons,
      imageSimilarity: scored.imageSimilarity,
      similarClaimCode: scored.similarClaimCode,
      receiptChecks: scored.receiptChecks,
      refundAmount: order.price,
      refundStatus: 'Not Started',
      pickupStatus,
      pickupAddress: req.user.address || order.address,
      expectedResolution: expected.toISOString(),
      assignedAgent: agent?._id || null,
      assignedAnalyst,
      escalated,
      timeline,
      history: [
        { at: new Date().toISOString(), text: 'Return requested', by: req.user.name, role: 'customer' },
        { at: new Date().toISOString(), text: 'Evidence submitted', by: req.user.name, role: 'customer' },
        { at: new Date().toISOString(), text: `AI scored ${scored.risk} risk (${scored.score})`, by: 'ReturnShield AI', role: 'system' }
      ]
    });

    req.user.previousReturns = (req.user.previousReturns || 0) + 1;
    await req.user.save();

    await notify(req.user._id, 'teal', 'Return request received', `Your return request ${code} has been received.`);
    if (agent) await notify(agent._id, 'teal', 'New return request', `${code} requires review.`);
    if (scored.risk === 'High' && analyst) {
      await notify(analyst._id, 'amber', 'High-risk case routed', `${code} entered the fraud queue (score ${scored.score}).`);
    }
    if (admin) {
      await notify(admin._id, scored.risk === 'High' ? 'amber' : 'navy', 'New return submitted', `${code} by ${req.user.name} — ${scored.risk} risk.`);
    }
    await audit(req.user.name, 'customer', `Submitted return ${code}`, code, `Risk ${scored.score}`);

    const populated = await loadReturn(code);
    res.status(201).json({
      return: mapReturn(populated, { hideRisk: true }),
      message: `Return Request ${code} created successfully.`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/returns/:id/evidence', authRequired, requireRole('customer'), async (req, res) => {
  const r = await ReturnClaim.findOne({ code: req.params.id, customer: req.user._id });
  if (!r) return res.status(404).json({ error: 'Return not found' });
  const { images, description } = req.body || {};
  if (Array.isArray(images) && images.length) r.images = [...(r.images || []), ...images].slice(0, 8);
  if (description) r.description = `${r.description}\n\n[Update] ${description}`;
  r.verificationRequested = false;
  r.status = 'Pending Review';
  r.customerStatus = 'Under Review';
  r.history.push({ at: new Date().toISOString(), text: 'Customer uploaded additional evidence', by: req.user.name, role: 'customer' });
  setTimeline(r, { evidence: 'done', agent: 'active' });
  await r.save();
  if (r.assignedAgent) await notify(r.assignedAgent, 'teal', 'Evidence updated', `${r.code} has new customer evidence.`);
  await audit(req.user.name, 'customer', `Uploaded evidence for ${r.code}`, r.code);
  res.json({ return: mapReturn(await loadReturn(r.code), { hideRisk: true }) });
});

/* ===================== AGENT ACTIONS ===================== */
app.post('/api/returns/:id/approve', authRequired, staffRoles('service_agent', 'fraud_analyst', 'admin'), async (req, res) => {
  const r = await loadReturn(req.params.id);
  if (!r) return res.status(404).json({ error: 'Return not found' });
  const reason = (req.body?.reason || '').trim();
  if (req.user.role === 'fraud_analyst' && !reason) {
    return res.status(400).json({ error: 'Decision reason is required' });
  }

  r.status = 'Refund Processed';
  r.customerStatus = 'Refund Processed';
  r.pickupStatus = 'Picked Up';
  r.refundStatus = 'Completed';
  r.refundMethod = r.refundMethod || 'Original Payment Method';
  r.refundDate = new Date().toISOString().slice(0, 10);
  r.refundTxn = `TXN-${Math.floor(10000 + Math.random() * 89999)}`;
  r.decisionReason = reason;
  r.escalated = false;
  r.verificationRequested = false;
  setTimeline(r, {
    agent: 'done',
    fraud: 'done',
    approved: 'done',
    pickup: 'done',
    inspection: 'done',
    refund: 'done'
  });
  r.history.push({
    at: new Date().toISOString(),
    text: `Approved by ${req.user.name}${reason ? `: ${reason}` : ''}`,
    by: req.user.name,
    role: req.user.role
  });
  r.history.push({
    at: new Date().toISOString(),
    text: `Refund ${formatINR(r.refundAmount)} completed (${r.refundTxn})`,
    by: 'System',
    role: 'system'
  });
  await r.save();

  if (r.customer?.previousRefunds !== undefined) {
    r.customer.previousRefunds = (r.customer.previousRefunds || 0) + 1;
    await r.customer.save();
  }

  const cust = r.customer._id || r.customer;
  await notify(cust, 'green', 'Return approved', `Your return ${r.code} has been approved.`);
  await notify(cust, 'green', 'Refund processed', `Your refund of ${formatINR(r.refundAmount)} has been processed. Ref: ${r.refundTxn}`);
  await audit(req.user.name, req.user.role, `Approved ${r.code}`, r.code, reason);
  res.json({ return: mapReturn(await loadReturn(r.code)) });
});

app.post('/api/returns/:id/reject', authRequired, staffRoles('fraud_analyst', 'admin'), async (req, res) => {
  const r = await loadReturn(req.params.id);
  if (!r) return res.status(404).json({ error: 'Return not found' });
  const reason = (req.body?.reason || '').trim();
  if (!reason) return res.status(400).json({ error: 'Decision reason is required' });

  const fraud = !!req.body?.fraudConfirmed;
  r.status = fraud ? 'Fraud Confirmed' : 'Rejected';
  r.customerStatus = fraud ? 'Rejected' : 'Rejected';
  r.pickupStatus = 'On Hold';
  r.refundStatus = 'Denied';
  r.decisionReason = reason;
  r.history.push({
    at: new Date().toISOString(),
    text: `${fraud ? 'Fraud confirmed' : 'Rejected'} by ${req.user.name}: ${reason}`,
    by: req.user.name,
    role: req.user.role
  });
  if (fraud && r.customer?.fraudFlags !== undefined) {
    r.customer.fraudFlags = (r.customer.fraudFlags || 0) + 1;
    await r.customer.save();
  }
  await r.save();
  await notify(r.customer._id || r.customer, 'amber', 'Return decision', `${r.code} was ${fraud ? 'rejected due to policy' : 'rejected'} after review.`);
  await audit(req.user.name, req.user.role, `${fraud ? 'Fraud confirmed' : 'Rejected'} ${r.code}`, r.code, reason);
  res.json({ return: mapReturn(await loadReturn(r.code)) });
});

app.post('/api/returns/:id/verify', authRequired, staffRoles('service_agent', 'fraud_analyst', 'admin'), async (req, res) => {
  const r = await loadReturn(req.params.id);
  if (!r) return res.status(404).json({ error: 'Return not found' });
  const items = Array.isArray(req.body?.items) ? req.body.items : ['Additional photos'];
  r.status = 'Verification Required';
  r.customerStatus = 'Additional Evidence Required';
  r.verificationRequested = true;
  r.verificationItems = items;
  r.history.push({
    at: new Date().toISOString(),
    text: `Verification requested: ${items.join(', ')}`,
    by: req.user.name,
    role: req.user.role
  });
  await r.save();
  await notify(r.customer._id || r.customer, 'amber', 'Additional evidence required', `Please provide: ${items.join(', ')} for ${r.code}.`);
  await audit(req.user.name, req.user.role, `Requested verification for ${r.code}`, r.code, items.join(', '));
  res.json({ return: mapReturn(await loadReturn(r.code)) });
});

app.post('/api/returns/:id/escalate', authRequired, staffRoles('service_agent', 'fraud_analyst', 'admin'), async (req, res) => {
  const r = await loadReturn(req.params.id);
  if (!r) return res.status(404).json({ error: 'Return not found' });
  const toAdmin = req.body?.toAdmin || req.user.role === 'fraud_analyst';
  const analyst = await User.findOne({ role: 'fraud_analyst', status: 'Active' });
  const admin = await User.findOne({ role: 'admin' });

  r.escalated = true;
  if (toAdmin) {
    r.status = 'Escalated to Admin';
    r.history.push({ at: new Date().toISOString(), text: `Escalated to Admin: ${req.body?.reason || ''}`, by: req.user.name, role: req.user.role });
    if (admin) await notify(admin._id, 'amber', 'Case escalated to admin', `${r.code} needs management review.`);
  } else {
    r.status = 'Fraud Queue';
    r.assignedAnalyst = analyst?._id || null;
    setTimeline(r, { agent: 'done', fraud: 'active' });
    r.history.push({ at: new Date().toISOString(), text: `Escalated to Fraud Analyst: ${req.body?.reason || ''}`, by: req.user.name, role: req.user.role });
    if (analyst) await notify(analyst._id, 'amber', 'High-risk case escalated', `${r.code} has been escalated.`);
  }
  await r.save();
  await notify(r.customer._id || r.customer, 'navy', 'Return under advanced review', `Your return ${r.code} is under additional review.`);
  await audit(req.user.name, req.user.role, `Escalated ${r.code}`, r.code, req.body?.reason || '');
  res.json({ return: mapReturn(await loadReturn(r.code)) });
});

app.post('/api/returns/:id/note', authRequired, staffRoles('service_agent', 'fraud_analyst', 'admin'), async (req, res) => {
  const r = await loadReturn(req.params.id);
  if (!r) return res.status(404).json({ error: 'Return not found' });
  const text = (req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Note text is required' });
  r.notes.push({ at: new Date().toISOString(), text, by: req.user.name, role: req.user.role });
  r.history.push({ at: new Date().toISOString(), text: `Note: ${text}`, by: req.user.name, role: req.user.role });
  await r.save();
  await audit(req.user.name, req.user.role, `Added note on ${r.code}`, r.code, text);
  res.json({ return: mapReturn(await loadReturn(r.code)) });
});

/* ===================== USERS / ADMIN ===================== */
app.get('/api/users', authRequired, staffRoles('admin', 'service_agent'), async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.user.role === 'service_agent') filter.role = 'customer';
  const users = await User.find(filter).sort({ createdAt: -1 });
  const result = [];
  for (const u of users) {
    const orders = await Order.countDocuments({ customer: u._id });
    const returns = await ReturnClaim.countDocuments({ customer: u._id });
    result.push({ ...publicUser(u), orders, returns });
  }
  res.json({ users: result });
});

app.post('/api/users', authRequired, requireRole('admin'), async (req, res) => {
  const { name, email, phone, password, role, status, address } = req.body || {};
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'Name, email, password and role are required' });
  if (!['customer', 'service_agent', 'fraud_analyst', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (await User.findOne({ email: String(email).toLowerCase().trim() })) {
    return res.status(409).json({ error: 'Email already exists' });
  }
  const user = await User.create({
    name: name.trim(),
    email: String(email).toLowerCase().trim(),
    phone: phone || '',
    address: address || '',
    password: bcrypt.hashSync(password, 10),
    role,
    status: status === 'Suspended' ? 'Suspended' : 'Active'
  });
  await audit(req.user.name, 'admin', `Created user ${user.email}`, '', role);
  res.status(201).json({ user: publicUser(user) });
});

app.patch('/api/users/:id', authRequired, requireRole('admin'), async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { name, phone, address, role, status, password } = req.body || {};
  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (address !== undefined) user.address = address;
  if (role && ['customer', 'service_agent', 'fraud_analyst', 'admin'].includes(role)) user.role = role;
  if (status && ['Active', 'Suspended'].includes(status)) user.status = status;
  if (password) user.password = bcrypt.hashSync(password, 10);
  await user.save();
  await audit(req.user.name, 'admin', `Updated user ${user.email}`, '', JSON.stringify({ role: user.role, status: user.status }));
  res.json({ user: publicUser(user) });
});

app.post('/api/users/:id/toggle-status', authRequired, requireRole('admin'), async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'admin' && String(user._id) === String(req.user._id)) {
    return res.status(400).json({ error: 'Cannot suspend yourself' });
  }
  user.status = user.status === 'Active' ? 'Suspended' : 'Active';
  await user.save();
  await notify(user._id, 'amber', `Account ${user.status}`, `An admin set your account to ${user.status}.`);
  await audit(req.user.name, 'admin', `Set ${user.email} to ${user.status}`);
  res.json({ user: publicUser(user) });
});

/* ===================== CONFIG / AUDIT / ANALYTICS ===================== */
app.get('/api/config', authRequired, requireRole('admin'), async (_req, res) => {
  const cfg = await getConfig();
  res.json({
    weights: cfg.weights,
    thresholds: cfg.thresholds,
    rules: cfg.rules
  });
});

app.put('/api/config', authRequired, requireRole('admin'), async (req, res) => {
  const cfg = await getConfig();
  if (req.body.weights) cfg.weights = { ...cfg.weights.toObject?.() || cfg.weights, ...req.body.weights };
  if (req.body.thresholds) cfg.thresholds = { ...cfg.thresholds.toObject?.() || cfg.thresholds, ...req.body.thresholds };
  if (Array.isArray(req.body.rules)) cfg.rules = req.body.rules;
  await cfg.save();
  await audit(req.user.name, 'admin', 'Updated AI configuration / fraud rules');
  res.json({ weights: cfg.weights, thresholds: cfg.thresholds, rules: cfg.rules });
});

app.get('/api/audit', authRequired, requireRole('admin'), async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.returnCode) filter.returnCode = req.query.returnCode;
  const rows = await AuditLog.find(filter).sort({ at: -1 }).limit(100);
  res.json({
    logs: rows.map((l) => ({
      id: String(l._id),
      at: l.at,
      actor: l.actor,
      role: l.role,
      action: l.action,
      returnCode: l.returnCode,
      meta: l.meta
    }))
  });
});

app.get('/api/analytics', authRequired, staffRoles('admin', 'fraud_analyst', 'service_agent'), async (req, res) => {
  const all = await ReturnClaim.find();
  const approved = all.filter((r) => ['Approved', 'Refund Processed'].includes(r.status)).length;
  const rejected = all.filter((r) => ['Rejected', 'Fraud Confirmed'].includes(r.status)).length;
  const flagged = all.filter((r) => r.risk === 'High' || r.escalated).length;
  const fraud = all.filter((r) => r.status === 'Fraud Confirmed').length;
  const pending = all.filter((r) => ['Pending Review', 'Verification Required', 'Fraud Queue', 'Escalated', 'Escalated to Admin'].includes(r.status)).length;
  const prevented = all.filter((r) => ['Rejected', 'Fraud Confirmed'].includes(r.status)).reduce((s, r) => s + r.refundAmount, 0);
  const refunds = all.filter((r) => ['Approved', 'Refund Processed'].includes(r.status)).reduce((s, r) => s + r.refundAmount, 0);
  const total = all.length || 1;

  res.json({
    totalUsers: await User.countDocuments(),
    totalReturns: all.length,
    flaggedReturns: flagged,
    confirmedFraud: fraud,
    fraudPrevented: formatINR(prevented),
    fraudPreventedRaw: prevented,
    pendingInvestigations: pending,
    approved,
    rejected,
    totalRefunds: formatINR(refunds),
    customers: await User.countDocuments({ role: 'customer' }),
    agents: await User.countDocuments({ role: 'service_agent' }),
    analysts: await User.countDocuments({ role: 'fraud_analyst' }),
    riskDistribution: {
      low: Math.round((all.filter((r) => r.risk === 'Low').length / total) * 100),
      medium: Math.round((all.filter((r) => r.risk === 'Medium').length / total) * 100),
      high: Math.round((all.filter((r) => r.risk === 'High').length / total) * 100)
    },
    byReason: Object.entries(all.reduce((acc, r) => {
      acc[r.reason] = (acc[r.reason] || 0) + 1;
      return acc;
    }, {})).map(([name, count]) => ({ name, count }))
  });
});

app.get('/api/notifications', authRequired, async (req, res) => {
  const rows = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({
    notifications: rows.map((n) => ({
      id: String(n._id),
      icon: n.icon,
      title: n.title,
      msg: n.message,
      time: n.createdAt,
      read: !!n.read
    })),
    unread: rows.filter((n) => !n.read).length
  });
});

app.post('/api/notifications/read', authRequired, async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
  res.json({ ok: true });
});

app.get('/api/dashboard', authRequired, async (req, res) => {
  if (req.user.role === 'customer') {
    const orders = await Order.find({ customer: req.user._id }).sort({ createdAt: -1 });
    const returns = await ReturnClaim.find({ customer: req.user._id }).sort({ createdAt: -1 });
    const active = returns.filter((r) => !['Refund Processed', 'Rejected', 'Fraud Confirmed'].includes(r.status));
    const approved = returns.filter((r) => ['Approved', 'Refund Processed'].includes(r.status));
    const pendingRefunds = returns.filter((r) => r.refundStatus === 'Initiated').length;
    const returned = new Set(returns.map((x) => x.orderCode));
    return res.json({
      stats: {
        orders: orders.length,
        activeReturns: active.length,
        approvedReturns: approved.length,
        pendingRefunds
      },
      recentOrders: orders.slice(0, 10).map((o) => mapOrder(o, returned.has(o.code))),
      activeReturn: active[0] ? mapReturn(active[0], { hideRisk: true }) : null,
      refunds: returns.filter((r) => r.refundStatus !== 'Not Started').map((r) => mapReturn(r, { hideRisk: true }))
    });
  }

  if (req.user.role === 'service_agent') {
    const all = await ReturnClaim.find().populate('customer', 'name email').sort({ createdAt: -1 });
    const today = new Date().toDateString();
    return res.json({
      stats: {
        newReturns: all.filter((r) => r.status === 'Pending Review').length,
        pendingReviews: all.filter((r) => ['Pending Review', 'Under Review'].includes(r.status)).length,
        verificationRequired: all.filter((r) => r.status === 'Verification Required').length,
        escalated: all.filter((r) => r.escalated).length,
        approvedToday: all.filter((r) => ['Approved', 'Refund Processed'].includes(r.status) && new Date(r.updatedAt).toDateString() === today).length,
        rejectedToday: all.filter((r) => ['Rejected', 'Fraud Confirmed'].includes(r.status) && new Date(r.updatedAt).toDateString() === today).length
      },
      queue: all.filter((r) => !['Refund Processed', 'Rejected', 'Fraud Confirmed'].includes(r.status)).slice(0, 10).map((r) => mapReturn(r))
    });
  }

  if (req.user.role === 'fraud_analyst') {
    const all = await ReturnClaim.find().populate('customer', 'name email').sort({ riskScore: -1 });
    const queue = all.filter((r) => r.escalated || r.risk === 'High' || ['Fraud Queue', 'Escalated'].includes(r.status));
    return res.json({
      stats: {
        totalFlagged: queue.length,
        highRisk: all.filter((r) => r.risk === 'High').length,
        mediumRisk: all.filter((r) => r.risk === 'Medium').length,
        confirmedFraud: all.filter((r) => r.status === 'Fraud Confirmed').length,
        falsePositives: all.filter((r) => r.risk === 'High' && r.status === 'Approved').length,
        fraudPrevented: formatINR(all.filter((r) => r.status === 'Fraud Confirmed').reduce((s, r) => s + r.refundAmount, 0)),
        pendingInvestigations: queue.filter((r) => !['Approved', 'Rejected', 'Fraud Confirmed', 'Refund Processed'].includes(r.status)).length
      },
      queue: queue.slice(0, 12).map((r) => mapReturn(r))
    });
  }

  const analytics = await ReturnClaim.find().populate('customer', 'name email').sort({ createdAt: -1 });
  const prevented = analytics.filter((r) => ['Rejected', 'Fraud Confirmed'].includes(r.status)).reduce((s, r) => s + r.refundAmount, 0);
  res.json({
    stats: {
      totalUsers: await User.countDocuments(),
      totalReturns: analytics.length,
      flaggedReturns: analytics.filter((r) => r.risk === 'High' || r.escalated).length,
      confirmedFraud: analytics.filter((r) => r.status === 'Fraud Confirmed').length,
      fraudPrevented: formatINR(prevented),
      pendingInvestigations: analytics.filter((r) => ['Fraud Queue', 'Escalated', 'Escalated to Admin', 'Pending Review'].includes(r.status)).length
    },
    recentReturns: analytics.slice(0, 8).map((r) => mapReturn(r))
  });
});

app.get('/api/network/:customerId', authRequired, staffRoles('fraud_analyst', 'admin'), async (req, res) => {
  const user = await User.findById(req.params.customerId);
  if (!user) return res.status(404).json({ error: 'Customer not found' });
  const sameAddress = await User.find({ address: user.address, role: 'customer', _id: { $ne: user._id } }).limit(5);
  const claims = await ReturnClaim.find({ customer: user._id }).sort({ createdAt: -1 }).limit(5);
  res.json({
    center: publicUser(user),
    relatedCustomers: sameAddress.map(publicUser),
    claims: claims.map((c) => ({ id: c.code, product: c.productName, risk: c.riskScore, status: c.status }))
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  res.status(500).json({ error: 'Server error' });
});

export default app;

const isVercel = !!process.env.VERCEL;
if (!isVercel) {
  connectDb()
    .then(() => {
      app.listen(PORT, () => console.log(`ReturnShield API running on http://localhost:${PORT}`));
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}
