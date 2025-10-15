import { Entity } from '../../../shared/domain/Entity';
import { UniqueEntityID } from '../../../shared/domain/UniqueEntityID';
import { Result } from '../../../shared/core/Result';

interface RoleProps {
  name: string;
  description?: string;
  permissions: string[];
  createdAt: Date;
  updatedAt?: Date;
}

export class Role extends Entity<RoleProps> {
  private constructor(props: RoleProps, id?: UniqueEntityID) {
    super(props, id);
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get permissions(): readonly string[] {
    return this.props.permissions;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  public static create(
    props: Omit<RoleProps, 'createdAt'>,
    id?: UniqueEntityID
  ): Result<Role, string> {
    // Validate name
    if (!props.name || props.name.trim().length === 0) {
      return Result.fail('Role name is required');
    }

    if (props.name.length > 50) {
      return Result.fail('Role name must not exceed 50 characters');
    }

    // Validate permissions array
    if (!props.permissions || !Array.isArray(props.permissions)) {
      return Result.fail('Permissions must be an array');
    }

    // Validate each permission string
    for (const permission of props.permissions) {
      if (typeof permission !== 'string' || permission.trim().length === 0) {
        return Result.fail('Each permission must be a non-empty string');
      }
    }

    const role = new Role(
      {
        ...props,
        name: props.name.trim(),
        permissions: props.permissions,
        createdAt: new Date(),
      },
      id
    );

    return Result.ok(role);
  }

  public hasPermission(permission: string): boolean {
    return this.props.permissions.includes(permission);
  }

  public addPermission(permission: string): Result<void, string> {
    if (!permission || permission.trim().length === 0) {
      return Result.fail('Permission cannot be empty');
    }

    if (this.props.permissions.includes(permission)) {
      return Result.fail('Permission already exists');
    }

    this.props.permissions.push(permission);
    this.props.updatedAt = new Date();

    return Result.ok(undefined);
  }

  public removePermission(permission: string): Result<void, string> {
    const index = this.props.permissions.indexOf(permission);

    if (index === -1) {
      return Result.fail('Permission not found');
    }

    this.props.permissions.splice(index, 1);
    this.props.updatedAt = new Date();

    return Result.ok(undefined);
  }

  public updateDescription(description: string): void {
    this.props.description = description;
    this.props.updatedAt = new Date();
  }
}
