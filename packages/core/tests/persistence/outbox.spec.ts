import { describe, it } from 'vitest';

import { postgres } from '../../src/shared/infrastructure/persistence';

describe.skip('PostgreSQL outbox polling service', () => {
  const repository: postgres.outbox.IOutboxRepository = {
    async insert() {
      throw new Error('TODO: implement insert');
    },
    async reserveBatch() {
      throw new Error('TODO: implement reserveBatch');
    },
    async markPublished() {
      throw new Error('TODO: implement markPublished');
    },
    async markFailed() {
      throw new Error('TODO: implement markFailed');
    },
    async incrementAttempt() {
      throw new Error('TODO: implement incrementAttempt');
    },
    async findByStatus() {
      throw new Error('TODO: implement findByStatus');
    },
  };

  const pollingService = new postgres.outbox.OutboxPollingService(repository, {
    intervalMs: 1000,
    batchSize: 10,
  });

  it('polls the repository at the configured interval');

  it('marks messages as published after successful broker delivery');

  it('marks messages as failed when publishing throws');

  it('increments attempt count on retries');

  it('applies backoff when messages repeatedly fail');

  it('stops polling when stop() is invoked');

  it('is resilient to concurrent start() calls');

  it('cleans up interval handles after stop()');
});
