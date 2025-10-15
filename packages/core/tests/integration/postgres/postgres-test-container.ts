/**
 * Placeholder utilities for managing a PostgreSQL Testcontainers instance.
 *
 * The real implementation will spin up a containerised PostgreSQL database
 * for integration tests. Until that work is prioritised, we expose the same
 * surface area but fail fast with informative errors.
 */
export interface PostgresTestContainer {
  /** Connection string pointing at the running test database. */
  connectionString: string;
  /** Optional metadata for future debugging/diagnostics. */
  metadata?: Record<string, unknown>;
}

/** Configuration used when starting the future Testcontainers instance. */
export interface PostgresTestContainerOptions {
  image?: string;
  username?: string;
  password?: string;
  database?: string;
}

const NOT_IMPLEMENTED_MESSAGE =
  'PostgreSQL Testcontainer helper not implemented yet. Phase 2 will supply the real container wiring.';

export async function startPostgresContainer(
  _options: PostgresTestContainerOptions = {}
): Promise<PostgresTestContainer> {
  // We deliberately throw so tests fail loudly if somebody enables the suite prematurely.
  throw new Error(NOT_IMPLEMENTED_MESSAGE);
}

export async function stopPostgresContainer(_container: PostgresTestContainer): Promise<void> {
  throw new Error(NOT_IMPLEMENTED_MESSAGE);
}
