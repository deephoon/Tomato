import { supabase, supabaseAnonKey, supabaseUrl } from './client.js';
import {
  getAuthRedirectTo,
  isEmailConfirmed,
  normalizeEmail,
  validateAuthInput
} from '../services/authValidation.service.js';

function authError(code, fallbackMessage) {
  const err = new Error(code);
  err.code = code;
  err.fallbackMessage = fallbackMessage;
  return err;
}

function assertValidAuthInput(email, password) {
  const validation = validateAuthInput(email, password);
  if (!validation.ok) throw authError(validation.messageKey);
}

function toAuthError(error, fallbackCode = 'authErrorGeneric') {
  const message = error?.message || '';
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('email not confirmed')) {
    return authError('authErrorEmailNotConfirmed', message);
  }
  if (lowerMessage.includes('invalid login') || lowerMessage.includes('invalid credentials')) {
    return authError('authErrorInvalidLogin', message);
  }
  if (lowerMessage.includes('already registered') || lowerMessage.includes('already exists')) {
    return authError('authErrorDuplicate', message);
  }
  return authError(fallbackCode, message);
}

async function getAuthSettings() {
  if (!supabaseUrl || !supabaseAnonKey || typeof fetch !== 'function') return null;
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`
      }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.warn('Unable to verify Supabase auth settings:', err);
    return null;
  }
}

async function assertEmailConfirmationRequired() {
  const settings = await getAuthSettings();
  if (settings?.mailer_autoconfirm === true) {
    throw authError('authErrorEmailConfirmDisabled');
  }
}

async function ensureProfile(user, displayName) {
  if (!supabase || !user?.id) return;
  const cleanDisplayName = String(
    displayName || user.user_metadata?.display_name || user.email?.split('@')[0] || 'Tomato User'
  ).trim();
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, display_name: cleanDisplayName });
  if (error) console.error('Profile creation failed:', error);
}

export async function signInWithEmail(email, password) {
  const cleanEmail = normalizeEmail(email);
  assertValidAuthInput(cleanEmail, password);
  if (!supabase) throw authError('authErrorConfigMissing', 'Supabase configuration is missing.');
  await assertEmailConfirmationRequired();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: String(password || '')
  });
  
  if (error) {
    console.error("Auth signin error:", error.message);
    throw toAuthError(error, 'authErrorInvalidLogin');
  }

  if (!data?.user) {
    throw authError('authErrorInvalidLogin');
  }

  if (!isEmailConfirmed(data.user)) {
    await supabase.auth.signOut();
    throw authError('authErrorEmailNotConfirmed');
  }

  await ensureProfile(data.user);
  return data.user;
}

export async function signUpWithEmail(email, password, displayName, options = {}) {
  const cleanEmail = normalizeEmail(email);
  const cleanDisplayName = String(displayName || cleanEmail.split('@')[0] || '').trim();
  assertValidAuthInput(cleanEmail, password);
  if (!supabase) throw authError('authErrorConfigMissing', 'Supabase configuration is missing.');
  await assertEmailConfirmationRequired();

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: String(password || ''),
    options: {
      emailRedirectTo: options.redirectTo || getAuthRedirectTo(),
      data: {
        display_name: cleanDisplayName
      }
    }
  });
  
  if (error) {
    console.error("Auth signup error:", error.message);
    throw toAuthError(error);
  }

  if (data?.session) {
    await supabase.auth.signOut();
  }
  
  return {
    user: data?.user || null,
    needsEmailConfirmation: true
  };
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Auth signout error:", error.message);
}

export function onAuthStateChange(handler) {
  if (!supabase) return { unsubscribe: () => {} };
  
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    handler(event, session);
  });
  
  return data.subscription;
}
