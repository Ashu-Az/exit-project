import { Document } from "mongoose";

export type UserRole = "superadmin" | "admin" | "executive" | "client" | "newUser";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  roleId: string; // Reference to Role document
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  isBlocked: boolean;
  
  // Additional user info
  phoneNumber?: string;
  profileImage?: string;
  
  // Security
  lastPasswordChange?: Date;
  loginAttempts: number;
  accountLocked: boolean;
  lockUntil?: Date;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  roleId: string;
  phoneNumber?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  roleId?: string;
  isActive?: boolean;
  isBlocked?: boolean;
  phoneNumber?: string;
  profileImage?: string;
  accountLocked?: boolean;
}

export interface UserSearchRequest {
  mongoQuery: Record<string, any>;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  projection?: Record<string, number>;
  search?: string;
}