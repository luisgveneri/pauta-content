import { TrendSource } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

export type TrendSortOption = 'score' | 'recent' | 'relativePerformance';

export class ListTrendsDto {
  @IsOptional()
  @IsEnum(TrendSource)
  source?: TrendSource;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  minScore?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  maxDuration?: number;

  @IsOptional()
  @IsIn(['score', 'recent', 'relativePerformance'])
  sort?: TrendSortOption;
}
