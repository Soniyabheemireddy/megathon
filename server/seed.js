import bcrypt from 'bcryptjs';
import {
  User, Order, ReturnClaim, Notification, AuditLog, SystemConfig, Counter
} from './models.js';

export function formatINR(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

export function roleHome(role) {
  const map = {
    customer: '/customer',
    service_agent: '/agent',
    fraud_analyst: '/fraud',
    admin: '/admin'
  };
  return map[role] || '/';
}

export async function nextId(kind) {
  const starts = { ret: 5020, ord: 10240, cust: 1020 };
  const prefixes = { ret: 'RET-', ord: 'ORD-', cust: 'CUST-' };
  let doc = await Counter.findOne({ name: kind });
  if (!doc) {
    doc = await Counter.create({ name: kind, value: starts[kind] || 1 });
  } else {
    doc.value += 1;
    await doc.save();
  }
  return prefixes[kind] + doc.value;
}

export function defaultTimeline(partial = {}) {
  const steps = [
    { key: 'requested', label: 'Return Requested' },
    { key: 'evidence', label: 'Evidence Submitted' },
    { key: 'ai', label: 'AI Verification' },
    { key: 'agent', label: 'Agent Review' },
    { key: 'fraud', label: 'Fraud Review' },
    { key: 'approved', label: 'Return Approved' },
    { key: 'pickup', label: 'Pickup' },
    { key: 'inspection', label: 'Product Inspection' },
    { key: 'refund', label: 'Refund' }
  ];
  const now = new Date().toISOString();
  return steps.map((s) => {
    const state = partial[s.key] || 'pending';
    return { ...s, state, at: state === 'done' || state === 'active' ? now : '' };
  });
}

export function setTimeline(claim, updates) {
  const map = Object.fromEntries((claim.timeline || []).map((t) => [t.key, t]));
  for (const [key, state] of Object.entries(updates)) {
    if (!map[key]) continue;
    map[key].state = state;
    if (state === 'done' || state === 'active') map[key].at = new Date().toISOString();
  }
  claim.timeline = Object.values(map).length
    ? claim.timeline.map((t) => map[t.key] || t)
    : defaultTimeline(updates);
}

export async function getConfig() {
  let cfg = await SystemConfig.findOne({ key: 'main' });
  if (!cfg) {
    cfg = await SystemConfig.create({
      key: 'main',
      weights: { image: 30, receipt: 20, customer: 20, delivery: 15, claim: 15 },
      thresholds: { lowMax: 30, mediumMax: 70 },
      rules: [
        { id: 'freq', label: 'If return frequency > threshold → increase risk', enabled: true, threshold: 3 },
        { id: 'img', label: 'If image similarity > 85% → flag case', enabled: true, threshold: 85 },
        { id: 'price', label: 'If receipt price ≠ order price → increase risk', enabled: true },
        { id: 'network', label: 'If multiple accounts share suspicious info → flag network', enabled: true }
      ]
    });
  }
  return cfg;
}

export async function scoreReturnRisk(user, priorCount, reason, description, imageCount, orderPrice) {
  const cfg = await getConfig();
  const w = cfg.weights;
  const t = cfg.thresholds;

  let image = 20 + (imageCount === 0 ? 40 : 0) + (imageCount === 1 ? 15 : 0);
  let receipt = 25 + (imageCount === 0 ? 20 : 0);
  let customerBeh = 15 + priorCount * 14 + (user.fraudFlags || 0) * 20;
  if (user.status === 'Suspended') customerBeh += 35;
  let delivery = 30;
  let claim = 20;
  if (reason === 'Damaged Product') { image += 25; claim += 15; }
  if (reason === 'Wrong Product') claim += 10;
  if (reason === 'Missing Item') claim += 18;
  if (reason === 'Product Not as Described') claim += 20;
  if (reason === 'Defective Product') { image += 15; claim += 12; }
  if (reason === 'Item Not Received') { delivery += 40; claim += 25; }
  if (!description || description.trim().length < 20) claim += 25;
  if (/(broken|fake|never|scam|urgent|immediately)/i.test(description || '')) claim += 18;

  const clamp = (n) => Math.max(5, Math.min(98, Math.round(n)));
  image = clamp(image);
  receipt = clamp(receipt);
  customerBeh = clamp(customerBeh);
  delivery = clamp(delivery);
  claim = clamp(claim);

  const totalW = w.image + w.receipt + w.customer + w.delivery + w.claim;
  const score = clamp(
    (image * w.image + receipt * w.receipt + customerBeh * w.customer + delivery * w.delivery + claim * w.claim) / totalW
  );

  let risk = 'Low';
  if (score > t.mediumMax) risk = 'High';
  else if (score > t.lowMax) risk = 'Medium';

  const reasons = [];
  if (priorCount >= 2) reasons.push('Previous similar claim pattern');
  if (image >= 70) reasons.push('Image similarity / evidence risk detected');
  if (priorCount >= 3) reasons.push('Return frequency is high');
  if (receipt >= 60) reasons.push('Receipt information requires verification');
  if (user.fraudFlags) reasons.push('Customer has prior fraud flags');
  if (!reasons.length) reasons.push('Baseline risk from claim content');

  const imageSimilarity = image >= 70 ? 70 + Math.floor((image - 70) * 0.7) : Math.floor(image * 0.4);
  const priceMismatch = receipt >= 75;
  const receiptChecks = {
    product: true,
    orderId: true,
    date: true,
    price: !priceMismatch,
    priceOriginal: orderPrice,
    priceReceipt: priceMismatch ? Math.round(orderPrice * 1.28) : orderPrice
  };

  return {
    score,
    risk,
    breakdown: { image, receipt, customer: customerBeh, delivery, claim },
    reasons,
    imageSimilarity,
    similarClaimCode: imageSimilarity >= 85 ? 'RET-4211' : '',
    receiptChecks
  };
}

export async function notify(userId, icon, title, message) {
  if (!userId) return;
  await Notification.create({ user: userId, icon, title, message, read: false });
}

export async function audit(actor, role, action, returnCode = '', meta = '') {
  await AuditLog.create({ at: new Date(), actor, role, action, returnCode, meta });
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    phone: user.phone,
    address: user.address,
    role: user.role,
    status: user.status,
    seeded: !!user.seeded,
    joined: user.createdAt,
    previousReturns: user.previousReturns || 0,
    previousRefunds: user.previousRefunds || 0,
    fraudFlags: user.fraudFlags || 0,
    accountAgeDays: user.createdAt
      ? Math.max(1, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000))
      : 1
  };
}

export function mapReturn(r, { hideRisk = false } = {}) {
  const customer = r.customer && typeof r.customer === 'object' ? r.customer : null;
  const agent = r.assignedAgent && typeof r.assignedAgent === 'object' ? r.assignedAgent : null;
  const analyst = r.assignedAnalyst && typeof r.assignedAnalyst === 'object' ? r.assignedAnalyst : null;
  const base = {
    id: r.code,
    _id: String(r._id),
    orderId: r.orderCode,
    customerId: customer ? String(customer._id) : String(r.customer),
    customerName: customer?.name || '',
    customerEmail: customer?.email || '',
    customerPhone: customer?.phone || '',
    customerAddress: customer?.address || '',
    customerJoined: customer?.createdAt || null,
    previousReturns: customer?.previousReturns || 0,
    previousRefunds: customer?.previousRefunds || 0,
    fraudFlags: customer?.fraudFlags || 0,
    product: r.productName,
    reason: r.reason,
    description: r.description,
    images: r.images || [],
    receiptImage: r.receiptImage || '',
    videoUrl: r.videoUrl || '',
    status: r.status,
    customerStatus: r.customerStatus || r.status,
    refundAmount: r.refundAmount,
    refundLabel: formatINR(r.refundAmount),
    refundMethod: r.refundMethod,
    refundStatus: r.refundStatus,
    refundDate: r.refundDate,
    refundTxn: r.refundTxn,
    pickupStatus: r.pickupStatus,
    pickupAddress: r.pickupAddress,
    expectedResolution: r.expectedResolution,
    assignedAgentId: agent ? String(agent._id) : (r.assignedAgent ? String(r.assignedAgent) : null),
    assignedAgentName: agent?.name || null,
    assignedAnalystId: analyst ? String(analyst._id) : (r.assignedAnalyst ? String(r.assignedAnalyst) : null),
    assignedAnalystName: analyst?.name || null,
    escalated: !!r.escalated,
    verificationRequested: !!r.verificationRequested,
    verificationItems: r.verificationItems || [],
    timeline: r.timeline || [],
    notes: r.notes || [],
    history: r.history || [],
    decisionReason: r.decisionReason || '',
    date: r.createdAt
  };
  if (hideRisk) return base;
  return {
    ...base,
    risk: r.risk,
    riskScore: r.riskScore,
    riskBreakdown: r.riskBreakdown || {},
    riskReasons: r.riskReasons || [],
    imageSimilarity: r.imageSimilarity || 0,
    similarClaimCode: r.similarClaimCode || '',
    receiptChecks: r.receiptChecks || {}
  };
}

export function mapOrder(o, hasReturn) {
  return {
    id: o.code,
    name: o.productName,
    icon: o.productIcon,
    price: o.price,
    priceLabel: formatINR(o.price),
    status: o.status,
    address: o.address,
    date: o.createdAt,
    deliveredAt: o.deliveredAt || o.createdAt,
    hasReturn: !!hasReturn,
    returnEligible: o.status === 'Delivered' && !hasReturn
  };
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

const SEED_VERSION = 3;

export async function ensureSeed() {
  const cfg = await SystemConfig.findOne({ key: 'main' });
  if (cfg?.seedVersion === SEED_VERSION && await User.findOne({ email: 'agent@demo.com' })) {
    return;
  }

  // Fresh platform seed (demo customer gets exactly 10 mock orders)
  await Promise.all([
    User.deleteMany({}),
    Order.deleteMany({}),
    ReturnClaim.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
    SystemConfig.deleteMany({}),
    Counter.deleteMany({})
  ]);

  const hash = (pwd) => bcrypt.hashSync(pwd, 10);
  const [admin, customer, agentUser, analyst, priya, rahul, nisha] = await User.insertMany([
    { email: 'admin@demo.com', password: hash('admin123'), name: 'Jordan Lee', phone: '9800000000', address: 'HQ, Hyderabad', role: 'admin', status: 'Active', seeded: true },
    { email: 'customer@demo.com', password: hash('demo123'), name: 'Alex Morgan', phone: '9876543210', address: '12 MG Road, Bengaluru', role: 'customer', status: 'Active', seeded: true, previousReturns: 1, previousRefunds: 1 },
    { email: 'agent@demo.com', password: hash('demo123'), name: 'Sam Rivera', phone: '9876500001', address: 'Support Hub, Bengaluru', role: 'service_agent', status: 'Active', seeded: true },
    { email: 'fraud@demo.com', password: hash('demo123'), name: 'Casey Quinn', phone: '9876500002', address: 'Risk Ops, Hyderabad', role: 'fraud_analyst', status: 'Active', seeded: true },
    { email: 'priya@demo.com', password: hash('demo123'), name: 'Priya Sharma', phone: '9876543211', address: '45 Park Street, Kolkata', role: 'customer', status: 'Active', seeded: true, previousReturns: 4, previousRefunds: 3 },
    { email: 'rahul@demo.com', password: hash('demo123'), name: 'Rahul Verma', phone: '9876543212', address: '78 Sector 18, Noida', role: 'customer', status: 'Suspended', seeded: true, previousReturns: 6, previousRefunds: 4, fraudFlags: 1 },
    { email: 'nisha@demo.com', password: hash('demo123'), name: 'Nisha Patel', phone: '9876543213', address: '23 Marine Drive, Mumbai', role: 'customer', status: 'Active', seeded: true, previousReturns: 8, previousRefunds: 5, fraudFlags: 2 }
  ]);

  const addr = '12 MG Road, Bengaluru';
  const customerOrders = [
    ['ORD-10245', 'iPhone 15', '📱', 70000, '2026-09-08'],
    ['ORD-10246', 'Sony WH-1000XM5', '🎧', 29990, '2026-09-07'],
    ['ORD-10247', 'Nike Air Max', '👟', 12999, '2026-09-06'],
    ['ORD-10248', 'Samsung Galaxy Buds', '🎵', 8999, '2026-09-05'],
    ['ORD-10249', 'Kindle Paperwhite', '📚', 14999, '2026-09-04'],
    ['ORD-10250', 'Logitech MX Master 3S', '🖱️', 9995, '2026-09-03'],
    ['ORD-10251', 'Apple Watch SE', '⌚', 29900, '2026-09-02'],
    ['ORD-10252', 'Dyson Airwrap', '💨', 44900, '2026-09-01'],
    ['ORD-10253', 'Levi\'s Denim Jacket', '🧥', 4999, '2026-08-28'],
    ['ORD-10254', 'Instant Pot Duo', '🍲', 7999, '2026-08-25']
  ];

  const otherOrders = [
    ['ORD-10260', priya._id, 'Logitech Mouse', '🖱️', 2499, '45 Park Street, Kolkata'],
    ['ORD-10261', rahul._id, 'Nike Air Force 1', '👟', 8999, '78 Sector 18, Noida'],
    ['ORD-10262', nisha._id, 'Boat Speaker', '🔊', 3999, '23 Marine Drive, Mumbai'],
    ['ORD-10263', priya._id, 'Samsung Galaxy Watch', '⌚', 24999, '45 Park Street, Kolkata'],
    ['ORD-10264', nisha._id, 'MacBook Air', '💻', 99900, '23 Marine Drive, Mumbai']
  ];

  const orders = await Order.insertMany([
    ...customerOrders.map(([code, productName, productIcon, price, delivered]) => ({
      code, customer: customer._id, productName, productIcon, price, address: addr,
      status: 'Delivered', deliveredAt: new Date(delivered), createdAt: new Date(delivered)
    })),
    ...otherOrders.map(([code, cust, productName, productIcon, price, address]) => ({
      code, customer: cust, productName, productIcon, price, address, status: 'Delivered', deliveredAt: new Date()
    }))
  ]);

  const now = new Date().toISOString();
  const byCode = Object.fromEntries(orders.map((o) => [o.code, o]));

  await ReturnClaim.insertMany([
    {
      code: 'RET-5021', order: byCode['ORD-10263']._id, orderCode: 'ORD-10263', customer: priya._id,
      productName: 'Samsung Galaxy Watch', reason: 'Damaged Product',
      description: 'The screen was damaged when I received the product.',
      images: ['data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect fill="#fecaca" width="120" height="120"/><text x="20" y="65" fill="#991b1b">Damage</text></svg>')],
      status: 'Pending Review', customerStatus: 'Under Review',
      risk: 'Medium', riskScore: 54,
      riskBreakdown: { image: 48, receipt: 40, customer: 62, delivery: 30, claim: 55 },
      riskReasons: ['Return frequency is high', 'Receipt information requires verification'],
      imageSimilarity: 42, similarClaimCode: '',
      receiptChecks: { product: true, orderId: true, date: true, price: true, priceOriginal: 24999, priceReceipt: 24999 },
      refundAmount: 24999, refundStatus: 'Not Started',
      pickupStatus: 'Awaiting Review', pickupAddress: '45 Park Street, Kolkata',
      expectedResolution: daysFromNow(5), assignedAgent: agentUser._id,
      timeline: defaultTimeline({ requested: 'done', evidence: 'done', ai: 'done', agent: 'active' }),
      history: [
        { at: now, text: 'Return requested', by: 'Priya Sharma', role: 'customer' },
        { at: now, text: 'Evidence submitted', by: 'Priya Sharma', role: 'customer' },
        { at: now, text: 'AI scored Medium risk (54)', by: 'ReturnShield AI', role: 'system' }
      ],
      notes: []
    },
    {
      code: 'RET-4988', order: byCode['ORD-10260']._id, orderCode: 'ORD-10260', customer: priya._id,
      productName: 'Logitech Mouse', reason: 'Wrong Product', description: 'Received wrong color variant.',
      status: 'Refund Processed', customerStatus: 'Refund Processed',
      risk: 'Low', riskScore: 22,
      riskBreakdown: { image: 18, receipt: 20, customer: 35, delivery: 25, claim: 20 },
      riskReasons: ['Baseline risk from claim content'],
      refundAmount: 2499, refundMethod: 'Original Payment Method', refundStatus: 'Completed',
      refundDate: '2026-09-02', refundTxn: 'TXN-77821',
      pickupStatus: 'Picked Up', pickupAddress: '45 Park Street, Kolkata',
      expectedResolution: now, assignedAgent: agentUser._id,
      timeline: defaultTimeline({
        requested: 'done', evidence: 'done', ai: 'done', agent: 'done',
        fraud: 'done', approved: 'done', pickup: 'done', inspection: 'done', refund: 'done'
      }),
      history: [{ at: now, text: 'Refund processed', by: 'System', role: 'system' }]
    },
    {
      code: 'RET-5022', order: byCode['ORD-10261']._id, orderCode: 'ORD-10261', customer: rahul._id,
      productName: 'Nike Air Force 1', reason: 'Product Not as Described',
      description: 'Size and material do not match listing. Need urgent refund.',
      status: 'Verification Required', customerStatus: 'Additional Evidence Required',
      risk: 'Medium', riskScore: 68,
      riskBreakdown: { image: 55, receipt: 50, customer: 78, delivery: 40, claim: 71 },
      riskReasons: ['Previous similar claim pattern', 'Return frequency is high'],
      verificationRequested: true, verificationItems: ['Additional photos', 'Product serial number'],
      refundAmount: 8999, refundStatus: 'Not Started',
      pickupStatus: 'On Hold', pickupAddress: '78 Sector 18, Noida',
      expectedResolution: daysFromNow(7), assignedAgent: agentUser._id,
      timeline: defaultTimeline({ requested: 'done', evidence: 'done', ai: 'done', agent: 'active' }),
      history: [
        { at: now, text: 'AI scored Medium risk (68)', by: 'ReturnShield AI', role: 'system' },
        { at: now, text: 'Agent requested additional verification', by: 'Sam Rivera', role: 'service_agent' }
      ],
      notes: [{ at: now, text: 'Need serial number to confirm authenticity.', by: 'Sam Rivera', role: 'service_agent' }]
    },
    {
      code: 'RET-5025', order: byCode['ORD-10262']._id, orderCode: 'ORD-10262', customer: nisha._id,
      productName: 'Boat Speaker', reason: 'Damaged Product',
      description: 'Speaker was cracked. Claiming full refund immediately.',
      status: 'Escalated', customerStatus: 'Under Review',
      risk: 'High', riskScore: 87,
      riskBreakdown: { image: 92, receipt: 85, customer: 78, delivery: 35, claim: 71 },
      riskReasons: ['Previous similar claim', 'Image similarity detected', 'Return frequency is high', 'Receipt information requires verification'],
      imageSimilarity: 91, similarClaimCode: 'RET-4211',
      receiptChecks: { product: true, orderId: true, date: true, price: false, priceOriginal: 3999, priceReceipt: 5200 },
      escalated: true, refundAmount: 3999, refundStatus: 'Not Started',
      pickupStatus: 'On Hold', pickupAddress: '23 Marine Drive, Mumbai',
      expectedResolution: daysFromNow(10),
      assignedAgent: agentUser._id, assignedAnalyst: analyst._id,
      timeline: defaultTimeline({
        requested: 'done', evidence: 'done', ai: 'done', agent: 'done', fraud: 'active'
      }),
      history: [
        { at: now, text: 'AI flagged High risk (87)', by: 'ReturnShield AI', role: 'system' },
        { at: now, text: 'Escalated to Fraud Analyst', by: 'Sam Rivera', role: 'service_agent' }
      ],
      notes: [{ at: now, text: 'Image looks reused from prior claim. Escalate.', by: 'Sam Rivera', role: 'service_agent' }]
    },
    {
      code: 'RET-5023', order: byCode['ORD-10264']._id, orderCode: 'ORD-10264', customer: nisha._id,
      productName: 'MacBook Air', reason: 'Defective Product',
      description: 'Device overheats and shuts down. Fake serial suspected.',
      status: 'Fraud Queue', customerStatus: 'Under Review',
      risk: 'High', riskScore: 92,
      riskBreakdown: { image: 95, receipt: 88, customer: 90, delivery: 40, claim: 80 },
      riskReasons: ['Image similarity detected', 'Customer has prior fraud flags', 'Return frequency is high'],
      imageSimilarity: 94, similarClaimCode: 'RET-4211',
      receiptChecks: { product: true, orderId: true, date: true, price: false, priceOriginal: 99900, priceReceipt: 119000 },
      escalated: true, refundAmount: 99900, refundStatus: 'Not Started',
      pickupStatus: 'On Hold', pickupAddress: '23 Marine Drive, Mumbai',
      expectedResolution: daysFromNow(12), assignedAnalyst: analyst._id,
      timeline: defaultTimeline({
        requested: 'done', evidence: 'done', ai: 'done', agent: 'done', fraud: 'active'
      }),
      history: [{ at: now, text: 'Auto-routed to Fraud Queue (High risk 92)', by: 'ReturnShield AI', role: 'system' }]
    }
  ]);

  await SystemConfig.create({
    key: 'main',
    seedVersion: SEED_VERSION,
    weights: { image: 30, receipt: 20, customer: 20, delivery: 15, claim: 15 },
    thresholds: { lowMax: 30, mediumMax: 70 },
    rules: [
      { id: 'freq', label: 'If return frequency > threshold → increase risk', enabled: true, threshold: 3 },
      { id: 'img', label: 'If image similarity > 85% → flag case', enabled: true, threshold: 85 },
      { id: 'price', label: 'If receipt price ≠ order price → increase risk', enabled: true },
      { id: 'network', label: 'If multiple accounts share suspicious info → flag network', enabled: true }
    ]
  });

  await Notification.insertMany([
    { user: customer._id, icon: 'teal', title: 'Welcome to ReturnShield', message: 'Your account has 10 delivered orders. Try requesting a return.' },
    { user: customer._id, icon: 'green', title: 'Order Delivered', message: 'iPhone 15 (ORD-10245) has been delivered.' },
    { user: agentUser._id, icon: 'teal', title: 'New return in queue', message: 'RET-5021 requires agent review.' },
    { user: agentUser._id, icon: 'amber', title: 'Verification pending', message: 'RET-5022 is waiting for customer evidence.' },
    { user: analyst._id, icon: 'amber', title: 'High-risk case escalated', message: 'RET-5025 has been escalated to the fraud queue.' },
    { user: analyst._id, icon: 'amber', title: 'Fraud queue alert', message: 'RET-5023 (MacBook Air) scored 92 — investigate.' },
    { user: admin._id, icon: 'navy', title: 'Platform seeded', message: 'Demo users and 10 customer mock orders are ready.' },
    { user: admin._id, icon: 'amber', title: 'High-risk cases today', message: '2 new high-risk cases detected.' },
    { user: priya._id, icon: 'teal', title: 'Return received', message: 'Your return request RET-5021 has been received.' },
    { user: rahul._id, icon: 'amber', title: 'Additional evidence required', message: 'Please upload more photos for RET-5022.' }
  ]);

  await AuditLog.insertMany([
    { at: new Date(), actor: 'ReturnShield AI', role: 'system', action: 'Scored RET-5025 as High (87)', returnCode: 'RET-5025' },
    { at: new Date(), actor: 'Sam Rivera', role: 'service_agent', action: 'Escalated RET-5025 to Fraud Analyst', returnCode: 'RET-5025' },
    { at: new Date(), actor: 'ReturnShield AI', role: 'system', action: 'Auto-routed RET-5023 to Fraud Queue', returnCode: 'RET-5023' },
    { at: new Date(), actor: 'Jordan Lee', role: 'admin', action: 'Platform configuration initialized', returnCode: '' }
  ]);

  await Counter.insertMany([
    { name: 'ret', value: 5030 },
    { name: 'ord', value: 10270 }
  ]);

  console.log('MongoDB seeded (v3): 10 customer orders + role dashboards.');
}
