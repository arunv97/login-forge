import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  MaxLength,
} from 'class-validator';

export class RegisterUserDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'The full name of the user',
    required: true,
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Name should not be empty' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'The email address of the user (must be unique)',
    required: true,
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Email should not be empty' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(100)
  email!: string;

  @ApiProperty({
    example: 'P@$$wOrd123',
    description:
      'The user password. Must be at least 8 characters long and contain an uppercase letter, a lowercase letter, a number, and a special character.',
    required: true,
    minLength: 8,
  })
  @IsNotEmpty({ message: 'Password should not be empty' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password is too weak. It must contain an uppercase letter, a lowercase letter, a number or special character.',
  })
  password!: string;

  @ApiProperty({
    example: 'P@$$wOrd123',
    description: 'Password confirmation, must match the password field.',
    required: true,
  })
  @IsNotEmpty({ message: 'Confirm password should not be empty' })
  @IsString()
  confirmPassword!: string;
}