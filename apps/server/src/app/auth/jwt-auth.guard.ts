import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SafeUserDto } from './dto/auth-response.dto'; 
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'; 
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | ReturnType<typeof super.canActivate> {
    return super.canActivate(context);
  }

  override handleRequest<TUser = SafeUserDto>(
    err: Error | null, 
    user: SafeUserDto | false | null, 
    info: Error | JsonWebTokenError | TokenExpiredError | undefined, 
    // context: ExecutionContext, // context is available but not strictly needed in this override
    // status?: any, // status is available but not strictly needed
  ): TUser {
    if (err || !user) {
      if (info instanceof TokenExpiredError) {
        throw new UnauthorizedException('Token has expired.');
      }
      if (info instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token.');
      }
      throw err || new UnauthorizedException('User is not authorized.');
    }
    return user as TUser; 
  }
}