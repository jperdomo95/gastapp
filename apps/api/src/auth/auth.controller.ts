import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards, UsePipes } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { registerSchema, loginSchema } from '@gastapp/types';
import type { RegisterDto, LoginDto } from '@gastapp/types';
import { ZodValidationPipe } from 'nestjs-zod';
import { AuthService } from './auth.service';

const REFRESH_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, ...rest } = await this.auth.register(dto);
    this.setRefreshCookie(res, refreshToken);
    return rest;
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(AuthGuard('local'))
  async login(
    @Body(new ZodValidationPipe(loginSchema)) _dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as { id: string; email: string; name: string };
    const { refreshToken, ...rest } = await this.auth.login(user.id, user.email, user.name);
    this.setRefreshCookie(res, refreshToken);
    return rest;
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) {
      res.status(401);
      return { message: 'No refresh token' };
    }
    const { refreshToken, ...rest } = await this.auth.refresh(token);
    this.setRefreshCookie(res, refreshToken);
    return rest;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  google() {
    // Passport redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; email: string; name: string };
    const { refreshToken } = await this.auth.login(user.id, user.email, user.name);
    this.setRefreshCookie(res, refreshToken);
    const webOrigin = this.config.get<string>('WEB_ORIGIN', 'http://localhost:5173');
    res.redirect(`${webOrigin}/auth/callback`);
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600 * 1000,
    });
  }
}
