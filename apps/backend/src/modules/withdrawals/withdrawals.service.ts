import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWithdrawalDto, WalletStatsDto, WithdrawalQueryDto } from './dto';
import { Prisma, WithdrawalStatus } from '@prisma/client';

@Injectable()
export class WithdrawalsService {
    private readonly logger = new Logger(WithdrawalsService.name);
    private readonly minWithdrawalAmount: number;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) {
        this.minWithdrawalAmount = parseInt(
            this.configService.get<string>('MIN_WITHDRAWAL_AMOUNT') || '50000',
            10,
        );
    }

    /**
     * Get wallet stats for a user.
     */
    async getWalletStats(userId: string): Promise<WalletStatsDto> {
        const [user, totalWithdrawn, totalCashback] = await Promise.all([
            this.prisma.user.findUnique({
                where: { id: userId },
                select: { availableBalance: true, pendingBalance: true },
            }),
            this.prisma.withdrawal.aggregate({
                where: { userId, status: WithdrawalStatus.COMPLETED },
                _sum: { amount: true },
            }),
            this.prisma.order.aggregate({
                where: { userId },
                _sum: { cashbackAmount: true },
            }),
        ]);

        return {
            availableBalance: Number(user?.availableBalance || 0),
            pendingBalance: Number(user?.pendingBalance || 0),
            totalWithdrawn: Number(totalWithdrawn._sum.amount || 0),
            totalCashbackEarned: Number(totalCashback._sum.cashbackAmount || 0),
        };
    }

    /**
     * Create a withdrawal request.
     */
    async createWithdrawal(userId: string, dto: CreateWithdrawalDto) {
        // Validate minimum amount
        if (dto.amount < this.minWithdrawalAmount) {
            throw new BadRequestException(
                `Số tiền rút tối thiểu là ${this.minWithdrawalAmount.toLocaleString('vi-VN')}₫`,
            );
        }

        // Check available balance
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { availableBalance: true },
        });

        if (!user || Number(user.availableBalance) < dto.amount) {
            throw new BadRequestException('Số dư khả dụng không đủ');
        }

        // Create withdrawal and deduct balance in a transaction
        const withdrawal = await this.prisma.$transaction(async (tx) => {
            // Deduct from available balance
            await tx.user.update({
                where: { id: userId },
                data: {
                    availableBalance: { decrement: dto.amount },
                },
            });

            // Create withdrawal record
            return tx.withdrawal.create({
                data: {
                    userId,
                    amount: dto.amount,
                    bankAccount: dto.bankAccount,
                    bankName: dto.bankName,
                    accountHolder: dto.accountHolder,
                    status: WithdrawalStatus.PENDING,
                },
            });
        });

        this.logger.log(`Withdrawal created: ${withdrawal.id} - ${dto.amount.toLocaleString()}₫`);
        return withdrawal;
    }

    /**
     * Get withdrawal history for a user.
     */
    async getWithdrawals(userId: string, query: WithdrawalQueryDto) {
        const page = parseInt(query.page || '1', 10);
        const limit = Math.min(parseInt(query.limit || '20', 10), 100);
        const skip = (page - 1) * limit;

        const where: Prisma.WithdrawalWhereInput = { userId };

        if (query.status) {
            where.status = query.status as WithdrawalStatus;
        }

        const [data, total] = await Promise.all([
            this.prisma.withdrawal.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.withdrawal.count({ where }),
        ]);

        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
}
