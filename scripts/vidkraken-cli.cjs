#!/usr/bin/env node
/**
 * VidKraken CLI & GitHub Action Downloader Tool
 * Tự động lấy thông tin và tải Video / Audio từ YouTube qua VidKraken API v2
 * API Key mặc định: f71cd7b5-2fcd-42b4-a4b7-40e6ca96b6ba
 * 
 * Cách dùng:
 *   node scripts/vidkraken-cli.cjs me
 *   node scripts/vidkraken-cli.cjs info "https://youtu.be/dQw4w9WgXcQ"
 *   node scripts/vidkraken-cli.cjs download "https://youtu.be/dQw4w9WgXcQ" audio
 *   node scripts/vidkraken-cli.cjs download "https://youtu.be/dQw4w9WgXcQ" 1080
 */

const API_KEY = process.env.VIDKRAKEN_API_KEY || 'f71cd7b5-2fcd-42b4-a4b7-40e6ca96b6ba';
const BASE_URL = 'https://vidkraken.com/api/v2';

async function checkAccount() {
  console.log('🔍 Đang kiểm tra tài khoản VidKraken (/me)...');
  const res = await fetch(`${BASE_URL}/me`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`❌ Lỗi HTTP ${res.status}:`, err);
    process.exit(1);
  }
  const data = await res.json();
  console.log('✅ Thông tin tài khoản:');
  console.log(`   - Chủ sở hữu: ${data.name || 'Hiếu Đỗ Minh'}`);
  console.log(`   - Email: ${data.email || 'N/A'}`);
  console.log(`   - Gói: ${data.plan?.id || 'free'}`);
  if (data.balances) {
    console.log(`   - Lượt tải: ${data.balances.download_count?.remaining}/${data.balances.download_count?.granted} còn lại`);
    console.log(`   - Băng thông: ${data.balances.bandwidth_mb?.remaining} MB còn lại`);
    console.log(`   - Info queries: ${data.balances.info?.remaining}/${data.balances.info?.granted} còn lại`);
  }
}

async function fetchInfo(url) {
  if (!url) {
    console.error('❌ Vui lòng cung cấp URL YouTube.');
    process.exit(1);
  }
  console.log(`🔍 Đang gửi yêu cầu thông tin video: ${url}`);
  const postRes = await fetch(`${BASE_URL}/info`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (!postRes.ok) {
    console.error(`❌ Lỗi POST /info HTTP ${postRes.status}:`, await postRes.text());
    process.exit(1);
  }

  const { jobId } = await postRes.json();
  console.log(`⏳ Job ID tạo thành công: ${jobId}. Đang kiểm tra kết quả...`);

  let attempts = 0;
  while (attempts < 15) {
    attempts++;
    await new Promise((r) => setTimeout(r, 1500));
    const getRes = await fetch(`${BASE_URL}/info/${jobId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    if (getRes.ok) {
      const data = await getRes.json();
      if (data.status === 'success' || data.status === 'completed') {
        console.log('✅ Thông tin video thành công:');
        console.log(`   - Tiêu đề: ${data.result?.title}`);
        console.log(`   - Thời lượng: ${data.result?.duration} giây`);
        console.log(`   - URL: ${data.result?.url}`);
        return data;
      }
      if (data.status === 'failed') {
        console.error('❌ Lỗi xử lý:', data.error);
        process.exit(1);
      }
      console.log(`   [${attempts}/15] Đang xử lý (${data.status})...`);
    }
  }
}

async function downloadVideo(url, format = 'audio') {
  if (!url) {
    console.error('❌ Vui lòng cung cấp URL YouTube.');
    process.exit(1);
  }
  console.log(`🚀 Bắt đầu gửi yêu cầu tải (${format}): ${url}`);
  const postRes = await fetch(`${BASE_URL}/download`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, format }),
  });

  if (!postRes.ok) {
    console.error(`❌ Lỗi POST /download HTTP ${postRes.status}:`, await postRes.text());
    process.exit(1);
  }

  const job = await postRes.json();
  console.log(`⏳ Job ID: ${job.jobId} (Trạng thái ban đầu: ${job.status})`);

  let attempts = 0;
  while (attempts < 60) {
    attempts++;
    await new Promise((r) => setTimeout(r, 2000));
    const getRes = await fetch(`${BASE_URL}/download/${job.jobId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    if (getRes.ok) {
      const statusData = await getRes.json();
      if (statusData.status === 'COMPLETED') {
        console.log('\n🎉 TẢI HOÀN TẤT THÀNH CÔNG!');
        console.log(`   - Tiêu đề: ${statusData.title}`);
        console.log(`   - Định dạng: ${statusData.actualFormat || statusData.format}`);
        console.log(`   - Dung lượng: ${statusData.fileSize ? (statusData.fileSize / (1024 * 1024)).toFixed(2) + ' MB' : 'N/A'}`);
        console.log(`   - LIÊN KẾT TẢI: ${statusData.downloadUrl}`);

        if (statusData.downloadUrl) {
          try {
            const rawTitle = statusData.title || 'video';
            const cleanTitle = rawTitle
              .replace(/https?:\/\/\S+/gi, '')
              .replace(/[|•–—\-_/\\:;*?"<>!@#$%^&*()+=[\]{}~`']/g, ' ')
              .replace(/\s+/g, '_')
              .replace(/_+/g, '_')
              .replace(/^_|_$/g, '')
              .slice(0, 65);
            const fmt = (statusData.actualFormat || statusData.format || format).toLowerCase();
            const ext = fmt.includes('mp3') || fmt.includes('audio') ? 'mp3' : fmt.includes('aac') ? 'm4a' : 'mp4';
            const filename = `minhhieu_${cleanTitle}_${fmt}.${ext}`;
            console.log(`💾 Đang tự động lưu file về máy: ${filename}...`);

            const fileRes = await fetch(statusData.downloadUrl);
            if (fileRes.ok && fileRes.body) {
              const fs = require('fs');
              const fileStream = fs.createWriteStream(filename);
              const { Readable } = require('stream');
              await new Promise((resolve, reject) => {
                Readable.fromWeb(fileRes.body).pipe(fileStream).on('finish', resolve).on('error', reject);
              });
              console.log(`✅ Đã tải file về máy thành công: ${filename}`);
            }
          } catch (writeErr) {
            console.warn('⚠️ Không thể tự động ghi file ra đĩa:', writeErr.message);
          }
        }

        return statusData;
      }
      if (statusData.status === 'FAILED') {
        console.error('\n❌ Tải thất bại:', statusData.error || statusData.message);
        process.exit(1);
      }
      const p = statusData.progress ? `${statusData.progress.percent || 0}%` : statusData.status;
      process.stdout.write(`\r⏳ Tiến trình: ${p} (Kiểm tra lần ${attempts})...`);
    }
  }
}

// CLI Dispatcher
const [,, command, arg1, arg2] = process.argv;

switch (command) {
  case 'me':
    checkAccount();
    break;
  case 'info':
    fetchInfo(arg1);
    break;
  case 'download':
    downloadVideo(arg1, arg2 || 'audio');
    break;
  default:
    console.log(`
VidKraken CLI Tool (API v2)
Lệnh:
  node scripts/vidkraken-cli.cjs me                     - Kiểm tra tài khoản & hạn mức
  node scripts/vidkraken-cli.cjs info <youtube_url>     - Lấy thông tin video
  node scripts/vidkraken-cli.cjs download <url> [format]- Tải video/audio (audio, audio-mp3, 1080, 720...)
`);
}
