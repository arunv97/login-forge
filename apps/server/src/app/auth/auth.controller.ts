import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RegisterUserDto } from './dto/register-user.dto';
import { AuthService } from './auth.service';
import {
  RegistrationResponseDto,
  LoginResponseDto,
} from './dto/auth-response.dto';
import { LoginUserDto } from './dto/login-user.dto';

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
}
