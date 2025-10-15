import { describe, expect, it } from 'vitest';

describe('modules/auth/application/LoginUseCase', () => {
  it('exposes an execute method for handling login requests', async () => {
    const mod = await import('../src/modules/auth/application/usecases/LoginUseCase');
    const { LoginUseCase } = mod as { LoginUseCase: new (...args: any[]) => any };

    expect(LoginUseCase).toBeDefined();
    expect(typeof LoginUseCase.prototype.execute).toBe('function');
  });
});
