import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty({
    example: 'CurrentP@$$wOrd',
    description: 'The current password of the user.',
    required: true,
  })
  @IsNotEmpty({ message: 'Current password should not be empty.' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({
    example: 'NewP@$$wOrd123',
    description:
      'The new user password. Must be at least 8 characters long and contain an uppercase letter, a lowercase letter, a number, and a special character.',
    required: true,
    minLength: 8,
  })
  @IsNotEmpty({ message: 'New password should not be empty.' })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long.' })
  @MaxLength(25, {
    message: 'New password must be at most 25 characters long.',
  })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'New password is too weak. It must contain an uppercase letter, a lowercase letter, a number or special character.',
  })
  newPassword!: string;

  @ApiProperty({
    example: 'NewP@$$wOrd123',
    description: 'Password confirmation, must match the newPassword field.',
    required: true,
  })
  @IsNotEmpty({ message: 'Confirm new password should not be empty.' })
  @IsString()
  confirmNewPassword!: string;
}
