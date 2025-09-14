// Bun's built-in Redis-like storage implementation
class BunRedisStorage {
    private storage: Map<string, { value: string; expiry?: number }> = new Map();
    private timers: Map<string, Timer> = new Map();
    private isInitialized = false;
  
    constructor() {
      console.log('🚀 Bun Redis Storage initialized');
      
      // Cleanup expired keys every 60 seconds
      setInterval(() => {
        this.cleanupExpiredKeys();
      }, 60000);
      
      this.isInitialized = true;
    }
  
    private cleanupExpiredKeys() {
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [key, data] of this.storage.entries()) {
        if (data.expiry && now > data.expiry) {
          this.storage.delete(key);
          const timer = this.timers.get(key);
          if (timer) {
            clearTimeout(timer);
            this.timers.delete(key);
          }
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired keys`);
      }
    }
  
    // Redis-compatible methods
    async set(key: string, value: string): Promise<string> {
      this.storage.set(key, { value });
      console.log(`📝 SET ${key} = ${value}`);
      return 'OK';
    }
  
    async setEx(key: string, seconds: number, value: string): Promise<string> {
      const expiry = Date.now() + (seconds * 1000);
      this.storage.set(key, { value, expiry });
      
      // Set a timer to auto-delete when expired
      const timer = setTimeout(() => {
        this.storage.delete(key);
        this.timers.delete(key);
        console.log(`⏰ Auto-expired key: ${key}`);
      }, seconds * 1000);
      
      this.timers.set(key, timer);
      console.log(`📝 SETEX ${key} = ${value} (expires in ${seconds}s)`);
      return 'OK';
    }
  
    async get(key: string): Promise<string | null> {
      const data = this.storage.get(key);
      if (!data) {
        return null;
      }
      
      // Check if expired
      if (data.expiry && Date.now() > data.expiry) {
        this.storage.delete(key);
        const timer = this.timers.get(key);
        if (timer) {
          clearTimeout(timer);
          this.timers.delete(key);
        }
        return null;
      }
      
      return data.value;
    }
  
    async del(key: string): Promise<number> {
      const existed = this.storage.has(key);
      this.storage.delete(key);
      
      const timer = this.timers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(key);
      }
      
      console.log(`🗑️ DEL ${key}`);
      return existed ? 1 : 0;
    }
  
    async ttl(key: string): Promise<number> {
      const data = this.storage.get(key);
      if (!data) {
        return -2; // Key doesn't exist
      }
      
      if (!data.expiry) {
        return -1; // Key exists but no expiry
      }
      
      const remaining = Math.max(0, Math.floor((data.expiry - Date.now()) / 1000));
      return remaining;
    }
  
    async keys(pattern: string): Promise<string[]> {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      const matchingKeys = [];
      
      for (const key of this.storage.keys()) {
        if (regex.test(key)) {
          // Check if key is expired
          const data = this.storage.get(key);
          if (data && (!data.expiry || Date.now() <= data.expiry)) {
            matchingKeys.push(key);
          }
        }
      }
      
      return matchingKeys;
    }
  
    async incr(key: string): Promise<number> {
      const current = await this.get(key);
      const newValue = (current ? parseInt(current) : 0) + 1;
      await this.set(key, newValue.toString());
      return newValue;
    }
  
    async expire(key: string, seconds: number): Promise<number> {
      const data = this.storage.get(key);
      if (!data) {
        return 0; // Key doesn't exist
      }
      
      const expiry = Date.now() + (seconds * 1000);
      this.storage.set(key, { ...data, expiry });
      
      // Clear existing timer
      const existingTimer = this.timers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      
      // Set new timer
      const timer = setTimeout(() => {
        this.storage.delete(key);
        this.timers.delete(key);
        console.log(`⏰ Auto-expired key: ${key}`);
      }, seconds * 1000);
      
      this.timers.set(key, timer);
      console.log(`⏰ EXPIRE ${key} in ${seconds}s`);
      return 1;
    }
  
    // Debug methods
    getStorageSize(): number {
      return this.storage.size;
    }
  
    getAllKeys(): string[] {
      return Array.from(this.storage.keys());
    }
  
    getStats() {
      let withExpiry = 0;
      let withoutExpiry = 0;
      
      for (const data of this.storage.values()) {
        if (data.expiry) {
          withExpiry++;
        } else {
          withoutExpiry++;
        }
      }
      
      return {
        total: this.storage.size,
        withExpiry,
        withoutExpiry,
        isInitialized: this.isInitialized
      };
    }
  
    isConnected(): boolean {
      return this.isInitialized;
    }
  }
  
  // Create singleton instance
  const redisClient = new BunRedisStorage();
  
  // Helper function for safe operations
  const safeOperation = async <T>(operation: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      console.warn('Redis operation failed:', (error as Error).message);
      return fallback;
    }
  };
  
  // ============= EXPORTED FUNCTIONS =============
  
  // Connection (always succeeds with Bun)
  export const connectRedis = async (): Promise<void> => {
    console.log('✅ Bun Redis initialized');
  };
  
  // User blocking functions
  export const blockUser = async (userId: string): Promise<void> => {
    await safeOperation(async () => {
      await redisClient.set(`blocked_user:${userId}`, 'true');
      await forceLogoutUser(userId);
      console.log('🚫 User blocked:', userId);
    }, undefined);
  };
  
  export const unblockUser = async (userId: string): Promise<void> => {
    await safeOperation(async () => {
      await redisClient.del(`blocked_user:${userId}`);
      await removeUserFromForceLogout(userId);
      console.log('✅ User unblocked:', userId);
    }, undefined);
  };
  
  export const isUserBlocked = async (userId: string): Promise<boolean> => {
    return safeOperation(async () => {
      const blocked = await redisClient.get(`blocked_user:${userId}`);
      return !!blocked;
    }, false);
  };
  
  // Token blacklisting functions
  export const blacklistToken = async (token: string, expiry: number): Promise<void> => {
    const now = Math.floor(Date.now() / 1000);
    const ttl = expiry - now;
    
    if (ttl > 0) {
      await safeOperation(async () => {
        await redisClient.setEx(`blacklist:${token}`, ttl, 'true');
        console.log(`🚫 Token blacklisted for ${ttl} seconds`);
      }, undefined);
    }
  };
  
  export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
    return safeOperation(async () => {
      const blacklisted = await redisClient.get(`blacklist:${token}`);
      return !!blacklisted;
    }, false);
  };
  

  export const forceLogoutUser = async (userId: string): Promise<void> => {
    await safeOperation(async () => {
      await redisClient.setEx(`force_logout:${userId}`, 86400, 'true');
      console.log('🚪 User added to force logout list:', userId);
    }, undefined);
  };
  
  export const isUserForcedLogout = async (userId: string): Promise<boolean> => {
    return safeOperation(async () => {
      const forced = await redisClient.get(`force_logout:${userId}`);
      return !!forced;
    }, false);
  };
  
  export const removeUserFromForceLogout = async (userId: string): Promise<void> => {
    await safeOperation(async () => {
      await redisClient.del(`force_logout:${userId}`);
      console.log('🚪 User removed from force logout list:', userId);
    }, undefined);
  };
  
  // Login attempts functions
  export const incrementLoginAttempts = async (email: string): Promise<number> => {
    return safeOperation(async () => {
      const key = `login_attempts:${email}`;
      const attempts = await redisClient.incr(key);
      await redisClient.expire(key, 900); // 15 minutes
      return attempts;
    }, 0);
  };
  
  export const resetLoginAttempts = async (email: string): Promise<void> => {
    await safeOperation(async () => {
      await redisClient.del(`login_attempts:${email}`);
    }, undefined);
  };
  
  export const getLoginAttempts = async (email: string): Promise<number> => {
    return safeOperation(async () => {
      const attempts = await redisClient.get(`login_attempts:${email}`);
      return attempts ? parseInt(attempts) : 0;
    }, 0);
  };
  
  // Admin utility functions
  export const getAllBlockedUsers = async (): Promise<string[]> => {
    return safeOperation(async () => {
      const keys = await redisClient.keys('blocked_user:*');
      return keys.map(key => key.replace('blocked_user:', ''));
    }, []);
  };
  
  export const getAllForcedLogoutUsers = async (): Promise<string[]> => {
    return safeOperation(async () => {
      const keys = await redisClient.keys('force_logout:*');
      return keys.map(key => key.replace('force_logout:', ''));
    }, []);
  };
  
  export const getAllBlacklistedTokens = async (): Promise<string[]> => {
    return safeOperation(async () => {
      const keys = await redisClient.keys('blacklist:*');
      return keys.map(key => key.replace('blacklist:', ''));
    }, []);
  };
  
  // Debug functions
  export const getRedisStats = async () => {
    return safeOperation(async () => {
      const stats = redisClient.getStats();
      const blockedUsers = await getAllBlockedUsers();
      const forcedLogoutUsers = await getAllForcedLogoutUsers();
      const blacklistedTokens = await getAllBlacklistedTokens();
      
      return {
        ...stats,
        blockedUsers: blockedUsers.length,
        forcedLogoutUsers: forcedLogoutUsers.length,
        blacklistedTokens: blacklistedTokens.length,
        redisType: 'bun-in-memory'
      };
    }, {
      total: 0,
      withExpiry: 0,
      withoutExpiry: 0,
      blockedUsers: 0,
      forcedLogoutUsers: 0,
      blacklistedTokens: 0,
      isInitialized: false,
      redisType: 'bun-in-memory'
    });
  };
  
  export const getAllKeys = async (): Promise<string[]> => {
    return safeOperation(async () => {
      return redisClient.getAllKeys();
    }, []);
  };
  
  // Export the client for direct access if needed
  export { redisClient };