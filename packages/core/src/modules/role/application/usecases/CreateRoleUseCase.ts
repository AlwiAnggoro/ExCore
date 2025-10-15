import { Result } from '../../../../shared/core/Result';
import type { IRoleRepository } from '../../domain/IRoleRepository';
import { Role } from '../../domain/Role';

export interface CreateRoleDTO {
  name: string;
  description?: string;
  permissions: string[];
}

export interface RoleDTO {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  createdAt: Date;
  updatedAt?: Date;
}

export class CreateRoleUseCase {
  constructor(private readonly roleRepository: IRoleRepository) {}

  async execute(dto: CreateRoleDTO): Promise<Result<RoleDTO, string>> {
    // Check if role with same name exists
    const exists = await this.roleRepository.existsByName(dto.name);

    if (exists) {
      return Result.fail(`Role with name "${dto.name}" already exists`);
    }

    // Create role entity
    const roleOrError = Role.create({
      name: dto.name,
      description: dto.description,
      permissions: dto.permissions,
    });

    if (roleOrError.isFailure) {
      return Result.fail(roleOrError.error);
    }

    const role = roleOrError.value;

    // Persist role
    const saveResult = await this.roleRepository.save(role);

    if (saveResult.isFailure) {
      return Result.fail(saveResult.error);
    }

    // Return DTO
    return Result.ok({
      id: role.id.toString(),
      name: role.name,
      description: role.description,
      permissions: [...role.permissions],
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    });
  }
}
