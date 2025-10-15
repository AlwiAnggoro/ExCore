import { afterAll, beforeAll, describe, it } from 'vitest';

import {
  PostgresTestContainer,
  PostgresTestContainerOptions,
  startPostgresContainer,
  stopPostgresContainer,
} from './postgres-test-container';

describe.skip('PostgreSQL UserRepository CRUD smoke tests', () => {
  const containerOptions: PostgresTestContainerOptions = {
    image: 'postgres:16-alpine',
    username: 'postgres',
    password: 'postgres',
    database: 'excore_integration',
  };

  let container: PostgresTestContainer;

  beforeAll(async () => {
    container = await startPostgresContainer(containerOptions);
  });

  afterAll(async () => {
    await stopPostgresContainer(container);
  });

  describe('create()', () => {
    it('persists a new user with unique email');
    it('rejects duplicate emails');
  });

  describe('find()', () => {
    it('finds a user by id after creation');
    it('returns null for unknown ids');
  });

  describe('update()', () => {
    it('updates profile fields and returns the new state');
    it('guards against optimistic concurrency conflicts');
  });

  describe('delete()', () => {
    it('removes a user by id');
    it('returns success when deleting an already removed user');
  });

  describe('transactions', () => {
    it('commits when the transactional work succeeds');
    it('rolls back when an error is raised inside execute');
  });
});
