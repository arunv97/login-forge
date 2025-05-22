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
    };
  }

  private generateJwtAndLoginResponse(
    userFromDb: PrismaUser,
    message: string
  ): LoginResponseDto {
    const safeUser = this.mapToSafeUser(userFromDb);
    const payload = {
      email: safeUser.email,
      sub: safeUser.id,
      name: safeUser.name,
    };
    const accessToken = this.jwtService.sign(payload);
    return {
      message,
      user: safeUser,
      accessToken,
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
      const newUserFromDb: PrismaUser = await this.userService.create(
        newUserInput
      );
      return this.generateJwtAndLoginResponse(
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

    return this.generateJwtAndLoginResponse(
      user,
      'User logged in successfully.'
    );
  }

  async handleGoogleLogin(profile: GoogleProfile): Promise<LoginResponseDto> {
    const { providerId: googleId, email, name } = profile;

    const userByGoogleId = await this.userService.findByProviderId(
      'google',
      googleId
    );
    if (userByGoogleId) {
      return this.generateJwtAndLoginResponse(
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
      return this.generateJwtAndLoginResponse(
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
}
