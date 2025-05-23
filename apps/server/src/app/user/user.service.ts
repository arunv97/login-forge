import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@prisma-setup/prisma.service';
import { User as PrismaUser, Prisma } from '@prisma/client';
import { CreateUserDto } from '@user/dto/create-user.dto';
import { UpdateUserDto } from '@user/dto/update-user.dto';
import { UpdatePasswordDto } from '@user/dto/update-password.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';
import { Cron, CronExpression } from '@nestjs/schedule'; // CronExpression is still useful for other predefined values
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
  private readonly saltRounds = 10;
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  async findByEmail(
    email: string,
    includeDeleted = false
  ): Promise<PrismaUser | null> {
    return this.prisma.user.findFirst({
      where: {
        email,
        isDeleted: includeDeleted ? undefined : false,
      },
    });
  }

  async findById(
    id: string,
    includeDeleted = false
  ): Promise<PrismaUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (user && !includeDeleted && user.isDeleted) {
      return null;
    }
    return user;
  }

  async findByProviderId(
    provider: string,
    providerId: string,
    includeDeleted = false
  ): Promise<PrismaUser | null> {
    const user = await this.prisma.user.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
    });
    if (user && !includeDeleted && user.isDeleted) {
      return null;
    }
    return user;
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
          isDeleted: false,
          deletedAt: null,
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
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found.');

    const updateData: Partial<UpdateUserDto> = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (Object.keys(updateData).length === 0) {
      return user;
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
    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!userExists) {
      console.warn(
        `Attempt to update refresh token for non-existent user ID: ${userId}`
      );
      return;
    }

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
        'User not found, deactivated, or password not set.'
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

  async updateAvatarUrl(
    userId: string,
    avatarUrl: string | null
  ): Promise<PrismaUser> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found.');

    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });
  }

  async softDeleteUser(userId: string): Promise<PrismaUser> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    await this.updateRefreshToken(userId, null);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        email: `${user.email}_deleted_${Date.now()}`,
        refreshToken: null,
      },
    });
  }

  async findSoftDeletedUsersForPermanentDeletion(
    retentionDays: number
  ): Promise<PrismaUser[]> {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - retentionDays);

    return this.prisma.user.findMany({
      where: {
        isDeleted: true,
        deletedAt: {
          lte: retentionDate,
        },
      },
    });
  }

  async permanentlyDeleteUser(userId: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id: userId },
    });
    this.logger.log(`Permanently deleted user with ID: ${userId}`);
  }

  @Cron(process.env.USER_DELETION_CRON_SCHEDULE || '0 2 * * *') // Corrected cron string
  async handlePermanentUserDeletion(): Promise<void> {
    this.logger.log('Running scheduled task: Permanent User Deletion');
    const retentionDays = parseInt(
      this.configService.get<string>('USER_DELETION_RETENTION_DAYS', '5'),
      10
    );
    if (isNaN(retentionDays) || retentionDays <= 0) {
      this.logger.error(
        `Invalid USER_DELETION_RETENTION_DAYS: ${this.configService.get<string>(
          'USER_DELETION_RETENTION_DAYS'
        )}. Task will not run.`
      );
      return;
    }

    const usersToDelete = await this.findSoftDeletedUsersForPermanentDeletion(
      retentionDays
    );

    if (usersToDelete.length === 0) {
      this.logger.log('No users found for permanent deletion.');
      return;
    }

    this.logger.log(
      `Found ${usersToDelete.length} user(s) for permanent deletion.`
    );
    for (const user of usersToDelete) {
      try {
        if (user.avatarUrl) {
          this.logger.log(
            `Avatar for user ${user.id} (${user.avatarUrl}) was not deleted from cloud storage during permanent deletion. Manual cleanup may be required or implement Cloudinary deletion here.`
          );
        }
        await this.permanentlyDeleteUser(user.id);
      } catch (error) {
        this.logger.error(
          `Failed to permanently delete user ${user.id}:`,
          error
        );
      }
    }
    this.logger.log('Scheduled task: Permanent User Deletion finished.');
  }
}
