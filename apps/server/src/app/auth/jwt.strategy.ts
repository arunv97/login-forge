import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  ExtractJwt,
  Strategy,
  StrategyOptionsWithoutRequest,
} from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '@user/user.service';
import { User as PrismaUser } from '@prisma/client';
import { SafeUserDto } from '@auth/dto/auth-response.dto';

export interface JwtPayload {
  email: string;
  sub: string;
  name?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new InternalServerErrorException(
        'JWT_SECRET environment variable is not set.'
      );
    }

    const strategyOptions: StrategyOptionsWithoutRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    };

    super(strategyOptions);
  }

  async validate(payload: JwtPayload): Promise<SafeUserDto> {
    const userFromDb: PrismaUser | null = await this.userService.findById(
      payload.sub
    );

    if (!userFromDb) {
      throw new UnauthorizedException('User not found or token invalid.');
    }

    const safeUser: SafeUserDto = {
      id: userFromDb.id,
      email: userFromDb.email,
      name: userFromDb.name,
      emailVerified: userFromDb.emailVerified,
      provider: userFromDb.provider,
      createdAt: userFromDb.createdAt,
      updatedAt: userFromDb.updatedAt,
    };

    return safeUser;
  }
}
