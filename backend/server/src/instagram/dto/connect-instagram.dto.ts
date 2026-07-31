import { IsOptional, IsString, MinLength } from 'class-validator';

export class ConnectInstagramDto {
  @IsString()
  @MinLength(20, { message: 'El token proporcionado no parece válido.' })
  accessToken!: string;

  @IsOptional()
  @IsString()
  pageId?: string;
}
