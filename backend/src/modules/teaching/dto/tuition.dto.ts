import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import type { PaymentMethod } from '../entities/tuition-payment.entity.js';

export class CreateTuitionAdjustmentDto {
  @IsEnum(['SURCHARGE', 'DISCOUNT'])
  type: 'SURCHARGE' | 'DISCOUNT';

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class RecordPaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  paymentDate: string; // YYYY-MM-DD

  @IsEnum(['CASH', 'BANK_TRANSFER', 'MOMO', 'OTHER'])
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  note?: string;
}

export class BulkTuitionAdjustmentDto {
  @IsEnum(['SURCHARGE', 'DISCOUNT'])
  type: 'SURCHARGE' | 'DISCOUNT';

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsNotEmpty()
  tuitionIds: string[];
}

export class BulkPaymentDto {
  @IsNotEmpty()
  tuitionIds: string[];

  @IsString()
  @IsNotEmpty()
  paymentDate: string;

  @IsEnum(['CASH', 'BANK_TRANSFER', 'MOMO', 'OTHER'])
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  note?: string;
}

export class UpdateTuitionStatusDto {
  @IsEnum(['PAID', 'UNPAID', 'PARTIALLY_PAID'])
  status: 'PAID' | 'UNPAID' | 'PARTIALLY_PAID';
}

