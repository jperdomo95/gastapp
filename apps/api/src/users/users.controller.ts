import {
  BadRequestException, Body, Controller, Get, Patch, UseGuards,
} from '@nestjs/common';
import { updateUserSchema, type UpdateUserDto } from '@gastapp/types';
import { ZodValidationPipe } from 'nestjs-zod';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { isValidTimezone } from '../common/timezone';
import type { AuthUser } from '../auth/strategies/jwt.strategy';

const SELECT_FIELDS = { id: true, email: true, name: true, timezone: true, createdAt: true } as const;

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const fresh = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: SELECT_FIELDS,
    });
    return { ...fresh, createdAt: fresh.createdAt.toISOString() };
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserDto,
  ) {
    if (!isValidTimezone(dto.timezone)) {
      throw new BadRequestException('Unrecognized timezone');
    }
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { timezone: dto.timezone },
      select: SELECT_FIELDS,
    });
    return { ...updated, createdAt: updated.createdAt.toISOString() };
  }
}
