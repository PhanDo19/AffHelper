'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';

interface Order {
    id: string;
    platform: 'SHOPEE' | 'TIKTOK';
    externalOrderId: string;
    productName: string;
    productPrice: number;
    quantity: number;
    totalAmount: number;
    commissionRate: number;
    commissionAmount: number;
    cashbackAmount: number;
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
    purchasedAt: string;
    linkConversion?: {
        originalUrl: string;
        affiliateUrl: string;
    };
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    PENDING: { label: 'Chờ xử lý', variant: 'outline' },
    COMPLETED: { label: 'Hoàn thành', variant: 'default' },
    CANCELLED: { label: 'Đã hủy', variant: 'destructive' },
    REFUNDED: { label: 'Hoàn tiền', variant: 'secondary' },
};

export default function OrdersPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['orders'],
        queryFn: async () => {
            const { data } = await api.get<{ data: Order[]; meta: any }>('/orders?limit=50');
            return data;
        },
    });

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Đơn hàng</h2>
                <p className="text-muted-foreground">Danh sách đơn hàng từ link affiliate của bạn.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Tất cả đơn hàng</CardTitle>
                    <CardDescription>
                        Đơn hàng được đồng bộ tự động từ TikTok Shop mỗi 30 phút.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : !data?.data.length ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p className="text-lg font-medium mb-2">Chưa có đơn hàng nào</p>
                            <p className="text-sm">Khi có người mua qua link affiliate của bạn, đơn hàng sẽ xuất hiện ở đây.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[90px]">Platform</TableHead>
                                        <TableHead>Sản phẩm</TableHead>
                                        <TableHead className="text-right">Giá trị</TableHead>
                                        <TableHead className="text-right">Hoa hồng</TableHead>
                                        <TableHead className="text-right">Cashback</TableHead>
                                        <TableHead>Trạng thái</TableHead>
                                        <TableHead className="w-[140px]">Ngày mua</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.data.map((order) => {
                                        const statusInfo = statusConfig[order.status] || statusConfig.PENDING;
                                        return (
                                            <TableRow key={order.id}>
                                                <TableCell>
                                                    <Badge className="bg-gray-900 text-white hover:bg-gray-800">
                                                        {order.platform}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="max-w-[250px]">
                                                    <p className="font-medium text-sm line-clamp-1">{order.productName}</p>
                                                    <p className="text-xs text-muted-foreground">x{order.quantity}</p>
                                                </TableCell>
                                                <TableCell className="text-right text-sm">
                                                    {formatCurrency(order.totalAmount)}
                                                </TableCell>
                                                <TableCell className="text-right text-sm text-green-600 font-medium">
                                                    {formatCurrency(order.commissionAmount)}
                                                </TableCell>
                                                <TableCell className="text-right text-sm text-purple-600 font-medium">
                                                    {formatCurrency(order.cashbackAmount)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={statusInfo.variant}>
                                                        {statusInfo.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm whitespace-nowrap">
                                                    {format(new Date(order.purchasedAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
