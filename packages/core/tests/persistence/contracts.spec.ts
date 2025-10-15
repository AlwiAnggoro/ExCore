import { describe, it, expectTypeOf } from 'vitest';

import {
  BaseSpecification,
  InMemorySpecification,
  UniqueEntityID,
  createPage,
  PageResponse,
  IDataMapper,
  IRepository,
  IPaginatedRepository,
  ISpecification,
  IUnitOfWork,
  Result,
} from '../../src';

class AlwaysTrueSpecification<T> extends BaseSpecification<T> {
  isSatisfiedBy(): boolean {
    return true;
  }
}

describe('persistence contracts', () => {
  it('provides specification combinators', () => {
    const spec = new AlwaysTrueSpecification<number>();

    expectTypeOf(spec.and(spec)).toMatchTypeOf<ISpecification<number>>();
    expectTypeOf(spec.or(spec)).toMatchTypeOf<ISpecification<number>>();
    expectTypeOf(spec.not()).toMatchTypeOf<ISpecification<number>>();

    const inMemory = InMemorySpecification.from((value: number) => value > 0);
    expectTypeOf(inMemory).toMatchTypeOf<ISpecification<number>>();
  });

  it('defines repository contract shapes', () => {
    type Entity = { id: string };
    type Repo = IRepository<Entity>;
    type PaginatedRepo = IPaginatedRepository<Entity>;

    expectTypeOf<Parameters<Repo['findById']>>().toEqualTypeOf<[UniqueEntityID]>();
    expectTypeOf<Awaited<ReturnType<Repo['findById']>>>().toEqualTypeOf<Result<Entity | null>>();
    expectTypeOf<Awaited<ReturnType<Repo['save']>>>().toEqualTypeOf<Result<void>>();
    expectTypeOf<Awaited<ReturnType<Repo['exists']>>>().toEqualTypeOf<Result<boolean>>();
    expectTypeOf<Awaited<ReturnType<PaginatedRepo['findPage']>>>().toEqualTypeOf<
      Result<PageResponse<Entity>>
    >();
  });

  it('ensures data mapper converts between domain and persistence types', () => {
    type Domain = { id: string };
    type Persistence = { id: string };
    type Mapper = IDataMapper<Domain, Persistence>;

    expectTypeOf<ReturnType<Mapper['toDomain']>>().toEqualTypeOf<Result<Domain>>();
    expectTypeOf<ReturnType<Mapper['toPersistence']>>().toEqualTypeOf<Result<Persistence>>();
  });

  it('ensures unit of work exposes transactional methods', () => {
    type Uow = IUnitOfWork;
    type Exec = Uow['execute'];

    expectTypeOf<Awaited<ReturnType<Uow['begin']>>>().toEqualTypeOf<Result<void>>();
    expectTypeOf<Awaited<ReturnType<Uow['commit']>>>().toEqualTypeOf<Result<void>>();
    expectTypeOf<Awaited<ReturnType<Uow['rollback']>>>().toEqualTypeOf<Result<void>>();
    expectTypeOf<Parameters<Exec>[0]>().toEqualTypeOf<() => Promise<Result<unknown>>>();
    expectTypeOf<ReturnType<Exec>>().toEqualTypeOf<Promise<Result<unknown>>>();
  });

  it('provides repository utility helpers', () => {
    const page = createPage([1, 2], 2, { page: 1, pageSize: 2 });
    expectTypeOf(page.total).toEqualTypeOf<number>();
  });
});
