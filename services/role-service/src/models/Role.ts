import mongoose, { Schema } from "mongoose";
import type { IRole } from "../interfaces/Role.js";

const RoleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    permissions: [{
      type: String,
      required: true
    }],
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

RoleSchema.index({ name: 1 }, { unique: true });
RoleSchema.index({ isActive: 1 });

export const Role = mongoose.model<IRole>("Role", RoleSchema);