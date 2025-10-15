/**
 * Example: JWT Authentication
 *
 * Demonstrates how to authenticate users and manage JWT tokens.
 */

import { LoginUseCase, RefreshTokenUseCase } from '@excore/core/auth';
import { Result } from '@excore/core/shared';

// Mock JWT Service
class MockJWTService {
  private secret = 'demo-secret-key';

  async generateAccessToken(userId: string): Promise<string> {
    const token = Buffer.from(
      JSON.stringify({
        userId,
        type: 'access',
        exp: Date.now() + 15 * 60 * 1000, // 15 minutes
      })
    ).toString('base64');

    console.log(`🔑 Generated access token for user: ${userId}`);
    return token;
  }

  async generateRefreshToken(userId: string): Promise<string> {
    const token = Buffer.from(
      JSON.stringify({
        userId,
        type: 'refresh',
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      })
    ).toString('base64');

    console.log(`🔐 Generated refresh token for user: ${userId}`);
    return token;
  }

  async verifyToken(token: string): Promise<Result<{ userId: string }, string>> {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());

      if (payload.exp < Date.now()) {
        return Result.fail('Token expired');
      }

      return Result.ok({ userId: payload.userId });
    } catch (error) {
      return Result.fail('Invalid token');
    }
  }
}

// Mock User Repository
class MockUserRepository {
  private users = new Map([
    [
      'user-1',
      {
        id: 'user-1',
        email: 'john@example.com',
        passwordHash: 'hashed_password_SecurePass123!', // Simulated hash
        name: 'John Doe',
      },
    ],
    [
      'user-2',
      {
        id: 'user-2',
        email: 'jane@example.com',
        passwordHash: 'hashed_password_JanePass456!',
        name: 'Jane Smith',
      },
    ],
  ]);

  async findByEmail(email: string): Promise<any | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async findById(id: string): Promise<any | null> {
    return this.users.get(id) || null;
  }
}

// Mock Refresh Token Repository
class MockRefreshTokenRepository {
  private tokens = new Map<string, { userId: string; token: string; expiresAt: Date }>();

  async save(userId: string, token: string, expiresAt: Date): Promise<void> {
    this.tokens.set(token, { userId, token, expiresAt });
    console.log(`💾 Refresh token saved for user: ${userId}`);
  }

  async findByToken(token: string): Promise<any | null> {
    return this.tokens.get(token) || null;
  }

  async deleteByToken(token: string): Promise<void> {
    this.tokens.delete(token);
    console.log(`🗑️  Refresh token deleted`);
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    for (const [token, data] of this.tokens.entries()) {
      if (data.userId === userId) {
        this.tokens.delete(token);
      }
    }
    console.log(`🗑️  All refresh tokens deleted for user: ${userId}`);
  }
}

// Mock Password Hasher
class MockPasswordHasher {
  async compare(plainPassword: string, hashedPassword: string): Promise<boolean> {
    // Simple simulation: check if hash contains the plain password
    return hashedPassword.includes(plainPassword);
  }
}

// Example: Authentication Flow
async function authenticationExample() {
  console.log('=== JWT Authentication Example ===\n');

  // Setup
  const userRepository = new MockUserRepository();
  const refreshTokenRepository = new MockRefreshTokenRepository();
  const jwtService = new MockJWTService();
  const passwordHasher = new MockPasswordHasher();

  const loginUseCase = new LoginUseCase(
    userRepository,
    refreshTokenRepository,
    jwtService,
    passwordHasher
  );

  const refreshUseCase = new RefreshTokenUseCase(
    refreshTokenRepository,
    userRepository,
    jwtService
  );

  // Example 1: Successful login
  console.log('1️⃣ Successful Login:');
  const loginResult1 = await loginUseCase.execute({
    email: 'john@example.com',
    password: 'SecurePass123!',
  });

  let accessToken: string = '';
  let refreshToken: string = '';

  if (loginResult1.isSuccess) {
    accessToken = loginResult1.value.accessToken;
    refreshToken = loginResult1.value.refreshToken;

    console.log('✅ Login successful!');
    console.log('Access Token:', accessToken.substring(0, 30) + '...');
    console.log('Refresh Token:', refreshToken.substring(0, 30) + '...');
    console.log('User:', loginResult1.value.user.name);
  } else {
    console.log('❌ Login failed:', loginResult1.error);
  }

  // Example 2: Invalid credentials
  console.log('\n2️⃣ Invalid Credentials:');
  const loginResult2 = await loginUseCase.execute({
    email: 'john@example.com',
    password: 'WrongPassword',
  });

  if (loginResult2.isFailure) {
    console.log('❌ Login failed:', loginResult2.error);
  }

  // Example 3: User not found
  console.log('\n3️⃣ User Not Found:');
  const loginResult3 = await loginUseCase.execute({
    email: 'nonexistent@example.com',
    password: 'SomePassword123!',
  });

  if (loginResult3.isFailure) {
    console.log('❌ Login failed:', loginResult3.error);
  }

  // Example 4: Refresh token flow
  console.log('\n4️⃣ Refresh Token Flow:');
  if (refreshToken) {
    const refreshResult = await refreshUseCase.execute({
      refreshToken: refreshToken,
    });

    if (refreshResult.isSuccess) {
      console.log('✅ Token refreshed successfully!');
      console.log('New Access Token:', refreshResult.value.accessToken.substring(0, 30) + '...');
      console.log('New Refresh Token:', refreshResult.value.refreshToken.substring(0, 30) + '...');
    } else {
      console.log('❌ Refresh failed:', refreshResult.error);
    }
  }

  // Example 5: Verify token
  console.log('\n5️⃣ Verify Access Token:');
  if (accessToken) {
    const verifyResult = await jwtService.verifyToken(accessToken);

    if (verifyResult.isSuccess) {
      console.log('✅ Token is valid');
      console.log('User ID:', verifyResult.value.userId);

      // Fetch user details
      const user = await userRepository.findById(verifyResult.value.userId);
      if (user) {
        console.log('User:', user.name, '(' + user.email + ')');
      }
    } else {
      console.log('❌ Token verification failed:', verifyResult.error);
    }
  }

  // Example 6: Multiple users login
  console.log('\n6️⃣ Multiple Users Login:');
  const loginResult4 = await loginUseCase.execute({
    email: 'jane@example.com',
    password: 'JanePass456!',
  });

  if (loginResult4.isSuccess) {
    console.log('✅ Jane logged in successfully');
    console.log('User:', loginResult4.value.user.name);
  }
}

// Run the example
authenticationExample()
  .then(() => {
    console.log('\n✨ Authentication examples completed!');
  })
  .catch((error) => {
    console.error('❌ Example failed:', error);
  });
