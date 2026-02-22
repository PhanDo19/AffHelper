'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Wallet, Settings, LogOut, Link as LinkIcon, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const sidebarItems = [
    {
        title: 'Tổng quan',
        href: '/dashboard',
        icon: LayoutDashboard,
    },
    {
        title: 'Đơn hàng',
        href: '/dashboard/orders',
        icon: ShoppingBag,
    },
    {
        title: 'Ví tiền',
        href: '/dashboard/wallet',
        icon: Wallet,
    },
    {
        title: 'Cài đặt',
        href: '/dashboard/settings',
        icon: Settings,
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuthStore();

    return (
        <div className="flex h-screen flex-col justify-between border-r bg-muted/20">
            <div className="space-y-6 py-6">
                <div className="px-6 flex items-center gap-2">
                    <LinkIcon className="h-6 w-6 text-orange-500" />
                    <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                        AffCash
                    </span>
                </div>

                <div className="px-4">
                    <div className="space-y-1">
                        {sidebarItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary",
                                    pathname === item.href
                                        ? "bg-muted text-primary"
                                        : "text-muted-foreground hover:bg-muted/50"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.title}
                            </Link>
                        ))}

                        {user?.role === 'ADMIN' && (
                            <Link
                                href="/dashboard/admin"
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary",
                                    pathname === '/dashboard/admin'
                                        ? "bg-orange-50 text-orange-600 border border-orange-200"
                                        : "text-muted-foreground hover:bg-orange-50/50"
                                )}
                            >
                                <Shield className="h-4 w-4" />
                                Admin Panel
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <div className="border-t p-4">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <Avatar>
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.fullName || user?.email}`} />
                        <AvatarFallback>{(user?.fullName?.[0] || user?.email?.[0] || 'U').toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                        <span className="truncate text-sm font-medium">{user?.fullName || 'User'}</span>
                        <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                    </div>
                </div>

                <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 transition-colors"
                    onClick={logout}
                >
                    <LogOut className="h-4 w-4" />
                    Đăng xuất
                </Button>
            </div>
        </div>
    );
}
