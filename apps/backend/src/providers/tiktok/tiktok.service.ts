import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { TikTokGenerateLinkDto, TikTokProductDto } from './dto';

interface TikTokProductResponse {
    products: Array<{
        product_id: string;
        title: string;
        image_url: string; // or cover_image? details needed
        min_price: {
            price: string;
            currency: string;
        };
        commission_rate: string; // e.g. "10" for 10%
    }>;
}


@Injectable()
export class TikTokService {
    private readonly logger = new Logger(TikTokService.name);
    private readonly appKey: string;
    private readonly appSecret: string;
    private accessToken: string;
    private refreshToken: string;
    private shopCipher: string;
    private readonly apiUrl = 'https://open-api.tiktokglobalshop.com';
    private readonly authUrl = 'https://auth.tiktok-shops.com';

    constructor(private configService: ConfigService) {
        this.appKey = this.configService.get<string>('TIKTOK_APP_KEY') || '';
        this.appSecret = this.configService.get<string>('TIKTOK_APP_SECRET') || '';
        this.accessToken = this.configService.get<string>('TIKTOK_ACCESS_TOKEN') || '';
        this.refreshToken = this.configService.get<string>('TIKTOK_REFRESH_TOKEN') || '';
        this.shopCipher = this.configService.get<string>('TIKTOK_SHOP_CIPHER') || '';

        if (!this.appKey || !this.appSecret) {
            this.logger.warn('TikTok App Key or Secret is missing');
        }

        // Auto-refresh token and discover shop_cipher on startup
        if (this.refreshToken) {
            this.initializeTokens().catch((e) => this.logger.warn(`Init failed: ${e.message}`));
        }
    }

    /**
     * Initialize: refresh token then auto-discover shop_cipher if needed.
     */
    private async initializeTokens(): Promise<void> {
        await this.refreshAccessToken();

        // Auto-discover shop_cipher if not configured or placeholder
        if (!this.shopCipher || this.shopCipher === 'your_shop_cipher') {
            await this.discoverShopCipher();
        }
    }

    /**
     * Refresh the TikTok access token using the refresh token.
     */
    async refreshAccessToken(): Promise<boolean> {
        try {
            const url = `${this.authUrl}/api/v2/token/refresh`;
            const response = await axios.get(url, {
                params: {
                    app_key: this.appKey,
                    app_secret: this.appSecret,
                    refresh_token: this.refreshToken,
                    grant_type: 'refresh_token',
                },
                timeout: 10000,
            });

            const data = response.data;
            if (data?.code === 0 && data?.data?.access_token) {
                this.accessToken = data.data.access_token;
                this.refreshToken = data.data.refresh_token || this.refreshToken;
                this.logger.log(`TikTok token refreshed successfully`);
                return true;
            } else {
                this.logger.warn(`Token refresh failed: code=${data?.code}, message=${data?.message}`);
                return false;
            }
        } catch (error: any) {
            this.logger.warn(`Token refresh request failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Get the TikTok OAuth authorization URL for creator authorization.
     */
    getAuthUrl(): string {
        return `${this.authUrl}/oauth/authorize?app_key=${this.appKey}&state=affhelper&response_type=code&user_type=1`;
    }

    /**
     * Exchange authorization code for access token (creator token).
     */
    async getAccessTokenFromCode(code: string): Promise<any> {
        try {
            const url = `${this.authUrl}/api/v2/token/get`;
            const response = await axios.get(url, {
                params: {
                    app_key: this.appKey,
                    app_secret: this.appSecret,
                    auth_code: code,
                    grant_type: 'authorized_code',
                },
                timeout: 10000,
            });

            const data = response.data;
            this.logger.log(`Token exchange response: ${JSON.stringify(data).substring(0, 500)}`);

            if (data?.code === 0 && data?.data?.access_token) {
                this.accessToken = data.data.access_token;
                this.refreshToken = data.data.refresh_token || this.refreshToken;

                this.logger.log(`Creator token obtained! Expires in: ${data.data.access_token_expire_in}s`);
                this.logger.log(`NEW ACCESS_TOKEN: ${data.data.access_token}`);
                this.logger.log(`NEW REFRESH_TOKEN: ${data.data.refresh_token}`);

                await this.discoverShopCipher();

                return {
                    success: true,
                    accessToken: data.data.access_token,
                    refreshToken: data.data.refresh_token,
                    expiresIn: data.data.access_token_expire_in,
                    message: 'Cap nhat cac gia tri nay vao .env file!',
                };
            } else {
                return { success: false, error: data?.message, code: data?.code };
            }
        } catch (error: any) {
            this.logger.error(`Token exchange failed: ${error.message}`);
            return { success: false, error: error.response?.data || error.message };
        }
    }

    /**
     * Discover shop_cipher from authorized shops API.
     * GET /authorization/202309/shops
     */
    private async discoverShopCipher(): Promise<void> {
        try {
            const path = '/authorization/202309/shops';
            const params = this.getCommonParams(false); // Don't include shop_cipher for this call
            const sign = this.generateSignature(path, params);
            params.sign = sign;
            params.access_token = this.accessToken;

            const queryString = Object.entries(params)
                .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                .join('&');

            const requestUrl = `${this.apiUrl}${path}?${queryString}`;

            const response = await axios.get(requestUrl, {
                headers: {
                    'x-tts-access-token': this.accessToken,
                },
                timeout: 10000,
            });

            this.logger.log(`Authorized Shops response: ${JSON.stringify(response.data).substring(0, 500)}`);

            if (response.data?.code === 0 && response.data?.data?.shops?.length > 0) {
                this.shopCipher = response.data.data.shops[0].cipher;
                this.logger.log(`Discovered shop_cipher: ${this.shopCipher}`);
            } else {
                this.logger.warn(`No authorized shops found: code=${response.data?.code}, message=${response.data?.message}`);
            }
        } catch (error: any) {
            this.logger.warn(`Failed to discover shop_cipher: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
        }
    }

    /**
     * Generate HMAC-SHA256 signature for TikTok Shop Open API.
     * For GET: HMAC(app_secret, app_secret + path + sorted_params + app_secret)
     * For POST: HMAC(app_secret, app_secret + path + sorted_params + body_string + app_secret)
     */
    private generateSignature(path: string, params: Record<string, string>, body?: any): string {
        // Exclude 'sign' and 'access_token' from signature computation
        const filteredParams = Object.entries(params)
            .filter(([key]) => key !== 'sign' && key !== 'access_token')
            .sort(([a], [b]) => a.localeCompare(b));

        let baseString = this.appSecret + path;
        for (const [key, value] of filteredParams) {
            baseString += key + value;
        }

        // Include body for POST requests
        if (body) {
            baseString += JSON.stringify(body);
        }

        baseString += this.appSecret;

        return crypto.createHmac('sha256', this.appSecret).update(baseString).digest('hex');
    }

    /**
     * Build common query params required by all TikTok Shop API calls.
     */
    private getCommonParams(includeShopCipher = true): Record<string, string> {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const params: Record<string, string> = {
            app_key: this.appKey,
            timestamp,
        };
        if (includeShopCipher && this.shopCipher && this.shopCipher !== 'your_shop_cipher') {
            params.shop_cipher = this.shopCipher;
        }
        return params;
    }

    /**
     * Resolve short URL (vt.tiktok.com / vm.tiktok.com) to actual product URL.
     */
    async resolveShortUrl(url: string): Promise<string> {
        try {
            const response = await axios.get(url, {
                maxRedirects: 10,
                timeout: 10000,
                validateStatus: () => true,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });

            const finalUrl =
                response.request?.res?.responseUrl ||
                response.request?._redirectable?._currentUrl ||
                url;

            this.logger.log(`Resolved: ${url} -> ${finalUrl}`);
            return finalUrl;
        } catch (error: any) {
            this.logger.warn(`Failed to resolve short URL: ${error.message}`);
            return url;
        }
    }

    /**
     * Generate affiliate link using TikTok Shop Creator API.
     * Endpoint: POST /affiliate_creator/{version}/affiliate_sharing_links/general_publishers/generate_batch
     */
    async generateAffiliateLink(dto: TikTokGenerateLinkDto): Promise<string> {
        this.logger.log(`Generating TikTok affiliate link for: ${dto.url}`);

        let url = dto.url;


        // Try to extract product ID
        const productId = this.extractProductId(url);

        // If we have API credentials and product ID, use the real API
        if (this.accessToken && productId) {
            try {
                return await this.callGenerateLinkApi(productId, dto.subIds);
            } catch (error: any) {
                this.logger.warn(`TikTok API call failed: ${error.message}, using fallback`);
            }
        }

        // Fallback: construct a trackable affiliate-style link
        // This works as a basic redirect with tracking params
        if (productId) {
            return this.buildFallbackLink(url, productId, dto.subIds);
        }

        // Last resort: return resolved URL with tracking params only
        return this.buildFallbackLink(url, null, dto.subIds);
    }

    /**
     * Call the actual TikTok Shop API to generate affiliate link.
     */
    private async callGenerateLinkApi(productId: string, subIds?: string[]): Promise<string> {
        const apiVersion = '202405';
        const path = `/affiliate_creator/${apiVersion}/affiliate_sharing_links/general_publishers/generate_batch`;

        const body = {
            material: {
                ids: [productId],
                type: 'PRODUCT',
            },
        };

        const params = this.getCommonParams();
        const sign = this.generateSignature(path, params, body);
        params.sign = sign;
        params.access_token = this.accessToken;

        const queryString = Object.entries(params)
            .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
            .join('&');

        const requestUrl = `${this.apiUrl}${path}?${queryString}`;

        const response = await axios.post(requestUrl, body, {
            headers: {
                'Content-Type': 'application/json',
                'x-tts-access-token': this.accessToken,
            },
            timeout: 15000,
        });

        this.logger.log(`TikTok Generate Link response: ${JSON.stringify(response.data).substring(0, 300)}`);

        if (response.data?.data?.links && response.data.data.links.length > 0) {
            return response.data.data.links[0].url;
        }

        throw new Error('No link returned from TikTok API');
    }

    /**
     * Build a fallback affiliate-style link when API is not available.
     * Keeps the resolved URL clean and short.
     */
    private buildFallbackLink(resolvedUrl: string, productId: string | null, subIds?: string[]): string {
        try {
            const urlObj = new URL(resolvedUrl);

            // Add affiliate tracking params
            if (this.appKey) {
                urlObj.searchParams.set('affiliate_id', this.appKey);
            }
            if (subIds?.[0]) {
                urlObj.searchParams.set('sub1', subIds[0]);
            }

            // Clean up unnecessary params to shorten the URL
            // Remove checksum and encode_params which make URLs very long
            urlObj.searchParams.delete('_svg');
            urlObj.searchParams.delete('checksum');
            urlObj.searchParams.delete('encode_params');
            urlObj.searchParams.delete('_r');
            urlObj.searchParams.delete('sec_uid');

            return urlObj.toString();
        } catch {
            // If URL parsing fails, just append params
            const separator = resolvedUrl.includes('?') ? '&' : '?';
            const trackingParams = [
                this.appKey ? `affiliate_id=${this.appKey}` : '',
                subIds?.[0] ? `sub1=${subIds[0]}` : '',
            ].filter(Boolean).join('&');

            return `${resolvedUrl}${separator}${trackingParams}`;
        }
    }

    /**
     * Extract product ID from TikTok product URL.
     */
    extractProductId(url: string): string | null {
        const patterns = [
            /\/product\/(\d+)/,
            /\/view\/product\/(\d+)/,
            /@[^/]+\/product\/(\d+)/,
            /product_id=(\d+)/,
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return null;
    }
    /**
     * Fetch product details from TikTok.
     * Strategy:
     * 1. Extract title/image from og_info in URL (instant, reliable)
     * 2. Try API calls to enrich with price data (may need token refresh)
     * 3. If API fails with 401, auto-refresh token and retry once
     */
    async getProductDetails(productId: string, resolvedUrl?: string): Promise<TikTokProductDto | null> {
        // Step 1: Get base info from og_info (instant, no API call needed)
        let baseResult: TikTokProductDto | null = null;
        if (resolvedUrl) {
            baseResult = this.extractOgInfoFromUrl(resolvedUrl, productId);
        }

        // Step 2: Try API for price data (with auto-retry on 401)
        if (productId) {
            const apiResult = await this.fetchPriceFromApi(productId, baseResult?.productName);

            if (apiResult) {
                // If we got API data, merge with og_info
                if (baseResult) {
                    return {
                        ...baseResult,
                        priceMin: apiResult.priceMin || baseResult.priceMin,
                        priceMax: apiResult.priceMax || baseResult.priceMax,
                        commissionRate: apiResult.commissionRate || baseResult.commissionRate,
                        offerLink: apiResult.offerLink || baseResult.offerLink,
                        // Prefer API name/image if available, else keep og_info
                        productName: apiResult.productName || baseResult.productName,
                        imageUrl: apiResult.imageUrl || baseResult.imageUrl,
                    };
                }
                return apiResult;
            }
        }

        // Return og_info result (even without price) or null
        return baseResult;
    }

    /**
     * Try to get price data via Showcase: add product to showcase, then query price.
     * Automatically retries with token refresh on failure.
     */
    private async fetchPriceFromApi(productId: string, _productName?: string, retried = false): Promise<TikTokProductDto | null> {
        // Step 1: Add product to showcase (idempotent - safe to call multiple times)
        const added = await this.addProductToShowcase(productId);

        if (added) {
            // Step 2: Get price from showcase product list
            const showcaseResult = await this.getShowcaseProductPrice(productId);
            if (showcaseResult) return showcaseResult;
        }

        // If we haven't retried yet and we have a refresh token, refresh and retry
        if (!retried && this.refreshToken) {
            this.logger.log('Showcase API calls failed, attempting token refresh...');
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
                return this.fetchPriceFromApi(productId, _productName, true);
            }
        }

        return null;
    }

    /**
     * Strategy 0: Extract product info from og_info query parameter in resolved URL.
     * TikTok embeds og metadata (title, image) in the share link's URL params.
     * Example: og_info={"title":"Product Name","image":"https://..."}
     */
    private extractOgInfoFromUrl(resolvedUrl: string, productId: string): TikTokProductDto | null {
        try {
            const urlObj = new URL(resolvedUrl);
            const ogInfoRaw = urlObj.searchParams.get('og_info');

            if (!ogInfoRaw) {
                this.logger.log('No og_info found in resolved URL');
                return null;
            }

            const ogInfo = JSON.parse(ogInfoRaw);
            const title = ogInfo.title || ogInfo.name || '';
            const image = ogInfo.image || ogInfo.cover || '';

            if (!title && !image) return null;

            this.logger.log(`Extracted og_info: title="${title?.substring(0, 50)}...", hasImage=${!!image}`);

            return {
                productId,
                productName: title,
                imageUrl: image,
                priceMin: 0,  // Price not available in og_info
                priceMax: 0,
                commissionRate: 0.03, // Default 3% estimate
                offerLink: '',
            };
        } catch (error: any) {
            this.logger.warn(`Failed to extract og_info: ${error.message}`);
            return null;
        }
    }

    /**
     * Add a product to the creator's Showcase.
     * POST /affiliate_creator/202405/showcases/products/add
     * This endpoint does NOT need shop_cipher.
     */
    async addProductToShowcase(productId: string): Promise<boolean> {
        if (!this.accessToken || !productId) return false;

        const apiVersion = '202405';
        const path = `/affiliate_creator/${apiVersion}/showcases/products/add`;

        const body = {
            product_ids: [productId],
            add_type: 'PRODUCT_ID',
        };

        // No shop_cipher needed for affiliate creator endpoints
        const params = this.getCommonParams(false);
        const sign = this.generateSignature(path, params, body);
        params.sign = sign;
        params.access_token = this.accessToken;

        const queryString = Object.entries(params)
            .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
            .join('&');

        const requestUrl = `${this.apiUrl}${path}?${queryString}`;

        try {
            const response = await axios.post(requestUrl, body, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-tts-access-token': this.accessToken,
                },
                timeout: 10000,
            });

            this.logger.log(`Add to Showcase response: ${JSON.stringify(response.data).substring(0, 500)}`);

            if (response.data?.code === 0) {
                this.logger.log(`Product ${productId} added to Showcase successfully`);
                return true;
            } else {
                this.logger.warn(`Add to Showcase failed: code=${response.data?.code}, message=${response.data?.message}`);
                return false;
            }
        } catch (error: any) {
            const errData = error.response?.data ? JSON.stringify(error.response.data).substring(0, 300) : error.message;
            this.logger.warn(`Add to Showcase API failed: ${error.response?.status} - ${errData}`);
            return false;
        }
    }

    /**
     * Get product price from the creator's Showcase.
     * GET /affiliate_creator/202405/showcases/products?origin=SHOWCASE&page_size=20
     * Response includes price.original_price.minimum_amount
     */
    async getShowcaseProductPrice(productId: string): Promise<TikTokProductDto | null> {
        if (!this.accessToken || !productId) return null;

        const apiVersion = '202405';
        const path = `/affiliate_creator/${apiVersion}/showcases/products`;

        // No shop_cipher needed
        const params = this.getCommonParams(false);
        params.origin = 'SHOWCASE';
        params.page_size = '20';
        const sign = this.generateSignature(path, params);
        params.sign = sign;
        params.access_token = this.accessToken;

        const queryString = Object.entries(params)
            .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
            .join('&');

        const requestUrl = `${this.apiUrl}${path}?${queryString}`;

        try {
            const response = await axios.get(requestUrl, {
                headers: {
                    'x-tts-access-token': this.accessToken,
                },
                timeout: 10000,
            });

            this.logger.log(`Showcase Products response: ${JSON.stringify(response.data).substring(0, 500)}`);

            if (response.data?.code === 0 && response.data?.data?.products?.length > 0) {
                const products = response.data.data.products;

                // Find the specific product by ID
                const product = products.find((p: any) => p.id === productId || p.product_id === productId);

                if (product) {
                    const price = product.price?.original_price?.minimum_amount
                        || product.price?.sale_price?.minimum_amount
                        || product.price?.min_amount
                        || '0';
                    const commRate = product.commission_rate
                        ? parseFloat(product.commission_rate) / 100
                        : 0.03;

                    this.logger.log(`Found product in Showcase: price=${price}, commission=${commRate}`);

                    return {
                        productId: product.id || productId,
                        productName: product.title || '',
                        imageUrl: product.images?.[0]?.url || '',
                        priceMin: this.extractPrice(price),
                        priceMax: 0,
                        commissionRate: commRate,
                        offerLink: '',
                    };
                } else {
                    this.logger.log(`Product ${productId} not found in Showcase list (${products.length} products returned)`);
                }
            }
        } catch (error: any) {
            const errData = error.response?.data ? JSON.stringify(error.response.data).substring(0, 300) : error.message;
            this.logger.warn(`Get Showcase Products failed: ${error.response?.status} - ${errData}`);
        }

        return null;
    }

    /**
     * Extract content from HTML meta tag
     */
    private extractMetaTag(html: string, property: string): string | null {
        // Match both property="..." and name="..." attributes
        const patterns = [
            new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
            new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match) return match[1];
        }
        return null;
    }

    /**
     * Extract content from HTML tag like <title>...</title>
     */
    private extractTagContent(html: string, tag: string): string | null {
        const pattern = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i');
        const match = html.match(pattern);
        return match ? match[1].trim() : null;
    }

    /**
     * Safely extract price from various formats
     */
    private extractPrice(value: any): number {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const parsed = parseFloat(value.replace(/,/g, ''));
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    }
}
