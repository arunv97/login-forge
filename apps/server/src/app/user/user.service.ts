import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@prisma-setup/prisma.service';
import { User as PrismaUser } from '@prisma/client';
import { CreateUserDto } from '@user/dto/create-user.dto';
import { UpdateUserDto } from '@user/dto/update-user.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  private readonly saltRounds = 10;

  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByProviderId(
    provider: string,
    providerId: string
  ): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
    });
  }

  async create(data: CreateUserDto): Promise<PrismaUser> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          password: data.password,
          provider: data.provider || 'local',
          providerId: data.providerId,
          emailVerified: data.provider !== 'local' ? true : false,
          avatarUrl: null,
        },
      });
      return user;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[] | undefined;
          if (target?.includes('email')) {
            throw new ConflictException('User with this email already exists.');
          }
          if (target?.includes('provider') && target?.includes('providerId')) {
            throw new ConflictException(
              'This provider account is already linked to a user.'
            );
          }
          if (target?.includes('refreshToken')) {
            console.error(
              'Duplicate refresh token encountered during user creation:',
              error
            );
            throw new InternalServerErrorException(
              'Failed to store refresh token due to a conflict.'
            );
          }
        }
      }
      throw error;
    }
  }

  async updateUser(userId: string, data: UpdateUserDto): Promise<PrismaUser> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
      },
    });
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null
  ): Promise<void> {
    let hashedRefreshToken: string | null = null;
    if (refreshToken) {
      try {
        hashedRefreshToken = await bcrypt.hash(refreshToken, this.saltRounds);
      } catch (error) {
        console.error('Refresh token hashing failed:', error);
        throw new InternalServerErrorException(
          'Could not process refresh token.'
        );
      }
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefreshToken },
    });
  }
}
