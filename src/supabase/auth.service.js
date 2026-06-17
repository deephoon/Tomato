import { supabase } from './client.js';

export async function signInWithEmail(email, password) {
  if (!supabase) throw new Error("Supabase configuration is missing.");
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    console.error("Auth signin error:", error.message);
    throw error;
  }
  return data.user;
}

export async function signUpWithEmail(email, password, displayName) {
  if (!supabase) throw new Error("Supabase configuration is missing.");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName
      }
    }
  });
  
  if (error) {
    console.error("Auth signup error:", error.message);
    throw error;
  }
  
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: data.user.id, display_name: displayName });
    if (profileError) console.error('Profile creation failed:', profileError);
  }
  
  return data.user;
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
