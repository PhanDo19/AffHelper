import { IsNotEmpty, IsString, IsArray, IsOptional, IsNumber } from 'class-validator';

export class ShopeeGenerateLinkDto {
    @IsNotEmpty()
    @IsString()
    url: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    subIds?: string[];
}

export class ShopeeProductDto {
    itemId: number;
    productName: string;
    priceMin: number;
    priceMax: number;
    commissionRate: number;
    sellerCommissionRate: number;
    imageUrl: string;
    offerLink: string;
}

export class ShopeeConversionReportDto {
    conversionId: string;
    purchaseTime: number;
    totalCommission: number;
    utmContent: string;
    orders: {
        orderId: string;
        orderStatus: string;
        items: {
            itemId: number;
            itemName: string;
            itemPrice: number;
            qty: number;
            itemTotalCommission: number;
        }[];
    }[];
}
