import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CampaignObjective } from '@prisma/client';

const OBJECTIVES: CampaignObjective[] = ['TOURNAMENT', 'CLINIC', 'TEAM_RECRUITMENT', 'OTHER'];

export class CreateCampaignDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  name: string;

  @IsIn(OBJECTIVES)
  objective: CampaignObjective;

  @IsDateString()
  eventStartDate: string;

  @IsOptional()
  @IsDateString()
  eventEndDate?: string;
}
