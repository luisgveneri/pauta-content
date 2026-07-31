import { IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class SetCampaignResultDto {
  @IsInt()
  @Min(0)
  resultValue: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  resultNotes?: string;
}
