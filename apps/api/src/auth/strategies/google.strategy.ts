import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService, private readonly auth: AuthService) {
    super({
      // passport-oauth2 throws on a falsy clientID; placeholder keeps the API
      // booting when Google OAuth is not configured (routes become inert).
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'google-oauth-disabled',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || 'google-oauth-disabled',
      callbackURL: config.get<string>(
        'GOOGLE_CALLBACK_URL',
        'http://localhost:3001/api/auth/google/callback',
      ),
      scope: ['email', 'profile'],
    });
  }

  async validate(_at: string, _rt: string, profile: Profile, done: VerifyCallback) {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error('Google account has no email'), undefined);
    const name = profile.displayName ?? email.split('@')[0]!;
    const user = await this.auth.findOrCreateOAuth('google', profile.id, email, name);
    done(null, { id: user.id, email: user.email, name: user.name });
  }
}
