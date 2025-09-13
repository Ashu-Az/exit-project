import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import type { JWTPayload } from '../interfaces/Auth.js';

export const defineAbilityFor = (user: JWTPayload) => {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility);

  const permissions = user.role.permissions;

  // Superadmin has all permissions
  if (permissions.includes('*')) {
    can('manage', 'all');
    return build();
  }

  // Map permissions to CASL abilities
  permissions.forEach(permission => {
    const parts = permission.split(':');
    if (parts.length === 2) {
      const [action, subject] = parts;
      can(action, subject);
    }
  });

  // Add specific restrictions
  if (user.role.name === 'admin') {
    cannot('delete', 'User');
    cannot('manage', 'UserManagement');
  }

  if (user.role.name === 'executive') {
    can('read', 'Project');
    can('write', 'Project');
    can('read', 'Interview');
    can('write', 'Interview');
    can('schedule', 'Interview');
    can('conduct', 'Interview');
    can('fill_qa', 'Interview');
    cannot('manage', ['User', 'Company', 'Analytics']);
  }

  if (user.role.name === 'client') {
    can('read', 'Profile', { userId: user.userId });
    can('update', 'Profile', { userId: user.userId });
    cannot('manage', 'all');
  }

  return build();
};

export const checkPermission = (ability: any, action: string, subject: string, conditions?: any) => {
  return ability.can(action, subject, conditions);
};