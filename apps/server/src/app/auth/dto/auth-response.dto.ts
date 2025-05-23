import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SafeUserDto {
  @ApiProperty({ example: 'cl9z0x0000000000000000000', description: 'User ID' })
  id!: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'User email' })
  email!: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User name',
    nullable: true,
  })
  name!: string | null;

  @ApiProperty({
    example: false,
    description: 'Indicates if the email is verified',
  })
  emailVerified!: boolean;

  @ApiProperty({
    example: 'local',
    description: 'Authentication provider',
    nullable: true,
  })
  provider!: string | null;

  @ApiProperty({ description: 'User creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'User last update timestamp' })
  updatedAt!: Date;

  @ApiProperty({
    description: 'User avatar URL',
    nullable: true,
    required: false,
  })
  avatarUrl?: string | null;
}

export class RegistrationResponseDto {
  @ApiProperty({ example: 'User registered successfully.' })
  message!: string;

  @ApiProperty({ type: SafeUserDto })
  user!: SafeUserDto;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Access Token',
  })
  accessToken!: string;

  @ApiProperty({
    example: 'djP8z7qL9r1Xo2...',
    description: 'Refresh Token',
  })
  refreshToken!: string;
}

export class LoginResponseDto extends RegistrationResponseDto {}

export class RefreshTokenDto {
  @ApiProperty({
    example: 'djP8z7qL9r1Xo2...',
    description: 'The refresh token.',
    required: true,
  })
  @IsNotEmpty({ message: 'Refresh token should not be empty.' })
  @IsString()
  refreshToken!: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken?: string;
  message: string;
}

export class RefreshTokenResponseDto implements RefreshTokenResponse {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiPropertyOptional({ example: 'djP8z7qL9r1Xo2...' })
  refreshToken?: string;

  @ApiProperty({ example: 'Access token refreshed successfully.' })
  message!: string;
}
