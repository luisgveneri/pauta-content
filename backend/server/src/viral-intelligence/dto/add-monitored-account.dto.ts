import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class AddMonitoredAccountDto {
  // Instagram's own username rules: letters, digits, periods, underscores.
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9._]+$/, {
    message:
      'username solo puede contener letras, números, puntos y guiones bajos.',
  })
  username: string;
}
