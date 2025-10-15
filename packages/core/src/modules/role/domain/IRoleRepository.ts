import { Result } from '../../../shared/core/Result';
import { Role } from './Role';

export interface IRoleRepository {
  save(role: Role): Promise<Result<void, string>>;
  findById(id: string): Promise<Result<Role | null, string>>;
  findByName(name: string): Promise<Result<Role | null, string>>;
  existsByName(name: string): Promise<boolean>;
  findAll(): Promise<Result<Role[], string>>;
  delete(id: string): Promise<Result<void, string>>;
}
