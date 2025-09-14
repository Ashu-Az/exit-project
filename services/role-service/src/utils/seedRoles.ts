import mongoose from 'mongoose';
import { Role } from '../models/Role.js';
import dotenv from 'dotenv';

dotenv.config();

const STATIC_ROLES = [
  {
    name: 'superadmin',
    displayName: 'Super Administrator',
    description: 'Full system access with all permissions',
    permissions: ['*']
  },
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Administrative access excluding user management and deletion',
    permissions: [
      'company:read', 'company:write', 'company:update', 'company:delete',
      'project:read', 'project:write', 'project:update', 'project:delete',
      'interview:read', 'interview:write', 'interview:update', 'interview:delete',
      'analytics:read', 'analytics:write'
    ]
  },
  {
    name: 'executive',
    displayName: 'Executive',
    description: 'Interview management and project operations',
    permissions: [
      'project:read', 'project:write',
      'interview:read', 'interview:write', 'interview:schedule',
      'interview:conduct', 'interview:fill_qa'
    ]
  },
  {
    name: 'client',
    displayName: 'Client',
    description: 'Limited access to own profile and data',
    permissions: ['profile:read', 'profile:update']
  },
  {
    name: 'newuser',
    displayName: 'New User',
    description: 'Basic access for newly registered users',
    permissions: ['profile:read']
  }
];

export async function seedRoles() {
  try {
    console.log('🌱 Starting role seeding...');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/exit_interview_platform');
    console.log('✅ Connected to MongoDB for seeding');
    
    for (const roleData of STATIC_ROLES) {
      const existingRole = await Role.findOne({ name: roleData.name });
      
      if (existingRole) {
        // Update existing role
        await Role.findOneAndUpdate(
          { name: roleData.name },
          roleData,
          { new: true }
        );
        console.log(`✅ Role ${roleData.name} updated`);
      } else {
        // Create new role
        const role = new Role(roleData);
        await role.save();
        console.log(`✅ Role ${roleData.name} created`);
      }
    }
    
    console.log('🎯 All roles seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding roles:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedRoles();
}