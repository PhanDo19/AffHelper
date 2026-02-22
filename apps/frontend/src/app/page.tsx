import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-red-50 py-20 lg:py-32">
          <div className="container mx-auto">

            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Mua sắm thông minh,{' '}
                <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                  nhận cashback tức thì
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8">
                Chuyển đổi link sản phẩm từ Shopee & TikTok Shop thành link affiliate.
                Nhận hoàn tiền lên đến 70% hoa hồng cho mỗi đơn hàng.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-lg px-8">
                    Bắt đầu ngay - Miễn phí
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="text-lg px-8">
                    Đăng nhập
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto">

            <h2 className="text-3xl font-bold text-center mb-12">Cách thức hoạt động</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: '1',
                  title: 'Dán link sản phẩm',
                  description: 'Copy link sản phẩm từ Shopee hoặc TikTok Shop và dán vào hệ thống.',
                },
                {
                  step: '2',
                  title: 'Nhận link affiliate',
                  description: 'Hệ thống tự động tạo link affiliate với thông tin sản phẩm và tỷ lệ hoàn tiền.',
                },
                {
                  step: '3',
                  title: 'Mua hàng & nhận tiền',
                  description: 'Mua hàng qua link mới, xác nhận đơn hoàn thành và nhận cashback vào ví.',
                },
              ].map((item) => (
                <div key={item.step} className="text-center p-6 rounded-xl bg-background shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Platforms */}
        <section className="py-16">
          <div className="container mx-auto">

            <h2 className="text-3xl font-bold text-center mb-12">Nền tảng hỗ trợ</h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
              <div className="p-8 rounded-xl border bg-gradient-to-br from-orange-50 to-orange-100 text-center">
                <div className="text-5xl mb-4">🛒</div>
                <h3 className="text-2xl font-bold text-orange-600 mb-2">Shopee</h3>
                <p className="text-muted-foreground">Hoàn tiền lên đến 5% cho mỗi đơn hàng</p>
              </div>
              <div className="p-8 rounded-xl border bg-gradient-to-br from-slate-50 to-slate-100 text-center">
                <div className="text-5xl mb-4">🎵</div>
                <h3 className="text-2xl font-bold mb-2">TikTok Shop</h3>
                <p className="text-muted-foreground">Hoàn tiền lên đến 8% cho mỗi đơn hàng</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <div className="container mx-auto text-center">

            <h2 className="text-3xl font-bold mb-4">Sẵn sàng tiết kiệm tiền?</h2>
            <p className="text-lg mb-8 opacity-90">Đăng ký miễn phí và bắt đầu nhận cashback ngay hôm nay!</p>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Tạo tài khoản miễn phí
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
