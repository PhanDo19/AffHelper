import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { ShopeeGenerateLinkDto, ShopeeProductDto, ShopeeConversionReportDto } from './dto';

@Injectable()
export class ShopeeService {
  private readonly logger = new Logger(ShopeeService.name);
  private readonly appId: string;
  private readonly secretKey: string;
  private readonly apiUrl = 'https://open-api.affiliate.shopee.vn/graphql';

  constructor(private configService: ConfigService) {
    this.appId = this.configService.get<string>('SHOPEE_APP_ID') || '';
    this.secretKey = this.configService.get<string>('SHOPEE_SECRET_KEY') || '';

    if (!this.appId || !this.secretKey) {
      this.logger.warn('Shopee App ID or Secret Key is missing');
    }
  }

  private generateSignature(timestamp: number): string {
    const payload = `${this.appId}${timestamp}`;
    return crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');
  }

  private getHeaders() {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateSignature(timestamp);

    return {
      'Content-Type': 'application/json',
      Authorization: `SHA256 Credential=${this.appId}, Signature=${signature}, Timestamp=${timestamp}`,
    };
  }

  async generateAffiliateLink(dto: ShopeeGenerateLinkDto): Promise<string> {
    const query = `
      mutation {
        generateShortLink(input: {
          originUrl: "${dto.url}",
          subIds: ${JSON.stringify(dto.subIds || [])}
        }) {
          shortLink
        }
      }
    `;

    try {
      const response = await axios.post(
        this.apiUrl,
        { query },
        { headers: this.getHeaders() }
      );

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      return response.data.data.generateShortLink.shortLink;
    } catch (error: any) {
      this.logger.error(`Failed to generate link: ${error.message}`);
      throw error;
    }
  }

  async getProductOffer(itemId: number, shopId?: number): Promise<ShopeeProductDto | null> {
    const query = `
      query {
        productOfferV2(itemId: ${itemId}, shopId: ${shopId || 0}, limit: 1) {
          nodes {
            itemId
            productName
            priceMin
            priceMax
            commissionRate
            sellerCommissionRate
            imageUrl
            offerLink
          }
        }
      }
    `;

    try {
      const response = await axios.post(
        this.apiUrl,
        { query },
        { headers: this.getHeaders() }
      );

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      const nodes = response.data.data.productOfferV2.nodes;
      return nodes.length > 0 ? nodes[0] : null;

    } catch (error: any) {
      this.logger.error(`Failed to get product offer: ${error.message}`);
      return null;
    }
  }

  async getConversionReport(startTime: number, endTime: number, limit = 500): Promise<ShopeeConversionReportDto[]> {
    const query = `
      query {
        conversionReport(
          purchaseTimeStart: ${startTime},
          purchaseTimeEnd: ${endTime},
          limit: ${limit}
        ) {
          nodes {
            conversionId
            purchaseTime
            totalCommission
            utmContent
            orders {
              orderId
              orderStatus
              items {
                itemId
                itemName
                itemPrice
                qty
                itemTotalCommission
              }
            }
          }
          pageInfo {
            hasNextPage
            scrollId
          }
        }
      }
    `;

    try {
      const response = await axios.post(
        this.apiUrl,
        { query },
        { headers: this.getHeaders() }
      );

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      return response.data.data.conversionReport.nodes;

    } catch (error: any) {
      this.logger.error(`Failed to get conversion report: ${error.message}`);
      throw error;
    }
  }

  extractProductInfo(url: string): { itemId?: string; shopId?: string } | null {
    // Patterns to match Shopee URLs
    // 1. https://shopee.vn/product/shopId/itemId
    // 2. https://shopee.vn/name-i.shopId.itemId
    const patterns = [
      /shopee\.vn\/.*-i\.(\d+)\.(\d+)/,
      /shopee\.vn\/product\/(\d+)\/(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        // Pattern 1: shopId is match[1], itemId is match[2]
        return { shopId: match[1], itemId: match[2] };
      }
    }

    // Query params check
    try {
      const urlObj = new URL(url);
      const shopId = urlObj.searchParams.get('shopid') || urlObj.searchParams.get('shop');
      const itemId = urlObj.searchParams.get('itemid') || urlObj.searchParams.get('item');

      if (shopId && itemId) {
        return { shopId, itemId };
      }
    } catch {
      // Ignore invalid URL errors
    }

    return null;
  }
}
