import { Document } from "mongoose";

export interface IRole extends Document {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRoleRequest {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
}