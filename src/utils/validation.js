// Lightweight client-side validation helpers shared across all forms.

export const isValidEmail = (value = '') =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const isValidPhone = (value = '') =>
  value === '' || /^[+()\-\s0-9]{7,20}$/.test(value.trim());

// Returns { score: 0-4, label, key } for a password strength meter.
export const passwordStrength = (value = '') => {
  let score = 0;
  if (value.length >= 6) score++;
  if (value.length >= 10) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
  const map = [
    { label: 'Too short', key: 'weak' },
    { label: 'Weak', key: 'weak' },
    { label: 'Fair', key: 'fair' },
    { label: 'Good', key: 'good' },
    { label: 'Strong', key: 'strong' }
  ];
  return { score, ...map[score] };
};

export const isStrongEnough = (value = '') => value.length >= 6;
