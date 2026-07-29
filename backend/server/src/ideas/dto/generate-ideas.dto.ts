import { IsString, MaxLength, MinLength } from 'class-validator';

export class GenerateIdeasDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  topic: string;
}

