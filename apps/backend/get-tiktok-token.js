/**
 * TikTok Access Token Exchange Script
 * 
 * Bước 1: Mở URL authorization trong browser (script sẽ in ra)
 * Bước 2: Login TikTok và authorize
 * Bước 3: Copy "code" từ URL bar sau khi redirect
 * Bước 4: Chạy script với code đó để lấy access_token
 * 
 * Usage:
 *   node get-tiktok-token.js              → In ra URL authorization
 *   node get-tiktok-token.js AUTH_CODE     → Đổi code lấy token
 */

require('dotenv').config();
const crypto = require('crypto');

const APP_KEY = process.env.TIKTOK_APP_KEY;
const APP_SECRET = process.env.TIKTOK_APP_SECRET;
const API_URL = 'https://auth.tiktok-shops.com/api/v2/token/get';

if (!APP_KEY || !APP_SECRET) {
    console.error('❌ Thiếu TIKTOK_APP_KEY hoặc TIKTOK_APP_SECRET trong .env');
    process.exit(1);
}

const authCode = process.argv[2];

if (!authCode) {
    // Step 1: Print authorization URL
    const authUrl = `https://services.tiktokshop.com/open/authorize?app_key=${APP_KEY}&state=manual_auth`;

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  🔑 TikTok Access Token - Bước 1');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('1. Mở link này trong browser:');
    console.log('');
    console.log(`   ${authUrl}`);
    console.log('');
    console.log('2. Login TikTok và ấn "Authorize"');
    console.log('');
    console.log('3. Sau khi redirect, copy giá trị "code" từ URL bar.');
    console.log('   URL sẽ có dạng: https://your-callback?code=XXXXXX&state=manual_auth');
    console.log('   (Trang có thể bị lỗi 404 — không sao, chỉ cần copy code)');
    console.log('');
    console.log('4. Chạy lại script với code:');
    console.log(`   node get-tiktok-token.js YOUR_CODE_HERE`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════');

} else {
    // Step 2: Exchange code for token
    exchangeToken(authCode);
}

async function exchangeToken(code) {
    console.log('');
    console.log('⏳ Đang đổi code lấy access_token...');
    console.log('');

    try {
        const params = new URLSearchParams({
            app_key: APP_KEY,
            app_secret: APP_SECRET,
            auth_code: code,
            grant_type: 'authorized_code',
        });

        const response = await fetch(`${API_URL}?${params.toString()}`, {
            method: 'GET',
        });

        const data = await response.json();

        if (data.code === 0 && data.data) {
            const token = data.data;
            console.log('═══════════════════════════════════════════════════════');
            console.log('  ✅ Lấy token thành công!');
            console.log('═══════════════════════════════════════════════════════');
            console.log('');
            console.log('Thêm các giá trị sau vào file .env:');
            console.log('');
            console.log(`TIKTOK_ACCESS_TOKEN=${token.access_token}`);
            if (token.refresh_token) {
                console.log(`TIKTOK_REFRESH_TOKEN=${token.refresh_token}`);
            }
            console.log('');
            console.log(`Access Token hết hạn: ${new Date(token.access_token_expire_in * 1000).toLocaleString('vi-VN')}`);
            if (token.refresh_token_expire_in) {
                console.log(`Refresh Token hết hạn: ${new Date(token.refresh_token_expire_in * 1000).toLocaleString('vi-VN')}`);
            }
            console.log('');
            console.log('═══════════════════════════════════════════════════════');
        } else {
            console.error('❌ Lỗi:', data.message || JSON.stringify(data));
            console.log('');
            console.log('Response đầy đủ:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('❌ Lỗi kết nối:', error.message);
    }
}
