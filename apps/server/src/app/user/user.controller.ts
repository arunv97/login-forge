import {
  Controller,
  Get,
  UseGuards,
  Req,
  Body,
  Patch,
  HttpCode,
  HttpStatus,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';
import type { Request } from 'express';
import { SafeUserDto } from '@auth/dto/auth-response.dto';
import { UpdateUserDto } from '@user/dto/update-user.dto';
import { UpdatePasswordDto } from '@user/dto/update-password.dto';
import { UserService } from '@user/user.service';
import { User as PrismaUser } from '@prisma/client';
import { CloudinaryService } from '@core/cloudinary/cloudinary.service';

@ApiTags('user')
@Controller('user')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly userService: UserService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the authenticated user profile.',
    type: SafeUserDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  getCurrentUserProfile(@Req() req: Request): SafeUserDto {
    return req.user as SafeUserDto;
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current authenticated user profile name' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile name updated successfully.',
    type: SafeUserDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  async updateCurrentUserProfile(
    @Req() req: Request,
    @Body() updateUserDto: UpdateUserDto
  ): Promise<SafeUserDto> {
    const userId = (req.user as SafeUserDto).id;
    const updatedUserFromDb: PrismaUser = await this.userService.updateUser(
      userId,
      updateUserDto
    );

    return {
      id: updatedUserFromDb.id,
      email: updatedUserFromDb.email,
      name: updatedUserFromDb.name,
      emailVerified: updatedUserFromDb.emailVerified,
      provider: updatedUserFromDb.provider,
      createdAt: updatedUserFromDb.createdAt,
      updatedAt: updatedUserFromDb.updatedAt,
      avatarUrl: updatedUserFromDb.avatarUrl,
    };
  }

  @Patch('password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update current authenticated user's password" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password updated successfully.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized or current password incorrect.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Invalid input data (e.g., new passwords do not match, new password too weak).',
  })
  async updateCurrentUserPassword(
    @Req() req: Request,
    @Body() updatePasswordDto: UpdatePasswordDto
  ): Promise<{ message: string }> {
    const userId = (req.user as SafeUserDto).id;
    await this.userService.updatePassword(userId, updatePasswordDto);
    return { message: 'Password updated successfully.' };
  }

  private extractPublicIdFromCloudinaryUrl(url: string): string | null {
    try {
      const parts = url.split('/');
      const uploadIndex = parts.indexOf('upload');
      if (uploadIndex === -1 || uploadIndex + 2 >= parts.length) {
        this.logger.warn(
          `Could not determine public_id structure from URL: ${url}`
        );
        return null;
      }
      const pathAfterUpload = parts.slice(uploadIndex + 1);
      if (pathAfterUpload[0]?.match(/^v\d+$/)) {
        pathAfterUpload.shift();
      }
      const publicIdWithExtension = pathAfterUpload.join('/');
      if (!publicIdWithExtension) return null;
      const lastDotIndex = publicIdWithExtension.lastIndexOf('.');
      if (lastDotIndex > 0) {
        return publicIdWithExtension.substring(0, lastDotIndex);
      }
      return publicIdWithExtension;
    } catch (e) {
      this.logger.error(`Error extracting public_id from URL: ${url}`, e);
      return null;
    }
  }

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('avatarFile', {
      limits: { fileSize: 5 * 1024 * 1024 },
    })
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Avatar image file to upload. Field name must be "avatarFile".',
    required: true,
    schema: {
      type: 'object',
      properties: {
        avatarFile: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: "Upload or update current user's avatar" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Avatar uploaded successfully.',
    type: SafeUserDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file type or size.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to upload avatar.',
  })
  async uploadAvatar(
    @Req() req: Request,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|gif|webp)' }),
        ],
        fileIsRequired: true,
      })
    )
    avatarFile: Express.Multer.File
  ): Promise<SafeUserDto> {
    const userId = (req.user as SafeUserDto).id;
    const currentUser = await this.userService.findById(userId);

    if (!currentUser) {
      throw new InternalServerErrorException('Authenticated user not found.');
    }

    if (currentUser.avatarUrl) {
      const oldPublicId = this.extractPublicIdFromCloudinaryUrl(
        currentUser.avatarUrl
      );
      if (oldPublicId) {
        try {
          this.logger.log(
            `Attempting to delete old avatar with public_id: ${oldPublicId}`
          );
          await this.cloudinaryService.deleteImage(oldPublicId);
          this.logger.log(`Successfully deleted old avatar: ${oldPublicId}`);
        } catch (error) {
          this.logger.error(
            `Failed to delete old avatar (public_id: ${oldPublicId}), but proceeding with new upload.`,
            error
          );
        }
      } else {
        this.logger.warn(
          `Could not extract public_id from old avatarUrl: ${currentUser.avatarUrl}. Old image may not be deleted from Cloudinary.`
        );
      }
    }

    let uploadResult;
    try {
      uploadResult = await this.cloudinaryService.uploadImage(
        avatarFile.buffer,
        avatarFile.originalname,
        userId
      );
    } catch (uploadError) {
      this.logger.error(
        `Cloudinary upload failed for user ${userId}`,
        uploadError
      );
      throw new InternalServerErrorException(
        'Avatar upload to cloud storage failed.'
      );
    }

    const updatedUserFromDb = await this.userService.updateAvatarUrl(
      userId,
      uploadResult.secure_url
    );

    return {
      id: updatedUserFromDb.id,
      email: updatedUserFromDb.email,
      name: updatedUserFromDb.name,
      emailVerified: updatedUserFromDb.emailVerified,
      provider: updatedUserFromDb.provider,
      createdAt: updatedUserFromDb.createdAt,
      updatedAt: updatedUserFromDb.updatedAt,
      avatarUrl: updatedUserFromDb.avatarUrl,
    };
  }
}
