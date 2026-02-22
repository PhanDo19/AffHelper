import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ShopeeService } from './shopee.service';

@Module({
    imports: [ConfigModule],
    providers: [ShopeeService],
    exports: [ShopeeService],
})
export class ShopeeModule { }
