/**
 * Cloudflare Worker Reverse Proxy cho VidKraken API v2
 * Giúp vượt qua lỗi CORS ("Provisional headers are shown") khi chạy trên GitHub Pages!
 *
 * Cách cài đặt miễn phí (100.000 lượt gọi/ngày):
 * 1. Đăng nhập https://dash.cloudflare.com/ -> Chọn "Workers & Pages" -> "Create application" -> "Create Worker"
 * 2. Đặt tên worker: vidkraken-proxy -> Nhấn "Deploy"
 * 3. Nhấn "Edit code", dán toàn bộ đoạn mã bên dưới vào rồi nhấn "Save and Deploy"
 * 4. Copy URL của worker (ví dụ: https://vidkraken-proxy.username.workers.dev)
 * 5. Dán vào ô "Proxy / Worker URL" trong ứng dụng CastTube trên GitHub Pages!
 */

export default {
  async fetch(request, env, ctx) {
    // 1. Xử lý preflight CORS OPTIONS request từ trình duyệt Chrome
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
          "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, X-Requested-With",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    try {
      const url = new URL(request.url);
      
      // Xây dựng đường dẫn đích đến VidKraken API v2
      let targetPath = url.pathname;
      if (!targetPath.startsWith('/api/v2')) {
        targetPath = '/api/v2' + targetPath;
      }
      const targetUrl = 'https://vidkraken.com' + targetPath + url.search;

      // Chuẩn bị headers chuyển tiếp
      const forwardHeaders = new Headers();
      forwardHeaders.set('User-Agent', 'CastTube-Cloudflare-Worker/1.0');
      forwardHeaders.set('Content-Type', 'application/json');

      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        forwardHeaders.set('authorization', authHeader);
      } else {
        // API Key mặc định của bạn
        forwardHeaders.set('authorization', 'Bearer f71cd7b5-2fcd-42b4-a4b7-40e6ca96b6ba');
      }

      const fetchOptions = {
        method: request.method,
        headers: forwardHeaders,
      };

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const bodyText = await request.text();
        if (bodyText) {
          fetchOptions.body = bodyText;
        }
      }

      // Gọi đến VidKraken API
      const response = await fetch(targetUrl, fetchOptions);

      // Thêm header CORS vào kết quả trả về cho trình duyệt
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
      responseHeaders.set("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept, X-Requested-With");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message || 'Worker Proxy Error' }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  },
};
