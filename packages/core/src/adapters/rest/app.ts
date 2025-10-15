import { randomUUID } from 'node:crypto';

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { cors } from 'hono/cors';

import {
  initializeTracing,
  TracerProviderConfig,
} from '../../shared/infrastructure/telemetry/TracerProvider';
import { tracingMiddleware } from './middleware/tracing';

interface TokenPayload {
  userId: string;
  issuedAt: number;
}

interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  refreshTokens: Set<string>;
}

export interface RestTracingConfig extends TracerProviderConfig {
  enabled?: boolean;
}

export interface RestApiConfig {
  tracing?: RestTracingConfig;
}

const users = new Map<string, UserRecord>();
const accessTokens = new Map<string, TokenPayload>();

function isTracingEnabled(config?: RestTracingConfig): boolean {
  if (typeof config?.enabled === 'boolean') {
    return config.enabled;
  }

  return process.env.REST_TRACE_ENABLED === '1';
}

function hashPassword(password: string): string {
  return `hashed:${Buffer.from(password).toString('base64')}`;
}

function issueAccessToken(userId: string): string {
  const token = `access-${randomUUID()}`;
  accessTokens.set(token, { userId, issuedAt: Date.now() });
  return token;
}

function issueRefreshToken(user: UserRecord): string {
  const token = `refresh-${randomUUID()}`;
  user.refreshTokens.add(token);
  return token;
}

function validateAccessToken(token?: string): UserRecord | undefined {
  if (!token) {
    return undefined;
  }

  const payload = accessTokens.get(token);
  if (!payload) {
    return undefined;
  }

  return users.get(payload.userId);
}

export function createRestApi(config: RestApiConfig = {}) {
  const app = new Hono();

  app.use('*', cors());

  if (isTracingEnabled(config.tracing)) {
    initializeTracing({
      serviceName: config.tracing?.serviceName,
      endpoint: config.tracing?.endpoint,
      processor: config.tracing?.processor,
      exporter: config.tracing?.exporter,
    });
    app.use('*', tracingMiddleware());
  }

  app.use('*', async (c, next) => {
    try {
      await next();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal error';
      const status = error instanceof HTTPException ? error.status : 500;
      return c.json({ error: message }, status);
    }
  });

  app.get('/health', (c) => c.json({ status: 'healthy', timestamp: Date.now() }));
  app.get('/ready', (c) =>
    c.json({ status: 'ready', users: users.size, accessTokens: accessTokens.size })
  );
  app.get('/metrics', (c) =>
    c.text(
      ['# TYPE excore_users gauge', `excore_users ${users.size}`, '# EOF'].join('\n')
    )
  );

  app.post('/api/auth/register', async (c) => {
    const body = await c.req.json<{ email?: string; password?: string; name?: string }>();
    if (!body.email || !body.password || !body.name) {
      return c.json({ error: 'email, password and name are required' }, 400);
    }

    const existing = Array.from(users.values()).find((user) => user.email === body.email);
    if (existing) {
      return c.json({ error: 'User already exists' }, 409);
    }

    const id = randomUUID();
    const user: UserRecord = {
      id,
      email: body.email,
      passwordHash: hashPassword(body.password),
      name: body.name,
      refreshTokens: new Set(),
    };

    users.set(id, user);

    const accessToken = issueAccessToken(id);
    const refreshToken = issueRefreshToken(user);

    return c.json(
      {
        user: { id: user.id, email: user.email, name: user.name },
        tokens: { accessToken, refreshToken },
      },
      201
    );
  });

  app.post('/api/auth/login', async (c) => {
    const body = await c.req.json<{ email?: string; password?: string }>();
    if (!body.email || !body.password) {
      return c.json({ error: 'email and password are required' }, 400);
    }

    const user = Array.from(users.values()).find((record) => record.email === body.email);
    if (!user || user.passwordHash !== hashPassword(body.password)) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const accessToken = issueAccessToken(user.id);
    const refreshToken = issueRefreshToken(user);

    return c.json({
      user: { id: user.id, email: user.email, name: user.name },
      tokens: { accessToken, refreshToken },
    });
  });

  app.post('/api/auth/refresh', async (c) => {
    const body = await c.req.json<{ refreshToken?: string }>();
    if (!body.refreshToken) {
      return c.json({ error: 'refreshToken is required' }, 400);
    }

    const user = Array.from(users.values()).find((record) =>
      record.refreshTokens.has(body.refreshToken!)
    );

    if (!user) {
      return c.json({ error: 'Invalid refresh token' }, 401);
    }

    const accessToken = issueAccessToken(user.id);
    return c.json({
      user: { id: user.id, email: user.email, name: user.name },
      tokens: { accessToken },
    });
  });

  app.post('/api/auth/logout', async (c) => {
    const body = await c.req.json<{ refreshToken?: string }>();
    if (!body.refreshToken) {
      return c.json({ error: 'refreshToken is required' }, 400);
    }

    const user = Array.from(users.values()).find((record) =>
      record.refreshTokens.has(body.refreshToken!)
    );

    if (!user) {
      return c.json({ error: 'Invalid refresh token' }, 401);
    }

    user.refreshTokens.delete(body.refreshToken);
    return c.json({ success: true });
  });

  app.post('/api/auth/logout-all', async (c) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const user = validateAccessToken(token);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    user.refreshTokens.clear();
    return c.json({ success: true });
  });

  app.get('/api/users/me', (c) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const user = validateAccessToken(token);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    return c.json({ user: { id: user.id, email: user.email, name: user.name } });
  });

  app.put('/api/users/profile', async (c) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const user = validateAccessToken(token);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json<{ name?: string }>();
    if (!body.name) {
      return c.json({ error: 'name is required' }, 400);
    }

    user.name = body.name;
    return c.json({ user: { id: user.id, email: user.email, name: user.name } });
  });

  app.post('/api/users/change-password', async (c) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const user = validateAccessToken(token);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json<{ currentPassword?: string; newPassword?: string }>();
    if (!body.currentPassword || !body.newPassword) {
      return c.json({ error: 'currentPassword and newPassword are required' }, 400);
    }

    if (user.passwordHash !== hashPassword(body.currentPassword)) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    user.passwordHash = hashPassword(body.newPassword);
    return c.json({ success: true });
  });

  app.notFound((c) => c.json({ error: 'Not Found' }, 404));

  return app;
}
