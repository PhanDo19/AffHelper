'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    Users, ShoppingCart, TrendingUp, Wallet, Clock,
    CheckCircle2, XCircle, Ban, UserCheck, Shield
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';

interface SystemStats {
    totalUsers: number;
    totalLinks: number;
    totalOrders: number;
    totalRevenue: number;
    totalCommission: number;
    totalCashback: number;
    pendingWithdrawals: number;
    totalWithdrawn: number;
}

interface AdminUser {
    id: string;
    email: string;
    fullName: string | null;
    role: string;
    isActive: boolean;
    availableBalance: number;
    pendingBalance: number;
    createdAt: string;
    _count: { linkConversions: number; orders: number; withdrawals: number };
}

interface AdminWithdrawal {
    id: string;
    amount: number;
    bankAccount: string;
    bankName: string;
    accountHolder: string;
    status: string;
    processedAt: string | null;
    rejectReason: string | null;
    createdAt: string;
    user: { email: string; fullName: string | null };
}

function formatCurrency(n: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

export default function AdminPage() {
    const qc = useQueryClient();

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => (await api.get<SystemStats>('/admin/stats')).data,
    });

    const { data: usersData, isLoading: usersLoading } = useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => (await api.get<{ data: AdminUser[] }>('/admin/users?limit=50')).data,
    });

    const { data: withdrawalsData, isLoading: wdLoading } = useQuery({
        queryKey: ['admin-withdrawals'],
        queryFn: async () => (await api.get<{ data: AdminWithdrawal[] }>('/admin/withdrawals?limit=50')).data,
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/admin/withdrawals/${id}/approve`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-withdrawals'] });
            qc.invalidateQueries({ queryKey: ['admin-stats'] });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/admin/withdrawals/${id}/reject`, { reason: 'Không đủ điều kiện' }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-withdrawals'] });
            qc.invalidateQueries({ queryKey: ['admin-stats'] });
        },
    });

    const toggleActiveMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/admin/users/${id}/toggle-active`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    });

    const statCards = [
        { title: 'Tổng Users', value: stats?.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { title: 'Tổng Đơn hàng', value: stats?.totalOrders, icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50' },
        { title: 'Tổng Hoa hồng', value: stats?.totalCommission, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50', isCurrency: true },
        { title: 'Chờ duyệt rút', value: stats?.pendingWithdrawals, icon: Clock, color: 'text-red-600', bg: 'bg-red-50' },
    ];

    const wdStatusMap: Record<string, { label: string; color: string }> = {
        PENDING: { label: 'Chờ duyệt', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
        COMPLETED: { label: 'Đã duyệt', color: 'text-green-700 bg-green-50 border-green-200' },
        REJECTED: { label: 'Từ chối', color: 'text-red-700 bg-red-50 border-red-200' },
        PROCESSING: { label: 'Đang xử lý', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-orange-500" />
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Admin Panel</h2>
                    <p className="text-muted-foreground">Quản lý hệ thống AffCash.</p>
                </div>
            </div>

            {/* System Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((s) => {
                    const Icon = s.icon;
                    return (
                        <Card key={s.title}>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">{s.title}</p>
                                        {statsLoading ? (
                                            <Skeleton className="h-8 w-24 mt-1" />
                                        ) : (
                                            <p className="text-2xl font-bold mt-1">
                                                {s.isCurrency ? formatCurrency(s.value || 0) : (s.value || 0).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                    <div className={`p-3 rounded-full ${s.bg}`}>
                                        <Icon className={`h-5 w-5 ${s.color}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="withdrawals">
                <TabsList>
                    <TabsTrigger value="withdrawals">
                        <Wallet className="h-4 w-4 mr-2" /> Duyệt rút tiền
                        {(stats?.pendingWithdrawals || 0) > 0 && (
                            <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                                {stats?.pendingWithdrawals}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="users">
                        <Users className="h-4 w-4 mr-2" /> Quản lý Users
                    </TabsTrigger>
                </TabsList>

                {/* Withdrawals Tab */}
                <TabsContent value="withdrawals">
                    <Card>
                        <CardHeader>
                            <CardTitle>Yêu cầu rút tiền</CardTitle>
                            <CardDescription>Duyệt hoặc từ chối yêu cầu rút tiền từ users.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {wdLoading ? (
                                <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                            ) : !withdrawalsData?.data.length ? (
                                <p className="text-center py-8 text-muted-foreground">Không có yêu cầu rút tiền nào.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>User</TableHead>
                                                <TableHead className="text-right">Số tiền</TableHead>
                                                <TableHead>Ngân hàng</TableHead>
                                                <TableHead>STK</TableHead>
                                                <TableHead>Chủ TK</TableHead>
                                                <TableHead>Trạng thái</TableHead>
                                                <TableHead>Ngày tạo</TableHead>
                                                <TableHead className="text-right">Hành động</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {withdrawalsData.data.map((w) => {
                                                const st = wdStatusMap[w.status] || wdStatusMap.PENDING;
                                                return (
                                                    <TableRow key={w.id}>
                                                        <TableCell>
                                                            <p className="font-medium text-sm">{w.user.fullName || w.user.email}</p>
                                                            <p className="text-xs text-muted-foreground">{w.user.email}</p>
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold">{formatCurrency(w.amount)}</TableCell>
                                                        <TableCell>{w.bankName}</TableCell>
                                                        <TableCell className="font-mono text-sm">{w.bankAccount}</TableCell>
                                                        <TableCell>{w.accountHolder}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={st.color}>{st.label}</Badge>
                                                            {w.rejectReason && <p className="text-xs text-red-500 mt-1">{w.rejectReason}</p>}
                                                        </TableCell>
                                                        <TableCell className="text-sm whitespace-nowrap">
                                                            {format(new Date(w.createdAt), 'dd/MM HH:mm', { locale: vi })}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {w.status === 'PENDING' && (
                                                                <div className="flex gap-2 justify-end">
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => approveMutation.mutate(w.id)}
                                                                        disabled={approveMutation.isPending}
                                                                        className="bg-green-600 hover:bg-green-700 h-8"
                                                                    >
                                                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Duyệt
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        onClick={() => rejectMutation.mutate(w.id)}
                                                                        disabled={rejectMutation.isPending}
                                                                        className="h-8"
                                                                    >
                                                                        <XCircle className="h-3 w-3 mr-1" /> Từ chối
                                                                    </Button>
                                                                </div>
                                                            )}
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
                </TabsContent>

                {/* Users Tab */}
                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <CardTitle>Danh sách Users</CardTitle>
                            <CardDescription>Quản lý tài khoản người dùng.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {usersLoading ? (
                                <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>User</TableHead>
                                                <TableHead>Role</TableHead>
                                                <TableHead className="text-right">Số dư</TableHead>
                                                <TableHead className="text-center">Links</TableHead>
                                                <TableHead className="text-center">Đơn</TableHead>
                                                <TableHead>Ngày tạo</TableHead>
                                                <TableHead>Trạng thái</TableHead>
                                                <TableHead className="text-right">Hành động</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {usersData?.data.map((u) => (
                                                <TableRow key={u.id}>
                                                    <TableCell>
                                                        <p className="font-medium text-sm">{u.fullName || 'N/A'}</p>
                                                        <p className="text-xs text-muted-foreground">{u.email}</p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'}
                                                            className={u.role === 'ADMIN' ? 'bg-orange-500' : ''}>
                                                            {u.role}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm">
                                                        {formatCurrency(Number(u.availableBalance))}
                                                    </TableCell>
                                                    <TableCell className="text-center">{u._count.linkConversions}</TableCell>
                                                    <TableCell className="text-center">{u._count.orders}</TableCell>
                                                    <TableCell className="text-sm whitespace-nowrap">
                                                        {format(new Date(u.createdAt), 'dd/MM/yyyy', { locale: vi })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={u.isActive ? 'default' : 'destructive'}
                                                            className={u.isActive ? 'bg-green-600' : ''}>
                                                            {u.isActive ? 'Active' : 'Disabled'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => toggleActiveMutation.mutate(u.id)}
                                                            disabled={toggleActiveMutation.isPending}
                                                            className="h-8"
                                                        >
                                                            {u.isActive ? <Ban className="h-3 w-3 mr-1" /> : <UserCheck className="h-3 w-3 mr-1" />}
                                                            {u.isActive ? 'Khóa' : 'Mở'}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
