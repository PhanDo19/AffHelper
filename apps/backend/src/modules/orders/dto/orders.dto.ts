import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class OrderQueryDto {
    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;

    @IsOptional()
    @IsDateString()
    from?: string;

    @IsOptional()
    @IsDateString()
    to?: string;

    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    limit?: string;
}

export class OrderStatsDto {
    totalOrders: number;
    totalLinks: number;
    totalCommission: number;
    totalCashback: number;
    pendingOrders: number;
    completedOrders: number;
}
