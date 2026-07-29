import { IsInt, IsPositive, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateViralVideoDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title: string;

  @IsString()
  @MinLength(2)
  @MaxLength(32)
  platform: string;

  @IsInt()
  @Min(0)
  views: number;

  @IsInt()
  @Min(0)
  likes: number;

  @IsInt()
  @IsPositive()
  durationSec: number;

  @IsString()
  @MinLength(10)
  @MaxLength(400)
  description: string;
}

