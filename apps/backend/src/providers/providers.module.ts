import { Module } from '@nestjs/common';
import { ShopeeModule } from './shopee';
import { TikTokModule } from './tiktok';

@Module({
    imports: [ShopeeModule, TikTokModule],
    exports: [ShopeeModule, TikTokModule],
})
export class ProvidersModule { }
