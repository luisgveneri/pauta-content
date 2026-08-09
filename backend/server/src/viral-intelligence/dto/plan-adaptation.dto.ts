import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const STATUSES = ['Draft', 'Ready', 'Scheduled', 'Posted'];

export class PlanAdaptationDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  platform?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: string;
}
