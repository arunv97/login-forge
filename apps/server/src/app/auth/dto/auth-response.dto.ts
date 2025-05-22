import { ApiProperty } from '@nestjs/swagger';

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
}

export class RegistrationResponseDto {
  @ApiProperty({ example: 'User registered successfully.' })
  message!: string;

  @ApiProperty({ type: SafeUserDto })
  user!: SafeUserDto;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Access Token',
    nullable: true,
    required: false,
  })
  accessToken?: string;
}

export class LoginResponseDto extends RegistrationResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Access Token',
  })
  override accessToken!: string;
}
