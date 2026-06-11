import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Runs before AuthGuard('google'): when Google OAuth is not configured the
// routes respond 404 instead of redirecting to Google with a placeholder
// client id.
@Injectable()
export class GoogleEnabledGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(): boolean {
    if (!this.config.get<string>('GOOGLE_CLIENT_ID')) {
      throw new NotFoundException();
    }
    return true;
  }
}
