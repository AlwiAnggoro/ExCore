import type { IOutboxRepository } from './IOutboxRepository';
import type { OutboxMessage } from './OutboxMessage';

/**
 * Configuration options for the polling service. These values will be refined
 * once the real scheduler is implemented.
 */
export interface OutboxPollingServiceConfig {
  /** How often to poll for new messages (milliseconds). */
  intervalMs: number;
  /** Maximum number of messages to reserve per poll. */
  batchSize: number;
}

export class OutboxPollingService {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly repository: IOutboxRepository,
    private readonly config: OutboxPollingServiceConfig,
  ) {}

  /**
   * Start background polling.
   * TODO: replace placeholder implementation with real scheduler.
   */
  start(): void {
    if (this.intervalHandle) {
      return;
    }

    this.intervalHandle = setInterval(() => {
      void this.poll();
    }, this.config.intervalMs);

    // Immediately trigger the first poll.
    void this.poll();
  }

  /**
   * Stop background polling and clean up resources.
   */
  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /**
   * Poll the repository for messages and attempt to publish them.
   * TODO: implement retry/backoff and broker integration.
   */
  async poll(): Promise<void> {
    if (!this.isActive()) {
      return;
    }

    const messages = await this.repository.reserveBatch(this.config.batchSize);
    await Promise.all(messages.map((message) => this.publishMessage(message)));
  }

  isActive(): boolean {
    return this.intervalHandle !== null;
  }

  private async publishMessage(message: OutboxMessage): Promise<void> {
    // TODO: integration with message broker + retry logic.
    await this.repository.markPublished(message.id);
  }
}
