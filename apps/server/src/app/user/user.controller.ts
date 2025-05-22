import {
  Controller,
  Get,
  UseGuards,
  Req,
  Body,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';
import type { Request } from 'express';
import { SafeUserDto } from '@auth/dto/auth-response.dto';
import { UpdateUserDto } from '@user/dto/update-user.dto';
import { UserService } from '@user/user.service';
import { User as PrismaUser } from '@prisma/client';

@ApiTags('user')
@Controller('user')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

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
  @ApiOperation({ summary: 'Update current authenticated user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile updated successfully.',
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
    };
  }
}
