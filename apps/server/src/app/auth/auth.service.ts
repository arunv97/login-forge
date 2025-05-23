import {
  Injectable,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterUserDto } from '@auth/dto/register-user.dto';
import { UserService } from '@user/user.service';
import * as bcrypt from 'bcrypt';
import { User as PrismaUser } from '@prisma/client';
import {
  RegistrationResponseDto,
  SafeUserDto,
  LoginResponseDto,
  RefreshTokenResponse,
} from '@auth/dto/auth-response.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from '@auth/dto/login-user.dto';
import { CreateUserDto } from '@user/dto/create-user.dto';
import { ConfigService } from '@nestjs/config';

export interface GoogleProfile {
  providerId: string;
  email: string;
  name?: string;
}

export interface JwtTokenPayload {
  email: string;
  sub: string;
  name?: string;
}

export interface RefreshTokenPayload extends JwtTokenPayload {
  refreshTokenId?: string;
}

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    public readonly configService: ConfigService
  ) {}

  private mapToSafeUser(user: PrismaUser): SafeUserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      provider: user.provider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      avatarUrl: user.avatarUrl,
    };
  }

  private async generateAndStoreRefreshToken(
    user: PrismaUser,
    existingPayload?: JwtTokenPayload
  ): Promise<string> {
    const refreshTokenPayload: RefreshTokenPayload = existingPayload || {
      email: user.email,
      sub: user.id,
      name: user.name !== null ? user.name : undefined,
    };

    const newRefreshToken = this.jwtService.sign(refreshTokenPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_REFRESH_EXPIRATION_TIME',
        '7d'
      ),
    });
    await this.userService.updateRefreshToken(user.id, newRefreshToken);
    return newRefreshToken;
  }

  private async generateTokens(
    user: PrismaUser,
    message: string
  ): Promise<LoginResponseDto> {
    const safeUser = this.mapToSafeUser(user);
    const accessTokenPayload: JwtTokenPayload = {
      email: safeUser.email,
      sub: safeUser.id,
    };
    if (safeUser.name !== null) {
      accessTokenPayload.name = safeUser.name;
    }

    const accessToken = this.jwtService.sign(accessTokenPayload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRATION_TIME', '15m'),
    });

    const refreshToken = await this.generateAndStoreRefreshToken(
      user,
      accessTokenPayload
    );

    return {
      message,
      user: safeUser,
      accessToken,
      refreshToken,
    };
  }

  async register(
    registerUserDto: RegisterUserDto
  ): Promise<RegistrationResponseDto> {
    const { name, email, password, confirmPassword } = registerUserDto;

    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    const existingUserByEmail = await this.userService.findByEmail(email);
    if (existingUserByEmail) {
      throw new ConflictException(
        `An account with email ${email} already exists. Try logging in or use a different email.`
      );
    }

    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      console.error('Password hashing failed:', error);
      throw new InternalServerErrorException('Could not process registration.');
    }

    try {
      const newUserInput: CreateUserDto = {
        email,
        name,
        password: hashedPassword,
        provider: 'local',
      };
      const newUserFromDb = await this.userService.create(newUserInput);
      return this.generateTokens(
        newUserFromDb,
        'User registered successfully.'
      );
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      console.error('User creation failed in AuthService register:', error);
      throw new InternalServerErrorException(
        'Could not complete registration.'
      );
    }
  }

  async login(loginUserDto: LoginUserDto): Promise<LoginResponseDto> {
    const { email, password } = loginUserDto;
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (user.provider !== 'local' || !user.password) {
      throw new UnauthorizedException(
        `This account was registered using ${
          user.provider || 'an external provider'
        }. Please use that method to log in.`
      );
    }

    const isPasswordMatching = await bcrypt.compare(password, user.password);
    if (!isPasswordMatching) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return this.generateTokens(user, 'User logged in successfully.');
  }

  async handleGoogleLogin(profile: GoogleProfile): Promise<LoginResponseDto> {
    const { providerId: googleId, email, name } = profile;

    const userByGoogleId = await this.userService.findByProviderId(
      'google',
      googleId
    );
    if (userByGoogleId) {
      return this.generateTokens(
        userByGoogleId,
        'User logged in successfully via Google.'
      );
    }

    const userByEmail = await this.userService.findByEmail(email);
    if (userByEmail) {
      if (userByEmail.provider === 'local') {
        throw new ConflictException(
          `An account with email ${email} already exists. Please sign in using your email and password.`
        );
      } else if (userByEmail.provider === 'google') {
        throw new ConflictException(
          `The email ${email} is already associated with a different Google account on our platform.`
        );
      } else {
        throw new ConflictException(
          `An account with email ${email} already exists using ${userByEmail.provider}. Please use that sign-in method.`
        );
      }
    }

    const newUserInput: CreateUserDto = {
      email,
      name: name || email.split('@')[0],
      provider: 'google',
      providerId: googleId,
    };

    try {
      const newGoogleUser = await this.userService.create(newUserInput);
      return this.generateTokens(
        newGoogleUser,
        'New user account created via Google.'
      );
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      console.error('Google user creation failed:', error);
      throw new InternalServerErrorException(
        'Could not complete Google sign-in.'
      );
    }
  }

  async refreshToken(
    providedRefreshToken: string
  ): Promise<RefreshTokenResponse> {
    let decodedPayload: RefreshTokenPayload;
    try {
      decodedPayload = this.jwtService.verify(providedRefreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      }) as RefreshTokenPayload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    if (!decodedPayload || !decodedPayload.sub) {
      throw new UnauthorizedException('Invalid refresh token payload.');
    }

    const userId = decodedPayload.sub;
    const user = await this.userService.findById(userId);

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException(
        'Access Denied. User not found or no active refresh session.'
      );
    }

    const isRefreshTokenMatching = await bcrypt.compare(
      providedRefreshToken,
      user.refreshToken
    );
    if (!isRefreshTokenMatching) {
      // Security measure: If a used refresh token is attempted again, invalidate all tokens for this user.
      await this.userService.updateRefreshToken(userId, null);
      throw new UnauthorizedException(
        'Access Denied. Refresh token mismatch or already used. All sessions logged out.'
      );
    }

    const accessTokenPayload: JwtTokenPayload = {
      email: user.email,
      sub: user.id,
    };
    if (user.name !== null) {
      accessTokenPayload.name = user.name;
    }

    const newAccessToken = this.jwtService.sign(accessTokenPayload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRATION_TIME', '15m'),
    });

    const newRotatedRefreshToken = await this.generateAndStoreRefreshToken(
      user,
      accessTokenPayload
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRotatedRefreshToken,
      message: 'Access token refreshed successfully.',
    };
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.userService.updateRefreshToken(userId, null);
    return { message: 'User logged out successfully.' };
  }
}
