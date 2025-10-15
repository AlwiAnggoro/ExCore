import type { Result } from '../../../core/Result';
import type { UniqueEntityID } from '../../../domain/UniqueEntityID';
import type { ISpecification } from './ISpecification';
import type { PageResponse } from '../base/RepositoryUtils';

/**
 * Repository contract describing the minimal persistence operations needed by aggregates.
 * Implementations should translate between domain entities and their persistence models.
 */
export interface IRepository<TEntity, TId = UniqueEntityID> {
  findById(id: TId): Promise<Result<TEntity | null>>;
  findOne(specification: ISpecification<TEntity>): Promise<Result<TEntity | null>>;
  findMany(specification?: ISpecification<TEntity>): Promise<Result<TEntity[]>>;
  save(entity: TEntity): Promise<Result<void>>;
  delete(entity: TEntity): Promise<Result<void>>;
  exists(specification: ISpecification<TEntity>): Promise<Result<boolean>>;
}

/**
 * Optional pagination contract that repositories may implement for list endpoints.
 */
export interface IPaginatedRepository<TEntity, TId = UniqueEntityID> extends IRepository<TEntity, TId> {
  findPage(
    specification: ISpecification<TEntity>,
    options: { page: number; pageSize: number }
  ): Promise<Result<PageResponse<TEntity>>>;
}
