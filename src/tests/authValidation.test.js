import { describe, expect, it } from 'vitest';
import {
  getAuthRedirectTo,
  isEmailConfirmed,
  normalizeEmail,
  validateAuthInput,
  validateEmail
} from '../services/authValidation.service.js';

describe('auth validation', () => {
  it('normalizes email before validation', () => {
    expect(normalizeEmail('  USER@Example.COM  ')).toBe('user@example.com');
    expect(validateAuthInput('  USER@Example.COM  ', 'tomato2026')).toMatchObject({
      handleOk: true,
      lengthOk: true,
      mixOk: true,
      ok: true
    });
  });

  it('rejects malformed email shapes before they reach Supabase', () => {
    expect(validateEmail('tomato')).toBe(false);
    expect(validateEmail('tomato@example')).toBe(false);
    expect(validateEmail('tomato@example.c')).toBe(false);
    expect(validateEmail('tomato@example..com')).toBe(false);
    expect(validateEmail('tomato@-example.com')).toBe(false);
    expect(validateEmail('tomato@example-.com')).toBe(false);
    expect(validateEmail('tomato@example.co')).toBe(true);
  });

  it('requires a mixed password with at least eight characters', () => {
    expect(validateAuthInput('tomato@example.com', 'short1')).toMatchObject({
      ok: false,
      messageKey: 'authErrorPasswordLength'
    });
    expect(validateAuthInput('tomato@example.com', 'password')).toMatchObject({
      ok: false,
      messageKey: 'authErrorPasswordMix'
    });
  });

  it('builds a redirect URL for the deployed base path', () => {
    expect(getAuthRedirectTo({ origin: 'https://deephoon.github.io' }, '/Tomato/'))
      .toBe('https://deephoon.github.io/Tomato/');
  });

  it('recognizes confirmed Supabase email users', () => {
    expect(isEmailConfirmed({ email_confirmed_at: '2026-06-24T00:00:00Z' })).toBe(true);
    expect(isEmailConfirmed({ confirmed_at: '2026-06-24T00:00:00Z' })).toBe(true);
    expect(isEmailConfirmed({ email_confirmed_at: null })).toBe(false);
  });
});
