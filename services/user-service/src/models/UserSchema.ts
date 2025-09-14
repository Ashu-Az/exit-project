import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

interface UserDocument {
  name: string;
  email: string;
  password?: string;
  roleId?: string; // Changed from ObjectId to string
  isActive: boolean;
  lastLogin?: Date;
  isBlocked: boolean;
  phoneNumber?: string;
  profileImage?: string;
  lastPasswordChange: Date;
  loginAttempts: number;
  accountLocked: boolean;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    roleId: {
      type: String, // Changed from ObjectId to String
      required: false, // Make optional for now
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    profileImage: {
      type: String,
      trim: true
    },
    lastPasswordChange: {
      type: Date,
      default: Date.now
    },
    loginAttempts: {
      type: Number,
      default: 0
    },
    accountLocked: {
      type: Boolean,
      default: false
    },
    lockUntil: {
      type: Date
    }
  },
  { 
    timestamps: true,
    toJSON: { 
      transform: function(doc: any, ret: UserDocument) { 
        const obj = ret as any;
        delete obj.password;
        return obj;
      } 
    }
  }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ roleId: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ isBlocked: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ name: 'text', email: 'text' });

UserSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

UserSchema.methods.comparePassword = async function(password: string) {
  return await bcrypt.compare(password, this.password);
};

export const User = mongoose.model<UserDocument>("User", UserSchema);