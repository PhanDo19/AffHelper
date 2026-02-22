import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderQueryDto, OrderStatsDto } from './dto';
import { Prisma, OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Get orders for a specific user with filtering and pagination.
     */
    async getOrders(userId: string, query: OrderQueryDto) {
        const page = parseInt(query.page || '1', 10);
        const limit = Math.min(parseInt(query.limit || '20', 10), 100);
        const skip = (page - 1) * limit;

        const where: Prisma.OrderWhereInput = { userId };

        if (query.status) {
            where.status = query.status;
        }

        if (query.from || query.to) {
            where.purchasedAt = {};
            if (query.from) where.purchasedAt.gte = new Date(query.from);
            if (query.to) where.purchasedAt.lte = new Date(query.to);
        }

        const [data, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                orderBy: { purchasedAt: 'desc' },
                skip,
                take: limit,
                include: {
                    linkConversion: {
                        select: {
                            originalUrl: true,
                            affiliateUrl: true,
                        },
                    },
                },
            }),
            this.prisma.order.count({ where }),
        ]);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get dashboard stats for a user.
     */
    async getStats(userId: string): Promise<OrderStatsDto> {
        const [totalLinks, orderStats, commissionData] = await Promise.all([
            // Total affiliate links created
            this.prisma.linkConversion.count({ where: { userId } }),

            // Order counts by status
            this.prisma.order.groupBy({
                by: ['status'],
                where: { userId },
                _count: true,
            }),

            // Total commission and cashback
            this.prisma.order.aggregate({
                where: { userId },
                _sum: {
                    commissionAmount: true,
                    cashbackAmount: true,
                },
            }),
        ]);

        const statusCounts = orderStats.reduce(
            (acc, item) => {
                acc[item.status] = item._count;
                return acc;
            },
            {} as Record<string, number>,
        );

        return {
            totalLinks,
            totalOrders: Object.values(statusCounts).reduce((a, b) => a + b, 0),
            pendingOrders: statusCounts[OrderStatus.PENDING] || 0,
            completedOrders: statusCounts[OrderStatus.COMPLETED] || 0,
            totalCommission: Number(commissionData._sum.commissionAmount || 0),
            totalCashback: Number(commissionData._sum.cashbackAmount || 0),
        };
    }
}
