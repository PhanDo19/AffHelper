import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { OrderQueryDto } from './dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
    constructor(private ordersService: OrdersService) { }

    @Get()
    async getOrders(
        @CurrentUser('id') userId: string,
        @Query() query: OrderQueryDto,
    ) {
        return this.ordersService.getOrders(userId, query);
    }

    @Get('stats')
    async getStats(@CurrentUser('id') userId: string) {
        return this.ordersService.getStats(userId);
    }
}
