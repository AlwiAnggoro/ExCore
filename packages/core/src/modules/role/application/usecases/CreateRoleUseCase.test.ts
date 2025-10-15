import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateRoleUseCase } from './CreateRoleUseCase';
import type { IRoleRepository } from '../../domain/IRoleRepository';
import { Result } from '../../../../shared/core/Result';
import { Role } from '../../domain/Role';

describe('CreateRoleUseCase', () => {
  let useCase: CreateRoleUseCase;
  let mockRepository: IRoleRepository;

  beforeEach(() => {
    mockRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByName: vi.fn(),
      existsByName: vi.fn(),
      findAll: vi.fn(),
      delete: vi.fn(),
    };

    useCase = new CreateRoleUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should create a role successfully with valid input', async () => {
      const dto = {
        name: 'Admin',
        description: 'System administrator',
        permissions: ['users:read', 'users:write'],
      };

      vi.spyOn(mockRepository, 'existsByName').mockResolvedValue(false);
      vi.spyOn(mockRepository, 'save').mockResolvedValue(Result.ok(undefined));

      const result = await useCase.execute(dto);

      expect(result.isSuccess).toBe(true);
      expect(result.value.name).toBe('Admin');
      expect(result.value.description).toBe('System administrator');
      expect(result.value.permissions).toEqual(['users:read', 'users:write']);
      expect(result.value.id).toBeDefined();
      expect(result.value.createdAt).toBeInstanceOf(Date);

      expect(mockRepository.existsByName).toHaveBeenCalledWith('Admin');
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should create a role without description', async () => {
      const dto = {
        name: 'Editor',
        permissions: ['content:edit'],
      };

      vi.spyOn(mockRepository, 'existsByName').mockResolvedValue(false);
      vi.spyOn(mockRepository, 'save').mockResolvedValue(Result.ok(undefined));

      const result = await useCase.execute(dto);

      expect(result.isSuccess).toBe(true);
      expect(result.value.name).toBe('Editor');
      expect(result.value.description).toBeUndefined();
      expect(result.value.permissions).toEqual(['content:edit']);
    });

    it('should create a role with empty permissions array', async () => {
      const dto = {
        name: 'Guest',
        permissions: [],
      };

      vi.spyOn(mockRepository, 'existsByName').mockResolvedValue(false);
      vi.spyOn(mockRepository, 'save').mockResolvedValue(Result.ok(undefined));

      const result = await useCase.execute(dto);

      expect(result.isSuccess).toBe(true);
      expect(result.value.permissions).toEqual([]);
    });

    it('should fail when role name already exists', async () => {
      const dto = {
        name: 'Admin',
        permissions: ['users:read'],
      };

      vi.spyOn(mockRepository, 'existsByName').mockResolvedValue(true);

      const result = await useCase.execute(dto);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('already exists');
      expect(result.error).toContain('Admin');

      expect(mockRepository.existsByName).toHaveBeenCalledWith('Admin');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should fail when role name is empty', async () => {
      const dto = {
        name: '',
        permissions: ['users:read'],
      };

      vi.spyOn(mockRepository, 'existsByName').mockResolvedValue(false);

      const result = await useCase.execute(dto);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('name is required');

      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should fail when role name exceeds maximum length', async () => {
      const dto = {
        name: 'A'.repeat(51),
        permissions: ['users:read'],
      };

      vi.spyOn(mockRepository, 'existsByName').mockResolvedValue(false);

      const result = await useCase.execute(dto);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('must not exceed 50 characters');

      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should fail when permissions is not an array', async () => {
      const dto = {
        name: 'Admin',
        permissions: 'users:read' as any,
      };

      vi.spyOn(mockRepository, 'existsByName').mockResolvedValue(false);

      const result = await useCase.execute(dto);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('must be an array');

      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should fail when permissions contain invalid values', async () => {
      const dto = {
        name: 'Admin',
        permissions: ['users:read', '', 'users:write'],
      };

      vi.spyOn(mockRepository, 'existsByName').mockResolvedValue(false);

      const result = await useCase.execute(dto);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('non-empty string');

      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should fail when repository save fails', async () => {
      const dto = {
        name: 'Admin',
        permissions: ['users:read'],
      };

      vi.spyOn(mockRepository, 'existsByName').mockResolvedValue(false);
      vi.spyOn(mockRepository, 'save').mockResolvedValue(
        Result.fail('Database connection failed')
      );

      const result = await useCase.execute(dto);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database connection failed');

      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should trim whitespace from role name before checking existence', async () => {
      const dto = {
        name: '  Admin  ',
        permissions: ['users:read'],
      };

      vi.spyOn(mockRepository, 'existsByName').mockResolvedValue(false);
      vi.spyOn(mockRepository, 'save').mockResolvedValue(Result.ok(undefined));

      const result = await useCase.execute(dto);

      expect(result.isSuccess).toBe(true);
      expect(result.value.name).toBe('Admin');

      // Should check existence with original name (before trimming in entity)
      expect(mockRepository.existsByName).toHaveBeenCalledWith('  Admin  ');
    });

    it('should pass Role entity to repository save method', async () => {
      const dto = {
        name: 'Admin',
        permissions: ['users:read'],
      };

      let savedRole: Role | undefined;

      vi.spyOn(mockRepository, 'existsByName').mockResolvedValue(false);
      vi.spyOn(mockRepository, 'save').mockImplementation(async (role) => {
        savedRole = role;
        return Result.ok(undefined);
      });

      await useCase.execute(dto);

      expect(savedRole).toBeDefined();
      expect(savedRole).toBeInstanceOf(Role);
      expect(savedRole!.name).toBe('Admin');
      expect(savedRole!.permissions).toEqual(['users:read']);
    });

    it('should return immutable permissions array in DTO', async () => {
      const dto = {
        name: 'Admin',
        permissions: ['users:read', 'users:write'],
      };

      vi.spyOn(mockRepository, 'existsByName').mockResolvedValue(false);
      vi.spyOn(mockRepository, 'save').mockResolvedValue(Result.ok(undefined));

      const result = await useCase.execute(dto);

      expect(result.isSuccess).toBe(true);

      // Modify the returned permissions array
      const returnedPermissions = result.value.permissions;
      returnedPermissions.push('users:delete');

      // Original DTO should not be affected
      expect(dto.permissions).toEqual(['users:read', 'users:write']);
    });

    it('should handle multiple role creations independently', async () => {
      const dto1 = {
        name: 'Admin',
        permissions: ['users:read'],
      };

      const dto2 = {
        name: 'Editor',
        permissions: ['content:edit'],
      };

      vi.spyOn(mockRepository, 'existsByName').mockResolvedValue(false);
      vi.spyOn(mockRepository, 'save').mockResolvedValue(Result.ok(undefined));

      const result1 = await useCase.execute(dto1);
      const result2 = await useCase.execute(dto2);

      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result1.value.id).not.toBe(result2.value.id);
      expect(result1.value.name).toBe('Admin');
      expect(result2.value.name).toBe('Editor');
    });
  });
});
