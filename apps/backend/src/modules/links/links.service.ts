import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { ConvertLinkDto, LinkResponseDto } from './dto';
import { ShopeeService } from '../../providers/shopee';
import { TikTokService } from '../../providers/tiktok';
import { Platform } from '@prisma/client';

@Injectable()
export class LinksService {
    private readonly logger = new Logger(LinksService.name);

    constructor(
        private prisma: PrismaService,
        private shopeeService: ShopeeService,
        private tiktokService: TikTokService,
    ) { }

    async convertLink(userId: string, dto: ConvertLinkDto): Promise<LinkResponseDto> {
        let { url } = dto;
        let platform: Platform | null = null;
        let shortLink = '';
        let productId = '';
        let productName: string | undefined;
        let productImage: string | undefined;
        let price: number | undefined;
        let estimatedCashback: number | undefined;
        let commissionRate: number | undefined;


        // Detect platform
        if (url.includes('shopee') || url.includes('shp.ee')) {
            platform = Platform.SHOPEE;
        } else if (url.includes('tiktok') || url.includes('vt.tiktok.com')) {
            platform = Platform.TIKTOK;
        } else {
            throw new BadRequestException('Unsupported platform. Only Shopee and TikTok links are supported.');
        }

        try {
            if (platform === Platform.SHOPEE) {
                // Generate Shopee affiliate link
                // Use user ID as subId1 to track orders
                shortLink = await this.shopeeService.generateAffiliateLink({
                    url,
                    subIds: [userId],
                });

                // Extract product info if possible
                const productInfo = this.shopeeService.extractProductInfo(url);
                if (productInfo?.itemId) {
                    productId = productInfo.itemId;

                    try {
                        // Fetch product details for rich display
                        const productOffer = await this.shopeeService.getProductOffer(
                            parseInt(productId),
                            productInfo.shopId ? parseInt(productInfo.shopId) : undefined
                        );

                        if (productOffer) {
                            productName = productOffer.productName;
                            productImage = productOffer.imageUrl;
                            price = productOffer.priceMin; // Use min price for estimation

                            // Calculate estimated cashback
                            // Formula: Price * Commission Rate * User Share (50%)
                            const commissionRate = productOffer.commissionRate || 0; // e.g. 0.05 for 5%
                            const userShare = 0.5; // Configurable, default 50%

                            // Shopee API returns commissionRate as string or number? usually decimal e.g. 0.1 for 10%
                            // Let's ensure it's treated correctly. 
                            // If API returns string, parseFloat.
                            const rate = typeof commissionRate === 'string' ? parseFloat(commissionRate) : commissionRate;

                            estimatedCashback = price * rate * userShare;
                        }
                    } catch (error) {
                        this.logger.warn(`Failed to fetch product offer: ${error.message}`);
                        // Continue without product info
                    }
                }

            } else if (platform === Platform.TIKTOK) {
                if (url.includes('vt.tiktok.com') || url.includes('vm.tiktok.com')) {
                    const resolvedUrl = await this.tiktokService.resolveShortUrl(url);
                    if (resolvedUrl) {
                        url = resolvedUrl;
                    }
                }

                // Generate TikTok affiliate link
                shortLink = await this.tiktokService.generateAffiliateLink({
                    url,
                    subIds: [userId],
                });

                // Extract product ID if possible
                const extractedId = this.tiktokService.extractProductId(url);
                if (extractedId) {
                    productId = extractedId;
                }

                // Always try to fetch product details (og_info works even without product ID)
                try {
                    const productDetails = await this.tiktokService.getProductDetails(
                        productId || '',
                        url
                    );

                    if (productDetails) {
                        productName = productDetails.productName;
                        productImage = productDetails.imageUrl;

                        const commRate = productDetails.commissionRate || 0.03;
                        const userShare = 0.5; // 50% for user

                        if (productDetails.priceMin > 0) {
                            price = productDetails.priceMin;
                            estimatedCashback = price * commRate * userShare;
                        }

                        // Always return commissionRate so frontend can show % cashback
                        commissionRate = commRate;
                    }
                } catch (error) {
                    this.logger.warn(`Failed to fetch TikTok product details: ${error.message}`);
                }
            }



            // Save conversion history
            await this.prisma.linkConversion.create({
                data: {
                    userId,
                    originalUrl: url,
                    affiliateUrl: shortLink,
                    platform,
                    productId: productId || null,
                },
            });

            return {
                originalUrl: url,
                shortLink,
                platform,
                productId,
                productName,
                productImage,
                price,
                estimatedCashback,
                commissionRate,
            };



        } catch (error: any) {
            this.logger.error(`Link conversion failed: ${error.message}`);
            throw new BadRequestException(`Failed to convert link: ${error.message}`);
        }
    }

    async getHistory(userId: string, limit = 20, offset = 0) {
        const conversions = await this.prisma.linkConversion.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });

        const total = await this.prisma.linkConversion.count({
            where: { userId },
        });

        return {
            data: conversions,
            meta: {
                total,
                limit,
                offset,
            },
        };
    }
}
