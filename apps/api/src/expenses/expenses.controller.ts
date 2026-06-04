import {
  BadRequestException,
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  createExpenseSchema, updateExpenseSchema, listExpensesQuerySchema,
  type CreateExpenseDto, type UpdateExpenseDto, type ListExpensesQuery,
} from '@gastapp/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from 'nestjs-zod';
import { ExpensesService } from './expenses.service';
import type { AuthUser } from '../auth/strategies/jwt.strategy';

/** Minimal shape of a multer upload — avoids pulling in @types/multer. */
interface UploadedCsv {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

const CSV_MIME_TYPES = ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'];

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listExpensesQuerySchema)) q: ListExpensesQuery,
  ) {
    return this.expenses.list(user.id, q);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createExpenseSchema)) dto: CreateExpenseDto,
  ) {
    return this.expenses.create(user.id, dto);
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  importCsv(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadedCsv | undefined,
    @Body('categoryId') categoryId?: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!categoryId) throw new BadRequestException('categoryId is required');
    const isCsv =
      CSV_MIME_TYPES.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.csv');
    if (!isCsv) throw new BadRequestException('File must be a CSV');
    return this.expenses.importFromCsv(user.id, categoryId, file.buffer);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateExpenseSchema)) dto: UpdateExpenseDto,
  ) {
    return this.expenses.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.expenses.remove(user.id, id);
  }
}
