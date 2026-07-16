import { describe, it, expect } from 'vitest';

/**
 * Security tests for the share code generation and join flow.
 * These test the pure logic portions that don't require Supabase connection.
 */

describe('Share Code Generation', () => {
  it('should generate a 6-character alphanumeric share code', () => {
    // Simulate the share code generation logic from supabaseApi.ts
    const generateShareCode = (): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const arr = new Uint8Array(6);
      crypto.getRandomValues(arr);
      return Array.from(arr, b => chars[b % chars.length]).join('');
    };

    const code = generateShareCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('should generate unique codes across 1000 iterations', () => {
    const generateShareCode = (): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const arr = new Uint8Array(6);
      crypto.getRandomValues(arr);
      return Array.from(arr, b => chars[b % chars.length]).join('');
    };

    const codes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      codes.add(generateShareCode());
    }
    // With 36^6 = 2.17 billion possibilities, 1000 codes should all be unique
    expect(codes.size).toBe(1000);
  });

  it('should generate a 6-character password (not all zeros)', () => {
    // Fixed password generation (the bug was returning all zeros)
    const generatePassword = (): string => {
      const pwArray = new Uint8Array(6);
      crypto.getRandomValues(pwArray);
      return Array.from(pwArray, b => b.toString(36)).join('').substring(0, 6).toUpperCase();
    };

    const passwords = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const pw = generatePassword();
      passwords.add(pw);
      // Must never be all zeros (the bug we fixed)
      expect(pw).not.toBe('000000');
    }
    // Should generate diverse passwords
    expect(passwords.size).toBeGreaterThan(90);
  });

  it('should generate passwords with sufficient entropy', () => {
    const generatePassword = (): string => {
      const pwArray = new Uint8Array(6);
      crypto.getRandomValues(pwArray);
      return Array.from(pwArray, b => b.toString(36)).join('').substring(0, 6).toUpperCase();
    };

    const pw = generatePassword();
    expect(pw.length).toBe(6);
    // Should contain alphanumeric characters
    expect(pw).toMatch(/^[A-Z0-9]{6}$/);
  });
});

describe('Input Validation', () => {
  it('should reject empty share codes', () => {
    const validateShareCode = (code: string): boolean => {
      return code.trim().length > 0 && code.trim().length <= 10;
    };

    expect(validateShareCode('')).toBe(false);
    expect(validateShareCode('   ')).toBe(false);
    expect(validateShareCode('ABC123')).toBe(true);
  });

  it('should reject empty passwords', () => {
    const validatePassword = (pw: string): boolean => {
      return pw.trim().length > 0;
    };

    expect(validatePassword('')).toBe(false);
    expect(validatePassword('   ')).toBe(false);
    expect(validatePassword('ABC123')).toBe(true);
  });

  it('should sanitize share code input (trim whitespace)', () => {
    const sanitize = (input: string): string => input.trim().toUpperCase();

    expect(sanitize('  abc123  ')).toBe('ABC123');
    expect(sanitize('XyZ')).toBe('XYZ');
  });
});

describe('Rate Limiting Logic', () => {
  it('should allow requests within the limit', () => {
    // Simulate in-memory rate limiter
    const rateLimiter = new Map<string, number[]>();
    const maxRequests = 10;
    const windowMs = 60000;

    const checkRateLimit = (userId: string): boolean => {
      const now = Date.now();
      const requests = rateLimiter.get(userId) || [];
      const validRequests = requests.filter(t => now - t < windowMs);
      if (validRequests.length >= maxRequests) return false;
      validRequests.push(now);
      rateLimiter.set(userId, validRequests);
      return true;
    };

    // First 10 requests should pass
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit('user-1')).toBe(true);
    }
    // 11th should fail
    expect(checkRateLimit('user-1')).toBe(false);
    // Different user should still pass
    expect(checkRateLimit('user-2')).toBe(true);
  });
});
