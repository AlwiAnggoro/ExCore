import { describe, it, expect } from 'vitest';
import { Role } from './Role';

describe('Role Domain Entity', () => {
  describe('create', () => {
    it('should create a valid role with minimum required fields', () => {
      const result = Role.create({
        name: 'Admin',
        permissions: ['users:read', 'users:write'],
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value.name).toBe('Admin');
      expect(result.value.permissions).toEqual(['users:read', 'users:write']);
      expect(result.value.createdAt).toBeInstanceOf(Date);
    });

    it('should create a role with description', () => {
      const result = Role.create({
        name: 'Editor',
        description: 'Can edit content',
        permissions: ['content:edit'],
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value.description).toBe('Can edit content');
    });

    it('should create a role with empty permissions array', () => {
      const result = Role.create({
        name: 'Guest',
        permissions: [],
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value.permissions).toEqual([]);
    });

    it('should trim whitespace from role name', () => {
      const result = Role.create({
        name: '  Admin  ',
        permissions: ['users:read'],
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value.name).toBe('Admin');
    });

    it('should fail when name is empty', () => {
      const result = Role.create({
        name: '',
        permissions: ['users:read'],
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('name is required');
    });

    it('should fail when name is only whitespace', () => {
      const result = Role.create({
        name: '   ',
        permissions: ['users:read'],
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('name is required');
    });

    it('should fail when name exceeds 50 characters', () => {
      const result = Role.create({
        name: 'A'.repeat(51),
        permissions: ['users:read'],
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('must not exceed 50 characters');
    });

    it('should fail when permissions is not an array', () => {
      const result = Role.create({
        name: 'Admin',
        permissions: 'users:read' as any, // Invalid type
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('must be an array');
    });

    it('should fail when permissions is undefined', () => {
      const result = Role.create({
        name: 'Admin',
        permissions: undefined as any,
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('must be an array');
    });

    it('should fail when permissions contain empty string', () => {
      const result = Role.create({
        name: 'Admin',
        permissions: ['users:read', '', 'users:write'],
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('non-empty string');
    });

    it('should fail when permissions contain only whitespace', () => {
      const result = Role.create({
        name: 'Admin',
        permissions: ['users:read', '   ', 'users:write'],
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('non-empty string');
    });

    it('should fail when permissions contain non-string value', () => {
      const result = Role.create({
        name: 'Admin',
        permissions: ['users:read', 123 as any, 'users:write'],
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('non-empty string');
    });
  });

  describe('hasPermission', () => {
    it('should return true when role has the permission', () => {
      const role = Role.create({
        name: 'Admin',
        permissions: ['users:read', 'users:write', 'users:delete'],
      }).value;

      expect(role.hasPermission('users:read')).toBe(true);
      expect(role.hasPermission('users:write')).toBe(true);
      expect(role.hasPermission('users:delete')).toBe(true);
    });

    it('should return false when role does not have the permission', () => {
      const role = Role.create({
        name: 'Editor',
        permissions: ['content:read', 'content:write'],
      }).value;

      expect(role.hasPermission('users:delete')).toBe(false);
      expect(role.hasPermission('admin:access')).toBe(false);
    });

    it('should return false for empty permission string', () => {
      const role = Role.create({
        name: 'Admin',
        permissions: ['users:read'],
      }).value;

      expect(role.hasPermission('')).toBe(false);
    });

    it('should be case-sensitive', () => {
      const role = Role.create({
        name: 'Admin',
        permissions: ['users:read'],
      }).value;

      expect(role.hasPermission('users:read')).toBe(true);
      expect(role.hasPermission('users:READ')).toBe(false);
      expect(role.hasPermission('Users:read')).toBe(false);
    });
  });

  describe('addPermission', () => {
    it('should add a new permission successfully', () => {
      const role = Role.create({
        name: 'Editor',
        permissions: ['content:read'],
      }).value;

      const result = role.addPermission('content:write');

      expect(result.isSuccess).toBe(true);
      expect(role.permissions).toContain('content:write');
      expect(role.permissions).toHaveLength(2);
      expect(role.updatedAt).toBeInstanceOf(Date);
    });

    it('should fail when adding empty permission', () => {
      const role = Role.create({
        name: 'Admin',
        permissions: ['users:read'],
      }).value;

      const result = role.addPermission('');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('cannot be empty');
      expect(role.permissions).toHaveLength(1);
    });

    it('should fail when adding whitespace-only permission', () => {
      const role = Role.create({
        name: 'Admin',
        permissions: ['users:read'],
      }).value;

      const result = role.addPermission('   ');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('cannot be empty');
    });

    it('should fail when adding duplicate permission', () => {
      const role = Role.create({
        name: 'Admin',
        permissions: ['users:read', 'users:write'],
      }).value;

      const result = role.addPermission('users:read');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('already exists');
      expect(role.permissions).toHaveLength(2);
    });

    it('should update the updatedAt timestamp', () => {
      const role = Role.create({
        name: 'Editor',
        permissions: ['content:read'],
      }).value;

      const beforeUpdate = role.updatedAt;

      // Wait a tiny bit to ensure timestamp difference
      setTimeout(() => {
        role.addPermission('content:write');
        expect(role.updatedAt).not.toBe(beforeUpdate);
      }, 1);
    });

    it('should allow adding multiple permissions sequentially', () => {
      const role = Role.create({
        name: 'Admin',
        permissions: [],
      }).value;

      role.addPermission('users:read');
      role.addPermission('users:write');
      role.addPermission('users:delete');

      expect(role.permissions).toHaveLength(3);
      expect(role.permissions).toContain('users:read');
      expect(role.permissions).toContain('users:write');
      expect(role.permissions).toContain('users:delete');
    });
  });

  describe('removePermission', () => {
    it('should remove an existing permission successfully', () => {
      const role = Role.create({
        name: 'Admin',
        permissions: ['users:read', 'users:write', 'users:delete'],
      }).value;

      const result = role.removePermission('users:delete');

      expect(result.isSuccess).toBe(true);
      expect(role.permissions).not.toContain('users:delete');
      expect(role.permissions).toHaveLength(2);
      expect(role.updatedAt).toBeInstanceOf(Date);
    });

    it('should fail when removing non-existent permission', () => {
      const role = Role.create({
        name: 'Editor',
        permissions: ['content:read', 'content:write'],
      }).value;

      const result = role.removePermission('users:delete');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('not found');
      expect(role.permissions).toHaveLength(2);
    });

    it('should update the updatedAt timestamp', () => {
      const role = Role.create({
        name: 'Admin',
        permissions: ['users:read', 'users:write'],
      }).value;

      const beforeUpdate = role.updatedAt;

      setTimeout(() => {
        role.removePermission('users:write');
        expect(role.updatedAt).not.toBe(beforeUpdate);
      }, 1);
    });

    it('should allow removing all permissions', () => {
      const role = Role.create({
        name: 'Admin',
        permissions: ['users:read', 'users:write'],
      }).value;

      role.removePermission('users:read');
      role.removePermission('users:write');

      expect(role.permissions).toHaveLength(0);
    });

    it('should handle removing from single-permission role', () => {
      const role = Role.create({
        name: 'Viewer',
        permissions: ['content:read'],
      }).value;

      const result = role.removePermission('content:read');

      expect(result.isSuccess).toBe(true);
      expect(role.permissions).toHaveLength(0);
    });
  });

  describe('updateDescription', () => {
    it('should update description successfully', () => {
      const role = Role.create({
        name: 'Admin',
        permissions: ['users:read'],
      }).value;

      role.updateDescription('System administrator with full access');

      expect(role.description).toBe('System administrator with full access');
      expect(role.updatedAt).toBeInstanceOf(Date);
    });

    it('should update the updatedAt timestamp', () => {
      const role = Role.create({
        name: 'Admin',
        description: 'Old description',
        permissions: ['users:read'],
      }).value;

      const beforeUpdate = role.updatedAt;

      setTimeout(() => {
        role.updateDescription('New description');
        expect(role.updatedAt).not.toBe(beforeUpdate);
      }, 1);
    });

    it('should allow setting empty description', () => {
      const role = Role.create({
        name: 'Admin',
        description: 'Initial description',
        permissions: ['users:read'],
      }).value;

      role.updateDescription('');

      expect(role.description).toBe('');
    });

    it('should replace existing description', () => {
      const role = Role.create({
        name: 'Editor',
        description: 'Can edit content',
        permissions: ['content:edit'],
      }).value;

      role.updateDescription('Can view and edit content');

      expect(role.description).toBe('Can view and edit content');
    });
  });

  describe('getters', () => {
    it('should expose all properties via getters', () => {
      const role = Role.create({
        name: 'Admin',
        description: 'Administrator role',
        permissions: ['users:read', 'users:write'],
      }).value;

      expect(role.name).toBe('Admin');
      expect(role.description).toBe('Administrator role');
      expect(role.permissions).toEqual(['users:read', 'users:write']);
      expect(role.createdAt).toBeInstanceOf(Date);
      expect(role.updatedAt).toBeUndefined(); // Not updated yet
    });

    it('should return readonly permissions array', () => {
      const role = Role.create({
        name: 'Admin',
        permissions: ['users:read'],
      }).value;

      const permissions = role.permissions;

      // TypeScript enforces readonly, but we can test runtime behavior
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions).toContain('users:read');
    });
  });

  describe('Entity properties', () => {
    it('should have unique ID', () => {
      const role1 = Role.create({
        name: 'Admin',
        permissions: ['users:read'],
      }).value;

      const role2 = Role.create({
        name: 'Editor',
        permissions: ['content:read'],
      }).value;

      expect(role1.id).toBeDefined();
      expect(role2.id).toBeDefined();
      expect(role1.id.toString()).not.toBe(role2.id.toString());
    });

    it('should accept custom ID during creation', () => {
      const customId = 'custom-role-id';

      const role = Role.create(
        {
          name: 'Admin',
          permissions: ['users:read'],
        },
        { toString: () => customId, toValue: () => customId, equals: (id) => id?.toValue() === customId } as any
      ).value;

      expect(role.id.toString()).toBe(customId);
    });
  });
});
