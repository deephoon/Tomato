// ==========================================
// AUTH MANAGEMENT — Local Profile Layer
// ==========================================

const AUTH_USERS_KEY = 'tomato_auth_users';
const AUTH_ACTIVE_KEY = 'tomato_auth_active_user';
const PASSWORD_ITERATIONS = 120000;
const HANDLE_RE = /^[a-z0-9._-]{3,24}$/;

function authError(code, fallback) {
  const err = new Error(fallback || code);
  err.code = code;
  return err;
}

function safeLoadUsers() {
  try {
    const raw = localStorage.getItem(AUTH_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Auth storage parse error:', err);
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function normalizeHandle(handle) {
  return String(handle || '').trim().toLowerCase();
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    handle: user.handle,
    displayName: user.displayName || user.handle,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt || null
  };
}

function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function hashPassword(password, saltBase64 = null) {
  if (!crypto.subtle) {
    throw new Error('This browser does not support secure local password hashing.');
  }
  const encoder = new TextEncoder();
  const salt = saltBase64 ? base64ToBytes(saltBase64) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PASSWORD_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  return {
    salt: bytesToBase64(salt),
    hash: bytesToBase64(new Uint8Array(bits)),
    iterations: PASSWORD_ITERATIONS,
    algorithm: 'PBKDF2-SHA256'
  };
}

async function verifyPassword(password, user) {
  const result = await hashPassword(password, user.passwordSalt);
  return result.hash === user.passwordHash;
}

export function getCurrentUser() {
  const activeId = localStorage.getItem(AUTH_ACTIVE_KEY);
  if (!activeId) return null;
  const user = safeLoadUsers().find((item) => item.id === activeId);
  return publicUser(user);
}

export function hasUsers() {
  return safeLoadUsers().length > 0;
}

export function getUserStoragePrefix(user = getCurrentUser()) {
  return user ? `tomato_user_${user.id}` : 'tomato_no_user';
}

export async function createUser({ handle, displayName, password }) {
  const normalizedHandle = normalizeHandle(handle);
  const cleanDisplayName = String(displayName || handle || '').trim();
  const cleanPassword = String(password || '');

  if (!HANDLE_RE.test(normalizedHandle)) {
    throw authError('authErrorHandleRule', 'User ID must be 3-24 lowercase letters, numbers, dot, underscore, or hyphen.');
  }
  if (cleanPassword.length < 8) {
    throw authError('authErrorPasswordLength', 'Password must be at least 8 characters.');
  }
  if (!/[a-zA-Z]/.test(cleanPassword) || !/[0-9]/.test(cleanPassword)) {
    throw authError('authErrorPasswordMix', 'Password must include letters and numbers.');
  }

  const users = safeLoadUsers();
  if (users.some((user) => user.handle === normalizedHandle)) {
    throw authError('authErrorDuplicate', 'That user ID already exists.');
  }

  const passwordRecord = await hashPassword(cleanPassword);
  const now = Date.now();
  const user = {
    id: `u_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    handle: normalizedHandle,
    displayName: cleanDisplayName || normalizedHandle,
    passwordSalt: passwordRecord.salt,
    passwordHash: passwordRecord.hash,
    passwordIterations: passwordRecord.iterations,
    passwordAlgorithm: passwordRecord.algorithm,
    createdAt: now,
    lastLoginAt: now
  };

  users.push(user);
  saveUsers(users);
  localStorage.setItem(AUTH_ACTIVE_KEY, user.id);
  return publicUser(user);
}

export async function signIn({ handle, password }) {
  const normalizedHandle = normalizeHandle(handle);
  const users = safeLoadUsers();
  const user = users.find((item) => item.handle === normalizedHandle);
  if (!user) throw authError('authErrorInvalidLogin', 'User ID or password is incorrect.');

  const ok = await verifyPassword(String(password || ''), user);
  if (!ok) throw authError('authErrorInvalidLogin', 'User ID or password is incorrect.');

  user.lastLoginAt = Date.now();
  saveUsers(users);
  localStorage.setItem(AUTH_ACTIVE_KEY, user.id);
  return publicUser(user);
}

export function signOut() {
  localStorage.removeItem(AUTH_ACTIVE_KEY);
}
