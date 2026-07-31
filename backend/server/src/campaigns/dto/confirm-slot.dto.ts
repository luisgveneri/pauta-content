import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const STATUSES = ['Draft', 'Ready', 'Scheduled', 'Posted'];

export class ConfirmSlotDto {
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  platform: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
