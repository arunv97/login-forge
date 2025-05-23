import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Req,
  Res,
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException, // Import UnauthorizedException
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { RegisterUserDto } from '@auth/dto/register-user.dto';
import { AuthService } from '@auth/auth.service';
import {
  RegistrationResponseDto,
  LoginResponseDto,
  SafeUserDto,
  RefreshTokenDto,
  RefreshTokenResponseDto,
} from '@auth/dto/auth-response.dto';
import { LoginUserDto } from '@auth/dto/login-user.dto';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';

export const UserFromRequest = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully registered.',
    type: RegistrationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already exists.',
  })
  async register(
    @Body() registerUserDto: RegisterUserDto
  ): Promise<RegistrationResponseDto> {
    return this.authService.register(registerUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in an existing user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully logged in.',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials.',
  })
  async login(@Body() loginUserDto: LoginUserDto): Promise<LoginResponseDto> {
    return this.authService.login(loginUserDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh an access token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Access token refreshed.',
    type: RefreshTokenResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired refresh token.',
  })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto
  ): Promise<RefreshTokenResponseDto> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully logged out.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  async logout(
    @UserFromRequest() user: SafeUserDto
  ): Promise<{ message: string }> {
    return this.authService.logout(user.id);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth2 login flow' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google for authentication.',
  })
  async googleAuth(): Promise<void> {
    /* Intentionally empty */
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiExcludeEndpoint()
  async googleAuthRedirect(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    const loginResponse = req.user as LoginResponseDto;

    if (
      !loginResponse ||
      !loginResponse.accessToken ||
      !loginResponse.refreshToken
    ) {
      const errorFrontendUrl = `${this.authService.configService.get<string>(
        'FRONTEND_URL',
        'http://localhost:4200'
      )}/auth/oauth-error`;
      res.redirect(errorFrontendUrl);
      return;
    }

    const accessToken = loginResponse.accessToken;
    const refreshToken = loginResponse.refreshToken;
    const frontendUrl = this.authService.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:4200'
    );
    res.redirect(
      `${frontendUrl}/auth/oauth-callback?token=${accessToken}&refreshToken=${refreshToken}`
    );
  }
}
