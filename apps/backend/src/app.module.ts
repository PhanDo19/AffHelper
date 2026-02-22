import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma';
import { AuthModule } from './modules/auth';
import { LinksModule } from './modules/links/links.module';
import { OrdersModule } from './modules/orders';
import { WithdrawalsModule } from './modules/withdrawals';
import { AdminModule } from './modules/admin';
import { ProvidersModule } from './providers';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    LinksModule,
    OrdersModule,
    WithdrawalsModule,
    AdminModule,
    ProvidersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
