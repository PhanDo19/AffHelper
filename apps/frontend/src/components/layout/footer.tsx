import Link from 'next/link';

export function Footer() {
    return (
        <footer className="border-t bg-muted/50">
            <div className="container mx-auto py-8 md:py-12">

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center space-x-2">
                            <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                                AffCash
                            </span>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                            Nền tảng hoàn tiền affiliate hàng đầu Việt Nam.
                            Mua sắm thông minh, nhận cashback tức thì.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-semibold">Sản phẩm</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/dashboard" className="hover:text-foreground transition-colors">Tạo link affiliate</Link></li>
                            <li><Link href="/dashboard/orders" className="hover:text-foreground transition-colors">Đơn hàng</Link></li>
                            <li><Link href="/dashboard/wallet" className="hover:text-foreground transition-colors">Ví tiền</Link></li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-semibold">Hỗ trợ</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/help" className="hover:text-foreground transition-colors">Hướng dẫn sử dụng</Link></li>
                            <li><Link href="/faq" className="hover:text-foreground transition-colors">Câu hỏi thường gặp</Link></li>
                            <li><Link href="/contact" className="hover:text-foreground transition-colors">Liên hệ</Link></li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-semibold">Pháp lý</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/terms" className="hover:text-foreground transition-colors">Điều khoản sử dụng</Link></li>
                            <li><Link href="/privacy" className="hover:text-foreground transition-colors">Chính sách bảo mật</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} AffCash. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
