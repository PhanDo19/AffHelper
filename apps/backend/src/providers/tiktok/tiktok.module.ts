import { Module } from '@nestjs/common';
import { TikTokService } from './tiktok.service';
import { TikTokSyncService } from './tiktok-sync.service';
import { TikTokAuthController } from './tiktok-auth.controller';
import { PrismaModule } from '../../prisma';

@Module({
    imports: [PrismaModule],
    controllers: [TikTokAuthController],
    providers: [TikTokService, TikTokSyncService],
    exports: [TikTokService, TikTokSyncService],
})
export class TikTokModule { }
