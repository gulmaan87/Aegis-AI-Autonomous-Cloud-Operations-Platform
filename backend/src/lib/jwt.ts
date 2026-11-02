import jwt from 'jsonwebtoken';

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'aegis_jwt_secret_change_in_production';

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
