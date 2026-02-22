import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class TikTokGenerateLinkDto {
    @IsNotEmpty()
    @IsString()
    url: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    subIds?: string[];
}

export class TikTokProductDto {
    productId: string;
    productName: string;
    priceMin: number;
    priceMax: number;
    commissionRate: number;
    imageUrl: string;
    offerLink?: string;
}


export class TikTokOrderDto {
    orderId: string;
    orderStatus: string;
    productName: string;
    skuId: string;
    quantity: number;
    price: number;
    commissionAmount: number;
    paidTime: number;
}
