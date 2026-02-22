'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Wallet, ArrowDownCircle, Clock, CheckCircle2, XCircle, Banknote } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';

interface WalletStats {
    availableBalance: number;
    pendingBalance: number;
    totalWithdrawn: number;
    totalCashbackEarned: number;
}

interface Withdrawal {
    id: string;
    amount: number;
    bankAccount: string;
    bankName: string;
    accountHolder: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
    processedAt: string | null;
    rejectReason: string | null;
    createdAt: string;
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
    PENDING: { label: 'Chờ duyệt', icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
    PROCESSING: { label: 'Đang xử lý', icon: ArrowDownCircle, color: 'text-blue-600 bg-blue-50' },
    COMPLETED: { label: 'Hoàn thành', icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
    REJECTED: { label: 'Từ chối', icon: XCircle, color: 'text-red-600 bg-red-50' },
};

export default function WalletPage() {
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [amount, setAmount] = useState('');
    const [bankName, setBankName] = useState('');
    const [bankAccount, setBankAccount] = useState('');
    const [accountHolder, setAccountHolder] = useState('');

    const { data: wallet, isLoading: walletLoading } = useQuery({
        queryKey: ['wallet-stats'],
        queryFn: async () => {
            const { data } = await api.get<WalletStats>('/withdrawals/wallet');
            return data;
        },
    });

    const { data: withdrawals, isLoading: withdrawalsLoading } = useQuery({
        queryKey: ['withdrawals'],
        queryFn: async () => {
            const { data } = await api.get<{ data: Withdrawal[]; meta: any }>('/withdrawals?limit=20');
            return data;
        },
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            const { data } = await api.post('/withdrawals', {
                amount: parseFloat(amount),
                bankName,
                bankAccount,
                accountHolder,
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wallet-stats'] });
            queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
            setShowForm(false);
            setAmount('');
            setBankName('');
            setBankAccount('');
            setAccountHolder('');
        },
    });

    const walletCards = [
        {
            title: 'Số dư khả dụng',
            value: wallet?.availableBalance || 0,
            icon: Wallet,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
        },
        {
            title: 'Đang chờ duyệt',
            value: wallet?.pendingBalance || 0,
            icon: Clock,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50',
        },
        {
            title: 'Đã rút',
            value: wallet?.totalWithdrawn || 0,
            icon: ArrowDownCircle,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
        },
        {
            title: 'Tổng cashback',
            value: wallet?.totalCashbackEarned || 0,
            icon: Banknote,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
        },
    ];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Ví tiền</h2>
                    <p className="text-muted-foreground">Quản lý số dư và yêu cầu rút tiền.</p>
                </div>
                <Button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                    <ArrowDownCircle className="h-4 w-4 mr-2" />
                    Rút tiền
                </Button>
            </div>

            {/* Wallet Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {walletCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Card key={card.title}>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                                        {walletLoading ? (
                                            <Skeleton className="h-8 w-28 mt-1" />
                                        ) : (
                                            <p className="text-2xl font-bold mt-1">{formatCurrency(card.value)}</p>
                                        )}
                                    </div>
                                    <div className={`p-3 rounded-full ${card.bgColor}`}>
                                        <Icon className={`h-5 w-5 ${card.color}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Withdrawal Form */}
            {showForm && (
                <Card className="border-orange-200 shadow-lg">
                    <CardHeader>
                        <CardTitle>Yêu cầu rút tiền</CardTitle>
                        <CardDescription>Số tiền tối thiểu: 50,000₫. Thời gian xử lý: 1-3 ngày làm việc.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="amount">Số tiền (₫)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    placeholder="50000"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min={50000}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bankName">Ngân hàng</Label>
                                <Input
                                    id="bankName"
                                    placeholder="Vietcombank, MB Bank, ..."
                                    value={bankName}
                                    onChange={(e) => setBankName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bankAccount">Số tài khoản</Label>
                                <Input
                                    id="bankAccount"
                                    placeholder="0123456789"
                                    value={bankAccount}
                                    onChange={(e) => setBankAccount(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="accountHolder">Chủ tài khoản</Label>
                                <Input
                                    id="accountHolder"
                                    placeholder="NGUYEN VAN A"
                                    value={accountHolder}
                                    onChange={(e) => setAccountHolder(e.target.value)}
                                />
                            </div>
                        </div>
                        {createMutation.error && (
                            <p className="text-sm text-red-500 mt-3">
                                {(createMutation.error as any)?.response?.data?.message || 'Có lỗi xảy ra'}
                            </p>
                        )}
                        <div className="flex gap-3 mt-6">
                            <Button
                                onClick={() => createMutation.mutate()}
                                disabled={createMutation.isPending || !amount || !bankName || !bankAccount || !accountHolder}
                                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                            >
                                {createMutation.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
                            </Button>
                            <Button variant="outline" onClick={() => setShowForm(false)}>
                                Hủy
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Withdrawal History */}
            <Card>
                <CardHeader>
                    <CardTitle>Lịch sử rút tiền</CardTitle>
                    <CardDescription>Danh sách các yêu cầu rút tiền của bạn.</CardDescription>
                </CardHeader>
                <CardContent>
                    {withdrawalsLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : !withdrawals?.data.length ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p className="text-lg font-medium mb-2">Chưa có yêu cầu rút tiền</p>
                            <p className="text-sm">Khi bạn tạo yêu cầu rút tiền, lịch sử sẽ hiển thị ở đây.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Số tiền</TableHead>
                                        <TableHead>Ngân hàng</TableHead>
                                        <TableHead>Số TK</TableHead>
                                        <TableHead>Chủ TK</TableHead>
                                        <TableHead>Trạng thái</TableHead>
                                        <TableHead className="w-[140px]">Ngày tạo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {withdrawals.data.map((w) => {
                                        const status = statusConfig[w.status] || statusConfig.PENDING;
                                        const StatusIcon = status.icon;
                                        return (
                                            <TableRow key={w.id}>
                                                <TableCell className="font-bold text-lg">
                                                    {formatCurrency(w.amount)}
                                                </TableCell>
                                                <TableCell>{w.bankName}</TableCell>
                                                <TableCell className="font-mono text-sm">{w.bankAccount}</TableCell>
                                                <TableCell>{w.accountHolder}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={status.color}>
                                                        <StatusIcon className="h-3 w-3 mr-1" />
                                                        {status.label}
                                                    </Badge>
                                                    {w.rejectReason && (
                                                        <p className="text-xs text-red-500 mt-1">{w.rejectReason}</p>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm whitespace-nowrap">
                                                    {format(new Date(w.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
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
