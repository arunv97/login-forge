import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService, GoogleProfile } from '@auth/auth.service';
import { LoginResponseDto } from '@auth/dto/auth-response.dto';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

    if (!clientID || !clientSecret || !callbackURL) {
      throw new InternalServerErrorException(
        'Google OAuth environment variables are not set.'
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string | undefined,
    profile: Profile,
    done: VerifyCallback
  ): Promise<void> {
    const { id, name, emails } = profile;

    if (!emails || emails.length === 0 || !emails[0].value) {
      done(
        new InternalServerErrorException(
          'Google profile did not return an email.'
        ),
        undefined
      );
      return;
    }

    const googleProfileData: GoogleProfile = {
      providerId: id,
      email: emails[0].value,
      name: name
        ? `${name.givenName || ''} ${name.familyName || ''}`.trim() ||
          emails[0].value.split('@')[0]
        : emails[0].value.split('@')[0],
    };

    try {
      const loginResponse: LoginResponseDto =
        await this.authService.handleGoogleLogin(googleProfileData);
      done(null, loginResponse);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
