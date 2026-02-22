import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import { LinksService } from './links.service';
import { ConvertLinkDto } from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';

@Controller('links')
@UseGuards(JwtAuthGuard)
export class LinksController {
    constructor(private readonly linksService: LinksService) { }

    @Post('convert')
    async convertLink(
        @CurrentUser('id') userId: string,
        @Body() dto: ConvertLinkDto,
    ) {
        return this.linksService.convertLink(userId, dto);
    }

    @Get('history')
    async getHistory(
        @CurrentUser('id') userId: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.linksService.getHistory(
            userId,
            limit ? parseInt(limit) : undefined,
            offset ? parseInt(offset) : undefined,
        );
    }
}
