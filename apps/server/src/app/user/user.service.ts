import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '@prisma-setup/prisma.service';
import { User as PrismaUser } from '@prisma/client';
import { CreateUserDto } from '@user/dto/create-user.dto';
import { UpdateUserDto } from '@user/dto/update-user.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class UserService {
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
}
