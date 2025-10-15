/**
 * Placeholder representation of an outbox message. The concrete
 * PostgreSQL-backed implementation will extend this with database specific
 * identifiers, locking metadata, retry counters, and payload encodings.
 */
export interface OutboxMessage {
  /** Unique identifier (UUID expected once the real implementation lands). */
  id: string;
  /** Type discriminator so consumers can route events appropriately. */
  type: string;
  /** JSON serialised payload. */
  payload: Record<string, unknown>;
  /** ISO timestamp indicating when the message was created. */
  createdAt: string;
  /** Number of delivery attempts so far. */
  attemptCount: number;
  /** Current delivery status (pending, published, failed). */
  status: 'pending' | 'published' | 'failed';
  /**
   * When the message should become available again for polling. The real
   * adapter will use this to implement exponential backoff and dead letter
   * queues.
   */
  availableAt: string;
}

/**
 * TODO: extend this type with additional metadata such as headers, tenant
 * identifiers, or partition keys once the outbox schema is finalised.
 */
