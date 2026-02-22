import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WithdrawalStatus, Prisma } from '@prisma/client';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * System-wide dashboard stats for admin.
     */
    async getSystemStats() {
        const [totalUsers, totalLinks, totalOrders, orderRevenue, pendingWithdrawals, completedWithdrawals] =
            await Promise.all([
                this.prisma.user.count(),
                this.prisma.linkConversion.count(),
                this.prisma.order.count(),
                this.prisma.order.aggregate({
                    _sum: { commissionAmount: true, cashbackAmount: true, totalAmount: true },
                }),
                this.prisma.withdrawal.count({ where: { status: WithdrawalStatus.PENDING } }),
                this.prisma.withdrawal.aggregate({
                    where: { status: WithdrawalStatus.COMPLETED },
                    _sum: { amount: true },
                }),
            ]);

        return {
            totalUsers,
            totalLinks,
            totalOrders,
            totalRevenue: Number(orderRevenue._sum.totalAmount || 0),
            totalCommission: Number(orderRevenue._sum.commissionAmount || 0),
            totalCashback: Number(orderRevenue._sum.cashbackAmount || 0),
            pendingWithdrawals,
            totalWithdrawn: Number(completedWithdrawals._sum.amount || 0),
        };
    }

    /**
     * List all users with pagination.
     */
    async getUsers(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.prisma.user.findMany({
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    email: true,
                    fullName: true,
                    role: true,
                    isActive: true,
                    availableBalance: true,
                    pendingBalance: true,
                    createdAt: true,
                    _count: { select: { linkConversions: true, orders: true, withdrawals: true } },
                },
            }),
            this.prisma.user.count(),
        ]);
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    /**
     * List all withdrawals (pending first) with pagination.
     */
    async getWithdrawals(page = 1, limit = 20, status?: string) {
        const skip = (page - 1) * limit;
        const where: Prisma.WithdrawalWhereInput = {};
        if (status) where.status = status as WithdrawalStatus;

        const [data, total] = await Promise.all([
            this.prisma.withdrawal.findMany({
                where,
                orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
                skip,
                take: limit,
                include: {
                    user: { select: { email: true, fullName: true } },
                },
            }),
            this.prisma.withdrawal.count({ where }),
        ]);
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    /**
     * Approve a withdrawal request.
     */
    async approveWithdrawal(withdrawalId: string, adminId: string) {
        const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
        if (!withdrawal) throw new NotFoundException('Yêu cầu rút tiền không tồn tại');
        if (withdrawal.status !== WithdrawalStatus.PENDING) {
            throw new BadRequestException('Yêu cầu đã được xử lý');
        }

        const updated = await this.prisma.withdrawal.update({
            where: { id: withdrawalId },
            data: {
                status: WithdrawalStatus.COMPLETED,
                processedAt: new Date(),
                processedBy: adminId,
            },
        });

        this.logger.log(`Withdrawal ${withdrawalId} approved by admin ${adminId}`);
        return updated;
    }

    /**
     * Reject a withdrawal request (refund balance to user).
     */
    async rejectWithdrawal(withdrawalId: string, adminId: string, reason: string) {
        const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
        if (!withdrawal) throw new NotFoundException('Yêu cầu rút tiền không tồn tại');
        if (withdrawal.status !== WithdrawalStatus.PENDING) {
            throw new BadRequestException('Yêu cầu đã được xử lý');
        }

        // Refund balance + update withdrawal status in transaction
        const updated = await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: withdrawal.userId },
                data: { availableBalance: { increment: Number(withdrawal.amount) } },
            });

            return tx.withdrawal.update({
                where: { id: withdrawalId },
                data: {
                    status: WithdrawalStatus.REJECTED,
                    processedAt: new Date(),
                    processedBy: adminId,
                    rejectReason: reason,
                },
            });
        });

        this.logger.log(`Withdrawal ${withdrawalId} rejected by admin ${adminId}: ${reason}`);
        return updated;
    }

    /**
     * Toggle user active status.
     */
    async toggleUserActive(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User không tồn tại');

        return this.prisma.user.update({
            where: { id: userId },
            data: { isActive: !user.isActive },
        });
    }
}
