import { describe, it, expect } from 'vitest';
import { RBACPolicyEvaluator } from './RBACPolicyEvaluator';
import type { PolicyContext } from '../domain/IPolicyEvaluator';

describe('RBACPolicyEvaluator', () => {
  let evaluator: RBACPolicyEvaluator;

  beforeEach(() => {
    evaluator = new RBACPolicyEvaluator();
  });

  describe('evaluate', () => {
    describe('Direct Permission Checks', () => {
      it('should allow access when user has direct permission', async () => {
        const context: PolicyContext = {
          userId: 'user-1',
          roles: ['editor'],
          permissions: ['content:edit', 'content:publish'],
          action: 'content:edit',
        };

        const result = await evaluator.evaluate(context);

        expect(result.isSuccess).toBe(true);
        expect(result.value.allowed).toBe(true);
        expect(result.value.reason).toContain('direct permission');
      });

      it('should deny access when user lacks direct permission', async () => {
        const context: PolicyContext = {
          userId: 'user-1',
          roles: ['viewer'],
          permissions: ['content:read'],
          action: 'content:delete',
        };

        const result = await evaluator.evaluate(context);

        expect(result.isSuccess).toBe(true);
        expect(result.value.allowed).toBe(false);
        expect(result.value.reason).toContain('does not have required permissions');
      });
    });

    describe('Resource-Action Combination Checks', () => {
      it('should allow access with resource:action permission', async () => {
        const context: PolicyContext = {
          userId: 'user-1',
          roles: ['editor'],
          permissions: ['articles:edit', 'articles:delete'],
          resource: 'articles',
          action: 'edit',
        };

        const result = await evaluator.evaluate(context);

        expect(result.isSuccess).toBe(true);
        expect(result.value.allowed).toBe(true);
        expect(result.value.reason).toContain('articles:edit');
      });

      it('should allow access with wildcard permission', async () => {
        const context: PolicyContext = {
          userId: 'user-1',
          roles: ['admin'],
          permissions: ['articles:*'],
          resource: 'articles',
          action: 'delete',
        };

        const result = await evaluator.evaluate(context);

        expect(result.isSuccess).toBe(true);
        expect(result.value.allowed).toBe(true);
        expect(result.value.reason).toContain('wildcard permission');
        expect(result.value.reason).toContain('articles:*');
      });

      it('should deny access when resource permission does not match', async () => {
        const context: PolicyContext = {
          userId: 'user-1',
          roles: ['editor'],
          permissions: ['articles:read'],
          resource: 'users',
          action: 'delete',
        };

        const result = await evaluator.evaluate(context);

        expect(result.isSuccess).toBe(true);
        expect(result.value.allowed).toBe(false);
      });

      it('should deny access when action does not match', async () => {
        const context: PolicyContext = {
          userId: 'user-1',
          roles: ['editor'],
          permissions: ['articles:read'],
          resource: 'articles',
          action: 'delete',
        };

        const result = await evaluator.evaluate(context);

        expect(result.isSuccess).toBe(true);
        expect(result.value.allowed).toBe(false);
      });
    });

    describe('Admin Role Checks', () => {
      it('should allow full access for admin role', async () => {
        const context: PolicyContext = {
          userId: 'admin-1',
          roles: ['admin'],
          permissions: [],
          resource: 'users',
          action: 'delete',
        };

        const result = await evaluator.evaluate(context);

        expect(result.isSuccess).toBe(true);
        expect(result.value.allowed).toBe(true);
        expect(result.value.reason).toContain('admin role');
      });

      it('should allow full access for superadmin role', async () => {
        const context: PolicyContext = {
          userId: 'superadmin-1',
          roles: ['superadmin'],
          permissions: [],
          resource: 'system',
          action: 'configure',
        };

        const result = await evaluator.evaluate(context);

        expect(result.isSuccess).toBe(true);
        expect(result.value.allowed).toBe(true);
        expect(result.value.reason).toContain('admin role');
      });

      it('should grant admin access even without specific permissions', async () => {
        const context: PolicyContext = {
          userId: 'admin-1',
          roles: ['admin', 'editor'],
          permissions: [],
          resource: 'anything',
          action: 'anything',
        };

        const result = await evaluator.evaluate(context);

        expect(result.isSuccess).toBe(true);
        expect(result.value.allowed).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('should deny access when no permissions and no admin role', async () => {
        const context: PolicyContext = {
          userId: 'user-1',
          roles: [],
          permissions: [],
          resource: 'articles',
          action: 'read',
        };

        const result = await evaluator.evaluate(context);

        expect(result.isSuccess).toBe(true);
        expect(result.value.allowed).toBe(false);
      });

      it('should handle empty roles array', async () => {
        const context: PolicyContext = {
          userId: 'user-1',
          roles: [],
          permissions: ['articles:read'],
          resource: 'articles',
          action: 'read',
        };

        const result = await evaluator.evaluate(context);

        expect(result.isSuccess).toBe(true);
        expect(result.value.allowed).toBe(true);
      });

      it('should handle missing resource in context', async () => {
        const context: PolicyContext = {
          userId: 'user-1',
          roles: ['editor'],
          permissions: ['edit'],
          action: 'edit',
        };

        const result = await evaluator.evaluate(context);

        expect(result.isSuccess).toBe(true);
        expect(result.value.allowed).toBe(true);
        expect(result.value.reason).toContain('direct permission');
      });

      it('should handle missing action in context', async () => {
        const context: PolicyContext = {
          userId: 'user-1',
          roles: ['viewer'],
          permissions: ['articles:read'],
          resource: 'articles',
        };

        const result = await evaluator.evaluate(context);

        expect(result.isSuccess).toBe(true);
        expect(result.value.allowed).toBe(false);
      });

      it('should handle context with only userId', async () => {
        const context: PolicyContext = {
          userId: 'user-1',
          roles: [],
          permissions: [],
        };

        const result = await evaluator.evaluate(context);

        expect(result.isSuccess).toBe(true);
        expect(result.value.allowed).toBe(false);
      });
    });

    describe('Permission Priority', () => {
      it('should check direct permission before resource:action', async () => {
        const context: PolicyContext = {
          userId: 'user-1',
          roles: ['editor'],
          permissions: ['edit', 'articles:read'],
          resource: 'articles',
          action: 'edit',
        };

        const result = await evaluator.evaluate(context);

        expect(result.isSuccess).toBe(true);
        expect(result.value.allowed).toBe(true);
        expect(result.value.reason).toContain('direct permission');
      });

      it('should check resource:action when direct permission not found', async () => {
        const context: PolicyContext = {
          userId: 'user-1',
          roles: ['editor'],
          permissions: ['articles:read', 'articles:edit'],
          resource: 'articles',
          action: 'read',
        };

        const result = await evaluator.evaluate(context);

        expect(result.isSuccess).toBe(true);
        expect(result.value.allowed).toBe(true);
      });

      it('should check wildcard after exact match', async () => {
        const context: PolicyContext = {
          userId: 'user-1',
          roles: ['editor'],
          permissions: ['articles:*'],
          resource: 'articles',
          action: 'create',
        };

        const result = await evaluator.evaluate(context);

        expect(result.isSuccess).toBe(true);
        expect(result.value.allowed).toBe(true);
        expect(result.value.reason).toContain('wildcard');
      });
    });

    describe('Multiple Permissions', () => {
      it('should allow access with any matching permission', async () => {
        const context: PolicyContext = {
          userId: 'user-1',
          roles: ['editor'],
          permissions: [
            'articles:read',
            'articles:edit',
            'articles:delete',
            'comments:read',
          ],
          resource: 'articles',
          action: 'delete',
        };

        const result = await evaluator.evaluate(context);

        expect(result.isSuccess).toBe(true);
        expect(result.value.allowed).toBe(true);
      });

      it('should deny access if no permissions match', async () => {
        const context: PolicyContext = {
          userId: 'user-1',
          roles: ['viewer'],
          permissions: ['articles:read', 'comments:read', 'users:read'],
          resource: 'articles',
          action: 'delete',
        };

        const result = await evaluator.evaluate(context);

        expect(result.isSuccess).toBe(true);
        expect(result.value.allowed).toBe(false);
      });
    });

    describe('Multiple Roles', () => {
      it('should grant admin access when admin is one of many roles', async () => {
        const context: PolicyContext = {
          userId: 'user-1',
          roles: ['viewer', 'editor', 'admin'],
          permissions: [],
          resource: 'system',
          action: 'delete',
        };

        const result = await evaluator.evaluate(context);

        expect(result.isSuccess).toBe(true);
        expect(result.value.allowed).toBe(true);
      });

      it('should work with non-admin roles', async () => {
        const context: PolicyContext = {
          userId: 'user-1',
          roles: ['viewer', 'editor', 'moderator'],
          permissions: ['articles:edit'],
          resource: 'articles',
          action: 'edit',
        };

        const result = await evaluator.evaluate(context);

        expect(result.isSuccess).toBe(true);
        expect(result.value.allowed).toBe(true);
      });
    });
  });

  describe('hasPermission', () => {
    it('should return false (stub implementation)', async () => {
      const result = await evaluator.hasPermission('user-1', 'articles:read');

      expect(result).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return false (stub implementation)', async () => {
      const result = await evaluator.hasRole('user-1', 'admin');

      expect(result).toBe(false);
    });
  });

  describe('canAccessResource', () => {
    it('should return false (stub implementation)', async () => {
      const result = await evaluator.canAccessResource('user-1', 'articles', 'read');

      expect(result).toBe(false);
    });
  });
});
