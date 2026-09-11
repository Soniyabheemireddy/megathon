export const ROLE_HOME = {
  customer: '/customer',
  service_agent: '/agent',
  fraud_analyst: '/fraud',
  admin: '/admin'
};

export const ROLE_LABELS = {
  customer: 'Customer',
  service_agent: 'Service Agent',
  fraud_analyst: 'Fraud Analyst',
  admin: 'Admin'
};

export function roleHome(role) {
  return ROLE_HOME[role] || '/';
}

export function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}

export function fmtDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(v);
  }
}

export function fmtDateTime(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return String(v);
  }
}
