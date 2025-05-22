import {
  Injectable,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterUserDto } from './dto/register-user.dto';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { User as PrismaUser } from '@prisma/client';
import {
  RegistrationResponseDto,
  SafeUserDto,
  LoginResponseDto,
} from './dto/auth-response.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService
  ) {}

  async register(
    registerUserDto: RegisterUserDto
  ): Promise<RegistrationResponseDto> {
    const { name, email, password, confirmPassword } = registerUserDto;

    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists.');
    }

    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      console.error('Password hashing failed:', error);
      throw new InternalServerErrorException('Could not process registration.');
    }

    try {
      const newUserFromDb: PrismaUser = await this.userService.create({
        email,
        name,
        password: hashedPassword,
        provider: 'local',
      });

      const safeUser: SafeUserDto = {
        id: newUserFromDb.id,
        email: newUserFromDb.email,
        name: newUserFromDb.name,
        emailVerified: newUserFromDb.emailVerified,
        provider: newUserFromDb.provider,
        createdAt: newUserFromDb.createdAt,
        updatedAt: newUserFromDb.updatedAt,
      };

      const payload = {
        email: safeUser.email,
        sub: safeUser.id,
        name: safeUser.name,
      };
      const accessToken = this.jwtService.sign(payload);

      return {
        message: 'User registered successfully.',
        user: safeUser,
        accessToken,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      console.error('User creation failed in AuthService:', error);
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

    if (!user.password) {
      throw new UnauthorizedException(
        'Login with this method is not permitted for this account.'
      );
    }

    const isPasswordMatching = await bcrypt.compare(password, user.password);

    if (!isPasswordMatching) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const safeUser: SafeUserDto = {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      provider: user.provider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const payload = {
      email: safeUser.email,
      sub: safeUser.id,
      name: safeUser.name,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      message: 'User logged in successfully.',
      user: safeUser,
      accessToken,
    };
  }
}
