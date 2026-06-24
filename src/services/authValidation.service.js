const EMAIL_MAX_LENGTH = 254;
const LOCAL_MAX_LENGTH = 64;
const TLD_MAX_LENGTH = 24;

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function validateEmail(email) {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || cleanEmail.length > EMAIL_MAX_LENGTH) return false;

  const parts = cleanEmail.split('@');
  if (parts.length !== 2) return false;

  const [local, domain] = parts;
  if (!local || !domain || local.length > LOCAL_MAX_LENGTH) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return false;

  const labels = domain.split('.');
  if (labels.length < 2) return false;
  if (labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) {
    return false;
  }

  const tld = labels[labels.length - 1];
  return /^[a-z]{2,24}$/i.test(tld) && tld.length <= TLD_MAX_LENGTH;
}

export function validatePassword(password) {
  const value = String(password || '');
  const hasLetter = /[a-zA-Z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  return {
    lengthOk: value.length >= 8,
    mixOk: hasLetter && hasNumber
  };
}

export function validateAuthInput(email, password) {
  const handleOk = validateEmail(email);
  const { lengthOk, mixOk } = validatePassword(password);
  return {
    handleOk,
    lengthOk,
    mixOk,
    ok: handleOk && lengthOk && mixOk,
    messageKey: !handleOk ? 'authErrorHandleRule' :
                !lengthOk ? 'authErrorPasswordLength' :
                !mixOk ? 'authErrorPasswordMix' : null
  };
}

export function getAuthRedirectTo(locationLike, basePath = import.meta.env.BASE_URL || '/') {
  const fallbackLocation = typeof window !== 'undefined' ? window.location : null;
  const location = locationLike || fallbackLocation;
  const origin = location?.origin || '';
  if (!origin) return basePath;
  return new URL(basePath || '/', origin).toString();
}

export function isEmailConfirmed(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}
