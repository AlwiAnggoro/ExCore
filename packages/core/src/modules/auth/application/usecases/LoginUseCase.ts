export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export class LoginUseCase {
  // Minimal placeholder to satisfy existing tests; real implementation will follow future phases.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(_request: LoginRequest): Promise<LoginResponse> {
    throw new Error('LoginUseCase.execute is not implemented yet');
  }
}
