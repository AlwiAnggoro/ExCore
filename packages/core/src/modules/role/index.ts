// Role Module Public API

// Domain
export { Role } from './domain/Role';
export type { IRoleRepository } from './domain/IRoleRepository';

// Application
export { CreateRoleUseCase } from './application/usecases/CreateRoleUseCase';
export type { CreateRoleDTO, RoleDTO } from './application/usecases/CreateRoleUseCase';
