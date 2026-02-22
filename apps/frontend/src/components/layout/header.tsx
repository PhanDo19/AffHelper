'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';

export function Header() {
    const { user, isAuthenticated, logout } = useAuthStore();

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between">

                <Link href="/" className="flex items-center space-x-2">
                    <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                        AffCash
                    </span>
                </Link>

                <nav className="flex items-center gap-4">
                    {isAuthenticated ? (
                        <>
                            <Link href="/dashboard">
                                <Button variant="ghost">Dashboard</Button>
                            </Link>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                    {user?.fullName || user?.email}
                                </span>
                                <Button variant="outline" onClick={logout}>
                                    Đăng xuất
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Link href="/login">
                                <Button variant="ghost">Đăng nhập</Button>
                            </Link>
                            <Link href="/register">
                                <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                                    Đăng ký
                                </Button>
                            </Link>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}
