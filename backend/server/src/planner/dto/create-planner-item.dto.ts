import {
  IsDateString,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePlannerItemDto {
  @IsDateString()
  date: string;

  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title: string;

  @IsString()
  @MinLength(2)
  @MaxLength(32)
  platform: string;

  @IsIn(['Draft', 'Ready', 'Scheduled', 'Posted'])
  status: string;
}
