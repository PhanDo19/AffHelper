AGENT.md - Affiliate Link Converter Platform
PROJECT OVERVIEW
Xây dựng nền tảng web cho phép người dùng chuyển đổi link sản phẩm từ TikTok Shop và Shopee thành link affiliate để nhận hoàn tiền (cashback) khi mua hàng.

Business Model
User dán link sản phẩm -> Hệ thống tạo link affiliate -> User mua hàng qua link -> Hệ thống nhận hoa hồng -> Chia sẻ 70% cho user dưới dạng cashback

Target Platforms
Shopee Vietnam (shopee.vn, shope.ee)
TikTok Shop Vietnam (tiktok.com, vt.tiktok.com)
TECH STACK
Backend
Runtime: Node.js 20.x LTS
Framework: NestJS 10.x
Language: TypeScript 5.x
ORM: Prisma 5.x
Database: PostgreSQL 15.x
Cache: Redis 7.x (Upstash)
Queue: BullMQ 4.x
Auth: Passport.js + JWT
Frontend
Framework: Next.js 14.x (App Router)
Language: TypeScript 5.x
Styling: Tailwind CSS 3.x
UI Components: Shadcn/ui
State: Zustand 4.x
Data Fetching: TanStack Query 5.x
Forms: React Hook Form + Zod
Infrastructure
Frontend Hosting: Vercel
Backend Hosting: Railway
Database: Supabase (PostgreSQL)
Redis: Upstash
CDN: Cloudflare
PROJECT STRUCTURE
affiliate-platform/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── common/
│   │   │   │   ├── decorators/
│   │   │   │   ├── filters/
│   │   │   │   ├── guards/
│   │   │   │   └── interceptors/
│   │   │   ├── config/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── links/
│   │   │   │   ├── orders/
│   │   │   │   ├── withdrawals/
│   │   │   │   └── admin/
│   │   │   ├── providers/
│   │   │   │   ├── shopee/
│   │   │   │   └── tiktok/
│   │   │   ├── jobs/
│   │   │   └── prisma/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── test/
│   │   └── package.json
│   └── frontend/
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/
│       │   │   ├── (dashboard)/
│       │   │   └── (public)/
│       │   ├── components/
│       │   │   ├── ui/
│       │   │   ├── forms/
│       │   │   ├── layout/
│       │   │   └── shared/
│       │   ├── hooks/
│       │   ├── lib/
│       │   ├── stores/
│       │   └── types/
│       └── package.json
├── docker-compose.yml
├── turbo.json
└── package.json
DATABASE SCHEMA
File: prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Platform {
  SHOPEE
  TIKTOK
}

enum OrderStatus {
  PENDING
  COMPLETED
  CANCELLED
  REFUNDED
}

enum WithdrawalStatus {
  PENDING
  PROCESSING
  COMPLETED
  REJECTED
}

enum UserRole {
  USER
  ADMIN
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String    @map("password_hash")
  fullName      String?   @map("full_name")
  phone         String?
  bankAccount   String?   @map("bank_account")
  bankName      String?   @map("bank_name")
  role          UserRole  @default(USER)
  isActive      Boolean   @default(true) @map("is_active")
  
  availableBalance  Decimal @default(0) @map("available_balance") @db.Decimal(15, 2)
  pendingBalance    Decimal @default(0) @map("pending_balance") @db.Decimal(15, 2)
  
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  linkConversions LinkConversion[]
  orders          Order[]
  withdrawals     Withdrawal[]

  @@map("users")
}

model LinkConversion {
  id              String    @id @default(cuid())
  userId          String    @map("user_id")
  platform        Platform
  originalUrl     String    @map("original_url")
  affiliateUrl    String    @map("affiliate_url")
  
  productId       String?   @map("product_id")
  shopId          String?   @map("shop_id")
  productName     String?   @map("product_name")
  productImage    String?   @map("product_image")
  productPrice    Decimal?  @map("product_price") @db.Decimal(15, 2)
  
  commissionRate  Decimal?  @map("commission_rate") @db.Decimal(5, 4)
  cashbackRate    Decimal?  @map("cashback_rate") @db.Decimal(5, 4)
  
  subId           String?   @map("sub_id")
  clickCount      Int       @default(0) @map("click_count")
  
  createdAt       DateTime  @default(now()) @map("created_at")
  
  user            User      @relation(fields: [userId], references: [id])
  orders          Order[]

  @@index([userId])
  @@index([platform])
  @@index([subId])
  @@map("link_conversions")
}

model Order {
  id                String      @id @default(cuid())
  userId            String      @map("user_id")
  conversionId      String?     @map("conversion_id")
  platform          Platform
  
  externalOrderId   String      @map("external_order_id")
  externalItemId    String?     @map("external_item_id")
  
  productName       String      @map("product_name")
  productImage      String?     @map("product_image")
  productPrice      Decimal     @map("product_price") @db.Decimal(15, 2)
  quantity          Int         @default(1)
  totalAmount       Decimal     @map("total_amount") @db.Decimal(15, 2)
  
  commissionRate    Decimal     @map("commission_rate") @db.Decimal(5, 4)
  commissionAmount  Decimal     @map("commission_amount") @db.Decimal(15, 2)
  cashbackRate      Decimal     @map("cashback_rate") @db.Decimal(5, 4)
  cashbackAmount    Decimal     @map("cashback_amount") @db.Decimal(15, 2)
  
  status            OrderStatus @default(PENDING)
  purchasedAt       DateTime    @map("purchased_at")
  completedAt       DateTime?   @map("completed_at")
  
  createdAt         DateTime    @default(now()) @map("created_at")
  updatedAt         DateTime    @updatedAt @map("updated_at")

  user              User            @relation(fields: [userId], references: [id])
  linkConversion    LinkConversion? @relation(fields: [conversionId], references: [id])

  @@unique([platform, externalOrderId, externalItemId])
  @@index([userId])
  @@index([status])
  @@map("orders")
}

model Withdrawal {
  id            String            @id @default(cuid())
  userId        String            @map("user_id")
  amount        Decimal           @db.Decimal(15, 2)
  
  bankAccount   String            @map("bank_account")
  bankName      String            @map("bank_name")
  accountHolder String            @map("account_holder")
  
  status        WithdrawalStatus  @default(PENDING)
  processedAt   DateTime?         @map("processed_at")
  processedBy   String?           @map("processed_by")
  rejectReason  String?           @map("reject_reason")
  transactionId String?           @map("transaction_id")
  
  createdAt     DateTime          @default(now()) @map("created_at")
  updatedAt     DateTime          @updatedAt @map("updated_at")

  user          User              @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([status])
  @@map("withdrawals")
}

model PlatformToken {
  id            String    @id @default(cuid())
  platform      Platform  @unique
  accessToken   String    @map("access_token")
  refreshToken  String?   @map("refresh_token")
  expiresAt     DateTime  @map("expires_at")
  metadata      Json?     @default("{}")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  @@map("platform_tokens")
}

model Setting {
  id          String    @id @default(cuid())
  key         String    @unique
  value       String
  description String?
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  @@map("settings")
}
API SPECIFICATIONS
Authentication APIs
POST /api/auth/register
- Body: { email, password, fullName }
- Response: { accessToken, refreshToken, user }

POST /api/auth/login
- Body: { email, password }
- Response: { accessToken, refreshToken, user }

POST /api/auth/refresh
- Body: { refreshToken }
- Response: { accessToken }

POST /api/auth/logout
- Headers: Authorization: Bearer <token>
- Response: { success: true }

GET /api/auth/me
- Headers: Authorization: Bearer <token>
- Response: { user }
Link Conversion APIs
POST /api/links/convert
- Headers: Authorization: Bearer <token>
- Body: { url: string }
- Response: { platform, originalUrl, affiliateUrl, productInfo }

GET /api/links/history
- Headers: Authorization: Bearer <token>
- Query: { page?, limit? }
- Response: { data: LinkConversion[], pagination }

GET /api/links/:id
- Headers: Authorization: Bearer <token>
- Response: { linkConversion }
Order APIs
GET /api/orders
- Headers: Authorization: Bearer <token>
- Query: { page?, limit?, status?, platform? }
- Response: { data: Order[], pagination }

GET /api/orders/stats
- Headers: Authorization: Bearer <token>
- Response: { totalOrders, totalCashback, pendingCashback, completedOrders }
Wallet and Withdrawal APIs
GET /api/wallet/balance
- Headers: Authorization: Bearer <token>
- Response: { availableBalance, pendingBalance, totalEarned }

POST /api/withdrawals/request
- Headers: Authorization: Bearer <token>
- Body: { amount, bankAccount?, bankName?, accountHolder? }
- Response: { withdrawal }

GET /api/withdrawals/history
- Headers: Authorization: Bearer <token>
- Query: { page?, limit?, status? }
- Response: { data: Withdrawal[], pagination }
Admin APIs
GET /api/admin/dashboard
- Headers: Authorization: Bearer <token> (Admin only)
- Response: { totalUsers, totalConversions, totalOrders, totalCommission, recentOrders }

GET /api/admin/users
- Headers: Authorization: Bearer <token> (Admin only)
- Query: { page?, limit?, search? }
- Response: { data: User[], pagination }

GET /api/admin/withdrawals
- Headers: Authorization: Bearer <token> (Admin only)
- Query: { page?, limit?, status? }
- Response: { data: Withdrawal[], pagination }

PUT /api/admin/withdrawals/:id/process
- Headers: Authorization: Bearer <token> (Admin only)
- Body: { status: "COMPLETED" | "REJECTED", rejectReason?, transactionId? }
- Response: { withdrawal }
EXTERNAL API INTEGRATION
Shopee Affiliate API
Base URL: https://open-api.affiliate.shopee.vn/graphql

Authentication: SHA256 HMAC Header Format: Authorization: SHA256 Credential={app_id}, Signature={signature}, Timestamp={timestamp}

Signature Generation:

Copyfunction generateShopeeSignature(appId: string, secretKey: string, timestamp: number): string {
  const payload = `${appId}${timestamp}`;
  return crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
}
Generate Affiliate Link:

Copymutation {
  generateShortLink(input: {
    originUrl: "https://shopee.vn/product-link",
    subIds: ["userId_trackingId"]
  }) {
    shortLink
  }
}
Get Product Info:

Copyquery {
  productOfferV2(itemId: 123456, shopId: 789, limit: 1) {
    nodes {
      itemId
      productName
      priceMin
      priceMax
      commissionRate
      sellerCommissionRate
      imageUrl
      offerLink
    }
  }
}
Get Conversion Report:

Copyquery {
  conversionReport(
    purchaseTimeStart: 1704067200,
    purchaseTimeEnd: 1706745600,
    limit: 500
  ) {
    nodes {
      conversionId
      purchaseTime
      totalCommission
      utmContent
      orders {
        orderId
        orderStatus
        items {
          itemId
          itemName
          itemPrice
          qty
          itemTotalCommission
        }
      }
    }
    pageInfo {
      hasNextPage
      scrollId
    }
  }
}
URL Parsing:

Copyfunction parseShopeeUrl(url: string): { shopId?: string; itemId?: string } | null {
  const patterns = [
    /shopee\.vn\/.*-i\.(\d+)\.(\d+)/,
    /shopee\.vn\/.*[?&]shopid=(\d+).*itemid=(\d+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return { shopId: match[1], itemId: match[2] };
  }
  return null;
}
TikTok Shop Affiliate API
Base URL: https://open-api.tiktokglobalshop.com

Authentication: HMAC-SHA256

Signature Generation:

Copyfunction generateTikTokSignature(
  path: string, 
  params: Record<string, string>, 
  appSecret: string,
  body?: any
): string {
  const sortedParams = Object.keys(params)
    .filter(key => key !== 'sign' && key !== 'access_token')
    .sort()
    .map(key => `${key}${params[key]}`)
    .join('');

  let baseString = `${appSecret}${path}${sortedParams}`;
  if (body) baseString += JSON.stringify(body);
  baseString += appSecret;

  return crypto.createHmac('sha256', appSecret).update(baseString).digest('hex');
}
Generate Affiliate Link:

POST /affiliate/202405/promotions/generate_link
Body: { product_id: "123456", promotion_type: "PRODUCT" }
Get Affiliate Orders:

GET /affiliate/202405/orders
Query: { create_time_ge, create_time_lt, page_size }
URL Parsing:

Copyfunction parseTikTokUrl(url: string): { productId?: string } | null {
  const patterns = [
    /tiktok\.com\/@[\w.-]+\/product\/(\d+)/,
    /shop\.tiktok\.com\/view\/product\/(\d+)/,
    /tiktok\.com\/view\/product\/(\d+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return { productId: match[1] };
  }
  return null;
}
UI/UX REQUIREMENTS
Pages
Public Pages:

/ : Landing page với hero section, features, how it works
/login : Login form
/register : Registration form
Dashboard Pages (Protected):

/dashboard : Main dashboard với link converter, stats cards, recent orders
/dashboard/history : Lịch sử chuyển đổi link
/dashboard/orders : Danh sách đơn hàng và trạng thái
/dashboard/wallet : Số dư, lịch sử giao dịch, yêu cầu rút tiền
/dashboard/settings : Cài đặt tài khoản, thông tin ngân hàng
Admin Pages (Admin only):

/admin : Admin dashboard với thống kê tổng quan
/admin/users : Quản lý users
/admin/withdrawals : Xử lý yêu cầu rút tiền
/admin/settings : Cài đặt hệ thống
Key Components
LinkConverter: Form nhập URL, hiển thị kết quả với product info và nút copy
StatsCards: Hiển thị tổng quan - số đơn, tổng cashback, số dư
OrdersTable: Bảng danh sách đơn hàng với filter và pagination
WithdrawalForm: Form yêu cầu rút tiền
TransactionHistory: Lịch sử giao dịch ví
Design Guidelines
Colors: Primary (Orange/Red cho Shopee feel), Secondary (Dark/Black cho TikTok feel)
Typography: Inter hoặc Nunito Sans
Responsive: Mobile-first, breakpoints: sm(640px), md(768px), lg(1024px), xl(1280px)
Dark Mode: Optional nhưng nên support
ENVIRONMENT VARIABLES
Backend (.env)
NODE_ENV=development
PORT=3001
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

DATABASE_URL="postgresql://user:password@localhost:5432/affiliate_db"

REDIS_URL="redis://localhost:6379"

JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

SHOPEE_APP_ID=your_shopee_app_id
SHOPEE_SECRET_KEY=your_shopee_secret_key

TIKTOK_APP_KEY=your_tiktok_app_key
TIKTOK_APP_SECRET=your_tiktok_app_secret
TIKTOK_SHOP_CIPHER=your_shop_cipher

CASHBACK_RATE=0.7
MIN_WITHDRAWAL_AMOUNT=50000
Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_NAME="Affiliate Cashback"
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEVELOPMENT TASKS
Phase 1: Foundation (Week 1-2)
Task 1.1: Project Setup

Initialize monorepo với Turborepo
Setup NestJS backend với TypeScript
Setup Next.js 14 frontend với App Router
Configure ESLint, Prettier
Setup Prisma với PostgreSQL
Configure environment variables
Task 1.2: Database and Prisma

Create Prisma schema
Run initial migration
Create Prisma service module
Seed data cho development
Task 1.3: Authentication

Implement JWT authentication với Passport.js
Create auth module (register, login, refresh, logout)
Create JWT strategy và guards
Implement password hashing với bcrypt
Create auth middleware cho protected routes
Task 1.4: Basic Frontend

Setup Tailwind CSS và Shadcn/ui
Create layout components (Header, Sidebar, Footer)
Implement auth pages (Login, Register)
Setup Zustand store cho auth state
Create API client với axios
Implement auth flow và token refresh
Phase 2: Shopee Integration (Week 3-4)
Task 2.1: Shopee Provider

Create Shopee service module
Implement signature generation
Implement generateAffiliateLink method
Implement getProductOffer method
Implement getConversionReport method
Implement URL parsing helper
Add error handling và logging
Task 2.2: Link Conversion Module

Create links module
Implement convertLink endpoint
Implement platform detection
Save conversion to database
Return product info với estimated cashback
Implement getHistory endpoint
Task 2.3: Link Converter UI

Create LinkConverter component
Implement URL validation với Zod
Display loading state
Display result với product info
Implement copy to clipboard
Create conversion history page
Phase 3: TikTok Integration (Week 5-6)
Task 3.1: TikTok Provider

Create TikTok service module
Implement signature generation
Implement OAuth flow (nếu cần)
Implement generateAffiliateLink method
Implement getProductDetails method
Implement getAffiliateOrders method
Implement URL parsing helper
Task 3.2: Multi-platform Support

Update link conversion để support TikTok
Handle platform-specific logic
Update UI để hiển thị platform badge
Test cả 2 platforms
Phase 4: Order Tracking (Week 7-8)
Task 4.1: Order Sync Jobs

Create sync-orders job với BullMQ
Implement Shopee order sync
Implement TikTok order sync
Map subId to user
Calculate cashback amount
Update user balance khi order completed
Schedule job chạy mỗi giờ
Task 4.2: Orders Module

Create orders module
Implement getOrders endpoint với filter
Implement getOrderStats endpoint
Create orders list page
Create order detail modal
Display order status badges
Task 4.3: Dashboard Stats

Create stats cards component
Fetch và display: total orders, total cashback, pending, completed
Create recent orders component
Add real-time update (optional)
Phase 5: Wallet and Withdrawals (Week 9-10)
Task 5.1: Wallet Module

Create wallet endpoints
Implement getBalance endpoint
Track available vs pending balance
Create wallet page UI
Display balance cards
Show transaction history
Task 5.2: Withdrawals Module

Create withdrawals module
Implement requestWithdrawal endpoint
Validate minimum amount
Validate bank info
Create withdrawal form
Show withdrawal history
Add status tracking
Phase 6: Admin Panel (Week 9-10)
Task 6.1: Admin Module

Create admin module với role guard
Implement dashboard stats endpoint
Implement users management endpoints
Implement withdrawals management endpoints
Task 6.2: Admin UI

Create admin layout
Create admin dashboard page
Create users management page
Create withdrawals processing page
Add approve/reject withdrawal actions
Phase 7: Testing and Launch (Week 11-12)
Task 7.1: Testing

Write unit tests cho services
Write integration tests cho APIs
E2E testing với Playwright
Test full flow: convert -> buy -> sync -> cashback
Task 7.2: Optimization

Add Redis caching
Optimize database queries
Add rate limiting
Implement request validation
Task 7.3: Deployment

Setup CI/CD với GitHub Actions
Deploy backend to Railway
Deploy frontend to Vercel
Setup Supabase database
Configure environment variables
Setup monitoring (Sentry, Posthog)
Configure Cloudflare
QUICK START COMMANDS
Initialize Project
Copymkdir affiliate-platform && cd affiliate-platform

# Backend
mkdir -p apps/backend && cd apps/backend
npx @nestjs/cli new . --package-manager npm
npm install @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt passport-local
npm install @prisma/client bcrypt class-validator class-transformer
npm install axios ioredis bullmq
npm install -D prisma @types/passport-jwt @types/passport-local @types/bcrypt

# Frontend
cd ../..
npx create-next-app@latest apps/frontend --typescript --tailwind --eslint --app --src-dir
cd apps/frontend
npx shadcn-ui@latest init
npm install @tanstack/react-query zustand react-hook-form @hookform/resolvers zod
npm install axios sonner lucide-react
Database Setup
Copycd apps/backend
npx prisma init
npx prisma migrate dev --name init
npx prisma generate
Development
Copy# Terminal 1: Backend
cd apps/backend
npm run start:dev

# Terminal 2: Frontend
cd apps/frontend
npm run dev
CODING CONVENTIONS
Backend (NestJS)
Use dependency injection everywhere
Controllers chỉ handle HTTP logic, delegate to services
Services contain business logic
Use DTOs với class-validator cho input validation
Use Prisma transactions cho operations phức tạp
Log errors với NestJS Logger
Return consistent response format
Frontend (Next.js)
Use Server Components by default, 'use client' khi cần
Use TanStack Query cho data fetching
Use Zustand cho global state (auth, UI)
Use React Hook Form + Zod cho forms
Components nhỏ, single responsibility
Use Tailwind CSS classes, avoid inline styles
General
TypeScript strict mode
Meaningful variable/function names
Comments cho complex logic
Error handling với try-catch
Environment variables cho config
No hardcoded values
SECURITY CHECKLIST
Password hashing với bcrypt (salt rounds >= 12)
JWT với short expiry (15 min)
Refresh token in httpOnly cookie
Input validation trên tất cả endpoints
SQL injection prevention (Prisma handles)
Rate limiting trên auth endpoints
CORS configuration
Helmet security headers
HTTPS only in production
Sensitive data encryption
Admin role verification
API key protection
REFERENCES
Shopee Affiliate API: https://affiliate.shopee.vn/open_api/list
TikTok Shop Partner Center: https://partner.tiktokshop.com/
NestJS Documentation: https://docs.nestjs.com/
Next.js Documentation: https://nextjs.org/docs
Prisma Documentation: https://www.prisma.io/docs
Shadcn/ui: https://ui.shadcn.com/
TanStack Query: https://tanstack.com/query
NOTES FOR AI AGENT
Khi tạo files mới, luôn follow project structure đã định nghĩa
Khi implement API, đảm bảo match với API specifications
Khi integrate external APIs, sử dụng đúng authentication method
Luôn handle errors gracefully với proper error messages
Test từng feature trước khi move sang feature tiếp theo
Commit thường xuyên với meaningful commit messages
Đọc kỹ các TODO comments trong code nếu có
Prioritize security best practices
Write clean, readable, maintainable code
Follow the phase-by-phase development approach
Document Version: 1.0 Last Updated: 2026-02-09
