import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const confirmedUser = {
  id: 'user-1',
  email: 'tomato@example.com',
  email_confirmed_at: '2026-06-24T00:00:00Z',
  user_metadata: { display_name: 'Tomato' }
};

describe('Supabase auth service hardening', () => {
  let mockSupabase;

  beforeEach(() => {
    vi.resetModules();
    mockSupabase = {
      auth: {
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        onAuthStateChange: vi.fn()
      },
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({ error: null })
      }))
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ mailer_autoconfirm: false })
    });
    vi.doMock('../supabase/client.js', () => ({
      supabase: mockSupabase,
      supabaseAnonKey: 'anon-key',
      supabaseUrl: 'https://project.supabase.co'
    }));
  });

  afterEach(() => {
    vi.doUnmock('../supabase/client.js');
    vi.restoreAllMocks();
  });

  it('rejects invalid sign-in input before calling Supabase', async () => {
    const { signInWithEmail } = await import('../supabase/auth.service.js');

    await expect(signInWithEmail('bad-email', 'password1')).rejects.toMatchObject({
      code: 'authErrorHandleRule'
    });
    expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('signs out after sign-up so a new account must use the email confirmation flow', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: confirmedUser, session: { access_token: 'token' } },
      error: null
    });

    const { signUpWithEmail } = await import('../supabase/auth.service.js');
    const result = await signUpWithEmail(' Tomato@Example.COM ', 'tomato2026', 'Tomato', {
      redirectTo: 'https://deephoon.github.io/Tomato/'
    });

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'tomato@example.com',
      password: 'tomato2026',
      options: {
        data: { display_name: 'Tomato' },
        emailRedirectTo: 'https://deephoon.github.io/Tomato/'
      }
    });
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    expect(result).toMatchObject({ needsEmailConfirmation: true });
  });

  it('blocks auth when Supabase email auto-confirm is enabled', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ mailer_autoconfirm: true })
    });

    const { signInWithEmail } = await import('../supabase/auth.service.js');

    await expect(signInWithEmail('tomato@example.com', 'tomato2026')).rejects.toMatchObject({
      code: 'authErrorEmailConfirmDisabled'
    });
    expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('rejects unconfirmed email sessions and clears them immediately', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { ...confirmedUser, email_confirmed_at: null, confirmed_at: null },
        session: { access_token: 'token' }
      },
      error: null
    });

    const { signInWithEmail } = await import('../supabase/auth.service.js');

    await expect(signInWithEmail('tomato@example.com', 'tomato2026')).rejects.toMatchObject({
      code: 'authErrorEmailNotConfirmed'
    });
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('upserts a profile after a confirmed sign-in', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({ upsert });
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: confirmedUser, session: { access_token: 'token' } },
      error: null
    });

    const { signInWithEmail } = await import('../supabase/auth.service.js');
    await expect(signInWithEmail('tomato@example.com', 'tomato2026')).resolves.toBe(confirmedUser);

    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    expect(upsert).toHaveBeenCalledWith({ id: 'user-1', display_name: 'Tomato' });
  });
});
