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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { RegisterUserDto } from '@auth/dto/register-user.dto';
import { AuthService } from '@auth/auth.service';
import {
  RegistrationResponseDto,
  LoginResponseDto,
} from '@auth/dto/auth-response.dto';
import { LoginUserDto } from '@auth/dto/login-user.dto';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';

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
    description: 'Invalid input data or passwords do not match.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already exists.',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'An internal error occurred.',
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
    description: 'Invalid credentials or login method not permitted.',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'An internal error occurred.',
  })
  async login(@Body() loginUserDto: LoginUserDto): Promise<LoginResponseDto> {
    return this.authService.login(loginUserDto);
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

    if (!loginResponse || !loginResponse.accessToken) {
      const errorFrontendUrl = `${this.authService.configService.get<string>(
        'FRONTEND_URL',
        'http://localhost:4200'
      )}/auth/oauth-error`;
      res.redirect(errorFrontendUrl);
      return;
    }

    const token = loginResponse.accessToken;
    const frontendUrl = this.authService.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:4200'
    );
    res.redirect(`${frontendUrl}/auth/oauth-callback?token=${token}`);
  }
}
