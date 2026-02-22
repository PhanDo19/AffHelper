import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class ConvertLinkDto {
    @IsNotEmpty()
    @IsString()
    @IsUrl()
    url: string;
}

export class LinkResponseDto {
    originalUrl: string;
    shortLink: string;
    platform: 'SHOPEE' | 'TIKTOK';
    productId?: string;
    productName?: string;
    productImage?: string;
    price?: number;
    currency?: string;
    estimatedCashback?: number;
    commissionRate?: number; // Commission percentage (e.g., 0.03 = 3%)
}

