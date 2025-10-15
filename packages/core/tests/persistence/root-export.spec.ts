import { describe, it, expectTypeOf } from 'vitest';

import { postgres } from '../../src';

describe('root postgres export', () => {
  it('exposes outbox polling service', () => {
    expectTypeOf(postgres.outbox.OutboxPollingService).toBeFunction();
  });
});
