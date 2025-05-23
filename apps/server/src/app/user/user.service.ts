import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@prisma-setup/prisma.service';
import { User as PrismaUser } from '@prisma/client';
import { CreateUserDto } from '@user/dto/create-user.dto';
import { UpdateUserDto } from '@user/dto/update-user.dto';
import { UpdatePasswordDto } from '@user/dto/update-password.dto'; // Import new DTO
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
    const updateData: Partial<UpdateUserDto> = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (Object.keys(updateData).length === 0) {
      const currentUser = await this.findById(userId);
      if (!currentUser)
        throw new InternalServerErrorException(
          'User not found for no-op update.'
        );
      return currentUser;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
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

  async updatePassword(userId: string, data: UpdatePasswordDto): Promise<void> {
    const { currentPassword, newPassword, confirmNewPassword } = data;

    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException('New passwords do not match.');
    }

    const user = await this.findById(userId);
    if (!user || !user.password) {
      throw new UnauthorizedException(
        'User not found or password not set (e.g. OAuth user).'
      );
    }

    const isCurrentPasswordMatching = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordMatching) {
      throw new UnauthorizedException('Current password does not match.');
    }

    let hashedNewPassword;
    try {
      hashedNewPassword = await bcrypt.hash(newPassword, this.saltRounds);
    } catch (error) {
      console.error('New password hashing failed:', error);
      throw new InternalServerErrorException('Could not update password.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });
  }
}
