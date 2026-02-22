import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TikTokService } from './tiktok.service';
import { OrderStatus, Platform } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class TikTokSyncService {
    private readonly logger = new Logger(TikTokSyncService.name);
    private readonly cashbackRate: number;

    constructor(
        private prisma: PrismaService,
        private tiktokService: TikTokService,
        private configService: ConfigService,
    ) {
        this.cashbackRate = parseFloat(this.configService.get<string>('CASHBACK_RATE') || '0.7');
    }

    /**
     * Cron job: sync TikTok affiliate orders every 30 minutes.
     */
    @Cron(CronExpression.EVERY_30_MINUTES)
    async syncOrders() {
        this.logger.log('🔄 Starting TikTok order sync...');

        try {
            const orders = await this.fetchAffiliateOrders();

            if (!orders || orders.length === 0) {
                this.logger.log('No new orders to sync');
                return;
            }

            let synced = 0;
            let skipped = 0;

            for (const order of orders) {
                try {
                    const result = await this.processOrder(order);
                    if (result === 'synced') synced++;
                    else skipped++;
                } catch (error: any) {
                    this.logger.error(`Failed to process order ${order.order_id}: ${error.message}`);
                }
            }

            this.logger.log(`✅ Sync complete: ${synced} synced, ${skipped} skipped`);
        } catch (error: any) {
            this.logger.error(`❌ Order sync failed: ${error.message}`);
        }
    }

    /**
     * Fetch affiliate orders from TikTok Shop API.
     * Endpoint: GET /affiliate_creator/{version}/orders
     */
    private async fetchAffiliateOrders(): Promise<any[]> {
        const appKey = this.configService.get<string>('TIKTOK_APP_KEY');
        const appSecret = this.configService.get<string>('TIKTOK_APP_SECRET');
        const accessToken = this.configService.get<string>('TIKTOK_ACCESS_TOKEN');

        if (!appKey || !appSecret || !accessToken) {
            this.logger.warn('TikTok credentials not configured, skipping sync');
            return [];
        }

        const apiVersion = '202405';
        const path = `/affiliate_creator/${apiVersion}/orders/search`;
        const timestamp = Math.floor(Date.now() / 1000).toString();

        // Look back 7 days for orders
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const params: Record<string, string> = {
            app_key: appKey,
            timestamp,
        };

        // Generate signature
        const sign = this.generateSignature(path, params, appSecret);
        params.sign = sign;
        params.access_token = accessToken;

        const queryString = Object.entries(params)
            .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
            .join('&');

        const apiUrl = `https://open-api.tiktokglobalshop.com${path}?${queryString}`;

        try {
            const response = await axios.post(
                apiUrl,
                {
                    create_time_from: Math.floor(sevenDaysAgo.getTime() / 1000),
                    create_time_to: Math.floor(now.getTime() / 1000),
                    page_size: 50,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-tts-access-token': accessToken,
                    },
                    timeout: 15000,
                },
            );

            if (response.data?.code === 0 && response.data?.data?.orders) {
                return response.data.data.orders;
            }

            this.logger.warn(`TikTok API response: ${JSON.stringify(response.data)}`);
            return [];
        } catch (error: any) {
            this.logger.error(`TikTok orders API error: ${error.message}`);
            return [];
        }
    }

    /**
     * Process a single TikTok order: match to user, calculate cashback, save to DB.
     */
    private async processOrder(tiktokOrder: any): Promise<'synced' | 'skipped'> {
        const externalOrderId = tiktokOrder.order_id?.toString();
        if (!externalOrderId) return 'skipped';

        // Check if order already exists
        const existing = await this.prisma.order.findFirst({
            where: {
                platform: Platform.TIKTOK,
                externalOrderId,
            },
        });

        if (existing) {
            // Update status if changed
            const newStatus = this.mapOrderStatus(tiktokOrder.order_status);
            if (existing.status !== newStatus) {
                await this.prisma.order.update({
                    where: { id: existing.id },
                    data: {
                        status: newStatus,
                        completedAt: newStatus === OrderStatus.COMPLETED ? new Date() : null,
                    },
                });

                // If order completed, update user balance
                if (newStatus === OrderStatus.COMPLETED && existing.status !== OrderStatus.COMPLETED) {
                    await this.creditCashback(existing.userId, Number(existing.cashbackAmount));
                }
            }
            return 'skipped';
        }

        // Match order to user via sub1 tracking param
        const subId = tiktokOrder.sub_ids?.[0] || tiktokOrder.tracking_info?.sub_id;
        let userId: string | null = null;

        if (subId) {
            // sub1 = userId set during link generation
            const user = await this.prisma.user.findUnique({ where: { id: subId } });
            if (user) userId = user.id;
        }

        if (!userId) {
            // Try to match via product ID in link conversions
            const productId = tiktokOrder.product_id?.toString();
            if (productId) {
                const conversion = await this.prisma.linkConversion.findFirst({
                    where: {
                        platform: Platform.TIKTOK,
                        productId,
                    },
                    orderBy: { createdAt: 'desc' },
                });
                if (conversion) userId = conversion.userId;
            }
        }

        if (!userId) {
            this.logger.warn(`Cannot match order ${externalOrderId} to any user`);
            return 'skipped';
        }

        // Calculate commission and cashback
        const totalAmount = parseFloat(tiktokOrder.total_amount || '0');
        const commissionRate = parseFloat(tiktokOrder.commission_rate || '0') / 100;
        const commissionAmount = totalAmount * commissionRate;
        const cashbackAmount = commissionAmount * this.cashbackRate;

        const status = this.mapOrderStatus(tiktokOrder.order_status);

        // Create order in DB
        await this.prisma.order.create({
            data: {
                userId,
                platform: Platform.TIKTOK,
                externalOrderId,
                externalItemId: tiktokOrder.product_id?.toString(),
                productName: tiktokOrder.product_name || 'TikTok Product',
                productImage: tiktokOrder.product_image || null,
                productPrice: totalAmount,
                quantity: tiktokOrder.quantity || 1,
                totalAmount,
                commissionRate,
                commissionAmount,
                cashbackRate: this.cashbackRate,
                cashbackAmount,
                status,
                purchasedAt: tiktokOrder.create_time
                    ? new Date(tiktokOrder.create_time * 1000)
                    : new Date(),
            },
        });

        // If order is already completed, credit immediately
        if (status === OrderStatus.COMPLETED) {
            await this.creditCashback(userId, cashbackAmount);
        } else {
            // Add to pending balance
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    pendingBalance: { increment: cashbackAmount },
                },
            });
        }

        this.logger.log(`Synced order ${externalOrderId} for user ${userId}: ₫${cashbackAmount.toLocaleString()}`);
        return 'synced';
    }

    /**
     * Credit cashback to user's available balance.
     */
    private async creditCashback(userId: string, amount: number) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                availableBalance: { increment: amount },
                pendingBalance: { decrement: amount },
            },
        });
    }

    /**
     * Map TikTok order status to our OrderStatus enum.
     */
    private mapOrderStatus(tiktokStatus: string): OrderStatus {
        const statusMap: Record<string, OrderStatus> = {
            UNPAID: OrderStatus.PENDING,
            ON_HOLD: OrderStatus.PENDING,
            AWAITING_SHIPMENT: OrderStatus.PENDING,
            AWAITING_COLLECTION: OrderStatus.PENDING,
            IN_TRANSIT: OrderStatus.PENDING,
            DELIVERED: OrderStatus.PENDING,
            COMPLETED: OrderStatus.COMPLETED,
            CANCELLED: OrderStatus.CANCELLED,
            RETURNED: OrderStatus.REFUNDED,
            REFUNDED: OrderStatus.REFUNDED,
        };
        return statusMap[tiktokStatus] || OrderStatus.PENDING;
    }

    /**
     * Generate HMAC-SHA256 signature.
     */
    private generateSignature(path: string, params: Record<string, string>, secret: string): string {
        const filtered = Object.entries(params)
            .filter(([key]) => key !== 'sign' && key !== 'access_token')
            .sort(([a], [b]) => a.localeCompare(b));

        let baseString = secret + path;
        for (const [key, value] of filtered) {
            baseString += key + value;
        }
        baseString += secret;

        return require('crypto').createHmac('sha256', secret).update(baseString).digest('hex');
    }

    /**
     * Manual trigger for order sync (called from admin or testing).
     */
    async triggerSync() {
        return this.syncOrders();
    }
}
