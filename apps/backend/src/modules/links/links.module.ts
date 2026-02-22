import { Module } from '@nestjs/common';
import { LinksService } from './links.service';
import { LinksController } from './links.controller';
import { ShopeeModule } from '../../providers/shopee';
import { TikTokModule } from '../../providers/tiktok';
import { PrismaModule } from '../../prisma';

@Module({
    imports: [ShopeeModule, TikTokModule, PrismaModule],
    controllers: [LinksController],
    providers: [LinksService],
})
export class LinksModule { }

