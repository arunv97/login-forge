import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'The email address of the user.',
    required: true,
  })
  @IsNotEmpty({ message: 'Email should not be empty.' })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email!: string;

  @ApiProperty({
    example: 'P@$$wOrd123',
    description: 'The password of the user.',
    required: true,
    minLength: 8,
  })
  @IsNotEmpty({ message: 'Password should not be empty.' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  password!: string;
}
