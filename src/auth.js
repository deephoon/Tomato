import { supabase, getCurrentUser as getSupaUser } from './supabase/client.js';

export async function getCurrentUser() {
  if (supabase) {
    const user = await getSupaUser();
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      displayName: user.user_metadata?.display_name || user.email.split('@')[0],
      createdAt: new Date(user.created_at).getTime(),
      lastLoginAt: new Date(user.last_sign_in_at).getTime()
    };
  } else {
    // Fallback to local storage if no Supabase configured
    const localUserStr = localStorage.getItem('tomato_local_user');
    if (localUserStr) {
      return JSON.parse(localUserStr);
    }
    return null;
  }
}

export async function hasUsers() {
  return false;
}

export function getUserStoragePrefix(user) {
  return user ? `tomato_user_${user.id}` : 'tomato_no_user';
}

function authError(code, fallback) {
  const err = new Error(fallback || code);
  err.code = code;
  return err;
}

export async function createUser({ email, displayName, password }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '');
  const cleanDisplayName = String(displayName || cleanEmail.split('@')[0] || '').trim();

  if (cleanPassword.length < 6) {
    throw authError('authErrorPasswordLength', 'Password must be at least 6 characters.');
  }

  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: cleanPassword,
      options: {
        data: { display_name: cleanDisplayName }
      }
    });

    if (error) {
      throw authError(error.name, error.message);
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: data.user.id, display_name: cleanDisplayName });
      if (profileError) console.error('Profile creation failed:', profileError);
    }
    return await getCurrentUser();
  } else {
    // Local fallback
    const mockUser = {
      id: `local_${cleanEmail}`,
      email: cleanEmail,
      displayName: cleanDisplayName,
      createdAt: Date.now(),
      lastLoginAt: Date.now()
    };
    localStorage.setItem('tomato_local_user', JSON.stringify(mockUser));
    return mockUser;
  }
}

export async function signIn({ email, password }) {
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: String(password || '')
    });

    if (error) {
      throw authError('authErrorInvalidLogin', error.message);
    }
    return await getCurrentUser();
  } else {
    // Local fallback
    const localUserStr = localStorage.getItem('tomato_local_user');
    if (!localUserStr) throw authError('authErrorInvalidLogin', 'User not found.');
    const user = JSON.parse(localUserStr);
    if (user.email !== cleanEmail) {
      // Very basic mock check
      throw authError('authErrorInvalidLogin', 'Invalid credentials.');
    }
    user.lastLoginAt = Date.now();
    localStorage.setItem('tomato_local_user', JSON.stringify(user));
    return user;
  }
}

export async function signOut() {
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } else {
    localStorage.removeItem('tomato_local_user');
  }
}
