import { describe, expect, it, vi } from 'vitest';

import { Result } from '../../src/shared/core/Result';
import { PostgreSQLConnectionManager } from '../../src/shared/infrastructure/persistence/postgres/PostgreSQLConnectionManager';
import { PostgreSQLUnitOfWork } from '../../src/shared/infrastructure/persistence/postgres/PostgreSQLUnitOfWork';

describe('PostgreSQLUnitOfWork', () => {
  it('begins and commits when execute succeeds', async () => {
    const connectionManager = new PostgreSQLConnectionManager();
    const unitOfWork = new PostgreSQLUnitOfWork(connectionManager);

    const beginSpy = vi.spyOn(unitOfWork, 'begin');
    const commitSpy = vi.spyOn(unitOfWork, 'commit');
    const rollbackSpy = vi.spyOn(unitOfWork, 'rollback');

    const result = await unitOfWork.execute(async () => Result.ok('done'));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBe('done');
    expect(beginSpy).toHaveBeenCalledTimes(1);
    expect(commitSpy).toHaveBeenCalledTimes(1);
    expect(rollbackSpy).not.toHaveBeenCalled();
  });

  it('rolls back when execute throws', async () => {
    const connectionManager = new PostgreSQLConnectionManager();
    const unitOfWork = new PostgreSQLUnitOfWork(connectionManager);

    const rollbackSpy = vi.spyOn(unitOfWork, 'rollback');

    const result = await unitOfWork.execute(async () => {
      throw new Error('boom');
    });

    expect(result.isFailure).toBe(true);
    expect(() => result.value).toThrow();
    expect(rollbackSpy).toHaveBeenCalledTimes(1);
  });

  it('returns a failure result when begin rejects', async () => {
    class FailingConnectionManager extends PostgreSQLConnectionManager {
      override async connect(): Promise<void> {
        throw new Error('cannot connect');
      }
    }

    const connectionManager = new FailingConnectionManager();
    const unitOfWork = new PostgreSQLUnitOfWork(connectionManager);
    const operation = vi.fn(async () => Result.ok('should not run'));

    const result = await unitOfWork.execute(operation);

    expect(operation).not.toHaveBeenCalled();
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('cannot connect');
  });
});
