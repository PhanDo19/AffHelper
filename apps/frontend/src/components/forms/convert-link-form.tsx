'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Copy, Link as LinkIcon, Loader2, Check, ExternalLink, ShoppingCart } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import api from '@/lib/api';

const formSchema = z.object({
    url: z.string().url('Vui lòng nhập đường dẫn hợp lệ').refine(
        (url) => url.includes('shopee') || url.includes('shp.ee') || url.includes('tiktok'),
        'Chỉ hỗ trợ link Shopee hoặc TikTok Shop'
    ),
});

interface ConvertResult {
    originalUrl: string;
    shortLink: string;
    platform: 'SHOPEE' | 'TIKTOK';
    productId?: string;
    productName?: string;
    productImage?: string;
    price?: number;
    currency?: string;
    estimatedCashback?: number;
    commissionRate?: number;
}


function truncateUrl(url: string, maxLength = 60): string {
    if (url.length <= maxLength) return url;
    const start = url.substring(0, 35);
    const end = url.substring(url.length - 20);
    return `${start}...${end}`;
}

interface ConvertLinkFormProps {
    onSuccess?: () => void;
}

export function ConvertLinkForm({ onSuccess }: ConvertLinkFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ConvertResult | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            url: '',
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        setResult(null);
        setIsCopied(false);

        try {
            const { data } = await api.post<ConvertResult>('/links/convert', values);
            setResult(data);
            toast.success('Tạo link thành công!');
            form.reset();
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo link');
        } finally {
            setIsLoading(false);
        }
    }

    const copyToClipboard = () => {
        if (result?.shortLink) {
            navigator.clipboard.writeText(result.shortLink);
            setIsCopied(true);
            toast.success('Đã sao chép link!');
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Tạo Link Affiliate</CardTitle>
                    <CardDescription>
                        Dán link sản phẩm từ Shopee hoặc TikTok Shop để tạo link tiếp thị của bạn.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-4">
                            <FormField
                                control={form.control}
                                name="url"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                            <Input placeholder="https://shopee.vn/product/..." {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isLoading} className="sm:w-32 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <LinkIcon className="mr-2 h-4 w-4" />
                                )}
                                Tạo Link
                            </Button>
                        </form>
                    </Form>

                    {result && (
                        <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-top-4">
                            {/* Rich Product Info */}
                            {(result.productName || result.productImage) && (
                                <Card className="overflow-hidden border-orange-100 bg-orange-50/30">
                                    <div className="flex flex-col md:flex-row gap-6 p-6">
                                        {/* Product Image */}
                                        {result.productImage && (
                                            <div className="w-full md:w-48 shrink-0">
                                                <div className="aspect-square relative rounded-lg overflow-hidden border bg-white">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={result.productImage}
                                                        alt={result.productName || 'Product'}
                                                        className="object-cover w-full h-full"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Product Details */}
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <h3 className="font-semibold text-lg line-clamp-2 mb-2">
                                                    {result.productName}
                                                </h3>
                                                {result.price != null && result.price > 0 && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-muted-foreground">Giá bán:</span>
                                                        <span className="text-xl font-bold text-orange-600">
                                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(result.price)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Cashback display - always show when we have info */}
                                            {result.estimatedCashback != null && result.estimatedCashback > 0 ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-muted-foreground">Hoàn tiền đến:</span>
                                                    <span className="text-xl font-bold text-green-600 bg-green-50 px-3 py-1 rounded-md border border-green-200">
                                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(result.estimatedCashback)}
                                                    </span>
                                                </div>
                                            ) : result.commissionRate != null && result.commissionRate > 0 ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-muted-foreground">Hoàn tiền đến:</span>
                                                    <span className="text-xl font-bold text-green-600 bg-green-50 px-3 py-1 rounded-md border border-green-200">
                                                        {(result.commissionRate * 50).toFixed(1)}% giá trị đơn hàng
                                                    </span>
                                                </div>
                                            ) : null}

                                            <div className="flex gap-3 pt-2">
                                                <Button
                                                    size="lg"
                                                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                                                    asChild
                                                >
                                                    <a
                                                        href={result.platform === 'TIKTOK'
                                                            ? 'https://www.tiktok.com/@xuongcs'
                                                            : result.shortLink
                                                        }
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <ShoppingCart className="mr-2 h-5 w-5" />
                                                        Mua ngay
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Instruction text */}
                                    {result.platform === 'TIKTOK' && (
                                        <div className="px-6 pb-4 space-y-2">
                                            <p className="text-sm text-blue-600 text-center">
                                                Bấm &quot;Mua ngay&quot; để mở kênh TikTok. Rồi vào mục &quot;Phần trưng bày&quot; và tìm mua sản phẩm ở mục &quot;Đề xuất&quot; hoặc &quot;Lựa chọn của nhà sáng tạo&quot; là được hoàn tiền.
                                            </p>
                                            <p className="text-xs text-orange-500 text-center">
                                                *Lưu ý: Số tiền hoàn thực tế phụ thuộc vào giá trị đơn hàng.
                                            </p>
                                        </div>
                                    )}
                                    {result.platform === 'SHOPEE' && (
                                        <div className="px-6 pb-4">
                                            <p className="text-xs text-orange-500 text-center">
                                                *Số tiền hoàn thực tế phụ thuộc vào giá trị đơn hàng cuối cùng.
                                            </p>
                                        </div>
                                    )}
                                </Card>
                            )}

                            {/* Simple Link Box (Fallback or Secondary) */}
                            <div className="p-4 rounded-lg bg-muted/50 border">
                                <p className="text-sm text-muted-foreground mb-2">Link Affiliate rút gọn:</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 min-w-0 p-3 bg-background rounded-md border">
                                        <p className="font-medium text-primary text-sm break-all line-clamp-2" title={result.shortLink}>
                                            {truncateUrl(result.shortLink)}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-1 shrink-0">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={copyToClipboard}
                                            className={isCopied ? "text-green-600 border-green-600" : ""}
                                            title="Sao chép"
                                        >
                                            {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </CardContent>
            </Card>
        </div>
    );
}
