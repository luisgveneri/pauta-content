import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../auth/public.decorator';
import { CurrentOrg } from '../auth/current-org.decorator';
import { ConnectInstagramDto } from './dto/connect-instagram.dto';
import { InstagramAnalysisService } from './instagram-analysis.service';
import { InstagramApiService } from './instagram-api.service';
import { InstagramSyncService } from './instagram-sync.service';

@Controller('instagram')
export class InstagramController {
  private readonly logger = new Logger(InstagramController.name);

  constructor(
    private readonly sync: InstagramSyncService,
    private readonly analysis: InstagramAnalysisService,
    private readonly api: InstagramApiService,
  ) {}

  @Get('status')
  status(@CurrentOrg() organizationId: string) {
    return this.sync.status(organizationId);
  }

  @Post('connect')
  connect(@CurrentOrg() organizationId: string, @Body() dto: ConnectInstagramDto) {
    return this.sync.connect(organizationId, dto.accessToken, dto.pageId);
  }

  @Delete('connect')
  disconnect(@CurrentOrg() organizationId: string) {
    return this.sync.disconnect(organizationId);
  }

  /**
   * Called via authenticated XHR (not a browser navigation) precisely so
   * organizationId comes from the verified Clerk JWT, not a spoofable query
   * param. The frontend takes the returned URL and does the actual
   * `window.location.href` navigation itself.
   */
  @Get('oauth/connect')
  oauthConnect(@CurrentOrg() organizationId: string) {
    return { url: this.sync.buildAuthorizeUrl(organizationId) };
  }

  /**
   * Meta redirects the browser here with no auth header of ours — hence
   * @Public(). Identity comes entirely from the encrypted `state`.
   */
  @Public()
  @Get('oauth/callback')
  async oauthCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

    if (error || !code || !state) {
      return res.redirect(`${frontendUrl}/instagram?igError=denied`);
    }

    try {
      const { organizationId } = this.sync.verifyOAuthState(state);
      const redirectUri = process.env.INSTAGRAM_OAUTH_REDIRECT_URI || '';
      const { accessToken } = await this.api.exchangeCodeForToken(code, redirectUri);
      await this.sync.connect(organizationId, accessToken);
      return res.redirect(`${frontendUrl}/instagram?igConnected=1`);
    } catch (err) {
      this.logger.warn(`OAuth callback falló: ${(err as Error).message}`);
      return res.redirect(`${frontendUrl}/instagram?igError=failed`);
    }
  }

  @Post('sync')
  runSync(@CurrentOrg() organizationId: string) {
    return this.sync.sync(organizationId);
  }

  @Get('posts')
  async listPosts(
    @CurrentOrg() organizationId: string,
    @Query('mediaType') mediaType?: string,
    @Query('sort') sort?: string,
  ) {
    const account = await this.requireAccount(organizationId);
    return this.analysis.listPosts(account.id, {
      mediaType,
      sort: sort === 'performance' ? 'performance' : 'recent',
    });
  }

  @Get('posts/:id')
  async getPost(@CurrentOrg() organizationId: string, @Param('id') id: string) {
    const account = await this.requireAccount(organizationId);
    return this.analysis.getPost(account.id, id);
  }

  @Get('posts/:id/analysis')
  async getPostAnalysis(@CurrentOrg() organizationId: string, @Param('id') id: string) {
    const result = await this.analysis.latestPostAnalysis(organizationId, id);
    if (!result) {
      throw new NotFoundException('Aún no hay análisis de IA para este post.');
    }
    return result;
  }

  @Post('posts/:id/analysis')
  analyzePost(@CurrentOrg() organizationId: string, @Param('id') id: string) {
    return this.analysis.analyzePost(organizationId, id);
  }

  @Get('trends')
  async trends(@CurrentOrg() organizationId: string, @Query('days') days?: string) {
    const account = await this.requireAccount(organizationId);
    const parsedDays = Number(days) > 0 ? Number(days) : 90;
    return this.analysis.trends(account.id, parsedDays);
  }

  @Get('analysis')
  async getAccountAnalysis(@CurrentOrg() organizationId: string) {
    const account = await this.requireAccount(organizationId);
    const result = await this.analysis.latestAccountAnalysis(account.id);
    if (!result) {
      throw new NotFoundException('Aún no hay análisis de IA para esta cuenta.');
    }
    return result;
  }

  @Post('analysis')
  async analyzeAccount(@CurrentOrg() organizationId: string) {
    const account = await this.requireAccount(organizationId);
    return this.analysis.analyzeAccount(account.id);
  }

  private async requireAccount(organizationId: string) {
    const account = await this.sync.getAccount(organizationId);
    if (!account) {
      throw new BadRequestException('No hay ninguna cuenta de Instagram conectada.');
    }
    return account;
  }
}
