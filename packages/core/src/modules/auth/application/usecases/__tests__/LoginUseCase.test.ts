import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoginUseCase } from '../LoginUseCase';
import { IUserRepository } from '../../../../user/domain/IUserRepository';
import { IJWTService } from '../../../domain/JWTService';
import { IRefreshTokenRepository } from '../../../domain/IRefreshTokenRepository';
import { User } from '../../../../user/domain/User';
import { Email } from '../../../../user/domain/Email';
import { UserName } from '../../../../user/domain/UserName';
import { PasswordHash } from '../../../../user/domain/PasswordHash';
import { UniqueEntityID } from '../../../../../shared/domain/UniqueEntityID';
import { RefreshToken } from '../../../domain/RefreshToken';
import { Result } from '../../../../../shared/core/Result';

describe('LoginUseCase', () => {
  let mockUserRepository: IUserRepository;
  let mockJWTService: IJWTService;
  let mockRefreshTokenRepository: IRefreshTokenRepository;
  let useCase: LoginUseCase;

  beforeEach(() => {
    // Create mock repositories and services with vi.fn() for all methods
    mockUserRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
    };

    mockJWTService = {
      signAccessToken: vi.fn(),
      signRefreshToken: vi.fn(),
      verifyAccessToken: vi.fn(),
      verifyRefreshToken: vi.fn(),
    };

    mockRefreshTokenRepository = {
      save: vi.fn(),
      findByToken: vi.fn(),
      findByUserId: vi.fn(),
      revokeByToken: vi.fn(),
      revokeAllByUserId: vi.fn(),
      deleteExpired: vi.fn(),
    };

    useCase = new LoginUseCase(
      mockUserRepository,
      mockJWTService,
      mockRefreshTokenRepository
    );
  });

  describe('execute() - Happy Path', () => {
    it('should login successfully with valid credentials and return tokens and user DTO', async () => {
      // Arrange
      const email = Email.create('test@example.com').value;
      const passwordHash = await PasswordHash.create('ValidPassword123!');
      const user = User.create(
        {
          email,
          name: UserName.create('Test User').value,
          passwordHash: passwordHash.value,
          isActive: true,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
        new UniqueEntityID('user-123')
      ).value;

      // Mock verifyPassword to return true
      vi.spyOn(user, 'verifyPassword').mockResolvedValue(true);

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(user);
      vi.mocked(mockJWTService.signAccessToken).mockReturnValue('access-token-123');
      vi.mocked(mockJWTService.signRefreshToken).mockReturnValue('refresh-token-456');
      vi.mocked(mockRefreshTokenRepository.save).mockResolvedValue(undefined);

      const request = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveProperty('accessToken', 'access-token-123');
      expect(result.value).toHaveProperty('refreshToken', 'refresh-token-456');
      expect(result.value.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        isActive: true,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      });

      // Verify user.verifyPassword was called
      expect(user.verifyPassword).toHaveBeenCalledWith('ValidPassword123!');

      // Verify JWT tokens were generated
      expect(mockJWTService.signAccessToken).toHaveBeenCalledWith({
        userId: 'user-123',
        email: 'test@example.com',
      });
      expect(mockJWTService.signRefreshToken).toHaveBeenCalledWith({
        userId: 'user-123',
        email: 'test@example.com',
      });

      // Verify refresh token was saved
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledTimes(1);
      const savedToken = vi.mocked(mockRefreshTokenRepository.save).mock.calls[0][0] as RefreshToken;
      expect(savedToken.token).toBe('refresh-token-456');
      expect(savedToken.userId.toString()).toBe('user-123');
    });
  });

  describe('execute() - Invalid Email Format', () => {
    it('should fail when email format is invalid', async () => {
      // Arrange
      const request = {
        email: 'invalid-email',
        password: 'Password123!',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Invalid email format');

      // Verify no repository methods were called
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
      expect(mockJWTService.signAccessToken).not.toHaveBeenCalled();
      expect(mockRefreshTokenRepository.save).not.toHaveBeenCalled();
    });

    it('should fail when email is empty string', async () => {
      // Arrange
      const request = {
        email: '',
        password: 'Password123!',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Invalid email format');
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('should fail when email is missing @ symbol', async () => {
      // Arrange
      const request = {
        email: 'testexample.com',
        password: 'Password123!',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Invalid email format');
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe('execute() - Unknown User', () => {
    it('should fail when user does not exist', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);

      const request = {
        email: 'nonexistent@example.com',
        password: 'Password123!',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Invalid credentials');

      // Verify findByEmail was called with correct Email value object
      expect(mockUserRepository.findByEmail).toHaveBeenCalledTimes(1);
      const calledEmail = vi.mocked(mockUserRepository.findByEmail).mock.calls[0][0];
      expect(calledEmail.value).toBe('nonexistent@example.com');

      // Verify no tokens were generated
      expect(mockJWTService.signAccessToken).not.toHaveBeenCalled();
      expect(mockRefreshTokenRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('execute() - Inactive User', () => {
    it('should fail when user account is inactive', async () => {
      // Arrange
      const email = Email.create('inactive@example.com').value;
      const passwordHash = await PasswordHash.create('Password123!');
      const inactiveUser = User.create(
        {
          email,
          name: UserName.create('Inactive User').value,
          passwordHash: passwordHash.value,
          isActive: false, // User is inactive
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID('user-456')
      ).value;

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(inactiveUser);

      const request = {
        email: 'inactive@example.com',
        password: 'Password123!',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('User account is inactive');

      // Verify user was found but login rejected
      expect(mockUserRepository.findByEmail).toHaveBeenCalledTimes(1);

      // Verify no password verification or token generation occurred
      expect(mockJWTService.signAccessToken).not.toHaveBeenCalled();
      expect(mockRefreshTokenRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('execute() - Wrong Password', () => {
    it('should fail when password is incorrect', async () => {
      // Arrange
      const email = Email.create('user@example.com').value;
      const passwordHash = await PasswordHash.create('CorrectPassword123!');
      const user = User.create(
        {
          email,
          name: UserName.create('Test User').value,
          passwordHash: passwordHash.value,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID('user-789')
      ).value;

      // Mock verifyPassword to return false (wrong password)
      vi.spyOn(user, 'verifyPassword').mockResolvedValue(false);

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(user);

      const request = {
        email: 'user@example.com',
        password: 'WrongPassword123!',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Invalid credentials');

      // Verify verifyPassword was called with wrong password
      expect(user.verifyPassword).toHaveBeenCalledWith('WrongPassword123!');

      // Verify no tokens were generated
      expect(mockJWTService.signAccessToken).not.toHaveBeenCalled();
      expect(mockRefreshTokenRepository.save).not.toHaveBeenCalled();
    });

    it('should call user.verifyPassword exactly once', async () => {
      // Arrange
      const email = Email.create('user@example.com').value;
      const passwordHash = await PasswordHash.create('Password123!');
      const user = User.create(
        {
          email,
          name: UserName.create('Test User').value,
          passwordHash: passwordHash.value,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID('user-xyz')
      ).value;

      const verifyPasswordSpy = vi.spyOn(user, 'verifyPassword').mockResolvedValue(false);

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(user);

      const request = {
        email: 'user@example.com',
        password: 'AnyPassword',
      };

      // Act
      await useCase.execute(request);

      // Assert
      expect(verifyPasswordSpy).toHaveBeenCalledTimes(1);
      expect(verifyPasswordSpy).toHaveBeenCalledWith('AnyPassword');
    });
  });

  describe('execute() - RefreshToken Creation Failure', () => {
    it('should handle repository.save errors gracefully', async () => {
      // Arrange
      const email = Email.create('user@example.com').value;
      const passwordHash = await PasswordHash.create('Password123!');
      const user = User.create(
        {
          email,
          name: UserName.create('Test User').value,
          passwordHash: passwordHash.value,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID('user-abc')
      ).value;

      vi.spyOn(user, 'verifyPassword').mockResolvedValue(true);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(user);
      vi.mocked(mockJWTService.signAccessToken).mockReturnValue('access-token');
      vi.mocked(mockJWTService.signRefreshToken).mockReturnValue('refresh-token');

      // Mock save to reject
      vi.mocked(mockRefreshTokenRepository.save).mockRejectedValue(
        new Error('Failed to save refresh token')
      );

      const request = {
        email: 'user@example.com',
        password: 'Password123!',
      };

      // Act & Assert - Repository errors bubble up as exceptions
      await expect(useCase.execute(request)).rejects.toThrow('Failed to save refresh token');

      // Verify tokens were generated before save failed
      expect(mockJWTService.signAccessToken).toHaveBeenCalled();
      expect(mockJWTService.signRefreshToken).toHaveBeenCalled();
    });
  });

  describe('execute() - Repository Exceptions', () => {
    it('should bubble up repository.findByEmail errors', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findByEmail).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = {
        email: 'user@example.com',
        password: 'Password123!',
      };

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Database connection failed');
      expect(mockJWTService.signAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('execute() - JWT Service Integration', () => {
    it('should pass correct payload to JWT service', async () => {
      // Arrange
      const email = Email.create('jwt@example.com').value;
      const passwordHash = await PasswordHash.create('Password123!');
      const user = User.create(
        {
          email,
          name: UserName.create('JWT User').value,
          passwordHash: passwordHash.value,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID('user-jwt-001')
      ).value;

      vi.spyOn(user, 'verifyPassword').mockResolvedValue(true);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(user);
      vi.mocked(mockJWTService.signAccessToken).mockReturnValue('access-token');
      vi.mocked(mockJWTService.signRefreshToken).mockReturnValue('refresh-token');
      vi.mocked(mockRefreshTokenRepository.save).mockResolvedValue(undefined);

      const request = {
        email: 'jwt@example.com',
        password: 'Password123!',
      };

      // Act
      await useCase.execute(request);

      // Assert - Verify exact payload structure
      const expectedPayload = {
        userId: 'user-jwt-001',
        email: 'jwt@example.com',
      };

      expect(mockJWTService.signAccessToken).toHaveBeenCalledWith(expectedPayload);
      expect(mockJWTService.signRefreshToken).toHaveBeenCalledWith(expectedPayload);
    });

    it('should generate both access and refresh tokens', async () => {
      // Arrange
      const email = Email.create('tokens@example.com').value;
      const passwordHash = await PasswordHash.create('Password123!');
      const user = User.create(
        {
          email,
          name: UserName.create('Token User').value,
          passwordHash: passwordHash.value,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID('user-token-001')
      ).value;

      vi.spyOn(user, 'verifyPassword').mockResolvedValue(true);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(user);
      vi.mocked(mockJWTService.signAccessToken).mockReturnValue('unique-access-token');
      vi.mocked(mockJWTService.signRefreshToken).mockReturnValue('unique-refresh-token');
      vi.mocked(mockRefreshTokenRepository.save).mockResolvedValue(undefined);

      const request = {
        email: 'tokens@example.com',
        password: 'Password123!',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockJWTService.signAccessToken).toHaveBeenCalledTimes(1);
      expect(mockJWTService.signRefreshToken).toHaveBeenCalledTimes(1);
      expect(result.value.accessToken).toBe('unique-access-token');
      expect(result.value.refreshToken).toBe('unique-refresh-token');
    });
  });

  describe('execute() - RefreshToken Persistence', () => {
    it('should save refresh token with correct properties', async () => {
      // Arrange
      const email = Email.create('persist@example.com').value;
      const passwordHash = await PasswordHash.create('Password123!');
      const user = User.create(
        {
          email,
          name: UserName.create('Persist User').value,
          passwordHash: passwordHash.value,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID('user-persist-001')
      ).value;

      vi.spyOn(user, 'verifyPassword').mockResolvedValue(true);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(user);
      vi.mocked(mockJWTService.signAccessToken).mockReturnValue('access');
      vi.mocked(mockJWTService.signRefreshToken).mockReturnValue('refresh');
      vi.mocked(mockRefreshTokenRepository.save).mockResolvedValue(undefined);

      const request = {
        email: 'persist@example.com',
        password: 'Password123!',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledTimes(1);
      const savedToken = vi.mocked(mockRefreshTokenRepository.save).mock.calls[0][0] as RefreshToken;

      // Verify token properties
      expect(savedToken.token).toBe('refresh');
      expect(savedToken.userId.toString()).toBe('user-persist-001');

      // Verify expiry is approximately 7 days from now (within 1 minute tolerance)
      const now = Date.now();
      const expectedExpiry = now + 7 * 24 * 60 * 60 * 1000;
      const actualExpiry = savedToken.expiresAt.getTime();
      const tolerance = 60 * 1000; // 1 minute
      expect(Math.abs(actualExpiry - expectedExpiry)).toBeLessThan(tolerance);
    });
  });
});
