import { createClient } from 'redis';

const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', (err) => console.error('Redis Error:', err));
client.on('connect', () => console.log('✅ Redis Connected'));

export const connectRedis = async () => {
  await client.connect();
};

// User blocking
export const blockUser = async (userId: string) => {
  await client.set(`blocked_user:${userId}`, 'true');
};

export const unblockUser = async (userId: string) => {
  await client.del(`blocked_user:${userId}`);
};

export const isUserBlocked = async (userId: string): Promise<boolean> => {
  const blocked = await client.get(`blocked_user:${userId}`);
  return !!blocked;
};

// Token blacklisting
export const blacklistToken = async (token: string, expiry: number) => {
  const now = Math.floor(Date.now() / 1000);
  const ttl = expiry - now;
  if (ttl > 0) {
    await client.setEx(`blacklist:${token}`, ttl, 'true');
  }
};

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const blacklisted = await client.get(`blacklist:${token}`);
  return !!blacklisted;
};

// Login attempt tracking
export const incrementLoginAttempts = async (email: string): Promise<number> => {
  const key = `login_attempts:${email}`;
  const attempts = await client.incr(key);
  await client.expire(key, 900); // 15 minutes
  return attempts;
};

export const resetLoginAttempts = async (email: string) => {
  await client.del(`login_attempts:${email}`);
};

export const getLoginAttempts = async (email: string): Promise<number> => {
  const attempts = await client.get(`login_attempts:${email}`);
  return attempts ? parseInt(attempts) : 0;
};