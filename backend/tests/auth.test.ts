import { describe, it, expect, vi } from 'vitest';
import { signToken, verifyToken } from '../src/lib/jwt';
import { requireRole, AuthRequest } from '../src/middleware/auth';
import { Response } from 'express';

describe('JWT Utilities', () => {
  it('signs and verifies a valid token payload', () => {
    const payload = { sub: 'user_123', email: 'admin@aegis.ai', role: 'ADMIN' };
    const token = signToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifyToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });

  it('throws an error on tampered or invalid token', () => {
    const token = signToken({ sub: 'user_123', email: 'test@aegis.ai', role: 'VIEWER' });
    const tampered = token.slice(0, -5) + 'abcde';
    expect(() => verifyToken(tampered)).toThrow();
  });
});

describe('requireRole middleware', () => {
  const createMockRes = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  it('allows access when user has the required role', () => {
    const req = {
      user: { sub: 'u1', email: 'ops@aegis.ai', role: 'OPERATOR' },
    } as AuthRequest;
    const res = createMockRes();
    const next = vi.fn();

    const middleware = requireRole('OPERATOR', 'ADMIN');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects with 403 when user lacks the required role', () => {
    const req = {
      user: { sub: 'u2', email: 'guest@aegis.ai', role: 'VIEWER' },
    } as AuthRequest;
    const res = createMockRes();
    const next = vi.fn();

    const middleware = requireRole('ADMIN');
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
  });

  it('rejects with 403 when req.user is undefined', () => {
    const req = {} as AuthRequest;
    const res = createMockRes();
    const next = vi.fn();

    const middleware = requireRole('ADMIN');
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
