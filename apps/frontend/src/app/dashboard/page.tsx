'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Link2, ShoppingCart, TrendingUp, Wallet, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { ConvertLinkForm } from '@/components/forms/convert-link-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

interface LinkHistory {
    id: string;
    originalUrl: string;
    affiliateUrl: string;
    platform: 'SHOPEE' | 'TIKTOK';
    createdAt: string;
    clickCount: number;
}

interface DashboardStats {
    totalLinks: number;
    totalOrders: number;
    totalCommission: number;
    totalCashback: number;
    pendingOrders: number;
    completedOrders: number;
}

function truncateUrl(url: string, max = 40): string {
    if (url.length <= max) return url;
    return url.substring(0, 30) + '...' + url.substring(url.length - 8);
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

const statCards = [
    {
        key: 'totalLinks',
        title: 'Tổng Link',
        icon: Link2,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        format: (v: number) => v.toLocaleString(),
    },
    {
        key: 'totalOrders',
        title: 'Tổng Đơn hàng',
        icon: ShoppingCart,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        format: (v: number) => v.toLocaleString(),
    },
    {
        key: 'totalCommission',
        title: 'Tổng Hoa hồng',
        icon: TrendingUp,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        format: (v: number) => formatCurrency(v),
    },
    {
        key: 'totalCashback',
        title: 'Cashback nhận được',
        icon: Wallet,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        format: (v: number) => formatCurrency(v),
    },
];

export default function DashboardPage() {
    const queryClient = useQueryClient();

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const { data } = await api.get<DashboardStats>('/orders/stats');
            return data;
        },
    });

    const { data: historyData, isLoading: historyLoading } = useQuery({
        queryKey: ['links-history'],
        queryFn: async () => {
            const { data } = await api.get<{ data: LinkHistory[]; meta: any }>('/links/history?limit=5');
            return data;
        },
    });

    const handleConvertSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['links-history'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground">Chào mừng trở lại! Bắt đầu kiếm tiền ngay hôm nay.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => {
                    const Icon = stat.icon;
                    const value = stats ? (stats as any)[stat.key] : 0;
                    return (
                        <Card key={stat.key}>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                                        {statsLoading ? (
                                            <Skeleton className="h-8 w-24 mt-1" />
                                        ) : (
                                            <p className="text-2xl font-bold mt-1">{stat.format(value)}</p>
                                        )}
                                    </div>
                                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                                        <Icon className={`h-5 w-5 ${stat.color}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Convert Link Form */}
            <ConvertLinkForm onSuccess={handleConvertSuccess} />

            {/* Recent History */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Lịch sử chuyển đổi</CardTitle>
                        <CardDescription>Link affiliate bạn đã tạo gần đây.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {historyLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : historyData?.data.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">
                            Chưa có lịch sử. Hãy thử tạo link đầu tiên!
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[90px]">Platform</TableHead>
                                        <TableHead>Link gốc</TableHead>
                                        <TableHead>Link Affiliate</TableHead>
                                        <TableHead className="w-[140px]">Thời gian</TableHead>
                                        <TableHead className="text-right w-[80px]">Click</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {historyData?.data.map((link) => (
                                        <TableRow key={link.id}>
                                            <TableCell>
                                                <Badge variant={link.platform === 'SHOPEE' ? 'default' : 'secondary'}
                                                    className={link.platform === 'SHOPEE'
                                                        ? 'bg-orange-500 hover:bg-orange-600'
                                                        : 'bg-gray-900 text-white hover:bg-gray-800'}>
                                                    {link.platform}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-[200px]" title={link.originalUrl}>
                                                <span className="text-muted-foreground text-sm break-all line-clamp-1">
                                                    {truncateUrl(link.originalUrl)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="max-w-[200px]" title={link.affiliateUrl}>
                                                <span className="font-medium text-primary text-sm break-all line-clamp-1">
                                                    {truncateUrl(link.affiliateUrl)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-sm whitespace-nowrap">
                                                {format(new Date(link.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                                            </TableCell>
                                            <TableCell className="text-right">{link.clickCount}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
