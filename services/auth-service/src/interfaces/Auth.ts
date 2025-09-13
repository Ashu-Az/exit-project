export interface LoginRequest {
    email: string;
    password: string;
  }
  
  export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
    roleId: string;
    phoneNumber?: string;
  }
  
  export interface JWTPayload {
    userId: string;
    email: string;
    name: string;
    roleId: string;
    role: {
      name: string;
      displayName: string;
      permissions: string[];
    };
    iat: number;
    exp: number;
  }
  
  export interface UserWithRole {
    _id: string;
    name: string;
    email: string;
    password?: string;
    roleId: {
      _id: string;
      name: string;
      displayName: string;
      permissions: string[];
    };
    isActive: boolean;
    isBlocked: boolean;
    lastLogin?: Date;
    loginAttempts: number;
    accountLocked: boolean;
    lockUntil?: Date;
  }