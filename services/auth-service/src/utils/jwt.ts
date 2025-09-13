import jwt, { SignOptions } from 'jsonwebtoken';
import type { JWTPayload, UserWithRole } from '../interfaces/Auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

export const generateToken = (user: UserWithRole): string => {
  const payload = {
    userId: user._id,
    email: user.email,
    name: user.name,
    roleId: user.roleId._id,
    role: {
      name: user.roleId.name,
      displayName: user.roleId.displayName,
      permissions: user.roleId.permissions
    }
  };

  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRY 
  } as any);
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
};

export const getTokenExpiry = (token: string): number => {
  const decoded = decodeToken(token);
  return decoded?.exp || 0;
};