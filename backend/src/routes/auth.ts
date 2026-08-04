import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../lib/db';
import { signToken } from '../lib/jwt';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  adminSecret: z.string().optional(), // if matches ADMIN_SECRET env var → ADMIN role
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const PromoteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['USER', 'OPERATOR', 'ADMIN']),
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const { email, password, name, adminSecret } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  // Determine role from adminSecret
  let role: 'USER' | 'OPERATOR' | 'ADMIN' = 'USER';
  const secret = process.env.ADMIN_SECRET;
  if (adminSecret && secret && adminSecret === secret) {
    role = 'ADMIN';
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: { email, hashedPassword, name, role },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  res.status(201).json({ token, user });
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const { email, password } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.hashedPassword);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: AuthRequest, res: Response): void => {
  res.json({ user: req.user });
});

// POST /api/auth/promote  — ADMIN only
// Body: { email: string, role: 'USER' | 'OPERATOR' | 'ADMIN' }
router.post(
  '/promote',
  requireAuth,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = PromoteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }
    const { email, role } = parsed.data;

    const target = await db.user.findUnique({ where: { email } });
    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updated = await db.user.update({
      where: { email },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });

    res.json({ message: `${email} promoted to ${role}`, user: updated });
  }
);

export default router;
