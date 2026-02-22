import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { TikTokService } from './tiktok.service';

@Controller('tiktok')
export class TikTokAuthController {
    constructor(private readonly tiktokService: TikTokService) { }

    /**
     * GET /api/tiktok/auth
     * Redirects to TikTok OAuth page for creator authorization.
     */
    @Get('auth')
    authorize(@Res() res: Response) {
        const url = this.tiktokService.getAuthUrl();
        return res.redirect(url);
    }

    /**
     * GET /api/tiktok/callback?code=XXX
     * Exchanges the authorization code for a creator access token.
     * After authorizing on TikTok, paste the code from the redirect URL here.
     */
    @Get('callback')
    async callback(@Query('code') code: string) {
        if (!code) {
            return {
                error: 'Missing code parameter',
                usage: 'GET /api/tiktok/callback?code=YOUR_AUTH_CODE',
            };
        }

        const result = await this.tiktokService.getAccessTokenFromCode(code);
        return result;
    }
}
