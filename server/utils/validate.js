const { bad } = require('./ApiError');

// Tiny schema validator. spec: { field: { type, required, min, max, values, trim, pattern, message } }
// Returns only whitelisted, cleaned fields (so unknown fields like `role` can never be mass-assigned).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function check(body, spec, { partial = false } = {}) {
  const out = {};
  const errors = {};
  body = body && typeof body === 'object' ? body : {};
  for (const [field, rule] of Object.entries(spec)) {
    let v = body[field];
    const missing = v === undefined || v === null || v === '';
    if (missing) {
      if (rule.required && !partial) errors[field] = `${rule.label || field} is required`;
      else if (v === '' && !rule.required && rule.type === 'string') out[field] = '';
      continue;
    }
    const label = rule.label || field;
    switch (rule.type) {
      case 'string':
      case 'email': {
        if (typeof v !== 'string') { errors[field] = `${label} must be text`; break; }
        v = v.trim();
        if (rule.type === 'email') { v = v.toLowerCase(); if (!EMAIL_RE.test(v)) { errors[field] = `${label} must be a valid email address`; break; } }
        if (rule.min && v.length < rule.min) errors[field] = `${label} must be at least ${rule.min} characters`;
        else if (rule.max && v.length > rule.max) errors[field] = `${label} must be at most ${rule.max} characters`;
        else if (rule.pattern && !rule.pattern.test(v)) errors[field] = rule.message || `${label} is invalid`;
        else if (rule.values && !rule.values.includes(v)) errors[field] = `${label} must be one of: ${rule.values.join(', ')}`;
        else out[field] = v;
        break;
      }
      case 'int': {
        const n = Number(v);
        if (!Number.isInteger(n)) errors[field] = `${label} must be a whole number`;
        else if (rule.min !== undefined && n < rule.min) errors[field] = `${label} must be at least ${rule.min}`;
        else if (rule.max !== undefined && n > rule.max) errors[field] = `${label} must be at most ${rule.max}`;
        else out[field] = n;
        break;
      }
      case 'bool':
        out[field] = v === true || v === 'true' || v === 'on' || v === '1' || v === 1;
        break;
      case 'date': {
        const d = new Date(v);
        if (isNaN(d.getTime())) errors[field] = `${label} must be a valid date`;
        else out[field] = d;
        break;
      }
      case 'array': {
        let arr = v;
        if (typeof arr === 'string') arr = arr.split(',');
        if (!Array.isArray(arr)) { errors[field] = `${label} must be a list`; break; }
        arr = arr.map((x) => String(x).trim()).filter(Boolean).slice(0, rule.max || 50);
        if (rule.values && arr.some((x) => !rule.values.includes(x))) errors[field] = `${label} contains an invalid value`;
        else out[field] = arr;
        break;
      }
      default:
        out[field] = v;
    }
  }
  if (Object.keys(errors).length) throw bad('Please fix the highlighted fields', errors);
  return out;
}

module.exports = { check, EMAIL_RE };
