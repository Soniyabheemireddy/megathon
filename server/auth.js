import jwt from 'jsonwebtoken';
import { User } from './models.js';
import { publicUser } from './seed.js';

const JWT_SECRET = process.env.JWT_SECRET || 'returnshield-dev-secret-change-me';

export function signToken(user) {
  return jwt.sign({ id: String(user._id), role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

export async function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.status === 'Suspended' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Account suspended' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export { publicUser, JWT_SECRET };
