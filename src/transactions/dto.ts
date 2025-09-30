import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class TransferDto {
  @ApiProperty() @IsUUID() recipientUserId: string;
  @ApiProperty() @IsEnum(['USD','EUR'] as any) currency: 'USD' | 'EUR';
  @ApiProperty() @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() amount: number;
  @ApiPropertyOptional() @IsOptional() @IsString() idempotencyKey?: string;
}

export class ExchangeDto {
  @ApiProperty() @IsEnum(['USD','EUR'] as any) fromCurrency: 'USD' | 'EUR';
  @ApiProperty() @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() amount: number;
  @ApiPropertyOptional() @IsOptional() @IsString() idempotencyKey?: string;
}

export class TxQueryDto {
  @ApiPropertyOptional({ enum: ['transfer','exchange'] })
  @IsOptional() @IsEnum(['transfer','exchange'] as any) type?: 'transfer' | 'exchange';
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() limit?: number;
}
