import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
  at: { type: String, required: true },
  text: { type: String, required: true },
  by: { type: String, default: '' },
  role: { type: String, default: '' }
}, { _id: false });

const noteSchema = new mongoose.Schema({
  at: { type: String, required: true },
  text: { type: String, required: true },
  by: { type: String, required: true },
  role: { type: String, required: true }
}, { _id: false });

const timelineSchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  state: { type: String, required: true, enum: ['done', 'active', 'pending'], default: 'pending' },
  at: { type: String, default: '' }
}, { _id: false });

const riskBreakdownSchema = new mongoose.Schema({
  image: { type: Number, default: 0 },
  receipt: { type: Number, default: 0 },
  customer: { type: Number, default: 0 },
  delivery: { type: Number, default: 0 },
  claim: { type: Number, default: 0 }
}, { _id: false });

export const User = mongoose.model('User', new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  role: {
    type: String,
    required: true,
    enum: ['customer', 'service_agent', 'fraud_analyst', 'admin']
  },
  status: { type: String, required: true, enum: ['Active', 'Suspended'], default: 'Active' },
  seeded: { type: Boolean, default: false },
  previousReturns: { type: Number, default: 0 },
  previousRefunds: { type: Number, default: 0 },
  fraudFlags: { type: Number, default: 0 }
}, { timestamps: true }));

export const Order = mongoose.model('Order', new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productName: { type: String, required: true },
  productIcon: { type: String, required: true },
  price: { type: Number, required: true },
  status: { type: String, default: 'Delivered' },
  address: { type: String, default: '' },
  deliveredAt: { type: Date, default: Date.now }
}, { timestamps: true }));

export const ReturnClaim = mongoose.model('ReturnClaim', new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  orderCode: { type: String, required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productName: { type: String, required: true },
  reason: { type: String, required: true },
  description: { type: String, default: '' },
  images: { type: [String], default: [] },
  receiptImage: { type: String, default: '' },
  videoUrl: { type: String, default: '' },
  status: { type: String, required: true },
  customerStatus: { type: String, default: 'Under Review' },
  risk: { type: String, required: true, enum: ['Low', 'Medium', 'High'] },
  riskScore: { type: Number, required: true },
  riskBreakdown: { type: riskBreakdownSchema, default: () => ({}) },
  riskReasons: { type: [String], default: [] },
  imageSimilarity: { type: Number, default: 0 },
  similarClaimCode: { type: String, default: '' },
  receiptChecks: {
    type: Object,
    default: () => ({ product: true, orderId: true, date: true, price: true, priceOriginal: 0, priceReceipt: 0 })
  },
  refundAmount: { type: Number, required: true },
  refundMethod: { type: String, default: 'Original Payment Method' },
  refundStatus: { type: String, default: 'Not Started' },
  refundDate: { type: String, default: '' },
  refundTxn: { type: String, default: '' },
  pickupStatus: { type: String, required: true },
  pickupAddress: { type: String, default: '' },
  expectedResolution: { type: String, default: '' },
  assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedAnalyst: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  escalated: { type: Boolean, default: false },
  verificationRequested: { type: Boolean, default: false },
  verificationItems: { type: [String], default: [] },
  timeline: { type: [timelineSchema], default: [] },
  notes: { type: [noteSchema], default: [] },
  history: { type: [historySchema], default: [] },
  decisionReason: { type: String, default: '' }
}, { timestamps: true }));

export const Notification = mongoose.model('Notification', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  icon: { type: String, default: 'teal' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false }
}, { timestamps: true }));

export const AuditLog = mongoose.model('AuditLog', new mongoose.Schema({
  at: { type: Date, default: Date.now },
  actor: { type: String, default: 'System' },
  role: { type: String, default: 'system' },
  action: { type: String, required: true },
  returnCode: { type: String, default: '' },
  meta: { type: String, default: '' }
}, { timestamps: true }));

export const SystemConfig = mongoose.model('SystemConfig', new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  seedVersion: { type: Number, default: 1 },
  weights: {
    image: { type: Number, default: 30 },
    receipt: { type: Number, default: 20 },
    customer: { type: Number, default: 20 },
    delivery: { type: Number, default: 15 },
    claim: { type: Number, default: 15 }
  },
  thresholds: {
    lowMax: { type: Number, default: 30 },
    mediumMax: { type: Number, default: 70 }
  },
  rules: { type: [Object], default: [] }
}, { timestamps: true }));

export const Counter = mongoose.model('Counter', new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  value: { type: Number, required: true }
}));
