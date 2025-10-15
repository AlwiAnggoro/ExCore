import type { OutboxMessage } from './OutboxMessage';

/**
 * Persistence contract for the PostgreSQL-backed outbox.
 *
 * TODO: Replace all placeholder implementations once the real database wiring
 * is available. These methods intentionally avoid specifying concrete return
 * types so early iterations can experiment with Result/Either wrappers.
 */
export interface IOutboxRepository {
  /**
   * Persist a new message in the outbox table.
   */
  insert(message: OutboxMessage): Promise<void>;

  /**
   * Reserve a batch of messages for publishing. Implementations should rely on
  * `FOR UPDATE SKIP LOCKED` or a similar locking strategy.
  */
  reserveBatch(limit: number): Promise<OutboxMessage[]>;

  /**
   * Mark the message as successfully published.
   */
  markPublished(messageId: string): Promise<void>;

  /**
   * Mark the message as failed and capture the error payload for later
   * inspection.
   */
  markFailed(messageId: string, error: unknown): Promise<void>;

  /**
   * Increment the attempt counter for retry logic.
   */
  incrementAttempt(messageId: string): Promise<void>;

  /**
   * Retrieve messages matching the provided status.
   */
  findByStatus(status: OutboxMessage['status']): Promise<OutboxMessage[]>;
}
