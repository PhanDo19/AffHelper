import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WithdrawalsService } from './withdrawals.service';
import { CreateWithdrawalDto, WithdrawalQueryDto } from './dto';

@Controller('withdrawals')
@UseGuards(JwtAuthGuard)
export class WithdrawalsController {
    constructor(private withdrawalsService: WithdrawalsService) { }

    @Get('wallet')
    async getWalletStats(@CurrentUser('id') userId: string) {
        return this.withdrawalsService.getWalletStats(userId);
    }

    @Post()
    async createWithdrawal(
        @CurrentUser('id') userId: string,
        @Body() dto: CreateWithdrawalDto,
    ) {
        return this.withdrawalsService.createWithdrawal(userId, dto);
    }

    @Get()
    async getWithdrawals(
        @CurrentUser('id') userId: string,
        @Query() query: WithdrawalQueryDto,
    ) {
        return this.withdrawalsService.getWithdrawals(userId, query);
    }
}
