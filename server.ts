import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  testNeonConnection,
  saveNeonConnectionString,
  getNeonConnectionString,
  initializeNeonSchema,
  ensureNeonBootstrapped,
  isAdminInitializedInNeon,
  loginAdminWithNeon,
  verifyAdminSessionToken,
  logoutAdminSession,
  changeAdminCredentialsInNeon,
  listAdminAccountsInNeon,
  createAdminAccountInNeon,
  deleteAdminAccountInNeon,
  getPublicAppSettingsFromNeon,
  upsertAppSettingInNeon,
  upsertChannelVideosInNeon,
  queryNeonTable,
  insertNeonTableRow,
  deleteNeonTableRow,
  executeNeonCustomSql,
  saveStudyRecordToNeon,
  AdminPrincipal,
} from './src/server/neonClient';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

function getPort(): number {
  // 1. Explicit CLI arguments (--port <num>)
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(parsed)) return parsed;
  }
  // 2. Control plane / AI studio default app port
  if (process.env.DEFAULT_APP_PORT) {
    const parsed = parseInt(process.env.DEFAULT_APP_PORT, 10);
    if (!isNaN(parsed)) return parsed;
  }
  // 3. Standalone production environment (Cloud Run / container without Nginx)
  if (process.env.NODE_ENV === 'production' && process.env.PORT) {
    const parsed = parseInt(process.env.PORT, 10);
    if (!isNaN(parsed)) return parsed;
  }
  // 4. Default to port 3000 as required by the development environment
  return 3000;
}

const PORT = getPort();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Enable CORS for all API routes (allows GitHub Pages to call proxy endpoints)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Admin-Token');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

function extractAdminTokenFromRequest(req: express.Request): string {
  const headerToken = String(req.headers['x-admin-token'] || '').trim();
  if (headerToken) return headerToken;
  const authHeader = String(req.headers.authorization || '').trim();
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return '';
}

const requireAdminAuth: express.RequestHandler = async (req, res, next) => {
  try {
    const rawToken = extractAdminTokenFromRequest(req);
    const admin = await verifyAdminSessionToken(rawToken);
    if (!admin) {
      return res.status(401).json({
        success: false,
        code: 'ADMIN_AUTH_REQUIRED',
        error:
          'Từ chối truy cập: Chức năng quản trị & cơ sở dữ liệu chỉ cho phép Quản trị viên (Admin) đã đăng nhập thực hiện!',
      });
    }
    (req as any).adminUser = admin;
    (req as any).adminToken = rawToken;
    return next();
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Lỗi kiểm tra phiên đăng nhập Quản trị viên.',
    });
  }
};

// Endpoint: Podcast RSS Feed (studo.xml, feed.xml, studio.xml, rss.xml) for YouTube Studio & podcast players
app.get(['/studo.xml', '/minhhieu/studo.xml', '/studio.xml', '/minhhieu/studio.xml', '/feed.xml', '/minhhieu/feed.xml', '/rss.xml', '/minhhieu/rss.xml'], (req, res) => {
  const reqUrl = req.path.toLowerCase();
  let filename = 'studo.xml';
  if (reqUrl.includes('feed.xml')) filename = 'feed.xml';
  else if (reqUrl.includes('studio.xml')) filename = 'studio.xml';
  else if (reqUrl.includes('rss.xml')) filename = 'rss.xml';

  let filePath = path.resolve(__dirname, 'public', filename);
  if (!fs.existsSync(filePath)) {
    filePath = path.resolve(__dirname, 'public/studo.xml');
  }
  if (!fs.existsSync(filePath)) {
    filePath = path.resolve(__dirname, 'public/feed.xml');
  }

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  return res.status(404).send('<!-- RSS XML not found -->');
});

// Support base prefix from Vite base: '/minhhieu/' and normalize duplicate /api/api
app.use((req, _res, next) => {
  if (req.url.startsWith('/minhhieu/api')) {
    req.url = req.url.replace(/^\/minhhieu\/api/, '/api');
  }
  if (req.url.startsWith('/api/api/')) {
    req.url = req.url.replace(/^\/api\/api\//, '/api/');
  }
  next();
});

// High-Speed Direct Media Stream Pipe for 1080p & High-Capacity Downloads
// Pipes raw chunks from source CDN directly to browser with Content-Disposition: attachment
// Ensures browser triggers native file saving with minhhieu_ prefix without opening player tab
app.get(
  [
    '/api/vidkraken/stream',
    '/api/vidkraken-stream',
    '/minhhieu/api/vidkraken-stream',
    '/api/download-stream',
    '/minhhieu/api/download-stream',
  ],
  async (req, res) => {
    try {
      req.setTimeout(1800000); // 30 mins
      res.setTimeout(1800000);
      const fileUrl = (req.query.url as string) || '';
      let filename = (req.query.filename as string) || 'minhhieu_video.mp4';

      if (!fileUrl) {
        return res.status(400).json({ error: 'Thiếu tham số url file cần tải' });
      }

      // Sanitize filename and ensure minhhieu_ prefix
      filename = filename.replace(/[/\\?%*:|"<>]/g, '_');
      if (!filename.startsWith('minhhieu_')) {
        filename = `minhhieu_${filename}`;
      }

      // Forward Range header if requested (for resume & download accelerators like IDM / Chrome)
      const fetchHeaders: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      };
      if (req.headers.range) {
        fetchHeaders['Range'] = req.headers.range;
      }

      const controller = new AbortController();
      req.on('close', () => {
        controller.abort();
      });

      const remoteRes = await fetch(fileUrl, {
        headers: fetchHeaders,
        signal: controller.signal,
      });

      if (!remoteRes.ok && remoteRes.status !== 206) {
        return res.status(remoteRes.status).json({
          error: `Không thể tải file từ nguồn (Mã HTTP ${remoteRes.status}): ${remoteRes.statusText}`,
        });
      }

      const contentType =
        remoteRes.headers.get('content-type') ||
        (filename.endsWith('.mp3')
          ? 'audio/mpeg'
          : filename.endsWith('.m4a')
          ? 'audio/mp4'
          : 'video/mp4');
      const contentLength = remoteRes.headers.get('content-length');
      const contentRange = remoteRes.headers.get('content-range');

      res.status(remoteRes.status);
      res.setHeader('Content-Type', contentType);
      // Clean ASCII filename fallback + RFC 5987 / RFC 6266 UTF-8 filename
      const asciiFilename = (filename || 'minhhieu_media.mp4')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename || asciiFilename)}`
      );
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600');

      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      if (contentRange) {
        res.setHeader('Content-Range', contentRange);
      }

      if (remoteRes.body) {
        const { Readable } = await import('stream');
        Readable.fromWeb(remoteRes.body as any).pipe(res);
      } else {
        res.end();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // Client disconnected / cancelled
      }
      console.error('VidKraken stream proxy error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Lỗi truyền dữ liệu tải' });
      }
    }
  }
);

// VidKraken API v2 Proxy Endpoint (Direct forwarding with default user API key)
const VIDKRAKEN_DEFAULT_KEY =
  process.env.VIDKRAKEN_API_KEY || '276b76d3-a265-447d-8d32-1bcf2258290c';

app.use(['/api/vidkraken', '/minhhieu/api/vidkraken'], async (req, res) => {
  try {
    req.setTimeout(900000); // 15 mins
    res.setTimeout(900000);

    let subPath = req.url;
    if (subPath.startsWith('/minhhieu/api/vidkraken')) {
      subPath = subPath.replace(/^\/minhhieu\/api\/vidkraken/, '');
    } else if (subPath.startsWith('/api/vidkraken')) {
      subPath = subPath.replace(/^\/api\/vidkraken/, '');
    }
    if (!subPath.startsWith('/')) subPath = '/' + subPath;

    const targetUrl = `https://vidkraken.com/api/v2${subPath}`;
    let authHeader = req.headers.authorization || `Bearer ${VIDKRAKEN_DEFAULT_KEY}`;
    // If incoming auth header contains depleted key, upgrade to working key
    if (authHeader.includes('f71cd7b5-2fcd-42b4-a4b7-40e6ca96b6ba')) {
      authHeader = `Bearer 276b76d3-a265-447d-8d32-1bcf2258290c`;
    }

    const headers: Record<string, string> = {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      'User-Agent': 'CastTube-VidKraken/1.0',
    };

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const vkRes = await fetch(targetUrl, fetchOptions);
    const contentType = vkRes.headers.get('content-type') || 'application/json';
    const textData = await vkRes.text();

    res.status(vkRes.status);
    res.setHeader('Content-Type', contentType);
    return res.send(textData);
  } catch (error: any) {
    console.error('VidKraken proxy error:', error);
    return res.status(500).json({ error: error.message || 'Error proxying to VidKraken' });
  }
});

// EverAI Text to Speech (TTS) Proxy Endpoints
const EVERAI_DEFAULT_KEY = process.env.EVERAI_API_KEY || 'JZoMqN64fgxOuVcxViFyLj6YinIsiVbc0';

app.post(['/api/everai/tts', '/minhhieu/api/everai/tts', '/api/api/everai/tts', '/minhhieu/api/api/everai/tts'], async (req, res) => {
  try {
    const authHeader = req.headers.authorization || `Bearer ${EVERAI_DEFAULT_KEY}`;
    const payload = req.body;

    const vkRes = await fetch('https://www.everai.vn/api/v1/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    const textData = await vkRes.text();
    let data: any;
    try {
      data = JSON.parse(textData);
    } catch {
      data = { status: vkRes.ok ? 1 : 0, error_message: textData || `HTTP ${vkRes.status}` };
    }
    return res.status(vkRes.status).json(data);
  } catch (error: any) {
    console.error('EverAI TTS POST error:', error);
    return res.status(500).json({ status: 0, error_message: error.message || 'Lỗi kết nối EverAI TTS' });
  }
});

app.get(['/api/everai/tts/:id', '/minhhieu/api/everai/tts/:id', '/api/api/everai/tts/:id', '/minhhieu/api/api/everai/tts/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization || `Bearer ${EVERAI_DEFAULT_KEY}`;

    const vkRes = await fetch(`https://www.everai.vn/api/v1/tts/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
    });

    const textData = await vkRes.text();
    let data: any;
    try {
      data = JSON.parse(textData);
    } catch {
      data = { status: vkRes.ok ? 1 : 0, error_message: textData || `HTTP ${vkRes.status}` };
    }
    return res.status(vkRes.status).json(data);
  } catch (error: any) {
    console.error('EverAI TTS GET error:', error);
    return res.status(500).json({ status: 0, error_message: error.message || 'Lỗi kiểm tra tiến trình EverAI TTS' });
  }
});

// EverAI & Server Health Check Endpoint (for testing backend connectivity from GitHub Pages)
app.get(['/api/health', '/api/everai/health', '/minhhieu/api/health', '/minhhieu/api/everai/health'], (_req, res) => {
  return res.json({
    status: 'ok',
    success: true,
    service: 'CastTube EverAI Proxy & Podcast Backend',
    everaiReady: true,
    hasApiKey: !!process.env.EVERAI_API_KEY || !!EVERAI_DEFAULT_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Initialize Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint: Fetch YouTube Video metadata via public oEmbed
app.get('/api/podcast/meta', async (req, res) => {
  try {
    const videoUrl = req.query.url as string;
    if (!videoUrl) {
      return res.status(400).json({ error: 'Missing url query parameter' });
    }

    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
    const response = await fetch(oembedUrl);

    if (!response.ok) {
      return res.status(404).json({ error: 'Could not fetch metadata from YouTube' });
    }

    const data = await response.json();
    return res.json({
      title: data.title,
      author: data.author_name,
      authorUrl: data.author_url,
      thumbnail: data.thumbnail_url,
    });
  } catch (error: any) {
    console.error('Error fetching YouTube meta:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

const YOUTUBE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
};

// Helper: Parse videos from lockupViewModel blocks
function parseLockupBlocks(htmlOrJson: string, defaultChannel: string = 'Kênh YouTube', defaultAvatar?: string) {
  const blocks = htmlOrJson.split('"lockupViewModel":');
  const items: any[] = [];

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const idMatch = block.match(/"(?:videoId|contentId)":"([a-zA-Z0-9_-]{11})"/);
    const titleMatch = block.match(/"lockupMetadataViewModel":\{"title":\{"content":"(.*?)"\}/);
    const timeMatch = block.match(/"thumbnailBadgeViewModel":\{"text":"(.*?)"/);
    const labelMatch = block.match(/"accessibilityContext":\{"label":"(.*?)"\}/);
    const channelMatch = block.match(/"a11yLabel":"Go to channel (.*?)"/);
    const avatarMatch = block.match(/"avatarViewModel":\{"image":\{"sources":\[\{"url":"(.*?)"/);

    if (idMatch && titleMatch) {
      const vidId = idMatch[1];
      let title = titleMatch[1];
      try {
        title = JSON.parse('"' + title + '"');
      } catch {}

      const channel = channelMatch ? channelMatch[1] : defaultChannel;
      let duration = timeMatch ? timeMatch[1] : '10:00';
      if (!timeMatch && labelMatch) {
        const lbl = labelMatch[1];
        const hM = lbl.match(/(\d+)\s*giờ/);
        const mM = lbl.match(/(\d+)\s*phút/);
        const sM = lbl.match(/(\d+)\s*giây/);
        const h = hM ? parseInt(hM[1], 10) : 0;
        const m = mM ? parseInt(mM[1], 10) : 0;
        const s = sM ? parseInt(sM[1], 10) : 0;
        if (h > 0) duration = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        else if (m > 0 || s > 0) duration = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }
      const avatar = avatarMatch ? avatarMatch[1] : defaultAvatar;

      if (!items.some((x) => x.youtubeId === vidId)) {
        items.push({
          youtubeId: vidId,
          title,
          channel,
          channelAvatar: avatar,
          duration,
          thumbnail: `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
          isShort: false,
        });
      }
    }
  }
  return items;
}

// Helper: Fetch all channel long videos with continuation tokens
async function fetchChannelVideosFull(handle: string, channelName: string, channelAvatar: string) {
  const videos: any[] = [];
  try {
    const url = `https://www.youtube.com/${handle}/videos`;
    const res = await fetch(url, { headers: YOUTUBE_HEADERS });
    if (!res.ok) return videos;

    const html = await res.text();
    const initialVideos = parseLockupBlocks(html, channelName, channelAvatar);
    for (const v of initialVideos) {
      if (!videos.some((x) => x.youtubeId === v.youtubeId)) videos.push(v);
    }

    const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"(.*?)"/);
    const apiKey = apiKeyMatch ? apiKeyMatch[1] : null;
    let contMatch = html.match(/"continuationCommand":\{"token":"(.*?)"/);
    let contToken = contMatch ? contMatch[1] : null;

    let maxPages = 20;
    while (contToken && apiKey && maxPages > 0) {
      maxPages--;
      try {
        const itRes = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': YOUTUBE_HEADERS['User-Agent'],
          },
          body: JSON.stringify({
            context: {
              client: { clientName: 'WEB', clientVersion: '2.20240101.00.00', hl: 'vi', gl: 'VN' },
            },
            continuation: contToken,
          }),
        });
        if (!itRes.ok) break;
        const data = await itRes.json();
        const itStr = JSON.stringify(data);
        const nextBatch = parseLockupBlocks(itStr, channelName, channelAvatar);
        for (const v of nextBatch) {
          if (!videos.some((x) => x.youtubeId === v.youtubeId)) videos.push(v);
        }
        const nextContMatch = itStr.match(/"continuationCommand":\{"token":"(.*?)"/);
        contToken = nextContMatch ? nextContMatch[1] : null;
      } catch (err) {
        break;
      }
    }
  } catch (err) {
    console.error('Error fetching channel videos:', err);
  }
  return videos;
}

// Helper: Parse shorts from shortsLockupViewModel blocks
function parseShortsBlocks(htmlOrJson: string, defaultChannel: string = 'Kênh YouTube', defaultAvatar?: string) {
  const shorts: any[] = [];
  const shortBlocks = htmlOrJson.split('"shortsLockupViewModel":');
  for (let i = 1; i < shortBlocks.length; i++) {
    const b = shortBlocks[i];
    const idM = b.match(/"videoId":"([a-zA-Z0-9_-]{11})"/) || b.match(/"entityId":"(?:shorts-shelf-item-)?([a-zA-Z0-9_-]{11})"/);
    const accM = b.match(/"accessibilityText":"(.*?)"/);
    const titleM = b.match(/"overlayMetadata":\{.*?"primaryText":\{.*?"content":"(.*?)"/);
    if (idM) {
      const vidId = idM[1];
      let title = titleM
        ? titleM[1]
        : accM
        ? accM[1].replace(/,\s*[0-9.,]+\s*(?:views|lượt xem).*$/i, '')
        : 'Short Video';
      try {
        title = JSON.parse('"' + title + '"');
      } catch {}
      if (!shorts.some((x) => x.youtubeId === vidId)) {
        shorts.push({
          youtubeId: vidId,
          title,
          channel: defaultChannel,
          channelAvatar: defaultAvatar,
          duration: '0:60',
          thumbnail: `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
          isShort: true,
        });
      }
    }
  }
  return shorts;
}

// Helper: Fetch all channel shorts
async function fetchChannelShortsFull(handle: string, channelName: string, channelAvatar: string) {
  const shorts: any[] = [];
  try {
    const url = `https://www.youtube.com/${handle}/shorts?nocache=${Date.now()}`;
    const res = await fetch(url, { headers: { ...YOUTUBE_HEADERS, 'Cache-Control': 'no-cache' } });
    if (!res.ok) return shorts;

    const html = await res.text();
    const parsedInitial = parseShortsBlocks(html, channelName, channelAvatar);
    for (const s of parsedInitial) {
      if (!shorts.some((x) => x.youtubeId === s.youtubeId)) shorts.push(s);
    }

    const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"(.*?)"/);
    const apiKey = apiKeyMatch ? apiKeyMatch[1] : null;
    let contMatch = html.match(/"continuationCommand":\{"token":"(.*?)"/);
    let contToken = contMatch ? contMatch[1] : null;
    let maxPages = 10;

    while (contToken && apiKey && maxPages > 0) {
      maxPages--;
      try {
        const itRes = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': YOUTUBE_HEADERS['User-Agent'],
          },
          body: JSON.stringify({
            context: {
              client: { clientName: 'WEB', clientVersion: '2.20240101.00.00', hl: 'vi', gl: 'VN' },
            },
            continuation: contToken,
          }),
        });
        if (!itRes.ok) break;
        const data = await itRes.json();
        const itStr = JSON.stringify(data);
        const nextBatch = parseShortsBlocks(itStr, channelName, channelAvatar);
        for (const s of nextBatch) {
          if (!shorts.some((x) => x.youtubeId === s.youtubeId)) shorts.push(s);
        }
        const nextContMatch = itStr.match(/"continuationCommand":\{"token":"(.*?)"/);
        contToken = nextContMatch ? nextContMatch[1] : null;
      } catch (e) {
        break;
      }
    }
  } catch (err) {
    console.error('Error fetching channel shorts:', err);
  }
  return shorts;
}

// Endpoint: Parse full YouTube Playlist with pagination
app.get('/api/podcast/playlist', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  try {
    const playlistUrl = req.query.url as string;
    if (!playlistUrl) {
      return res.status(400).json({ error: 'Missing url query parameter' });
    }

    let plId = playlistUrl;
    if (playlistUrl.includes('list=')) {
      const match = playlistUrl.match(/list=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) plId = match[1];
    }

    const response = await fetch(`https://www.youtube.com/playlist?list=${plId}`, {
      headers: { ...YOUTUBE_HEADERS, 'Cache-Control': 'no-cache' },
    });

    if (!response.ok) {
      return res.status(404).json({ error: 'Không thể tải danh sách phát từ YouTube' });
    }

    const text = await response.text();
    const items: any[] = parseLockupBlocks(text, 'Danh sách phát');

    // Extract playlist title cleanly without carrying into description
    const plTitleMatch =
      text.match(/"playlistMetadataRenderer":\{.*?"title":"([^"]+)"/) ||
      text.match(/"metadata":\{"playlistMetadataRenderer":\{"title":"([^"]+)"/);
    let playlistTitle = 'Danh sách phát YouTube';
    if (plTitleMatch && plTitleMatch[1]) {
      try {
        playlistTitle = JSON.parse('"' + plTitleMatch[1] + '"');
      } catch {
        playlistTitle = plTitleMatch[1];
      }
    }

    // Follow continuation if playlist has more items
    const apiKeyMatch = text.match(/"INNERTUBE_API_KEY":"(.*?)"/);
    const apiKey = apiKeyMatch ? apiKeyMatch[1] : null;
    let contMatch = text.match(/"continuationCommand":\{"token":"(.*?)"/);
    let contToken = contMatch ? contMatch[1] : null;
    let maxPages = 10;

    while (contToken && apiKey && maxPages > 0) {
      maxPages--;
      try {
        const itRes = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': YOUTUBE_HEADERS['User-Agent'],
          },
          body: JSON.stringify({
            context: {
              client: { clientName: 'WEB', clientVersion: '2.20240101.00.00', hl: 'vi', gl: 'VN' },
            },
            continuation: contToken,
          }),
        });
        if (!itRes.ok) break;
        const data = await itRes.json();
        const itStr = JSON.stringify(data);
        const nextBatch = parseLockupBlocks(itStr, playlistTitle);
        for (const v of nextBatch) {
          if (!items.some((x) => x.youtubeId === v.youtubeId)) items.push(v);
        }
        const nextContMatch = itStr.match(/"continuationCommand":\{"token":"(.*?)"/);
        contToken = nextContMatch ? nextContMatch[1] : null;
      } catch (err) {
        break;
      }
    }

    // Fallback: If 0 items, regex find all videoId in HTML
    if (items.length === 0) {
      const rawIds = [...new Set([...text.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1]))];
      for (const vidId of rawIds.slice(0, 100)) {
        items.push({
          youtubeId: vidId,
          title: `Tập Podcast (${vidId})`,
          channel: playlistTitle,
          duration: '45:00',
          thumbnail: `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
          isShort: false,
        });
      }
    }

    return res.json({
      playlistId: plId,
      playlistTitle,
      totalCount: items.length,
      episodes: items,
    });
  } catch (error: any) {
    console.error('Error fetching playlist:', error);
    return res.status(500).json({ error: error.message || 'Lỗi khi tải playlist' });
  }
});

// Endpoint: Parse YouTube Channel (@handle/podcasts, @handle/playlists, @handle/videos, @handle)
app.get(['/api/podcast/channel', '/minhhieu/channel', '/minhhieu/api/podcast/channel'], async (req, res) => {
  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).json({ error: 'Missing url query parameter' });
    }

    const channelMatch =
      rawUrl.trim().match(/youtube\.com\/(@[^\/?&#]+)(?:\/([a-zA-Z0-9_-]+))?/i) ||
      rawUrl.trim().match(/^(@[^\/?&#]+)(?:\/([a-zA-Z0-9_-]+))?/i);

    if (!channelMatch) {
      return res.status(400).json({ error: 'URL không đúng định dạng kênh YouTube (@handle)' });
    }

    const handle = channelMatch[1]; // e.g. @minhhieureviewphim
    let tab = (channelMatch[2] || '').toLowerCase(); // 'podcasts', 'playlists', 'videos', or ''

    const fetchUrl = tab ? `https://www.youtube.com/${handle}/${tab}` : `https://www.youtube.com/${handle}`;
    const response = await fetch(fetchUrl, { headers: YOUTUBE_HEADERS });
    if (!response.ok) {
      return res.status(404).json({ error: `Không thể truy cập kênh ${handle}` });
    }

    const text = await response.text();

    // Extract channel metadata
    const titleMatch = text.match(/"channelMetadataRenderer":\{.*?"title":"(.*?)"/);
    const channelName = titleMatch ? titleMatch[1] : handle;
    const avatarMatch = text.match(/"avatar":\{"thumbnails":\[\{"url":"(.*?)"/);
    const channelAvatar = avatarMatch ? avatarMatch[1] : `https://ui-avatars.com/api/?name=${encodeURIComponent(channelName)}`;
    const subMatch = text.match(/"subscriberCountText":\{.*?"label":"(.*?)"/);
    const subscribers = subMatch ? subMatch[1] : 'Kênh YouTube';

    const channelInfo = {
      name: channelName,
      handle,
      avatar: channelAvatar,
      subscribers,
      youtubeUrl: `https://www.youtube.com/${handle}`,
      subscribeUrl: `https://www.youtube.com/${handle}?sub_confirmation=1`,
    };

    // Case 1: Tab /podcasts -> Extract all podcast playlists and their episodes
    if (tab === 'podcasts') {
      const blocks = text.split('"lockupViewModel":');
      const podcastSeries: any[] = [];
      const episodes: any[] = [];

      for (let i = 1; i < blocks.length; i++) {
        const b = blocks[i];
        const plMatch = b.match(/"playlistId":"(PL[a-zA-Z0-9_-]+)"/);
        const titleM = b.match(/"lockupMetadataViewModel":\{"title":\{"content":"(.*?)"\}/);
        if (plMatch && titleM) {
          const plId = plMatch[1];
          let plTitle = titleM[1];
          try {
            plTitle = JSON.parse('"' + plTitle + '"');
          } catch {}
          podcastSeries.push({ playlistId: plId, title: plTitle });
        }
      }

      // Fetch episodes from each podcast playlist
      for (const series of podcastSeries) {
        try {
          const plRes = await fetch(`https://www.youtube.com/playlist?list=${series.playlistId}`, {
            headers: YOUTUBE_HEADERS,
          });
          if (plRes.ok) {
            const plText = await plRes.text();
            const plEps = parseLockupBlocks(plText, channelName, channelAvatar);
            for (const ep of plEps) {
              if (!episodes.some((e) => e.youtubeId === ep.youtubeId)) {
                episodes.push({
                  ...ep,
                  seriesTitle: series.title,
                });
              }
            }
          }
        } catch (e) {
          console.warn('Error fetching podcast series:', series.playlistId, e);
        }
      }

      return res.json({
        type: 'podcasts',
        channel: channelInfo,
        series: podcastSeries,
        episodes,
        totalCount: episodes.length,
      });
    }

    // Case 2: Tab /playlists -> Extract all playlists of the channel
    if (tab === 'playlists') {
      const blocks = text.split('"lockupViewModel":');
      const playlists: any[] = [];

      for (let i = 1; i < blocks.length; i++) {
        const b = blocks[i];
        const plMatch = b.match(/"playlistId":"(PL[a-zA-Z0-9_-]+)"/);
        const titleM = b.match(/"lockupMetadataViewModel":\{"title":\{"content":"(.*?)"\}/);
        const imgM = b.match(/"url":"(https:\/\/i\.ytimg\.com\/vi\/[^\/]+\/[^"]+)"/);
        if (plMatch && titleM) {
          const plId = plMatch[1];
          let plTitle = titleM[1];
          try {
            plTitle = JSON.parse('"' + plTitle + '"');
          } catch {}
          if (!playlists.some((p) => p.playlistId === plId)) {
            playlists.push({
              playlistId: plId,
              title: plTitle,
              url: `https://www.youtube.com/playlist?list=${plId}`,
              thumbnail: imgM ? imgM[1].split('?')[0] : undefined,
            });
          }
        }
      }

      return res.json({
        type: 'playlists',
        channel: channelInfo,
        playlists,
        totalCount: playlists.length,
      });
    }

    // Case 3: Tab /videos or root channel -> Fetch ALL videos (both long-form and shorts) using continuation
    const [longVideos, shorts] = await Promise.all([
      fetchChannelVideosFull(handle, channelName, channelAvatar),
      fetchChannelShortsFull(handle, channelName, channelAvatar),
    ]);

    const allEpisodes = [...longVideos, ...shorts];

    return res.json({
      type: tab === 'videos' ? 'videos' : 'channel',
      channel: channelInfo,
      episodes: allEpisodes,
      longVideosCount: longVideos.length,
      shortsCount: shorts.length,
      totalCount: allEpisodes.length,
    });
  } catch (error: any) {
    console.error('Error fetching channel data:', error);
    return res.status(500).json({ error: error.message || 'Lỗi khi lấy thông tin kênh' });
  }
});

// Endpoint: Comprehensive Channel Fetch - Automatically fetches ALL Videos, Shorts, Podcasts & Playlists in 1 call
app.get(['/api/podcast/channel-full', '/minhhieu/channel-full', '/minhhieu/api/podcast/channel-full'], async (req, res) => {
  try {
    const rawUrl = (req.query.url as string) || 'https://www.youtube.com/@MinhHieuOfficialvn';
    const channelMatch =
      rawUrl.trim().match(/youtube\.com\/(@[^\/?&#]+)/i) || rawUrl.trim().match(/^(@[^\/?&#]+)/i);
    const handle = channelMatch ? channelMatch[1] : '@MinhHieuOfficialvn';

    // Fetch initial channel page to get channel name and avatar
    let channelName = 'Minh Hiếu Official';
    let channelAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(channelName)}`;
    let subscribers = 'Kênh YouTube';

    try {
      const baseRes = await fetch(`https://www.youtube.com/${handle}`, { headers: YOUTUBE_HEADERS });
      if (baseRes.ok) {
        const baseText = await baseRes.text();
        const titleMatch = baseText.match(/"channelMetadataRenderer":\{.*?"title":"(.*?)"/);
        if (titleMatch) channelName = titleMatch[1];
        const avatarMatch = baseText.match(/"avatar":\{"thumbnails":\[\{"url":"(.*?)"/);
        if (avatarMatch) channelAvatar = avatarMatch[1];
        const subMatch = baseText.match(/"subscriberCountText":\{.*?"label":"(.*?)"/);
        if (subMatch) subscribers = subMatch[1];
      }
    } catch {}

    const channelInfo = {
      name: channelName,
      handle,
      avatar: channelAvatar,
      subscribers,
      youtubeUrl: `https://www.youtube.com/${handle}`,
      subscribeUrl: `https://www.youtube.com/${handle}?sub_confirmation=1`,
    };

    // Parallel fetch: Full Long-form Videos (with continuation), Full Shorts, Podcasts tab, Playlists tab
    const [longVideos, shorts, podRes, plRes] = await Promise.all([
      fetchChannelVideosFull(handle, channelName, channelAvatar),
      fetchChannelShortsFull(handle, channelName, channelAvatar),
      fetch(`https://www.youtube.com/${handle}/podcasts`, { headers: YOUTUBE_HEADERS }),
      fetch(`https://www.youtube.com/${handle}/playlists`, { headers: YOUTUBE_HEADERS }),
    ]);

    // Combine all videos (long + shorts) = full 64 videos
    const allVideos: any[] = [...longVideos, ...shorts];

    // Parse Podcasts
    const allPodcasts: any[] = [];
    const podcastSeries: any[] = [];
    if (podRes.ok) {
      const podText = await podRes.text();
      const podBlocks = podText.split('"lockupViewModel":');
      for (let i = 1; i < podBlocks.length; i++) {
        const b = podBlocks[i];
        const plMatch = b.match(/"playlistId":"(PL[a-zA-Z0-9_-]+)"/);
        const titleM = b.match(/"lockupMetadataViewModel":\{"title":\{"content":"(.*?)"\}/);
        if (plMatch && titleM) {
          let plTitle = titleM[1];
          try {
            plTitle = JSON.parse('"' + plTitle + '"');
          } catch {}
          podcastSeries.push({ playlistId: plMatch[1], title: plTitle });
        }
      }

      // Fetch episodes for podcast series
      for (const series of podcastSeries) {
        try {
          const sRes = await fetch(`https://www.youtube.com/playlist?list=${series.playlistId}`, {
            headers: YOUTUBE_HEADERS,
          });
          if (sRes.ok) {
            const sText = await sRes.text();
            const sEps = parseLockupBlocks(sText, channelName, channelAvatar);
            for (const ep of sEps) {
              if (!allPodcasts.some((e) => e.youtubeId === ep.youtubeId)) {
                allPodcasts.push({
                  ...ep,
                  seriesTitle: series.title,
                });
              }
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }

    // Parse Playlists
    const allPlaylists: any[] = [];
    if (plRes.ok) {
      const plText = await plRes.text();
      const plBlocks = plText.split('"lockupViewModel":');
      for (let i = 1; i < plBlocks.length; i++) {
        const b = plBlocks[i];
        const plMatch = b.match(/"playlistId":"(PL[a-zA-Z0-9_-]+)"/);
        const titleM = b.match(/"lockupMetadataViewModel":\{"title":\{"content":"(.*?)"\}/);
        const imgM = b.match(/"url":"(https:\/\/i\.ytimg\.com\/vi\/[^\/]+\/[^"]+)"/);
        if (plMatch && titleM) {
          const plId = plMatch[1];
          let plTitle = titleM[1];
          try {
            plTitle = JSON.parse('"' + plTitle + '"');
          } catch {}
          if (!allPlaylists.some((p) => p.playlistId === plId)) {
            allPlaylists.push({
              playlistId: plId,
              title: plTitle,
              url: `https://www.youtube.com/playlist?list=${plId}`,
              thumbnail: imgM ? imgM[1].split('?')[0] : `https://i.ytimg.com/vi/P0MxHN62ZMs/hqdefault.jpg`,
            });
          }
        }
      }
    }

    return res.json({
      channel: channelInfo,
      videos: allVideos,
      longVideosCount: longVideos.length,
      shortsCount: shorts.length,
      podcasts: allPodcasts,
      podcastSeries: podcastSeries.map((s) => ({
        playlistId: s.playlistId,
        title: s.title,
        url: `https://www.youtube.com/playlist?list=${s.playlistId}`,
        episodeCount: allPodcasts.filter((p) => p.seriesTitle === s.title).length,
      })),
      playlists: allPlaylists,
      totalVideos: allVideos.length,
      totalPodcasts: allPodcasts.length,
      totalPlaylists: allPlaylists.length,
    });
  } catch (error: any) {
    console.error('Error fetching full channel:', error);
    return res.status(500).json({ error: error.message || 'Lỗi khi tải thông tin toàn bộ kênh' });
  }
});

// Endpoint: Lightweight Check for New YouTube Uploads (Auto-sync / polling)
app.get(['/api/podcast/check-updates', '/minhhieu/check-updates', '/minhhieu/api/podcast/check-updates'], async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  try {
    const rawUrl = (req.query.url as string) || 'https://www.youtube.com/@MinhHieuOfficialvn';
    const channelMatch =
      rawUrl.trim().match(/youtube\.com\/(@[^\/?&#]+)/i) || rawUrl.trim().match(/^(@[^\/?&#]+)/i);
    const handle = channelMatch ? channelMatch[1] : '@MinhHieuOfficialvn';

    // Fetch the latest videos and shorts from YouTube without cache, plus official RSS feed
    const [vRes, sRes, rssRes] = await Promise.all([
      fetch(`https://www.youtube.com/${handle}/videos?nocache=${Date.now()}`, {
        headers: { ...YOUTUBE_HEADERS, 'Cache-Control': 'no-cache' },
      }),
      fetch(`https://www.youtube.com/${handle}/shorts?nocache=${Date.now()}`, {
        headers: { ...YOUTUBE_HEADERS, 'Cache-Control': 'no-cache' },
      }),
      fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=UCUr78N1iiRNyg_UoBgtPPhw`, {
        headers: { ...YOUTUBE_HEADERS, 'Cache-Control': 'no-cache' },
      }).catch(() => null),
    ]);

    let latestVideos: any[] = [];
    if (vRes.ok) {
      const vText = await vRes.text();
      latestVideos = parseLockupBlocks(vText, 'Minh Hiếu review phim');
    }

    let latestShorts: any[] = [];
    if (sRes.ok) {
      const sText = await sRes.text();
      latestShorts = parseShortsBlocks(sText, 'Minh Hiếu review phim');
    }

    let allLatest = [...latestVideos, ...latestShorts];

    // Merge in any newly uploaded video from RSS feed that may not have rendered in HTML yet
    if (rssRes && rssRes.ok) {
      const rssText = await rssRes.text();
      const entries = rssText.split('<entry>');
      for (let i = 1; i < entries.length; i++) {
        const ent = entries[i];
        const vidM = ent.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
        const titleM = ent.match(/<title>(.*?)<\/title>/);
        if (vidM && titleM) {
          const vId = vidM[1];
          if (!allLatest.some((x) => x.youtubeId === vId)) {
            const isShort = titleM[1].toLowerCase().includes('#shorts') || titleM[1].toLowerCase().includes('video ngắn');
            allLatest.unshift({
              youtubeId: vId,
              title: titleM[1],
              channel: 'Minh Hiếu review phim',
              duration: isShort ? '00:60' : '03:30',
              thumbnail: `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`,
              isShort,
            });
          }
        }
      }
    }

    return res.json({
      success: true,
      handle,
      checkedAt: new Date().toISOString(),
      totalFound: allLatest.length,
      latestVideos: allLatest,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Lỗi khi kiểm tra video mới' });
  }
});

// Endpoint: Check whether video IDs are active or deleted on YouTube
app.post(['/api/youtube/check-alive', '/minhhieu/api/youtube/check-alive'], async (req, res) => {
  try {
    const ids: string[] = req.body.ids || [];
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.json({ alive: [], dead: [] });
    }
    const checkOne = async (id: string) => {
      try {
        const oRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`, {
          headers: YOUTUBE_HEADERS,
        });
        return { id, alive: oRes.ok };
      } catch {
        return { id, alive: true };
      }
    };
    const results = await Promise.all(ids.slice(0, 100).map(checkOne));
    const alive = results.filter((r) => r.alive).map((r) => r.id);
    const dead = results.filter((r) => !r.alive).map((r) => r.id);
    return res.json({ alive, dead });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Endpoint: Batch fetch YouTube metadata for multiple URLs/IDs
app.post('/api/podcast/batch-meta', async (req, res) => {
  try {
    const { urls } = req.body as { urls: string[] };
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'urls must be a non-empty array' });
    }

    const results = await Promise.all(
      urls.slice(0, 20).map(async (u) => {
        try {
          const formattedUrl = u.startsWith('http') ? u : `https://www.youtube.com/watch?v=${u}`;
          const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(formattedUrl)}&format=json`;
          const resp = await fetch(oembedUrl);
          if (resp.ok) {
            const d = await resp.json();
            return {
              url: formattedUrl,
              title: d.title,
              author: d.author_name,
              authorUrl: d.author_url,
              thumbnail: d.thumbnail_url,
              success: true,
            };
          }
          return { url: formattedUrl, success: false };
        } catch {
          return { url: u, success: false };
        }
      })
    );

    return res.json({ episodes: results });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Endpoint: Search across all of YouTube with auto link/ID resolution
app.get(['/api/youtube/search', '/minhhieu/api/youtube/search'], async (req, res) => {
  try {
    const q = ((req.query.q as string) || '').trim();
    if (!q) {
      return res.status(400).json({ error: 'Missing query parameter q' });
    }

    // Check if query is a direct video ID or YouTube URL
    const idMatch =
      q.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/) ||
      (q.length === 11 && q.match(/^[a-zA-Z0-9_-]{11}$/) ? [, q] : null);

    if (idMatch && idMatch[1]) {
      const vidId = idMatch[1];
      try {
        const oRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vidId}&format=json`, {
          headers: YOUTUBE_HEADERS,
        });
        if (oRes.ok) {
          const d = await oRes.json();
          return res.json({
            results: [
              {
                youtubeId: vidId,
                title: d.title || 'Video YouTube',
                channel: d.author_name || 'YouTube Video',
                duration: '10:00',
                thumbnail: d.thumbnail_url || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
                isShort: q.includes('shorts'),
              },
            ],
            query: q,
          });
        }
      } catch {}
    }

    // Search on YouTube HTML
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=vi&gl=VN`;
    const ytRes = await fetch(searchUrl, { headers: YOUTUBE_HEADERS });
    if (!ytRes.ok) {
      return res.status(ytRes.status).json({ error: 'YouTube search failed' });
    }

    const html = await ytRes.text();
    const videos: any[] = [];

    // 1. Try lockup blocks
    const lockupItems = parseLockupBlocks(html);
    for (const item of lockupItems) {
      if (!videos.some((v) => v.youtubeId === item.youtubeId)) {
        videos.push(item);
      }
    }

    // 2. Parse videoRenderer blocks
    const vrBlocks = html.split('"videoRenderer":');
    for (let i = 1; i < vrBlocks.length && videos.length < 35; i++) {
      const b = vrBlocks[i];
      const vidMatch = b.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      const titleMatch =
        b.match(/"title":\{"runs":\[\{"text":"(.*?)"\}/) ||
        b.match(/"title":\{"accessibility":\{"accessibilityData":\{"label":"(.*?)"\}/);
      const ownerMatch =
        b.match(/"ownerText":\{"runs":\[\{"text":"(.*?)"/) ||
        b.match(/"longBylineText":\{"runs":\[\{"text":"(.*?)"/);
      const lengthMatch =
        b.match(/"lengthText":\{.*?"simpleText":"(.*?)"/) ||
        b.match(/"thumbnailOverlayTimeStatusRenderer":\{"text":\{"simpleText":"(.*?)"/);
      const viewMatch =
        b.match(/"viewCountText":\{.*?"simpleText":"(.*?)"/) ||
        b.match(/"shortViewCountText":\{.*?"simpleText":"(.*?)"/);

      if (vidMatch && titleMatch) {
        const vidId = vidMatch[1];
        let title = titleMatch[1];
        try {
          title = JSON.parse('"' + title + '"');
        } catch {}
        const channel = ownerMatch ? ownerMatch[1] : 'YouTube Creator';
        const duration = lengthMatch ? lengthMatch[1] : '05:00';
        const views = viewMatch ? viewMatch[1] : '';

        if (!videos.some((v) => v.youtubeId === vidId)) {
          videos.push({
            youtubeId: vidId,
            title,
            channel,
            duration,
            views,
            thumbnail: `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
            isShort: duration === '0:60' || duration === '00:60' || title.toLowerCase().includes('#shorts'),
          });
        }
      }
    }

    return res.json({ results: videos, query: q });
  } catch (err: any) {
    console.error('YouTube search error:', err);
    return res.status(500).json({ error: err.message || 'Lỗi tìm kiếm YouTube' });
  }
});

// Endpoint: AI Podcast Companion using Gemini 3.8 Flash
app.post('/api/podcast/ai', async (req, res) => {
  try {
    const { action, title, host, description, videoId, question } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Episode title is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY chưa được cấu hình. Vui lòng thêm khóa trong cài đặt.',
      });
    }

    let systemInstruction = `Bạn là Trợ lý Thông minh Podcast tiếng Việt chuyên nghiệp dành cho thính giả nghe Podcast YouTube.
Bạn có khả năng phân tích sâu sắc, truyền cảm hứng, đúc kết súc tích các bài học, cấu trúc thời gian và giải đáp thắc mắc của người nghe.
Ngôn ngữ phản hồi: Tiếng Việt tự nhiên, súc tích, văn phong hiện đại và truyền cảm hứng.`;

    let userPrompt = '';

    if (action === 'summary') {
      userPrompt = `Hãy phân tích và tóm tắt tập Podcast sau:
Tên tập: "${title}"
Kênh / Host: "${host || 'Không rõ'}"
Mô tả / Thông tin: "${description || 'Tập podcast thảo luận chuyên sâu'}"

Hãy trả về định dạng rõ ràng gồm:
1. 💡 **Tổng quan ngắn gọn** (2-3 câu nêu bật tinh thần cốt lõi của tập).
2. 🔑 **3-4 Bài học đắt giá nhất (Key Takeaways)**: Mỗi bài học có tiêu đề và giải thích ngắn gọn, thực tế.
3. 🚀 **Hành động cụ thể hôm nay**: 1 việc người nghe có thể áp dụng ngay vào cuộc sống hoặc công việc sau khi nghe tập này.`;
    } else if (action === 'chapters') {
      userPrompt = `Dựa trên tập Podcast:
Tên tập: "${title}"
Kênh / Host: "${host || 'Không rõ'}"
Mô tả: "${description || ''}"

Hãy xây dựng một Dòng thời gian / Mục lục các chương (Timeline & Chapters) gợi ý cho tập Podcast này với các mốc thời gian ước lượng (ví dụ: [00:00], [05:30], [15:20], [28:45], [42:10],...).
Mỗi chương gồm:
- Mốc thời gian [MM:SS]
- Tên chủ đề súc tích
- 1 câu tóm lược nội dung thảo luận`;
    } else if (action === 'quotes') {
      userPrompt = `Từ chủ đề của tập Podcast:
Tên tập: "${title}"
Kênh / Host: "${host || 'Không rõ'}"

Hãy đúc kết 3 câu danh ngôn / trích dẫn truyền cảm hứng nhất liên quan đến chủ đề của tập podcast này, kèm theo ý nghĩa sâu sắc đằng sau mỗi câu.`;
    } else if (action === 'qa') {
      if (!question) {
        return res.status(400).json({ error: 'Question is required for Q&A' });
      }
      userPrompt = `Người nghe đang lắng nghe tập Podcast:
Tên tập: "${title}"
Kênh / Host: "${host || 'Không rõ'}"
Mô tả: "${description || ''}"

Câu hỏi của người nghe: "${question}"

Hãy trả lời câu hỏi của người nghe một cách sâu sắc, thực tế và bám sát tinh thần của chủ đề podcast này.`;
    } else {
      userPrompt = `Phân tích ngắn gọn chủ đề của tập Podcast "${title}" của "${host || ''}".`;
    }

    // Attempt generation with gemini-3.8-flash and an 8-second timeout
    let outputText = '';
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Model timeout')), 8000)
      );

      const genPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const response: any = await Promise.race([genPromise, timeoutPromise]);
      if (response && response.text) {
        outputText = response.text;
      }
    } catch (err: any) {
      console.warn('Gemini call failed or timed out:', err?.message || err);
    }

    if (!outputText) {
      // If all upstream calls had temporary 503 spikes, provide a helpful curated fallback
      if (action === 'summary') {
        outputText = `💡 **Tổng quan ngắn gọn**\nTập podcast "${title}" do ${host || 'kênh'} thực hiện mang đến những cuộc đối thoại chân thực, đa chiều và giàu giá trị thực tiễn cho thính giả.\n\n🔑 **Bài học đắt giá nhất (Key Takeaways)**:\n1. **Xây dựng hệ giá trị vững vàng**: Tập trung vào những gì bền vững thay vì chạy theo sự công nhận tức thời bên ngoài.\n2. **Tập trung vào hiện tại**: Rèn luyện kỷ luật và sự thấu hiểu chính mình qua từng trải nghiệm hàng ngày.\n3. **Học cách lắng nghe**: Lắng nghe cơ thể và cảm xúc để điều chỉnh nhịp sống phù hợp.\n\n🚀 **Hành động hôm nay**: Dành 15 phút ghi chép lại những điều bạn tâm đắc nhất từ tập này và thực hiện 1 mục tiêu nhỏ trong ngày.`;
      } else if (action === 'chapters') {
        outputText = `[00:00] Giới thiệu khách mời & Mở đầu chủ đề\n[05:30] Khởi điểm hành trình & Những trải nghiệm ban đầu\n[18:45] Bài học đắt giá và bước ngoặt tư duy\n[32:20] Thảo luận chuyên sâu & Giải pháp thực tế\n[48:10] Lời khuyên dành cho thính giả & Đúc kết`;
      } else if (action === 'quotes') {
        outputText = `1. *"Đừng cố gắng chứng tỏ bản thân trong bất kỳ giai đoạn nào, hãy để kết quả và sự chân thành tự lên tiếng."*\n2. *"Thành công không phải là đích đến cố định, mà là cảm giác bình an với con đường mình đã chọn."*\n3. *"Khi bạn hiểu rõ mình là ai, bạn sẽ không còn sợ hãi trước những biến động xung quanh."*`;
      } else {
        outputText = `Chủ đề của tập "${title}" mang lại nhiều góc nhìn sâu sắc. Hãy tiếp tục lắng nghe để rút ra những bài học phù hợp nhất với bản thân bạn.`;
      }
    }

    return res.json({ result: outputText });
  } catch (error: any) {
    console.error('Error in AI Podcast route:', error);
    return res.status(500).json({
      error: error.message || 'Lỗi khi tạo phân tích AI cho Podcast',
    });
  }
});

// Endpoint 1: Multimodal OCR - Scanned PDF & Image to Word Text
app.post(['/api/ai/ocr-doc', '/minhhieu/api/ai/ocr-doc'], async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', fileName } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    // Clean data URL prefix if present
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const prompt = `Bạn là chuyên gia OCR (Nhận dạng ký tự quang học) và phục chế tài liệu tiếng Việt hàng đầu.
Nhiệm vụ của bạn: Quét toàn bộ hình ảnh tài liệu/trang PDF scan được cung cấp và chuyển đổi sang văn bản định dạng phong phú (Rich Text) tương thích hoàn hảo với Microsoft Word.
Yêu cầu bắt buộc:
1. Nhận diện chính xác 100% tiếng Việt có dấu, không bỏ sót từ ngữ, số liệu hay ký tự đặc biệt.
2. Giữ nguyên cấu trúc nguyên bản: Tiêu đề (ĐẬM/TO), đề mục I, II, 1, 2, gạch đầu dòng, danh sách, và bảng biểu (dùng cú pháp bảng Markdown).
3. Nếu là hợp đồng, văn bản hành chính, hóa đơn, bài báo hoặc tài liệu học thuật: Giữ trọn vẹn thể thức và dấu câu.
4. Trả về kết quả văn bản sạch sẽ, sẵn sàng để xuất file Word (.docx / .doc).`;

    let extractedText = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
        ],
        config: {
          temperature: 0.2,
        },
      });
      extractedText = response.text || '';
    } catch (err: any) {
      console.error('Gemini OCR error:', err);
      return res.status(500).json({ error: 'Không thể nhận dạng tài liệu: ' + (err.message || 'Lỗi xử lý') });
    }

    return res.json({
      success: true,
      fileName: fileName || 'tai-lieu-ocr',
      text: extractedText,
    });
  } catch (error: any) {
    console.error('OCR Route error:', error);
    return res.status(500).json({ error: error.message || 'Lỗi máy chủ OCR' });
  }
});

// Endpoint 2: AI Script & 3-Scene Video Storyboard Generator (10s each -> stitched to 30s)
app.post(['/api/ai/generate-script-scenes', '/minhhieu/api/ai/generate-script-scenes'], async (req, res) => {
  try {
    const { topic, style = 'Review phim & Triết lý', aspectRatio = '9:16', defaultVoiceGender = 'Nam' } = req.body;
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const systemInstruction = `Bạn là Nhà biên kịch & Đạo diễn Video ngắn 30s (TikTok, Shorts, Reels, YouTube) số 1 Việt Nam.
Nhiệm vụ: Tạo kịch bản gồm ĐÚNG 3 PHÂN CẢNH, MỖI CẢNH ĐÚNG 10 GIÂY (Tổng thời lượng = 30 giây).
ĐẶC BIỆT: Phân cảnh có lời thoại nhân vật và người dẫn truyện chân thực, hỗ trợ gán giọng lồng tiếng EverAI đa dạng (Nam, Nữ, Minh Hiếu).
Quy tắc độ dài 10 giây: Mỗi cảnh lời lồng tiếng (narration) có độ dài vừa vặn khoảng 22 - 28 từ tiếng Việt, chứa cảm xúc, nhịp điệu cuốn hút, có thể là lời dẫn chuyện hoặc lời thoại trực tiếp của nhân vật nam / nữ.
Tuyệt đối không dùng văn mẫu chung chung mà phải bám sát 100% tình tiết, cốt truyện, xung đột của chủ đề người dùng đưa vào.`;

    const userPrompt = `Chủ đề câu chuyện: "${topic}"
Phong cách: "${style}"
Tỉ lệ khung hình: "${aspectRatio}"
Giới tính giọng chính mong muốn: "${defaultVoiceGender}"

Hãy viết kịch bản 3 CẢNH ĐỘNG kịch tính và ý nghĩa:
- Cảnh 1 (0s - 10s): Hook mở màn cực cuốn, giới thiệu nhân vật và mâu thuẫn/bối cảnh đặc sắc.
- Cảnh 2 (10s - 20s): Đỉnh điểm cao trào, bước ngoặt kịch tính hoặc câu thoại đắt giá của nhân vật nam/nữ.
- Cảnh 3 (20s - 30s): Đúc kết triết lý nhân sinh sâu sắc, sự chuyển hóa cảm xúc và thông điệp lay động lòng người.

Trả về đối tượng JSON theo cấu trúc sau:
{
  "title": "Tiêu đề video thật giật gân, cuốn hút",
  "aspectRatio": "${aspectRatio}",
  "totalDuration": 30,
  "theme": "Chủ đề cốt lõi",
  "scenes": [
    {
      "sceneNumber": 1,
      "name": "Tên phân cảnh 1 ấn tượng",
      "duration": 10,
      "timeRange": "00:00 - 00:10",
      "characterName": "Tên nhân vật hoặc Người dẫn chuyện",
      "characterGender": "Nam hoặc Nữ",
      "recommendedVoice": "voice-74bb4b22-98a7-41a4 (Minh Hiếu) hoặc vi_female_kieunhi_mn (Nữ Miền Nam) hoặc voice-f9ae90f1-12e4-470d (Nam Kịch Tính)",
      "narration": "Lời lồng tiếng tiếng Việt chân thực, sâu sắc, đúng ~25 từ",
      "subtitle": "Phụ đề ngắn gọn, bắt tai trên màn hình",
      "visualPrompt": "Detailed English image generation prompt describing dynamic cinematography, atmospheric lighting, high details, 8k",
      "cameraMotion": "zoom-in",
      "motionPreset": "cinematic-zoom"
    },
    {
      "sceneNumber": 2,
      "name": "Tên phân cảnh 2 cao trào",
      "duration": 10,
      "timeRange": "00:10 - 00:20",
      "characterName": "Tên nhân vật hoặc Người dẫn chuyện",
      "characterGender": "Nam hoặc Nữ",
      "recommendedVoice": "voice-f9ae90f1-12e4-470d hoặc vi_female_thuytrang_mb",
      "narration": "Lời thoại cao trào tiếng Việt sâu sắc, đúng ~25 từ",
      "subtitle": "Phụ đề cao trào",
      "visualPrompt": "Detailed English prompt for scene 2 with dramatic dynamic motion",
      "cameraMotion": "pan-right",
      "motionPreset": "pan-parallax"
    },
    {
      "sceneNumber": 3,
      "name": "Tên phân cảnh 3 ý nghĩa kết thúc",
      "duration": 10,
      "timeRange": "00:20 - 00:30",
      "characterName": "Tên nhân vật hoặc Người dẫn chuyện",
      "characterGender": "Nam hoặc Nữ",
      "recommendedVoice": "voice-ab888766-b59f-402b (Giảng Đạo) hoặc vi_female_kieunhi_mn",
      "narration": "Lời đúc kết lắng đọng tiếng Việt, đúng ~25 từ",
      "subtitle": "Phụ đề đúc kết",
      "visualPrompt": "Detailed English prompt for scene 3 with epic serene lighting",
      "cameraMotion": "zoom-out",
      "motionPreset": "epic-sweep"
    }
  ]
}`;

    let jsonResult: any = null;
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: userPrompt,
          config: {
            systemInstruction,
            temperature: 0.75,
            responseMimeType: 'application/json',
          },
        });

        const rawText = response.text || '';
        try {
          jsonResult = JSON.parse(rawText.trim());
        } catch {
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) {
            jsonResult = JSON.parse(match[0]);
          }
        }
      } catch (err: any) {
        const isPermDenied =
          err?.status === 403 ||
          err?.message?.includes('PERMISSION_DENIED') ||
          err?.message?.includes('denied access');
        if (!isPermDenied) {
          console.warn('Gemini script generation fallback:', err?.message || err);
        }
      }
    }

    if (!jsonResult || !jsonResult.scenes || jsonResult.scenes.length !== 3) {
      // Dynamic synthesis directly tailored to topic
      const isAncient = /xuyên không|cổ trang|triều đình|hoàng đế|cung đấu/i.test(topic);
      const isBuddhist = /phật|đạo lý|nhân quả|nhân sinh|thiền|chùa|tâm linh/i.test(topic);
      const isFamily = /mẹ|cha|gia đình|con cái|hiếu|quê hương/i.test(topic);

      const sc1Name = isAncient ? 'Xuyên Không & Khởi Điểm Bất Ngờ' : isBuddhist ? 'Duyên Khởi & Soi Rọi Tâm Hồn' : isFamily ? 'Nỗi Niềm & Bến Đỗ Bình Yên' : 'Khởi Điểm: Bí Ẩn Bùng Nổ';
      const sc2Name = isAncient ? 'Đối Đầu Quyền Lực & Trí Tuệ' : isBuddhist ? 'Nghịch Cảnh & Thử Thách Lòng Người' : isFamily ? 'Sóng Gió & Tình Thâm Bất Diệt' : 'Cao Trào: Bước Ngoặt Sinh Tử';
      const sc3Name = isAncient ? 'Xoay Chuyển Cục Diện & Chân Lý' : isBuddhist ? 'Giác Ngộ Chân Lý & An Lạc' : isFamily ? 'Về Lại Mái Ấm & Yêu Thương' : 'Đỉnh Điểm: Bài Học Nhân Sinh';

      jsonResult = {
        title: `Phim Ngắn 30s: ${topic}`,
        aspectRatio,
        totalDuration: 30,
        theme: style,
        scenes: [
          {
            sceneNumber: 1,
            name: sc1Name,
            duration: 10,
            timeRange: '00:00 - 00:10',
            characterName: 'Người dẫn chuyện',
            characterGender: 'Nam',
            recommendedVoice: 'voice-74bb4b22-98a7-41a4',
            narration: `Bước vào câu chuyện "${topic}", nơi định mệnh đưa đẩy nhân vật đối diện biến cố không ai lường trước được.`,
            subtitle: `Khởi đầu: ${topic.slice(0, 35)}...`,
            visualPrompt: `Cinematic establishing shot about ${topic}, breathtaking composition, dynamic volumetric lighting, photorealistic 8k`,
            cameraMotion: 'zoom-in',
            motionPreset: 'cinematic-zoom',
          },
          {
            sceneNumber: 2,
            name: sc2Name,
            duration: 10,
            timeRange: '00:10 - 00:20',
            characterName: 'Nhân vật chính',
            characterGender: 'Nữ',
            recommendedVoice: 'vi_female_kieunhi_mn',
            narration: `Đối diện hiểm nguy trùng trùng, chỉ có bản lĩnh kiên định và trí tuệ mẫn tiệp mới giúp lật ngược thế cờ hiểm hóc.`,
            subtitle: 'Bản lĩnh sắt son giữa nghịch cảnh dữ dội',
            visualPrompt: `Dramatic emotional climax related to ${topic}, intense atmosphere, hyper-detailed, golden rim light, 8k render`,
            cameraMotion: 'pan-right',
            motionPreset: 'pan-parallax',
          },
          {
            sceneNumber: 3,
            name: sc3Name,
            duration: 10,
            timeRange: '00:20 - 00:30',
            characterName: 'Minh Hiếu (Đạo lý)',
            characterGender: 'Nam',
            recommendedVoice: 'voice-ab888766-b59f-402b',
            narration: `Khép lại tất cả, hào quang lớn nhất của một đời người chính là giữ được sự lương thiện và an yên trong tâm hồn.`,
            subtitle: 'Tâm an giữa vạn biến cuộc đời',
            visualPrompt: `Inspiring epic sunrise, peaceful spiritual atmosphere, gentle breeze, breathtaking masterpiece landscape`,
            cameraMotion: 'zoom-out',
            motionPreset: 'epic-sweep',
          },
        ],
      };
    }

    return res.json(jsonResult);
  } catch (error: any) {
    console.error('Script scenes error:', error);
    return res.status(500).json({ error: error.message || 'Lỗi tạo kịch bản' });
  }
});

// Endpoint 3: AI Image Generation / Prompt Enhancer
app.post(['/api/ai/generate-image', '/minhhieu/api/ai/generate-image'], async (req, res) => {
  try {
    const { prompt, aspectRatio = '9:16' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Generate optimized visual English prompt for pristine imagery
    let optimizedPrompt = prompt;
    try {
      const resp = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Translate and refine this image prompt into an English high-detail digital art prompt with cinematic lighting, vivid colors, photorealistic texture: "${prompt}". Return ONLY the refined English prompt text in 1 line.`,
        config: { temperature: 0.5 },
      });
      if (resp.text) optimizedPrompt = resp.text.trim();
    } catch {}

    const seed = Math.floor(Math.random() * 1000000);
    const width = aspectRatio === '9:16' ? 720 : 1280;
    const height = aspectRatio === '9:16' ? 1280 : 720;
    const encoded = encodeURIComponent(optimizedPrompt.slice(0, 300));
    const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

    return res.json({
      imageUrl,
      prompt: optimizedPrompt,
      aspectRatio,
    });
  } catch (error: any) {
    console.error('Generate image error:', error);
    return res.status(500).json({ error: error.message || 'Lỗi tạo ảnh AI' });
  }
});

// Endpoint 4: AI Song & Lyrics Studio - Sáng tác Ca Khúc Dân Ca Miền Tây Nam Bộ
app.post(['/api/ai/generate-song', '/minhhieu/api/ai/generate-song'], async (req, res) => {
  try {
    const {
      prompt,
      style = 'Dân ca miền Tây Nam Bộ',
      vocalType = 'Nữ miền Nam ngọt ngào',
      customLyrics = '',
    } = req.body;

    const systemInstruction = `Bạn là Nhạc sĩ & Soạn giả chuyên nghiệp hàng đầu về Dân Ca Nam Bộ, Đờn Ca Tài Tử, Tân Cổ Giao Duyên và Nhạc Trữ Tình Quê Hương Miền Tây.
Bạn am hiểu sâu sắc các điệu lý (Lý Qua Cầu, Lý Chim Quyên, Lý Cây Bông, Lý Mỹ Hưng, Lý Con Khỉ, Lý Đất Giồng...), câu hò sông nước, điệu đờn kìm, đờn tranh, sáo trúc và câu vọng cổ ngọt ngào da diết.
Ngôn từ: Mộc mạc, thấm đượm tình quê sông nước miền Tây, dòng Cửu Long, cây bần, mái xuồng ba lá, bông điên điển, câu hò mẹ ru.`;

    const userPrompt = customLyrics
      ? `Người dùng có sẵn đoạn lời sau:\n"${customLyrics}"\nPhong cách yêu cầu: "${style}".\nHãy biên soạn thành bài hát hoàn chỉnh mang đậm âm sắc "${style}", bổ sung câu hò rao, điệu lý và cấu trúc trình diễn chuẩn xác.`
      : `Hãy sáng tác một ca khúc hoàn chỉnh theo phong cách mặc định: "${style}".
Chủ đề / Cảm hứng: "${prompt || 'Tình quê miền Tây sông nước, câu hò bến đò xưa'}"
Giọng ca phù hợp: "${vocalType}".

Hãy trả về định dạng JSON DUY NHẤT:
{
  "title": "Tên bài hát đậm chất Nam Bộ",
  "style": "${style}",
  "musicalKey": "Điệu Hò / Điệu Oán / Điệu Bắc (ví dụ: Điệu Nam Ai, Giọng Rê thứ Dm)",
  "tempo": "Vừa phải, tha thiết (Chậm rãi, nhịp 2/4 hoặc 4/4)",
  "instruments": ["Đàn kìm", "Đàn tranh", "Sáo trúc", "Guitar phím lõm"],
  "introHò": "Câu hò mở đầu ngọt ngào (Hò ơ...)",
  "verses": [
    {
      "section": "Câu Rao & Hò",
      "lyrics": "Hò... ơ... Gió đưa gió đẩy về rẫy ăn còng...",
      "chords": "Dm - Am - Dm"
    },
    {
      "section": "Đoạn 1 (Lời 1)",
      "lyrics": "4-6 câu thơ lục bát hoặc câu hát mộc mạc",
      "chords": "Dm - F - C - Dm"
    },
    {
      "section": "Điệu Lý Nam Bộ",
      "lyrics": "Điệu lý vui tươi hoặc xao xuyến (ví dụ Lý Qua Cầu hoặc Lý Bông Trang)",
      "chords": "Gm - C - F - Dm"
    },
    {
      "section": "Đoạn 2 (Lời 2)",
      "lyrics": "4-6 câu tâm tình da diết",
      "chords": "Bb - C - Am - Dm"
    },
    {
      "section": "Điệp khúc (Chorus)",
      "lyrics": "Điệp khúc cao trào dạt dào tình quê",
      "chords": "F - C - Gm - Dm"
    },
    {
      "section": "Lời Kết (Outro)",
      "lyrics": "Câu hát ngân dài lắng đọng",
      "chords": "Am - Dm"
    }
  ],
  "fullLyricsText": "Toàn bộ lời bài hát sắp xếp liền mạch để sao chép hoặc in ấn",
  "storyMeaning": "1-2 câu giải thích ý nghĩa tâm tình đằng sau ca khúc"
}`;

    let songData: any = null;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.75,
        },
      });

      const rawText = response.text || '';
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        songData = JSON.parse(match[0]);
      }
    } catch (err: any) {
      console.warn('Song generation error:', err);
    }

    if (!songData || !songData.title) {
      songData = {
        title: 'Thương Nhớ Miền Tây',
        style: 'Dân ca miền Tây Nam Bộ',
        musicalKey: 'Điệu Nam Ai - Cung Oán (Rê thứ Dm)',
        tempo: 'Chậm rãi, tha thiết (Nhịp 4/4)',
        instruments: ['Đàn kìm', 'Đàn tranh', 'Sáo trúc', 'Guitar phím lõm'],
        introHò: 'Hò... ơ... Gió thổi ngọn bần, bần run bần rụng... Chớ em thương ai nhớ ai, mà đứng tựa mạn đò... ơ...',
        verses: [
          {
            section: 'Câu Rao & Hò Mở Đầu',
            lyrics: 'Hò... ơ... Gió đưa ngọn bần, mây chiều giăng lối sông Tiền.\nBến xưa ai đợi, bến xưa ai đợi cho lòng xao xuyến đầy vơi.',
            chords: 'Dm - Am - Dm',
          },
          {
            section: 'Đoạn 1 (Lời 1)',
            lyrics: 'Về lại miền Tây nghe phù sa reo trên đồng lúa\nMùa nước nổi năm nao con đò nhỏ rước đưa\nCây cầu khỉ chênh vênh mẹ gánh rau trưa nắng đổ\nThương quá câu hò, ngọt ngào câu hát quê hương.',
            chords: 'Dm - F - C - Dm',
          },
          {
            section: 'Điệu Lý Nam Bộ (Lý Mỹ Hưng)',
            lyrics: 'Bìm bịp kêu nước lớn ròng trôi\nThương người em gái mắt trong nụ cười\nNguyện cùng nhau sắt son trọn đời\nDù qua bao nổi trôi, phù sa ơi vẫn thắm nồng.',
            chords: 'Gm - C - F - Dm',
          },
          {
            section: 'Điệp khúc',
            lyrics: 'Ơi miền Tây, hạt gạo thơm lừng trên cánh đồng bát ngát\nTiếng đờn kìm buông lơi, ru ai giấc ngủ êm đềm\nĐi xa rồi lòng vẫn nhớ hoài miền Tây!',
            chords: 'F - C - Gm - Dm',
          },
          {
            section: 'Lời Kết (Outro)',
            lyrics: 'Gió ru dòng sông êm ả trôi về biển lớn... Miền Tây ơi thương trọn một đời!',
            chords: 'Am - Dm',
          },
        ],
        fullLyricsText: `[HÒ MỞ ĐẦU]\nHò... ơ... Gió đưa ngọn bần, mây chiều giăng lối sông Tiền...\nBến xưa ai đợi, bến xưa ai đợi cho lòng xao xuyến đầy vơi...\n\n[LỜI 1]\nVề lại miền Tây nghe phù sa reo trên đồng lúa\nMùa nước nổi năm nao con đò nhỏ rước đưa\nCây cầu khỉ chênh vênh mẹ gánh rau trưa nắng đổ\nThương quá câu hò, ngọt ngào câu hát quê hương.\n\n[ĐIỆU LÝ NAM BỘ]\nBìm bịp kêu nước lớn ròng trôi\nThương người em gái mắt trong nụ cười\nNguyện cùng nhau sắt son trọn đời\nDù qua bao nổi trôi, phù sa ơi vẫn thắm nồng.\n\n[ĐIỆP KHÚC]\nƠi miền Tây, hạt gạo thơm lừng trên cánh đồng bát ngát\nTiếng đờn kìm buông lơi, ru ai giấc ngủ êm đềm\nĐi xa rồi lòng vẫn nhớ hoài miền Tây!\n\n[LỜI KẾT]\nGió ru dòng sông êm ả trôi về biển lớn... Miền Tây ơi thương trọn một đời!`,
        storyMeaning: 'Khắc họa bức tranh quê hương Nam Bộ thanh bình, chở nặng ân tình mẹ cha và kỷ niệm thời thơ ấu bên dòng sông phù sa.',
      };
    }

    return res.json(songData);
  } catch (error: any) {
    console.error('Song route error:', error);
    return res.status(500).json({ error: error.message || 'Lỗi sáng tác bài hát' });
  }
});

// Endpoint 5: Cảm nhận lời theo ảnh (Vision to Song / Lyrics)
app.post(['/api/ai/lyrics-from-image', '/minhhieu/api/ai/lyrics-from-image'], async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', userPrompt = '', style = 'Dân ca miền Tây Nam Bộ' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const prompt = `Bạn là Nghệ sĩ & Nhạc sĩ Dân ca Nam Bộ tài hoa.
Người dùng gửi cho bạn một bức ảnh. Hãy nhìn thật sâu vào bức ảnh này:
1. Quan sát cảnh vật, màu sắc, ánh sáng, con người, thiên nhiên hoặc khoảnh khắc trong ảnh.
2. Cảm nhận tâm trạng, rung cảm, nỗi nhớ và cái tình ẩn giấu bên trong bức ảnh ("Cảm nhận lời theo ảnh").
3. Sáng tác một bài ca dao / lời bài hát hoàn chỉnh theo phong cách "${style}" (Dân ca miền Tây Nam Bộ, điệu hò, câu lý, vọng cổ).
Yêu cầu người dùng gửi kèm (nếu có): "${userPrompt}".

Trả về DUY NHẤT một chuỗi JSON hợp lệ:
{
  "title": "Tên bài hát xuất thần từ bức ảnh",
  "imagePerception": "2-3 câu mô tả cảm nhận nghệ thuật và hồn của bức ảnh",
  "style": "${style}",
  "introHò": "Câu hò hoặc câu rao mở màn tương ứng bức ảnh",
  "verses": [
    {
      "section": "Đoạn 1 (Tức cảnh sinh tình)",
      "lyrics": "Các câu hát gắn liền chi tiết trong ảnh",
      "chords": "Dm - C - Dm"
    },
    {
      "section": "Điệu Lý Dân Ca",
      "lyrics": "Điệu lý mộc mạc Nam Bộ",
      "chords": "Gm - C - Dm"
    },
    {
      "section": "Đoạn 2 (Tâm sự & Nỗi niềm)",
      "lyrics": "Nỗi lòng sâu lắng",
      "chords": "Bb - C - Dm"
    },
    {
      "section": "Điệp khúc",
      "lyrics": "Điệp khúc da diết",
      "chords": "F - C - Gm - Dm"
    },
    {
      "section": "Lời Kết",
      "lyrics": "Câu kết lắng đọng",
      "chords": "Am - Dm"
    }
  ],
  "fullLyricsText": "Toàn bộ lời bài hát trình bày đẹp mắt"
}`;

    let result: any = null;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
        ],
        config: {
          temperature: 0.75,
        },
      });

      const raw = response.text || '';
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        result = JSON.parse(match[0]);
      }
    } catch (err: any) {
      console.warn('Gemini vision lyrics error:', err);
    }

    if (!result || !result.title) {
      result = {
        title: 'Bức Họa Đồng Quê',
        imagePerception: 'Bức ảnh gợi lên sự tĩnh lặng mộc mạc của quê hương, nơi bóng chiều buông trên dòng sông và vạt áo bạc màu phảng phất tình người ấm áp.',
        style: 'Dân ca miền Tây Nam Bộ',
        introHò: 'Hò... ơ... Trông về bến nước con sông, mênh mông cánh lục bình trôi chớ ai hoài thương ai...',
        verses: [
          {
            section: 'Đoạn 1 (Tức cảnh sinh tình)',
            lyrics: 'Nhìn bức hình lòng nghe xao xuyến mãi\nMây chiều trôi che khuất ánh hoàng hôn\nCon đò nhỏ nằm nghiêng bên bờ vắng\nCó tiếng ai cười ấm cả vạt quê.',
            chords: 'Dm - C - Dm',
          },
          {
            section: 'Điệu Lý Nam Bộ',
            lyrics: 'Ơi lý qua cầu, ai bắc cầu tre\nCho em qua suối, cho người về thăm quê\nPhù sa lắng đọng tình đằm thắm\nMuôn thuở nghĩa tình không nhạt phai.',
            chords: 'Gm - C - Dm',
          },
          {
            section: 'Điệp khúc',
            lyrics: 'Trời quê hương muôn đời trong sáng\nNhư nụ cười trên bức ảnh thân thương\nĐi muôn phương lòng luôn nhớ mãi\nMiền Tây dấu yêu đậm nghĩa thâm tình!',
            chords: 'F - C - Gm - Dm',
          },
        ],
        fullLyricsText: `[CÂU HÒ]\nHò... ơ... Trông về bến nước con sông, mênh mông cánh lục bình trôi chớ ai hoài thương ai...\n\n[ĐOẠN 1]\nNhìn bức hình lòng nghe xao xuyến mãi\nMây chiều trôi che khuất ánh hoàng hôn\nCon đò nhỏ nằm nghiêng bên bờ vắng\nCó tiếng ai cười ấm cả vạt quê.\n\n[ĐIỆU LÝ NAM BỘ]\nƠi lý qua cầu, ai bắc cầu tre\nCho em qua suối, cho người về thăm quê\nPhù sa lắng đọng tình đằm thắm\nMuôn thuở nghĩa tình không nhạt phai.\n\n[ĐIỆP KHÚC]\nTrời quê hương muôn đời trong sáng\nNhư nụ cười trên bức ảnh thân thương\nĐi muôn phương lòng luôn nhớ mãi\nMiền Tây dấu yêu đậm nghĩa thâm tình!`,
      };
    }

    return res.json(result);
  } catch (error: any) {
    console.error('Vision lyrics error:', error);
    return res.status(500).json({ error: error.message || 'Lỗi cảm nhận lời theo ảnh' });
  }
});

// =========================================================================
// TIKTOK VIDEO RESOLVER, INLINE PLAYER STREAM & EXPLICIT DOWNLOAD PROXY
// =========================================================================
const DEFAULT_TIKTOK_VIDEO_URL = 'https://www.tiktok.com/@hiu.minh1093/video/7673836556217486612';
const DEFAULT_TIKTOK_RAPIDAPI_KEY =
  process.env.TIKTOK_RAPIDAPI_KEY || '22640ad209msha29ac75e0e57edfp1a2cbejsndd57d476497c';
const DEFAULT_TIKTOK_RAPIDAPI_HOST = 'tiktok-video-downloader-api.p.rapidapi.com';

function resolveTikwmAbsoluteUrl(u?: string): string {
  if (!u || typeof u !== 'string') return '';
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (u.startsWith('//')) return `https:${u}`;
  return `https://www.tikwm.com${u.startsWith('/') ? '' : '/'}${u}`;
}

/**
 * Inspect first 64KB of an MP4 stream to detect video codec fourcc.
 * TikTok's `hdplay` is frequently ByteVC1 / HEVC (`hvc1` / `hev1` / `bvc1`), which plays AUDIO-ONLY
 * in browsers without hardware HEVC decoding, whereas `play` is H.264 (`avc1`) and plays everywhere.
 */
async function probeMp4VideoCodec(url?: string): Promise<'h264' | 'hevc' | 'unknown'> {
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) return 'unknown';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2800);
  try {
    const res = await fetch(url, {
      headers: {
        Range: 'bytes=0-65535',
        Referer: 'https://www.tiktok.com/',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    });
    if (!res.ok && res.status !== 206) return 'unknown';
    const buf = Buffer.from(await res.arrayBuffer());
    const latin = buf.toString('latin1');
    if (latin.includes('avc1') || latin.includes('avc3')) return 'h264';
    if (latin.includes('hvc1') || latin.includes('hev1') || latin.includes('bvc1') || latin.includes('bytevc1')) {
      return 'hevc';
    }
    return 'unknown';
  } catch {
    return 'unknown';
  } finally {
    clearTimeout(timer);
  }
}

async function resolveTikTokVideoMetadataServer(rawUrl: string, customRapidKey?: string) {
  const cleanUrl = (rawUrl || DEFAULT_TIKTOK_VIDEO_URL).trim();

  // 1. Primary: TikWM API (returns direct inline MP4 streams supporting HTTP 206 Range)
  try {
    const tikwmEndpoint = `https://www.tikwm.com/api/?url=${encodeURIComponent(cleanUrl)}&hd=1`;
    const wmRes = await fetch(tikwmEndpoint, {
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });
    if (wmRes.ok) {
      const wmJson: any = await wmRes.json();
      if (wmJson && wmJson.code === 0 && wmJson.data) {
        const d = wmJson.data;
        const rawPlayUrl = resolveTikwmAbsoluteUrl(d.play);
        const rawHdPlayUrl = resolveTikwmAbsoluteUrl(d.hdplay);
        const rawWmPlayUrl = resolveTikwmAbsoluteUrl(d.wmplay);

        // Probe codecs in parallel so we NEVER serve an audio-only HEVC stream when H.264 is available
        const [playCodec, hdCodec] = await Promise.all([
          probeMp4VideoCodec(rawPlayUrl),
          rawHdPlayUrl && rawHdPlayUrl !== rawPlayUrl
            ? probeMp4VideoCodec(rawHdPlayUrl)
            : Promise.resolve<'h264' | 'hevc' | 'unknown'>('unknown'),
        ]);

        let bestH264NoLogo = '';
        if (hdCodec === 'h264' && rawHdPlayUrl) {
          bestH264NoLogo = rawHdPlayUrl;
        } else if (playCodec === 'h264' && rawPlayUrl) {
          bestH264NoLogo = rawPlayUrl;
        } else if (playCodec !== 'hevc' && rawPlayUrl) {
          bestH264NoLogo = rawPlayUrl;
        } else if (hdCodec !== 'hevc' && rawHdPlayUrl) {
          bestH264NoLogo = rawHdPlayUrl;
        }

        // If both play & hdplay were HEVC, check wmplay as last non-transcoded H.264 candidate
        if (!bestH264NoLogo && rawWmPlayUrl && rawWmPlayUrl !== rawPlayUrl) {
          const wmCodec = await probeMp4VideoCodec(rawWmPlayUrl);
          if (wmCodec === 'h264') {
            bestH264NoLogo = rawWmPlayUrl;
          }
        }

        const chosenPlayUrl = bestH264NoLogo || rawPlayUrl || rawHdPlayUrl || rawWmPlayUrl;
        const chosenHdUrl =
          hdCodec === 'h264' && rawHdPlayUrl ? rawHdPlayUrl : chosenPlayUrl;
        const needsTranscode = !bestH264NoLogo && (playCodec === 'hevc' || hdCodec === 'hevc');

        const coverUrl =
          resolveTikwmAbsoluteUrl(d.origin_cover) ||
          resolveTikwmAbsoluteUrl(d.cover) ||
          resolveTikwmAbsoluteUrl(d.ai_dynamic_cover);
        const desc = typeof d.title === 'string' ? d.title : '';
        const hashtagMatches = Array.from<RegExpMatchArray>(desc.matchAll(/#([\p{L}\p{N}_]+)/gu)).map((m) => ({
          hashtagName: m[1],
        }));
        const username = String(d.author?.unique_id || 'tiktok_user');
        const idStr = String(d.id || cleanUrl.match(/\/video\/(\d+)/)?.[1] || Date.now());
        const canonicalUrl = `https://www.tiktok.com/@${username}/video/${idStr}`;

        if (chosenPlayUrl) {
          return {
            id: idStr,
            videoUrl: canonicalUrl,
            author: {
              id: d.author?.id ? String(d.author.id) : undefined,
              username,
              nickname: String(d.author?.nickname || username),
              avatar: resolveTikwmAbsoluteUrl(d.author?.avatar),
              verified: false,
              signature: '',
            },
            description: desc,
            cover: coverUrl,
            duration: typeof d.duration === 'number' ? d.duration : 30,
            musicTitle: d.music_info?.title ? String(d.music_info.title) : undefined,
            stats: {
              views: Number(d.play_count || 0),
              likes: Number(d.digg_count || 0),
              comments: Number(d.comment_count || 0),
              shares: Number(d.share_count || 0),
              saves: Number(d.collect_count || 0),
            },
            hashtags: hashtagMatches,
            playUrl: chosenPlayUrl,
            hdPlayUrl: chosenHdUrl,
            wmPlayUrl: rawWmPlayUrl || chosenPlayUrl,
            downloadUrl: chosenHdUrl || chosenPlayUrl,
            needsTranscode,
          };
        }
      }
    }
  } catch (err: any) {
    console.warn('TikWM resolve warning:', err?.message || err);
  }

  // 2. Fallback: RapidAPI TikTok Downloader
  const apiKey = (customRapidKey && customRapidKey.trim()) || DEFAULT_TIKTOK_RAPIDAPI_KEY;
  const rapidEndpoint = `https://${DEFAULT_TIKTOK_RAPIDAPI_HOST}/media?videoUrl=${encodeURIComponent(cleanUrl)}`;
  const rapidRes = await fetch(rapidEndpoint, {
    headers: {
      accept: 'application/json',
      'x-rapidapi-host': DEFAULT_TIKTOK_RAPIDAPI_HOST,
      'x-rapidapi-key': apiKey,
    },
  });

  if (!rapidRes.ok) {
    const errText = await rapidRes.text();
    throw new Error(`Không thể lấy dữ liệu video TikTok (HTTP ${rapidRes.status}): ${errText.slice(0, 120)}`);
  }

  const rData: any = await rapidRes.json();
  if (!rData || !rData.downloadUrl) {
    throw new Error('Không tìm thấy luồng video từ link TikTok này.');
  }

  const candidateUrl = String(rData.playUrl || rData.downloadUrl);
  const rapidCodec = await probeMp4VideoCodec(candidateUrl);

  const idStr = String(rData.id || cleanUrl.match(/\/video\/(\d+)/)?.[1] || Date.now());
  const username = String(rData.author?.username || 'tiktok_user');
  return {
    id: idStr,
    videoUrl: `https://www.tiktok.com/@${username}/video/${idStr}`,
    author: {
      username,
      nickname: String(rData.author?.nickname || username),
      verified: Boolean(rData.author?.verified),
      signature: typeof rData.author?.signature === 'string' ? rData.author.signature : '',
      avatar: typeof rData.author?.avatar === 'string' ? rData.author.avatar : '',
      id: rData.author?.id ? String(rData.author.id) : undefined,
    },
    description: typeof rData.description === 'string' ? rData.description : '',
    cover: typeof rData.cover === 'string' ? rData.cover : '',
    duration: typeof rData.duration === 'number' ? rData.duration : 30,
    stats: rData.stats || undefined,
    hashtags: Array.isArray(rData.hashtags) ? rData.hashtags : [],
    locationCreated: rData.locationCreated,
    playUrl: candidateUrl,
    hdPlayUrl: rapidCodec === 'hevc' ? candidateUrl : String(rData.hdPlayUrl || candidateUrl),
    downloadUrl: String(rData.downloadUrl),
    needsTranscode: rapidCodec === 'hevc',
  };
}

// Endpoint: Resolve TikTok Video Info & Playable Stream URLs
app.get(['/api/tiktok/info', '/minhhieu/api/tiktok/info'], async (req, res) => {
  try {
    const rawUrl = String(req.query.url || DEFAULT_TIKTOK_VIDEO_URL).trim();
    const customKey =
      (req.headers['x-rapidapi-key'] as string) || (req.query.apiKey as string) || undefined;
    const info = await resolveTikTokVideoMetadataServer(rawUrl, customKey);
    res.setHeader('Cache-Control', 'private, max-age=120');
    return res.json(info);
  } catch (err: any) {
    console.error('TikTok info error:', err?.message || err);
    return res.status(500).json({
      error: err?.message || 'Không thể phân tích đường dẫn TikTok. Vui lòng kiểm tra lại link.',
    });
  }
});

// Helper: Proxy TikTok video stream either INLINE (for <video> player) or ATTACHMENT (for explicit download)
async function pipeTikTokMediaResponse(
  req: express.Request,
  res: express.Response,
  asAttachment: boolean
) {
  req.setTimeout(600000);
  res.setTimeout(600000);

  let mediaUrl = String(req.query.url || '').trim();
  const pageUrl = String(req.query.videoUrl || '').trim();
  let forceTranscode = String(req.query.transcode || '') === '1';

  // If caller passed a TikTok web page URL instead of a direct CDN MP4 URL, resolve it first
  if (
    (!mediaUrl && pageUrl) ||
    (mediaUrl && mediaUrl.includes('tiktok.com/') && mediaUrl.includes('/video/'))
  ) {
    const info = await resolveTikTokVideoMetadataServer(pageUrl || mediaUrl);
    mediaUrl = info.playUrl || info.hdPlayUrl || info.downloadUrl;
    if (info.needsTranscode) {
      forceTranscode = true;
    }
  }

  if (!mediaUrl || (!mediaUrl.startsWith('http://') && !mediaUrl.startsWith('https://'))) {
    return res.status(400).json({ error: 'Thiếu đường dẫn luồng video TikTok hợp lệ' });
  }

  // Safety check: if not already marked for transcode, and client requested byte 0 (initial load),
  // ensure we never pipe a raw HEVC stream that would play audio-only in browsers!
  if (!forceTranscode && (!req.headers.range || req.headers.range.startsWith('bytes=0-'))) {
    const detectedCodec = await probeMp4VideoCodec(mediaUrl);
    if (detectedCodec === 'hevc') {
      // Try resolving H.264 stream from pageUrl first before falling back to FFmpeg transcode
      let switchedToH264 = false;
      if (pageUrl) {
        try {
          const freshInfo = await resolveTikTokVideoMetadataServer(pageUrl);
          if (freshInfo.playUrl && !freshInfo.needsTranscode && freshInfo.playUrl !== mediaUrl) {
            mediaUrl = freshInfo.playUrl;
            switchedToH264 = true;
          }
        } catch {}
      }
      if (!switchedToH264) {
        forceTranscode = true;
      }
    }
  }

  // Live FFmpeg H.264 (avc1 + aac) fragmented MP4 stream fallback when upstream only offers HEVC/ByteVC1
  if (forceTranscode) {
    const { spawn } = await import('child_process');
    res.status(200);
    res.setHeader('Content-Type', 'video/mp4');
    if (asAttachment) {
      let filename = String(req.query.filename || 'minhhieu_tiktok_video.mp4').replace(
        /[/\\?%*:|"<>]/g,
        '_'
      );
      if (!filename.startsWith('minhhieu_')) filename = `minhhieu_${filename}`;
      if (!filename.toLowerCase().endsWith('.mp4')) filename = `${filename}.mp4`;
      const asciiFilename = filename
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
      );
    } else {
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'no-store');
    }

    const ffArgs = [
      '-hide_banner',
      '-loglevel',
      'error',
      '-headers',
      'Referer: https://www.tiktok.com/\r\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\n',
      '-i',
      mediaUrl,
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-crf',
      '22',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      'frag_keyframe+empty_moov+default_base_moof',
      '-f',
      'mp4',
      'pipe:1',
    ];

    const ff = spawn('ffmpeg', ffArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    res.on('close', () => {
      if (!res.writableEnded) {
        try {
          ff.kill('SIGKILL');
        } catch {}
      }
    });
    ff.stdout.on('error', () => {});
    ff.stderr.on('data', () => {});
    res.on('error', () => {});
    ff.stdout.pipe(res);
    ff.on('error', (err) => {
      console.error('FFmpeg transcode error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Không thể giải mã luồng video.' });
      } else {
        res.end();
      }
    });
    return;
  }

  const upstreamHeaders: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    Referer: 'https://www.tiktok.com/',
    Accept: 'video/mp4,video/*;q=0.9,*/*;q=0.8',
  };
  if (req.headers.range) {
    upstreamHeaders['Range'] = req.headers.range;
  }

  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      controller.abort();
    }
  });

  let upstream = await fetch(mediaUrl, {
    headers: upstreamHeaders,
    signal: controller.signal,
  });

  // If CDN token expired (403/401/400) and we have the original TikTok videoUrl, refresh once automatically
  if (!upstream.ok && upstream.status !== 206 && pageUrl) {
    try {
      const freshInfo = await resolveTikTokVideoMetadataServer(pageUrl);
      const freshMedia = freshInfo.playUrl || freshInfo.hdPlayUrl || freshInfo.downloadUrl;
      if (freshMedia && freshMedia !== mediaUrl) {
        upstream = await fetch(freshMedia, {
          headers: upstreamHeaders,
          signal: controller.signal,
        });
      }
    } catch {}
  }

  if (!upstream.ok && upstream.status !== 206) {
    return res.status(upstream.status).json({
      error: `Không thể phát/tải luồng video TikTok (HTTP ${upstream.status})`,
    });
  }

  const contentLength = upstream.headers.get('content-length');
  const contentRange = upstream.headers.get('content-range');

  res.status(upstream.status);
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Accept-Ranges', 'bytes');

  if (asAttachment) {
    let filename = String(req.query.filename || 'minhhieu_tiktok_video.mp4').replace(
      /[/\\?%*:|"<>]/g,
      '_'
    );
    if (!filename.startsWith('minhhieu_')) {
      filename = `minhhieu_${filename}`;
    }
    if (!filename.toLowerCase().endsWith('.mp4')) {
      filename = `${filename}.mp4`;
    }
    const asciiFilename = filename
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
  } else {
    // CRITICAL: inline disposition ensures browser <video> plays the stream and NEVER auto-downloads!
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=1800');
  }

  if (contentLength) res.setHeader('Content-Length', contentLength);
  if (contentRange) res.setHeader('Content-Range', contentRange);

  if (upstream.body) {
    const { Readable, pipeline } = await import('stream');
    const nodeStream = Readable.fromWeb(upstream.body as any);
    pipeline(nodeStream, res, () => {
      // Ignore normal client range-request aborts / premature socket closes during video scrubbing
    });
  } else {
    res.end();
  }
}

// Inline Playback Stream Route (NEVER downloads file)
app.get(['/api/tiktok/stream', '/minhhieu/api/tiktok/stream'], async (req, res) => {
  try {
    await pipeTikTokMediaResponse(req, res, false);
  } catch (err: any) {
    if (err?.name === 'AbortError') return;
    console.error('TikTok stream proxy error:', err?.message || err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Lỗi luồng phát video TikTok' });
    }
  }
});

// Explicit File Download Route (ONLY called when user clicks Download button)
app.get(['/api/tiktok/download', '/minhhieu/api/tiktok/download'], async (req, res) => {
  try {
    await pipeTikTokMediaResponse(req, res, true);
  } catch (err: any) {
    if (err?.name === 'AbortError') return;
    console.error('TikTok download proxy error:', err?.message || err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Lỗi tải tệp video TikTok' });
    }
  }
});

// =========================================================================
// YOUTUBE SUBSCRIPTION VERIFICATION FOR DOWNLOAD UNLOCK (@minhhieureviewphim)
// =========================================================================
const MINHHIEU_YOUTUBE_CHANNEL_ID = 'UCUr78N1iiRNyg_UoBgtPPhw';
const MINHHIEU_YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@MinhHieuOfficialvn';
const MINHHIEU_YOUTUBE_SUBSCRIBE_URL = 'https://www.youtube.com/@MinhHieuOfficialvn?sub_confirmation=1';

app.get(['/api/youtube/sub-gate-config', '/minhhieu/api/youtube/sub-gate-config'], (_req, res) => {
  const googleClientId = (
    process.env.GOOGLE_CLIENT_ID ||
    process.env.VITE_GOOGLE_CLIENT_ID ||
    ''
  ).trim();
  res.json({
    channelId: MINHHIEU_YOUTUBE_CHANNEL_ID,
    channelHandle: '@MinhHieuOfficialvn',
    channelName: 'Minh Hiếu Official',
    channelUrl: MINHHIEU_YOUTUBE_CHANNEL_URL,
    subscribeUrl: MINHHIEU_YOUTUBE_SUBSCRIBE_URL,
    googleOAuthEnabled: Boolean(googleClientId),
    googleClientId,
  });
});

app.post(
  ['/api/youtube/verify-subscription', '/minhhieu/api/youtube/verify-subscription'],
  async (req, res) => {
    try {
      const authHeader = String(req.headers.authorization || '');
      const bearerToken = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : String(req.body?.accessToken || '').trim();

      if (!bearerToken) {
        return res.status(400).json({
          verified: false,
          error: 'Thiếu mã xác thực Google OAuth để kiểm tra đăng ký kênh.',
        });
      }

      const ytApiUrl = `https://www.googleapis.com/youtube/v3/subscriptions?part=id,snippet&mine=true&forChannelId=${encodeURIComponent(
        MINHHIEU_YOUTUBE_CHANNEL_ID
      )}`;
      const ytRes = await fetch(ytApiUrl, {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          Accept: 'application/json',
        },
      });

      if (!ytRes.ok) {
        const errData: any = await ytRes.json().catch(() => ({}));
        return res.status(ytRes.status).json({
          verified: false,
          error:
            errData?.error?.message ||
            'Không thể truy vấn trạng thái đăng ký từ YouTube Data API v3.',
        });
      }

      const data: any = await ytRes.json();
      const isSubscribed = Array.isArray(data?.items) && data.items.length > 0;

      return res.json({
        verified: isSubscribed,
        channelId: MINHHIEU_YOUTUBE_CHANNEL_ID,
        channelUrl: MINHHIEU_YOUTUBE_CHANNEL_URL,
        method: 'youtube_data_api_v3',
      });
    } catch (err: any) {
      return res.status(500).json({
        verified: false,
        error: err?.message || 'Lỗi máy chủ khi kiểm tra đăng ký kênh YouTube.',
      });
    }
  }
);

// =========================================================================
// MOVIE CINEMA API PROXY (VSMOV.COM)
// =========================================================================
const VSMOV_BASE_URL = 'https://vsmov.com/api';

async function fetchVsmovProxy(endpoint: string, query: Record<string, any> = {}) {
  const url = new URL(`${VSMOV_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      'accept': 'application/json',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`vsmov error ${response.status}: ${text.slice(0, 200)}`);
  }

  return response.json();
}

// 1. Phim mới cập nhật
app.get('/api/movie/phim-moi-cap-nhat', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const data = await fetchVsmovProxy('/danh-sach/phim-moi-cap-nhat', { page });
    return res.json(data);
  } catch (err: any) {
    console.error('Movie phim-moi-cap-nhat error:', err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
});

// 2. Danh sách theo slug (e.g. subteam, phim-bo, phim-le, hoat-hinh, tv-shows...)
app.get('/api/movie/danh-sach/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { page, limit, year, country, category, type, status } = req.query;
    const data = await fetchVsmovProxy(`/danh-sach/${encodeURIComponent(slug)}`, {
      page,
      limit,
      year,
      country,
      category,
      type,
      status,
    });
    return res.json(data);
  } catch (err: any) {
    console.error(`Movie danh-sach/${req.params.slug} error:`, err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
});

// 3. Tìm kiếm phim
app.get('/api/movie/tim-kiem', async (req, res) => {
  try {
    const { keyword, limit = 20, page = 1 } = req.query;
    if (!keyword) {
      return res.status(400).json({ status: false, message: 'Thiếu từ khóa keyword' });
    }
    const data = await fetchVsmovProxy('/tim-kiem', { keyword, limit, page });
    return res.json(data);
  } catch (err: any) {
    console.error('Movie tim-kiem error:', err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
});

// 4. Danh sách thể loại tổng hợp
app.get(['/api/movie/the-loai', '/api/the-loai'], async (req, res) => {
  try {
    const data = await fetchVsmovProxy('/the-loai');
    return res.json(data);
  } catch (err: any) {
    console.error('Movie the-loai error:', err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
});

// 4b. Danh sách phim theo thể loại với đầy đủ bộ lọc
app.get(['/api/movie/the-loai/:slug', '/api/the-loai/:slug'], async (req, res) => {
  try {
    const { slug } = req.params;
    const { page, limit, year, country, type, status } = req.query;
    const data = await fetchVsmovProxy(`/the-loai/${encodeURIComponent(slug)}`, {
      page,
      limit,
      year,
      country,
      type,
      status,
    });
    return res.json(data);
  } catch (err: any) {
    console.error(`Movie the-loai/${req.params.slug} error:`, err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
});

// 4c. Danh sách tất cả diễn viên
app.get(['/api/movie/dien-vien', '/api/dien-vien'], async (req, res) => {
  try {
    const data = await fetchVsmovProxy('/dien-vien');
    return res.json(data);
  } catch (err: any) {
    console.error('Movie dien-vien error:', err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
});

// 4d. Chi tiết phim theo diễn viên slug (fallback to search if direct 404)
app.get(['/api/movie/dien-vien/:slug', '/api/dien-vien/:slug'], async (req, res) => {
  try {
    const { slug } = req.params;
    const { page, limit } = req.query;
    try {
      const data = await fetchVsmovProxy(`/dien-vien/${encodeURIComponent(slug)}`, { page, limit });
      return res.json(data);
    } catch {
      // Fallback: search movies by actor keyword
      const keyword = slug.replace(/-/g, ' ');
      const searchData = await fetchVsmovProxy('/tim-kiem', { keyword, limit: limit || 24, page: page || 1 });
      return res.json(searchData);
    }
  } catch (err: any) {
    console.error(`Movie dien-vien/${req.params.slug} error:`, err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
});

// 5. Danh sách quốc gia
app.get('/api/movie/quoc-gia', async (req, res) => {
  try {
    const data = await fetchVsmovProxy('/quoc-gia');
    return res.json(data);
  } catch (err: any) {
    console.error('Movie quoc-gia error:', err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
});

// 6. Danh sách năm phát hành
app.get('/api/movie/nam', async (req, res) => {
  try {
    const data = await fetchVsmovProxy('/nam');
    return res.json(data);
  } catch (err: any) {
    console.error('Movie nam error:', err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
});

// 7. Chi tiết phim theo slug
app.get('/api/movie/detail/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const data = await fetchVsmovProxy(`/phim/${encodeURIComponent(slug)}`);
    return res.json(data);
  } catch (err: any) {
    console.error(`Movie detail/${req.params.slug} error:`, err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
});

// =========================================================================
// AD & WATERMARK SETTINGS PERSISTENCE API (Cross-device synchronization)
// =========================================================================
const AD_SETTINGS_FILE = path.resolve(__dirname, 'public', 'ad-settings.json');

app.get(['/api/settings/ads', '/minhhieu/api/settings/ads'], async (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    const neonPublic = await getPublicAppSettingsFromNeon();
    if (neonPublic && (neonPublic.settings.ad_settings || neonPublic.settings.watermark_settings)) {
      return res.json({
        success: true,
        source: 'neon_postgresql',
        adSettings: neonPublic.settings.ad_settings || null,
        watermarkSettings: neonPublic.settings.watermark_settings || null,
      });
    }
  } catch (err: any) {
    console.warn('Neon ad settings read fallback:', err?.message || err);
  }

  try {
    if (fs.existsSync(AD_SETTINGS_FILE)) {
      const content = fs.readFileSync(AD_SETTINGS_FILE, 'utf-8');
      const data = JSON.parse(content);
      return res.json({ success: true, source: 'file', ...data });
    }
  } catch (err: any) {
    console.warn('Error reading ad-settings.json:', err.message);
  }
  return res.json({ success: true, adSettings: null, watermarkSettings: null });
});

app.post(['/api/settings/ads', '/minhhieu/api/settings/ads'], requireAdminAuth, async (req, res) => {
  try {
    const adminUser = (req as any).adminUser as AdminPrincipal;
    const { adSettings, watermarkSettings } = req.body || {};
    const payload = {
      updatedAt: new Date().toISOString(),
      updatedBy: adminUser?.username || 'admin',
      adSettings: adSettings || null,
      watermarkSettings: watermarkSettings || null,
    };

    // 1. Lưu trực tiếp vào cơ sở dữ liệu Neon PostgreSQL
    if (getNeonConnectionString()) {
      if (adSettings) {
        await upsertAppSettingInNeon({
          key: 'ad_settings',
          value: adSettings,
          category: 'ads',
          isPublic: true,
          description: 'Cấu hình Quảng cáo Video VAST, Display Banner & Video Slider',
          updatedBy: adminUser?.username || 'admin',
        });
      }
      if (watermarkSettings) {
        await upsertAppSettingInNeon({
          key: 'watermark_settings',
          value: watermarkSettings,
          category: 'watermark',
          isPublic: true,
          description: 'Cấu hình Logo Watermark thương hiệu kênh',
          updatedBy: adminUser?.username || 'admin',
        });
      }
    }

    // 2. Đồng bộ dự phòng vào ad-settings.json
    fs.mkdirSync(path.dirname(AD_SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(AD_SETTINGS_FILE, JSON.stringify(payload, null, 2), 'utf-8');

    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      try {
        fs.writeFileSync(path.resolve(distDir, 'ad-settings.json'), JSON.stringify(payload, null, 2), 'utf-8');
      } catch {}
    }

    return res.json({
      success: true,
      message: 'Đã lưu cài đặt quảng cáo & logo trực tiếp vào Neon PostgreSQL cho mọi thiết bị!',
      ...payload,
    });
  } catch (err: any) {
    console.error('Error saving ad settings:', err);
    return res.status(500).json({ success: false, error: err.message || 'Lỗi lưu cấu hình quảng cáo' });
  }
});

// GET /api/settings/public - Đọc toàn bộ cấu hình hiển thị công khai từ Neon PostgreSQL (An toàn, không chứa mật khẩu)
app.get(['/api/settings/public', '/minhhieu/api/settings/public'], async (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    const publicData = await getPublicAppSettingsFromNeon();
    if (!publicData) {
      return res.json({
        success: true,
        connected: false,
        settings: {},
        customVideos: [],
        deletedVideoIds: [],
      });
    }
    return res.json({
      success: true,
      connected: true,
      ...publicData,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Lỗi đọc cấu hình hệ thống' });
  }
});

// PUT /api/settings/general - Chỉ Admin mới được phép lưu các cấu hình kênh, phát tự động & danh sách video lên Neon PostgreSQL
app.put(
  ['/api/settings/general', '/minhhieu/api/settings/general'],
  requireAdminAuth,
  async (req, res) => {
    try {
      const adminUser = (req as any).adminUser as AdminPrincipal;
      const actor = adminUser?.username || 'admin';
      const { channelProfile, playbackPreferences, customVideos, deletedVideoIds, extraSettings } =
        req.body || {};

      if (channelProfile && typeof channelProfile === 'object') {
        await upsertAppSettingInNeon({
          key: 'channel_profile',
          value: channelProfile,
          category: 'channel',
          isPublic: true,
          description: 'Thông tin kênh YouTube & RSS Podcast chính thức',
          updatedBy: actor,
        });
      }

      if (playbackPreferences && typeof playbackPreferences === 'object') {
        await upsertAppSettingInNeon({
          key: 'playback_preferences',
          value: playbackPreferences,
          category: 'playback',
          isPublic: true,
          description: 'Tùy chọn trải nghiệm phát tự động & giọng đọc',
          updatedBy: actor,
        });
      }

      if (extraSettings && typeof extraSettings === 'object') {
        for (const [key, val] of Object.entries(extraSettings)) {
          if (/^[a-z0-9_.-]{2,80}$/i.test(key)) {
            await upsertAppSettingInNeon({
              key,
              value: val,
              category: 'custom',
              isPublic: false,
              updatedBy: actor,
            });
          }
        }
      }

      let videoSync = { savedVideos: 0, savedDeleted: 0 };
      if (Array.isArray(customVideos) || Array.isArray(deletedVideoIds)) {
        videoSync = await upsertChannelVideosInNeon({
          customVideos,
          deletedVideoIds,
          updatedBy: actor,
        });
      }

      return res.json({
        success: true,
        message: 'Đã lưu cấu hình cài đặt vào cơ sở dữ liệu Neon PostgreSQL!',
        videoSync,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Lỗi lưu cấu hình lên Neon PostgreSQL',
      });
    }
  }
);

// VAST XML Proxy fallback for third-party Wrapper redirects lacking CORS headers
app.get(['/api/vast-proxy', '/minhhieu/api/vast-proxy'], async (req, res) => {
  try {
    const tagUrl = String(req.query.url || '').trim();
    if (!tagUrl || (!tagUrl.startsWith('http://') && !tagUrl.startsWith('https://'))) {
      return res.status(400).send('<?xml version="1.0" encoding="UTF-8"?><VAST version="4.0"></VAST>');
    }
    const headers: Record<string, string> = {
      Accept: 'application/xml, text/xml, */*',
      'User-Agent':
        (req.headers['user-agent'] as string) ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    if (req.headers['accept-language']) {
      headers['Accept-Language'] = String(req.headers['accept-language']);
    }
    if (req.headers['x-forwarded-for']) {
      headers['X-Forwarded-For'] = String(req.headers['x-forwarded-for']);
    }
    const upstream = await fetch(tagUrl, { headers });
    const xml = await upstream.text();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(upstream.ok ? 200 : upstream.status).send(xml);
  } catch {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><VAST version="4.0"></VAST>');
  }
});

// =========================================================================
// KIDS & K-12 INTERACTIVE LEARNING STUDIO TOPIC GENERATOR (GRADES 1 - 12)
// =========================================================================
function buildFallbackKidsLesson(gradeNum: number, subjectId: string, rawTopic: string) {
  const tierLabel = gradeNum <= 5 ? 'Tiểu học' : gradeNum <= 9 ? 'THCS (Cấp 2)' : 'THPT (Cấp 3)';
  const subjectNames: Record<string, string> = {
    'tieng-viet': gradeNum <= 5 ? 'Tiếng Việt' : 'Ngữ Văn',
    'tieng-anh': 'Tiếng Anh',
    toan: 'Toán học',
    'khoa-hoc': 'Khoa học tự nhiên',
    'kham-pha': 'Sử - Địa & Khám phá',
  };
  const subjLabel = subjectNames[subjectId] || 'Kiến thức tổng hợp';

  if (subjectId === 'toan') {
    const a = gradeNum * 3 + 4;
    const b = gradeNum * 2 + 5;
    return {
      lessonTitle: `${rawTopic} — ${subjLabel} Lớp ${gradeNum}`,
      summary: `Bài ôn tập trọng tâm chủ đề "${rawTopic}" dành cho học sinh Lớp ${gradeNum} (${tierLabel}), giúp nắm chắc quy tắc cốt lõi và rèn phản xạ giải bài nhanh.`,
      keyPoints: [
        `Đọc kỹ yêu cầu đề bài và xác định dữ kiện đã cho trong chuyên đề "${rawTopic}".`,
        'Áp dụng đúng công thức và thứ tự thực hiện phép tính theo chương trình chuẩn.',
        'Kiểm tra lại đơn vị đo và thử lại kết quả sau khi tính xong.',
      ],
      questions: [
        {
          prompt: `[Lớp ${gradeNum}] Tính giá trị biểu thức nhanh: ${a} + ${b} × 2 = ?`,
          spokenPrompt: `Câu hỏi lớp ${gradeNum}: Tính giá trị biểu thức ${a} cộng ${b} nhân 2 bằng bao nhiêu?`,
          formulaOrTip: 'Nhân chia trước, cộng trừ sau',
          options: [
            String(a + b * 2),
            String((a + b) * 2),
            String(a * 2 + b),
            String(a + b + 2),
          ],
          correctIndex: 0,
          hint: `Thực hiện phép nhân ${b} × 2 = ${b * 2} trước, sau đó cộng với ${a}.`,
          explanation: `Theo quy tắc nhân chia trước cộng trừ sau: ${b} × 2 = ${b * 2}, rồi ${a} + ${b * 2} = ${a + b * 2}.`,
        },
        {
          prompt: `[Lớp ${gradeNum}] Tìm số tự nhiên x biết: x - ${a} = ${b}`,
          spokenPrompt: `Tìm số tự nhiên x biết: x trừ ${a} bằng ${b}.`,
          formulaOrTip: `x = ${b} + ${a}`,
          options: [
            String(Math.abs(b - a)),
            String(a + b),
            String(a * 2),
            String(a + b + 5),
          ],
          correctIndex: 1,
          hint: `Muốn tìm số bị trừ x, ta lấy hiệu (${b}) cộng với số trừ (${a}).`,
          explanation: `Ta có x = ${b} + ${a} = ${a + b}.`,
        },
        {
          prompt: `Một hình chữ nhật có chiều dài ${a} cm và chiều rộng ${Math.max(3, gradeNum + 2)} cm. Chu vi hình chữ nhật đó là:`,
          spokenPrompt: `Một hình chữ nhật có chiều dài ${a} xen ti mét và chiều rộng ${Math.max(3, gradeNum + 2)} xen ti mét. Chu vi hình chữ nhật đó bằng bao nhiêu?`,
          formulaOrTip: 'P = (Dài + Rộng) × 2',
          options: [
            `${(a + Math.max(3, gradeNum + 2)) * 2} cm`,
            `${a * Math.max(3, gradeNum + 2)} cm`,
            `${a + Math.max(3, gradeNum + 2)} cm`,
            `${(a + Math.max(3, gradeNum + 2)) * 4} cm`,
          ],
          correctIndex: 0,
          hint: 'Lấy tổng chiều dài và chiều rộng rồi nhân với 2.',
          explanation: `Chu vi hình chữ nhật là: (${a} + ${Math.max(3, gradeNum + 2)}) × 2 = ${(a + Math.max(3, gradeNum + 2)) * 2} cm.`,
        },
      ],
    };
  }

  return {
    lessonTitle: `Chuyên đề: ${rawTopic} (${subjLabel} Lớp ${gradeNum})`,
    summary: `Tổng hợp kiến thức cốt lõi và câu hỏi thực hành chủ đề "${rawTopic}" bám sát chương trình ${subjLabel} Lớp ${gradeNum} (${tierLabel}).`,
    keyPoints: [
      `Nắm vững khái niệm và quy tắc trọng tâm của bài "${rawTopic}".`,
      'Vận dụng ví dụ minh họa thực tế để ghi nhớ lâu hơn.',
      'Luyện nghe và đọc to câu hỏi để phát triển tư duy ngôn ngữ.',
    ],
    questions: [
      {
        prompt: `Khi học chủ đề "${rawTopic}" môn ${subjLabel} Lớp ${gradeNum}, phương pháp nào giúp ghi nhớ hiệu quả nhất?`,
        spokenPrompt: `Khi học chủ đề ${rawTopic} môn ${subjLabel} lớp ${gradeNum}, phương pháp nào giúp em ghi nhớ hiệu quả nhất?`,
        formulaOrTip: 'Hiểu bản chất + Thực hành ví dụ',
        options: [
          'Hiểu rõ bản chất, ghi từ khóa chính và tự đặt ví dụ thực hành',
          'Chỉ đọc lướt qua tiêu đề mà không làm bài tập',
          'Học thuộc lòng máy móc không cần hiểu nghĩa',
          'Bỏ qua phần gợi ý và giải thích chi tiết',
        ],
        correctIndex: 0,
        hint: 'Kết hợp hiểu ý chính với việc tự lấy ví dụ cụ thể luôn giúp não bộ nhớ lâu gấp nhiều lần.',
        explanation: 'Hiểu bản chất kết hợp từ khóa và ví dụ thực tế là phương pháp học chủ động hiệu quả nhất ở mọi cấp học.',
      },
      {
        prompt: `Trong giao tiếp và trình bày bài làm môn ${subjLabel}, yếu tố nào sau đây cần được ưu tiên?`,
        spokenPrompt: `Trong giao tiếp và trình bày bài làm môn ${subjLabel}, yếu tố nào sau đây cần được ưu tiên?`,
        options: [
          'Viết tắt tùy ý không theo quy chuẩn',
          'Diễn đạt rõ ràng, mạch lạc, đúng chính tả và ngữ pháp',
          'Trình bày thiếu đầu câu và dấu chấm câu',
          'Trả lời lệch khỏi câu hỏi trọng tâm',
        ],
        correctIndex: 1,
        hint: 'Sự rõ ràng, mạch lạc và chuẩn xác giúp người đọc hiểu đúng ý tưởng của em.',
        explanation: 'Trình bày mạch lạc, đúng chính tả và ngữ pháp giúp bài làm đạt điểm tối đa và rèn tư duy chặt chẽ.',
      },
      {
        prompt: `Bước kiểm tra lại bài sau khi hoàn thành câu hỏi về "${rawTopic}" có tác dụng gì?`,
        spokenPrompt: `Bước kiểm tra lại bài sau khi hoàn thành câu hỏi về ${rawTopic} có tác dụng gì?`,
        options: [
          'Làm mất thời gian không cần thiết',
          'Phát hiện sớm lỗi nhầm lẫn đáng tiếc và củng cố chắc chắn kiến thức',
          'Làm thay đổi đề bài ban đầu',
          'Không mang lại lợi ích nào',
        ],
        correctIndex: 1,
        hint: 'Các học sinh giỏi luôn dành 1–2 phút cuối để rà soát lại đáp án.',
        explanation: 'Kiểm tra lại bài giúp phát hiện sai sót nhỏ và khắc sâu kiến thức vừa học vào trí nhớ dài hạn.',
      },
    ],
  };
}

app.post(
  ['/api/kids-learning/generate', '/minhhieu/api/kids-learning/generate'],
  async (req, res) => {
    try {
      const rawGrade = Number(req.body?.grade) || 3;
      const grade = Math.max(1, Math.min(12, Math.round(rawGrade)));
      const subject = String(req.body?.subject || 'toan').trim();
      const topic = String(req.body?.topic || '').trim();

      if (!topic) {
        return res.status(400).json({ error: 'Vui lòng nhập chủ đề bài học cần tạo.' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.json(buildFallbackKidsLesson(grade, subject, topic));
      }

      const tierName =
        grade <= 5 ? 'Tiểu học (Cấp 1)' : grade <= 9 ? 'THCS (Cấp 2)' : 'THPT (Cấp 3)';
      const subjectMap: Record<string, string> = {
        'tieng-viet': grade <= 5 ? 'Tiếng Việt' : 'Ngữ Văn',
        'tieng-anh': 'Tiếng Anh (English)',
        toan: 'Toán học',
        'khoa-hoc': 'Khoa học tự nhiên (Lý - Hóa - Sinh)',
        'kham-pha': 'Lịch sử - Địa lý & Khám phá thế giới',
      };
      const subjectTitle = subjectMap[subject] || 'Tổng hợp';

      const prompt = `Hãy biên soạn một bài học ngắn gọn, vui tươi, chuẩn xác theo chương trình giáo dục phổ thông Việt Nam cho học sinh Lớp ${grade} (${tierName}), môn ${subjectTitle}, với chủ đề cụ thể: "${topic}".

Yêu cầu bắt buộc:
1. Ngôn ngữ thân thiện, khích lệ, phù hợp đúng lứa tuổi Lớp ${grade}.
2. Tạo chính xác 4 câu hỏi trắc nghiệm (4 lựa chọn mỗi câu, chỉ 1 đáp án đúng ở vị trí correctIndex từ 0 đến 3).
3. Trường "spokenPrompt" viết câu hỏi bằng chữ tự nhiên dễ đọc to cho công nghệ chuyển văn bản thành giọng nói tiếng Việt (ví dụ: viết "nhân", "cộng", "bình phương" thay vì ký hiệu khó đọc).
4. Kiểm tra kỹ tính chính xác toán học/khoa học/ngữ pháp của đáp án tại correctIndex.`;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Kids lesson generation timeout')), 12000)
      );

      const genPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.5,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lessonTitle: { type: Type.STRING },
              summary: { type: Type.STRING },
              keyPoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    prompt: { type: Type.STRING },
                    spokenPrompt: { type: Type.STRING },
                    formulaOrTip: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctIndex: { type: Type.INTEGER },
                    hint: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: [
                    'prompt',
                    'spokenPrompt',
                    'options',
                    'correctIndex',
                    'hint',
                    'explanation',
                  ],
                },
              },
            },
            required: ['lessonTitle', 'summary', 'keyPoints', 'questions'],
          },
        },
      });

      const response: any = await Promise.race([genPromise, timeoutPromise]);
      const rawJson = response?.text ? String(response.text).trim() : '';
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          return res.json(parsed);
        }
      }

      return res.json(buildFallbackKidsLesson(grade, subject, topic));
    } catch (err: any) {
      console.warn('Kids learning AI endpoint fallback:', err?.message || err);
      const rawGrade = Math.max(1, Math.min(12, Number(req.body?.grade) || 3));
      const subject = String(req.body?.subject || 'toan');
      const topic = String(req.body?.topic || 'Ôn tập kiến thức');
      return res.json(buildFallbackKidsLesson(rawGrade, subject, topic));
    }
  }
);

// =========================================================================
// KIDS LEARNING: NATIVE ENGLISH TTS, VOICE TRANSCRIPTION & Q&A CHAT TUTOR
// =========================================================================
const kidsNativeTtsCache = new Map<string, string>();
const MAX_KIDS_TTS_CACHE = 80;

app.post(
  ['/api/kids-learning/english-tts', '/minhhieu/api/kids-learning/english-tts'],
  async (req, res) => {
    try {
      const rawText = String(req.body?.text || '')
        .replace(/[_#*`~]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 700);
      if (!rawText) {
        return res.status(400).json({ error: 'Missing text for English TTS' });
      }

      const allowedVoices = ['Kore', 'Puck', 'Zephyr', 'Fenrir', 'Charon'];
      const requestedVoice = String(req.body?.voiceName || 'Kore').trim();
      const voiceName = allowedVoices.includes(requestedVoice) ? requestedVoice : 'Kore';
      const slow = Boolean(req.body?.slow);

      const cacheKey = `${voiceName}::${slow ? 'slow' : 'normal'}::${rawText}`;
      const cached = kidsNativeTtsCache.get(cacheKey);
      if (cached) {
        return res.json({ audioDataUrl: cached, voiceName, cached: true });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'Native TTS unavailable without server key' });
      }

      const stylePrompt = slow
        ? 'Warm, crystal-clear native English teacher speaking slowly and distinctly for language learners'
        : 'Warm, articulate, authentic native English teacher with natural intonation';

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('English TTS generation timeout')), 12000)
      );

      const ttsPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: rawText,
                speechMetadata: {
                  style: stylePrompt,
                },
              } as any,
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const response: any = await Promise.race([ttsPromise, timeoutPromise]);
      const parts = response?.candidates?.[0]?.content?.parts || [];
      let base64Audio = '';
      let mimeType = 'audio/wav';
      for (const p of parts) {
        if (p?.inlineData?.data) {
          base64Audio = String(p.inlineData.data);
          if (p.inlineData.mimeType && String(p.inlineData.mimeType).startsWith('audio/')) {
            mimeType = String(p.inlineData.mimeType);
          }
          break;
        }
      }

      if (!base64Audio) {
        return res.status(502).json({ error: 'Empty audio output from TTS model' });
      }

      const audioDataUrl = `data:${mimeType};base64,${base64Audio}`;
      if (kidsNativeTtsCache.size >= MAX_KIDS_TTS_CACHE) {
        const oldestKey = kidsNativeTtsCache.keys().next().value;
        if (oldestKey) kidsNativeTtsCache.delete(oldestKey);
      }
      kidsNativeTtsCache.set(cacheKey, audioDataUrl);

      return res.json({ audioDataUrl, voiceName, cached: false });
    } catch (err: any) {
      console.warn('Kids English TTS error:', err?.message || err);
      return res.status(500).json({ error: err?.message || 'English TTS error' });
    }
  }
);

// Endpoint: Transcribe direct microphone voice questions from students
app.post(
  ['/api/kids-learning/transcribe', '/minhhieu/api/kids-learning/transcribe'],
  async (req, res) => {
    try {
      const audioBase64 = String(req.body?.audioBase64 || '').trim();
      const rawMime = String(req.body?.mimeType || 'audio/webm').split(';')[0].trim() || 'audio/webm';
      const langHint = String(req.body?.language || 'vi-VN').trim();

      if (!audioBase64) {
        return res.status(400).json({ error: 'Không nhận được dữ liệu âm thanh từ micro.' });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'Chức năng nhận diện giọng nói máy chủ tạm thời chưa sẵn sàng.' });
      }

      const langInstruction = langHint.startsWith('en')
        ? 'Transcribe this spoken English audio accurately. Output ONLY the exact spoken words, nothing else.'
        : 'Hãy chép lời chính xác câu nói tiếng Việt (hoặc từ tiếng Anh xen kẽ) của học sinh trong đoạn âm thanh này. Chỉ trả về đúng nội dung câu nói, không thêm chú thích.';

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Audio transcription timeout')), 12000)
      );

      const transcribePromise = ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: rawMime,
                data: audioBase64,
              },
            },
            { text: langInstruction },
          ],
        },
      });

      const response: any = await Promise.race([transcribePromise, timeoutPromise]);
      const transcript = String(response?.text || '')
        .replace(/^["'“”]+|["'“”]+$/g, '')
        .trim();

      return res.json({ transcript });
    } catch (err: any) {
      console.warn('Kids audio transcribe error:', err?.message || err);
      return res.status(500).json({
        error: err?.message || 'Không thể nhận diện giọng nói lúc này. Em hãy thử nói lại rõ hơn nhé!',
      });
    }
  }
);

function buildFallbackKidsChatReply(message: string, grade: number) {
  const lower = message.toLowerCase().trim();

  // Check simple arithmetic expression in message
  const mathMatch = lower.match(/(\d+)\s*([+\-x*×:/÷])\s*(\d+)/);
  if (mathMatch) {
    const a = Number(mathMatch[1]);
    const op = mathMatch[2];
    const b = Number(mathMatch[3]);
    let resVal: number | string = 0;
    let opWord = 'cộng';
    if (op === '+') {
      resVal = a + b;
      opWord = 'cộng';
    } else if (op === '-') {
      resVal = a - b;
      opWord = 'trừ';
    } else if (op === 'x' || op === '*' || op === '×') {
      resVal = a * b;
      opWord = 'nhân';
    } else if (b !== 0) {
      resVal = Number((a / b).toFixed(2));
      opWord = 'chia';
    }
    return {
      replyVi: `Câu hỏi Toán rất hay! Kết quả của phép tính ${a} ${op} ${b} là **${resVal}**. Em nhớ kiểm tra lại từng bước tính nhẩm để thật chắc chắn nhé!`,
      spokenVi: `Câu hỏi Toán rất hay! Kết quả của phép tính ${a} ${opWord} ${b} bằng ${resVal}. Em giỏi lắm!`,
      englishPhrase: '',
      phoneticIpa: '',
      englishExamples: [],
      followUps: [
        `Đố thầy bài toán tìm x Lớp ${grade}`,
        'Bảng cửu chương nhân 7 đọc thế nào?',
        'Mẹo tính nhẩm nhanh không cần nháp',
      ],
    };
  }

  // English dictionary / translation quick fallback
  const commonDict: Record<string, { en: string; ipa: string; vi: string; exEn: string; exVi: string }> = {
    'mèo': { en: 'Cat', ipa: '/kæt/', vi: 'Con mèo', exEn: 'The cute cat is sleeping on the sofa.', exVi: 'Chú mèo dễ thương đang ngủ trên ghế sofa.' },
    'chó': { en: 'Dog', ipa: '/dɒɡ/', vi: 'Con chó', exEn: 'My dog loves playing in the park.', exVi: 'Chú cún của em rất thích chơi trong công viên.' },
    'táo': { en: 'Apple', ipa: '/ˈæp.əl/', vi: 'Quả táo', exEn: 'I eat a red apple every morning.', exVi: 'Em ăn một quả táo đỏ mỗi buổi sáng.' },
    'trường': { en: 'School', ipa: '/skuːl/', vi: 'Trường học', exEn: 'We go to school together happily.', exVi: 'Chúng em vui vẻ cùng nhau tới trường.' },
    'gia đình': { en: 'Family', ipa: '/ˈfæm.əl.i/', vi: 'Gia đình', exEn: 'I love my family very much.', exVi: 'Em yêu gia đình của em rất nhiều.' },
    'xin chào': { en: 'Hello! Nice to meet you!', ipa: '/həˈləʊ! naɪs tuː miːt juː/', vi: 'Xin chào! Rất vui được gặp bạn!', exEn: 'Hello teacher, how are you today?', exVi: 'Em chào cô ạ, hôm nay cô có khỏe không?' },
  };

  for (const [k, item] of Object.entries(commonDict)) {
    if (lower.includes(k) || lower.includes(item.en.toLowerCase())) {
      return {
        replyVi: `Trong Tiếng Anh, "${item.vi}" được viết là **${item.en}** (phiên âm quốc tế: ${item.ipa}). Em hãy nhấn nút loa Tiếng Anh bản xứ bên dưới để nghe phát âm chuẩn Mỹ và đọc nhẩm theo nhé!`,
        spokenVi: `Trong Tiếng Anh, ${item.vi} đọc chuẩn như âm thanh bản xứ bên dưới. Em hãy bấm nghe và đọc to theo nhé!`,
        englishPhrase: item.en,
        phoneticIpa: item.ipa,
        englishExamples: [{ en: item.exEn, ipa: '', vi: item.exVi }],
        followUps: [
          'Cho em thêm 3 từ vựng cùng chủ đề này',
          'Đặt câu giao tiếp Tiếng Anh ngắn gọn',
          'Cách phát âm âm cuối trong Tiếng Anh',
        ],
      };
    }
  }

  return {
    replyVi: `Thầy đã nhận được câu hỏi của em (Lớp ${grade}): "${message}". Để học tốt phần này, em hãy nắm chắc khái niệm chính, xem ví dụ minh họa và thử tự đặt 1 câu hoặc giải 1 bài tương tự nhé. Em muốn thầy giải chi tiết từng bước hay cho ví dụ Tiếng Anh chuẩn?`,
    spokenVi: `Thầy đã nhận được câu hỏi của em lớp ${grade}. Em hãy cho thầy biết đề bài cụ thể hoặc từ vựng Tiếng Anh em muốn nghe phát âm chuẩn nhé!`,
    englishPhrase: 'Keep up the great work! Learning every day makes you smarter.',
    phoneticIpa: '/kiːp ʌp ðə ɡreɪt wɜːk/',
    englishExamples: [
      {
        en: 'Practice makes perfect!',
        ipa: '/ˈpræk.tɪs meɪks ˈpɜː.fekt/',
        vi: 'Có công mài sắt, có ngày nên kim!',
      },
    ],
    followUps: [
      `Giải thích ngữ pháp Tiếng Anh trọng tâm Lớp ${grade}`,
      `Đố em một câu Toán tư duy Lớp ${grade}`,
      'Phân biệt chính tả Tiếng Việt dễ nhầm',
    ],
  };
}

app.post(
  ['/api/kids-learning/chat', '/minhhieu/api/kids-learning/chat'],
  async (req, res) => {
    try {
      const message = String(req.body?.message || '').trim().slice(0, 1200);
      const grade = Math.max(1, Math.min(12, Number(req.body?.grade) || 3));
      const subject = String(req.body?.subject || 'all').trim();
      const rawHistory = Array.isArray(req.body?.history) ? req.body.history.slice(-6) : [];

      if (!message) {
        return res.status(400).json({ error: 'Em hãy nhập hoặc nói câu hỏi trước nhé!' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.json(buildFallbackKidsChatReply(message, grade));
      }

      const tierDesc =
        grade <= 5
          ? 'Tiểu học (giải thích thật dịu dàng, ngắn gọn, sinh động, dễ hiểu cho bé)'
          : grade <= 9
          ? 'THCS Cấp 2 (giải thích logic, rõ từng bước, nắm chắc bản chất và công thức)'
          : 'THPT Cấp 3 (giải thích sâu sắc, chuẩn xác học thuật, mẹo giải nhanh thi THPT/IELTS)';

      const historyContext = rawHistory
        .map((h: any) => `${h?.role === 'user' ? 'Học sinh' : 'Gia sư'}: ${String(h?.text || '').slice(0, 280)}`)
        .join('\n');

      const prompt = `Bạn là Gia sư thông thái, tận tâm, an toàn tuyệt đối cho trẻ em & học sinh phổ thông Việt Nam đang dạy học sinh Lớp ${grade} — bậc ${tierDesc} (môn ưu tiên: ${subject}).

Lịch sử hội thoại gần nhất:
${historyContext || '(Bắt đầu cuộc trò chuyện mới)'}

Câu hỏi mới của học sinh: "${message}"

Quy tắc bắt buộc:
1. Trả lời 100% lành mạnh, khích lệ tinh thần học tập, KHÔNG bao giờ chèn quảng cáo hay nội dung người lớn.
2. "replyVi": Câu trả lời rõ ràng, trình bày đẹp dễ đọc cho học sinh Lớp ${grade}. Nếu là bài Toán/Lý/Hóa thì trình bày từng bước dễ hiểu. Nếu là câu hỏi Tiếng Anh (từ vựng, dịch câu, ngữ pháp, giao tiếp), giải thích rõ nghĩa, cấu trúc và cách phát âm.
3. "spokenVi": Câu trả lời rút gọn viết bằng chữ Tiếng Việt tự nhiên để đọc thành tiếng (không chứa ký hiệu markdown *, #, và chuyển các dấu +, -, ×, :, = thành chữ "cộng", "trừ", "nhân", "chia", "bằng"; KHÔNG nhồi nguyên đoạn Tiếng Anh dài vào spokenVi vì phần Tiếng Anh sẽ có giọng bản xứ riêng đọc chuẩn).
4. Nếu câu hỏi liên quan đến Tiếng Anh (hoặc học sinh hỏi bằng Tiếng Anh / hỏi cách đọc / dịch Tiếng Anh):
   - Đặt từ hoặc câu Tiếng Anh trọng tâm chuẩn xác nhất vào "englishPhrase" để hệ thống phát âm bằng giọng Tiếng Anh bản xứ chuẩn Mỹ/Anh!
   - Ghi phiên âm quốc tế IPA chuẩn vào "phoneticIpa" (ví dụ: "/ˈæp.əl/").
   - Cung cấp 1 đến 3 câu ví dụ thực tế trong "englishExamples" gồm { en, ipa, vi }.
   Nếu câu hỏi thuần Toán/Tiếng Việt không liên quan Tiếng Anh, để "englishPhrase": "", "phoneticIpa": "", "englishExamples": [].
5. "followUps": Gợi ý 3 câu hỏi tiếp theo ngắn gọn, thú vị đúng trình độ Lớp ${grade}.`;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Kids tutor chat timeout')), 14000)
      );

      const chatPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.45,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              replyVi: { type: Type.STRING },
              spokenVi: { type: Type.STRING },
              englishPhrase: { type: Type.STRING },
              phoneticIpa: { type: Type.STRING },
              englishExamples: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    en: { type: Type.STRING },
                    ipa: { type: Type.STRING },
                    vi: { type: Type.STRING },
                  },
                  required: ['en', 'vi'],
                },
              },
              followUps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['replyVi', 'spokenVi', 'followUps'],
          },
        },
      });

      const response: any = await Promise.race([chatPromise, timeoutPromise]);
      const rawJson = response?.text ? String(response.text).trim() : '';
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        if (parsed && parsed.replyVi) {
          return res.json({
            replyVi: String(parsed.replyVi),
            spokenVi: String(parsed.spokenVi || parsed.replyVi),
            englishPhrase: parsed.englishPhrase ? String(parsed.englishPhrase) : '',
            phoneticIpa: parsed.phoneticIpa ? String(parsed.phoneticIpa) : '',
            englishExamples: Array.isArray(parsed.englishExamples) ? parsed.englishExamples : [],
            followUps: Array.isArray(parsed.followUps) ? parsed.followUps.slice(0, 3) : [],
          });
        }
      }

      return res.json(buildFallbackKidsChatReply(message, grade));
    } catch (err: any) {
      console.warn('Kids chat tutor fallback:', err?.message || err);
      const message = String(req.body?.message || '');
      const grade = Math.max(1, Math.min(12, Number(req.body?.grade) || 3));
      return res.json(buildFallbackKidsChatReply(message, grade));
    }
  }
);

// =========================================================================
// ENDPOINT: CHỤP ẢNH TÀI LIỆU & GIẢI BÀI TẬP BẢNG ĐEN (Gemini Vision Multimodal)
// =========================================================================
app.post(
  ['/api/kids-learning/solve-homework', '/minhhieu/api/kids-learning/solve-homework'],
  async (req, res) => {
    try {
      const imageBase64Raw = String(req.body?.imageBase64 || '').trim();
      const mimeType = String(req.body?.mimeType || 'image/jpeg');
      const grade = Math.max(1, Math.min(12, Number(req.body?.grade) || 3));
      const subject = String(req.body?.subject || 'toan');
      const promptText = String(req.body?.prompt || '').trim().slice(0, 1000);
      const studentName = String(req.body?.studentName || 'Học sinh').slice(0, 50);

      const cleanBase64 = imageBase64Raw.includes(',')
        ? imageBase64Raw.split(',')[1]
        : imageBase64Raw;

      if (!cleanBase64 && !promptText) {
        return res.status(400).json({ error: 'Vui lòng tải ảnh đề bài hoặc gõ câu hỏi bài tập.' });
      }

      if (!process.env.GEMINI_API_KEY) {
        const fallbackBoard = {
          boardTitle: `Bài Tập Lớp ${grade} • Môn ${subject.toUpperCase()}`,
          subject,
          extractedText: promptText || 'Đề bài tập từ ảnh tài liệu học sinh tải lên',
          coreConcept: 'Phương pháp giải toán / phân tích logic từng bước',
          steps: [
            {
              stepNumber: 1,
              title: 'Xác định yêu cầu đề bài',
              content: 'Đọc kỹ các dữ kiện đã cho và đại lượng cần tìm.',
              formula: 'Đại lượng đã biết ⇒ Đại lượng cần tìm',
            },
            {
              stepNumber: 2,
              title: 'Thực hiện phép tính',
              content: 'Áp dụng công thức và tính toán cẩn thận từng phép biến đổi.',
              formula: 'A + B = C',
            },
          ],
          finalAnswer: 'Đáp số bài toán đã được xác định chính xác.',
          teacherAdvice: 'Em hãy ghi chép cẩn thận vào vở và rèn luyện thêm các dạng tương tự nhé!',
          spokenExplanation: `Chào em ${studentName}! Thầy đã phân tích đề bài và trình bày lời giải chi tiết lên bảng xanh rồi. Em quan sát từng bước trên bảng nhé!`,
        };
        return res.json(fallbackBoard);
      }

      const instructions = `Bạn là Thầy giáo thông thái, mẫu mực và tận tâm trong lớp học trực quan "Thầy Giáo & Tấm Bảng Thông Minh" cho học sinh Lớp ${grade} Việt Nam (Môn trọng tâm: ${subject}).
Học sinh tên là: "${studentName}".
${promptText ? `Học sinh có gửi kèm câu hỏi/chú thích: "${promptText}".` : ''}

Nhiệm vụ của bạn:
1. Nhìn vào hình ảnh chụp tài liệu/sách bài tập/vở ghi (hoặc câu hỏi đề bài được giao), nhận diện chính xác đề bài bài tập (Toán, Tiếng Việt, Tiếng Anh, Khoa học, Vật lý, Hóa học...).
2. "boardTitle": Tiêu đề ngắn gọn, trang trọng ghi trên đầu bảng (ví dụ: "Toán Lớp 4: Tìm Hai Số Khi Biết Tổng Và Hiệu", "Tiếng Anh Lớp 6: Thì Quá Khứ Đơn", "Tiếng Việt Lớp 3: Luyện Từ Và Câu").
3. "extractedText": Nội dung đề bài nguyên văn đã nhận diện rõ ràng từ ảnh hoặc câu hỏi của học sinh.
4. "coreConcept": Quy tắc, công thức hoặc phương pháp cốt lõi cần nhớ (viết đẹp, ngắn gọn như chữ phấn vàng trên bảng).
5. "steps": Danh sách từ 2 đến 5 bước giải logic, chi tiết và dễ hiểu nhất cho học sinh Lớp ${grade}. Mỗi bước gồm:
   - "stepNumber": Số thứ tự (1, 2, 3...)
   - "title": Tên bước (ví dụ: "Bước 1: Tìm số bé", "Bước 2: Tìm số lớn")
   - "content": Lời giải thích mạch lạc
   - "formula": Công thức toán học hoặc phép biến đổi nếu có (ví dụ: "Số bé = (Tổng - Hiệu) : 2 = (120 - 20) : 2 = 50")
6. "finalAnswer": Kết luận / Đáp số chính xác của bài tập.
7. "teacherAdvice": Lời động viên, mẹo tránh bẫy sai sót hoặc dặn dò ân cần của Thầy dành cho học sinh.
8. "spokenExplanation": Lời giảng bài của Thầy giáo bằng giọng nói truyền cảm, tự nhiên, xưng Thầy gọi Em (dùng chữ tự nhiên để đọc to thành tiếng bằng loa, không dùng ký hiệu toán học lạ).
9. Nếu là bài tập Tiếng Anh: bổ sung "englishPhrase" (cụm từ/câu mẫu cần phát âm), "phoneticIpa" (phiên âm quốc tế), và "englishExamples" (ví dụ thực tế). Nếu không phải Tiếng Anh, để trống chuỗi.`;

      const contents: any[] = [];
      if (cleanBase64) {
        contents.push({
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        });
      }
      contents.push(instructions);

      const response: any = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          temperature: 0.35,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              boardTitle: { type: Type.STRING },
              subject: { type: Type.STRING },
              extractedText: { type: Type.STRING },
              coreConcept: { type: Type.STRING },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stepNumber: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    content: { type: Type.STRING },
                    formula: { type: Type.STRING },
                  },
                  required: ['stepNumber', 'title', 'content'],
                },
              },
              finalAnswer: { type: Type.STRING },
              teacherAdvice: { type: Type.STRING },
              spokenExplanation: { type: Type.STRING },
              englishPhrase: { type: Type.STRING },
              phoneticIpa: { type: Type.STRING },
              englishExamples: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    en: { type: Type.STRING },
                    ipa: { type: Type.STRING },
                    vi: { type: Type.STRING },
                  },
                  required: ['en', 'vi'],
                },
              },
            },
            required: ['boardTitle', 'extractedText', 'steps', 'finalAnswer', 'spokenExplanation'],
          },
        },
      });

      const rawJson = response?.text ? String(response.text).trim() : '';
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        // Background auto-save to Neon.tech if connected
        saveStudyRecordToNeon({
          id: `hw-${Date.now()}`,
          studentName,
          grade,
          subject,
          prompt: promptText || parsed.extractedText || 'Đề bài ảnh tài liệu',
          boardTitle: parsed.boardTitle,
          coreConcept: parsed.coreConcept,
          stepsJson: parsed.steps,
          finalAnswer: parsed.finalAnswer,
          teacherAdvice: parsed.teacherAdvice,
        }).catch(() => {});

        return res.json(parsed);
      }

      throw new Error('Không nhận được dữ liệu phản hồi từ AI');
    } catch (err: any) {
      console.warn('Solve homework vision fallback:', err?.message || err);
      const grade = Math.max(1, Math.min(12, Number(req.body?.grade) || 3));
      const promptText = String(req.body?.prompt || '');
      const subject = String(req.body?.subject || 'toan');
      const studentName = String(req.body?.studentName || 'Học sinh');
      return res.json({
        boardTitle: `Bài Tập Lớp ${grade} • Môn ${subject.toUpperCase()}`,
        subject,
        extractedText: promptText || 'Đề bài tập từ ảnh tài liệu học sinh gửi',
        coreConcept: 'Phương pháp giải toán & phân tích logic từng bước',
        steps: [
          {
            stepNumber: 1,
            title: 'Bước 1: Xác định yêu cầu đề bài',
            content: 'Xác định rõ các dữ kiện đã biết và đại lượng cần tìm.',
            formula: promptText ? `Đề bài: ${promptText}` : undefined,
          },
          {
            stepNumber: 2,
            title: 'Bước 2: Thực hiện phép biến đổi',
            content: 'Áp dụng quy tắc chuyển vế đổi dấu hoặc công thức tính toán tương ứng.',
            formula: 'Biến đổi biểu thức ⇒ Kết quả trung gian',
          },
          {
            stepNumber: 3,
            title: 'Bước 3: Kiểm tra và kết luận',
            content: 'Thay kết quả vào điều kiện bài toán để xác nhận tính chính xác.',
          },
        ],
        finalAnswer: 'Đáp số đã được xác định chính xác theo các bước trên bảng.',
        teacherAdvice: 'Em hãy ghi chép cẩn thận vào vở và rèn luyện thêm các dạng bài tập tương tự nhé!',
        spokenExplanation: `Chào em ${studentName}! Thầy đã phân tích đề bài và trình bày lời giải chi tiết lên bảng xanh rồi. Em quan sát từng bước trên bảng nhé!`,
      });
    }
  }
);

// =========================================================================
// ENDPOINTS: ADMIN AUTHENTICATION & AUTO-PROVISIONING (NEON POSTGRESQL)
// =========================================================================

// POST /api/admin/login - Xác thực tài khoản & mật khẩu Admin từ bảng neon_admin_accounts
app.post(['/api/admin/login', '/minhhieu/api/admin/login'], async (req, res) => {
  try {
    const { username, password, rememberMe = true } = req.body || {};
    const ip =
      String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const userAgent = String(req.headers['user-agent'] || '');

    const result = await loginAdminWithNeon(username, password, Boolean(rememberMe), {
      ip,
      userAgent,
    });
    if (!result.success) {
      return res.status(401).json(result);
    }
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Lỗi máy chủ khi xác thực Quản trị viên.',
    });
  }
});

// GET /api/admin/session - Kiểm tra phiên đăng nhập Admin hiện tại trên PostgreSQL
app.get(['/api/admin/session', '/minhhieu/api/admin/session'], async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    const rawToken = extractAdminTokenFromRequest(req);
    const [admin, initialized] = await Promise.all([
      verifyAdminSessionToken(rawToken),
      isAdminInitializedInNeon(),
    ]);

    return res.json({
      authenticated: Boolean(admin),
      admin: admin || null,
      dbConnected: Boolean(getNeonConnectionString()),
      dbInitialized: initialized,
    });
  } catch {
    return res.json({
      authenticated: false,
      admin: null,
      dbConnected: Boolean(getNeonConnectionString()),
      dbInitialized: false,
    });
  }
});

// POST /api/admin/logout - Hủy phiên đăng nhập Admin trong cơ sở dữ liệu
app.post(['/api/admin/logout', '/minhhieu/api/admin/logout'], async (req, res) => {
  try {
    const rawToken = extractAdminTokenFromRequest(req);
    const allDevices = Boolean(req.body?.allDevices);
    await logoutAdminSession(rawToken, allDevices);
    return res.json({ success: true, message: 'Đã đăng xuất và khóa khu vực cài đặt!' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Lỗi đăng xuất' });
  }
});

// POST /api/admin/change-password - Đổi mật khẩu & tên đăng nhập Admin trực tiếp trên PostgreSQL (Chỉ Admin)
app.post(
  ['/api/admin/change-password', '/minhhieu/api/admin/change-password'],
  requireAdminAuth,
  async (req, res) => {
    try {
      const adminUser = (req as any).adminUser as AdminPrincipal;
      const currentToken = (req as any).adminToken as string;
      const { currentPassword, newPassword, newUsername, newDisplayName } = req.body || {};

      const result = await changeAdminCredentialsInNeon({
        adminId: adminUser.id,
        currentToken,
        currentPassword: String(currentPassword || ''),
        newPassword: String(newPassword || ''),
        newUsername: newUsername ? String(newUsername) : undefined,
        newDisplayName: newDisplayName ? String(newDisplayName) : undefined,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err?.message || 'Lỗi cập nhật mật khẩu Quản trị viên.',
      });
    }
  }
);

// GET /api/admin/accounts - Danh sách tài khoản Admin (Chỉ Admin, không lộ password_hash)
app.get(
  ['/api/admin/accounts', '/minhhieu/api/admin/accounts'],
  requireAdminAuth,
  async (_req, res) => {
    try {
      const accounts = await listAdminAccountsInNeon();
      return res.json({ success: true, accounts });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Lỗi tải tài khoản Admin' });
    }
  }
);

// POST /api/admin/accounts - Tạo thêm tài khoản Admin mới lưu vào PostgreSQL (Chỉ Admin)
app.post(
  ['/api/admin/accounts', '/minhhieu/api/admin/accounts'],
  requireAdminAuth,
  async (req, res) => {
    try {
      const adminUser = (req as any).adminUser as AdminPrincipal;
      const { username, password, displayName, email, role } = req.body || {};
      const result = await createAdminAccountInNeon({
        actorUsername: adminUser.username,
        username: String(username || ''),
        password: String(password || ''),
        displayName: displayName ? String(displayName) : undefined,
        email: email ? String(email) : undefined,
        role: role ? String(role) : 'admin',
      });
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Lỗi tạo tài khoản Admin' });
    }
  }
);

// DELETE /api/admin/accounts/:id - Xóa tài khoản Admin phụ (Chỉ Admin, bảo vệ tài khoản cuối cùng)
app.delete(
  ['/api/admin/accounts/:id', '/minhhieu/api/admin/accounts/:id'],
  requireAdminAuth,
  async (req, res) => {
    try {
      const adminUser = (req as any).adminUser as AdminPrincipal;
      const targetId = parseInt(String(req.params.id || '0'), 10);
      if (!targetId) {
        return res.status(400).json({ success: false, message: 'ID tài khoản không hợp lệ.' });
      }
      const result = await deleteAdminAccountInNeon({
        actorId: adminUser.id,
        actorUsername: adminUser.username,
        targetId,
      });
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Lỗi xóa tài khoản Admin' });
    }
  }
);

// POST /api/admin/auto-setup-db - Tự động tạo toàn bộ bảng dữ liệu & đồng bộ tất cả cài đặt trong 1-click ngay tại Cài Đặt (Chỉ Admin)
app.post(
  ['/api/admin/auto-setup-db', '/minhhieu/api/admin/auto-setup-db'],
  requireAdminAuth,
  async (req, res) => {
    try {
      const adminUser = (req as any).adminUser as AdminPrincipal;
      const actor = adminUser?.username || 'admin';

      // 1. Tự động tạo & kiểm tra đầy đủ 8 bảng dữ liệu + tài khoản Admin + cài đặt mặc định
      const schemaResult = await initializeNeonSchema();

      // 2. Đồng bộ mọi cài đặt hiện tại từ giao diện Admin lên bảng neon_app_settings & neon_channel_videos
      const {
        adSettings,
        watermarkSettings,
        channelProfile,
        playbackPreferences,
        customVideos,
        deletedVideoIds,
      } = req.body || {};

      if (adSettings && typeof adSettings === 'object') {
        await upsertAppSettingInNeon({
          key: 'ad_settings',
          value: adSettings,
          category: 'ads',
          isPublic: true,
          description: 'Cấu hình Quảng cáo Video VAST, Display Banner & Video Slider',
          updatedBy: actor,
        });
      }

      if (watermarkSettings && typeof watermarkSettings === 'object') {
        await upsertAppSettingInNeon({
          key: 'watermark_settings',
          value: watermarkSettings,
          category: 'watermark',
          isPublic: true,
          description: 'Cấu hình Logo Watermark thương hiệu kênh',
          updatedBy: actor,
        });
      }

      if (channelProfile && typeof channelProfile === 'object') {
        await upsertAppSettingInNeon({
          key: 'channel_profile',
          value: channelProfile,
          category: 'channel',
          isPublic: true,
          description: 'Thông tin kênh YouTube & RSS Podcast chính thức',
          updatedBy: actor,
        });
      }

      if (playbackPreferences && typeof playbackPreferences === 'object') {
        await upsertAppSettingInNeon({
          key: 'playback_preferences',
          value: playbackPreferences,
          category: 'playback',
          isPublic: true,
          description: 'Tùy chọn phát tự động & chế độ học tập',
          updatedBy: actor,
        });
      }

      let videoSync = { savedVideos: 0, savedDeleted: 0 };
      if (Array.isArray(customVideos) || Array.isArray(deletedVideoIds)) {
        videoSync = await upsertChannelVideosInNeon({
          customVideos,
          deletedVideoIds,
          updatedBy: actor,
        });
      }

      const freshStatus = await testNeonConnection();

      return res.json({
        success: true,
        message:
          'Đã tự động tạo đầy đủ 8 bảng dữ liệu và lưu trữ toàn bộ thông tin đăng nhập, mật khẩu & cài đặt trên Neon PostgreSQL!',
        tables: schemaResult.tables,
        status: freshStatus,
        videoSync,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Lỗi tự động tạo bảng và đồng bộ cài đặt lên Neon PostgreSQL',
      });
    }
  }
);

// =========================================================================
// ENDPOINTS: NEON.TECH POSTGRESQL DATABASE INTEGRATION & MANAGEMENT (ADMIN ONLY)
// =========================================================================

// GET /api/neon/status - Chỉ Admin mới xem được chi tiết máy chủ, bảng và số dòng
app.get(['/api/neon/status', '/minhhieu/api/neon/status'], async (req, res) => {
  try {
    const rawToken = extractAdminTokenFromRequest(req);
    const admin = await verifyAdminSessionToken(rawToken);
    const status = await testNeonConnection();

    if (!admin) {
      return res.json({
        connected: status.connected,
        initialized: Boolean(status.initialized),
        adminRequired: true,
      });
    }

    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Lỗi kiểm tra kết nối Neon.tech' });
  }
});

// POST /api/neon/connect - Cấu hình & lưu chuỗi kết nối Neon + Tự động khởi tạo bảng (Khóa chặt cho riêng Admin sau khi đã tạo DB)
app.post(['/api/neon/connect', '/minhhieu/api/neon/connect'], async (req, res) => {
  try {
    const alreadyInitialized = await isAdminInitializedInNeon();
    if (alreadyInitialized) {
      const rawToken = extractAdminTokenFromRequest(req);
      const admin = await verifyAdminSessionToken(rawToken);
      if (!admin) {
        return res.status(401).json({
          error: 'Chỉ Quản trị viên (Admin) đã đăng nhập mới được phép thay đổi chuỗi kết nối cơ sở dữ liệu!',
        });
      }
    }

    const connStr = String(req.body?.connectionString || '').trim();
    if (!connStr) {
      return res.status(400).json({ error: 'Vui lòng nhập chuỗi kết nối PostgreSQL từ https://neon.tech' });
    }

    const testResult = await testNeonConnection(connStr);
    if (!testResult.connected) {
      return res.status(400).json({
        error: testResult.error || 'Không thể kết nối đến máy chủ Neon với chuỗi kết nối này.',
      });
    }

    saveNeonConnectionString(connStr);
    await initializeNeonSchema();
    const updatedStatus = await testNeonConnection();

    return res.json({
      success: true,
      message: 'Kết nối Neon.tech và tự động khởi tạo các bảng dữ liệu thành công!',
      details: updatedStatus,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Lỗi thiết lập kết nối Neon.tech' });
  }
});

// POST /api/neon/init-tables - Tự động tạo cấu trúc các bảng trên Neon (Chỉ Admin)
app.post(
  ['/api/neon/init-tables', '/minhhieu/api/neon/init-tables'],
  requireAdminAuth,
  async (_req, res) => {
    try {
      const result = await initializeNeonSchema();
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Lỗi khởi tạo bảng trên Neon' });
    }
  }
);

// GET /api/neon/table/:name - Truy vấn danh sách bản ghi bảng (Chỉ Admin)
app.get(
  ['/api/neon/table/:name', '/minhhieu/api/neon/table/:name'],
  requireAdminAuth,
  async (req, res) => {
    try {
      const tableName = String(req.params.name || '');
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || '20'), 10)));
      const search = String(req.query.search || '');

      const data = await queryNeonTable(tableName, page, limit, search);
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Lỗi truy vấn dữ liệu từ bảng Neon' });
    }
  }
);

// POST /api/neon/table/:name - Thêm bản ghi mới vào bảng (Chỉ Admin)
app.post(
  ['/api/neon/table/:name', '/minhhieu/api/neon/table/:name'],
  requireAdminAuth,
  async (req, res) => {
    try {
      const tableName = String(req.params.name || '');
      const rowData = req.body || {};
      const inserted = await insertNeonTableRow(tableName, rowData);
      return res.json({ success: true, row: inserted });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Lỗi thêm bản ghi vào bảng Neon' });
    }
  }
);

// DELETE /api/neon/table/:name/:id - Xóa bản ghi (Chỉ Admin)
app.delete(
  ['/api/neon/table/:name/:id', '/minhhieu/api/neon/table/:name/:id'],
  requireAdminAuth,
  async (req, res) => {
    try {
      const tableName = String(req.params.name || '');
      const id = String(req.params.id || '');
      const deleted = await deleteNeonTableRow(tableName, id);
      return res.json({ success: deleted });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Lỗi xóa bản ghi trên Neon' });
    }
  }
);

// POST /api/neon/query - Thực thi câu lệnh SQL trực tiếp (Chỉ Admin)
app.post(['/api/neon/query', '/minhhieu/api/neon/query'], requireAdminAuth, async (req, res) => {
  try {
    const adminUser = (req as any).adminUser as AdminPrincipal;
    const sql = String(req.body?.sql || '').trim();
    if (!sql) return res.status(400).json({ error: 'Thiếu câu lệnh SQL' });

    const result = await executeNeonCustomSql(sql, adminUser?.username || 'admin');
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Lỗi thực thi SQL' });
  }
});

// POST /api/neon/sync-local - Đồng bộ toàn bộ dữ liệu cục bộ & cài đặt lên Neon (Chỉ Admin)
app.post(
  ['/api/neon/sync-local', '/minhhieu/api/neon/sync-local'],
  requireAdminAuth,
  async (req, res) => {
    try {
      const adminUser = (req as any).adminUser as AdminPrincipal;
      const actor = adminUser?.username || 'admin';
      const { users, studyRecords, appSettings, tiktokHistory, customVideos, deletedVideoIds } =
        req.body || {};
      let syncedUsers = 0;
      let syncedRecords = 0;
      let syncedTiktok = 0;
      let syncedSettings = 0;

      await initializeNeonSchema();

      if (appSettings && typeof appSettings === 'object') {
        for (const [k, v] of Object.entries(appSettings)) {
          if (v !== undefined && v !== null) {
            await upsertAppSettingInNeon({
              key: k,
              value: v,
              category: 'synced',
              isPublic: k !== 'security_policy',
              updatedBy: actor,
            });
            syncedSettings++;
          }
        }
      }

      if (Array.isArray(customVideos) || Array.isArray(deletedVideoIds)) {
        await upsertChannelVideosInNeon({
          customVideos,
          deletedVideoIds,
          updatedBy: actor,
        });
      }

      if (Array.isArray(users)) {
        for (const u of users) {
          if (u && u.id) {
            try {
              await insertNeonTableRow('neon_app_users', {
                id: u.id,
                full_name: u.name || u.fullName || 'Học sinh',
                email: u.email || null,
                grade: u.grade || 3,
                stars: u.stars || 0,
                xp: u.xp || 0,
                streak: u.streak || 0,
                avatar: u.avatar || null,
              });
              syncedUsers++;
            } catch {}
          }
        }
      }

      if (Array.isArray(studyRecords)) {
        for (const r of studyRecords) {
          if (r) {
            try {
              await saveStudyRecordToNeon(r);
              syncedRecords++;
            } catch {}
          }
        }
      }

      if (Array.isArray(tiktokHistory)) {
        for (const t of tiktokHistory) {
          if (t && t.id) {
            try {
              await insertNeonTableRow('neon_tiktok_history', {
                id: String(t.id),
                video_id: String(t.id),
                author_name: t.authorName || 'TikTok',
                author_username: t.authorUsername || 'tiktok',
                description: t.description || '',
                cover: t.cover || '',
                download_url: t.downloadUrl || '',
                video_url: t.videoUrl || '',
                file_name: t.fileName || 'tiktok.mp4',
              });
              syncedTiktok++;
            } catch {}
          }
        }
      }

      return res.json({
        success: true,
        message: 'Đồng bộ hóa toàn bộ cài đặt & dữ liệu lên Neon.tech hoàn tất!',
        synced: {
          settings: syncedSettings,
          users: syncedUsers,
          studyRecords: syncedRecords,
          tiktok: syncedTiktok,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Lỗi đồng bộ dữ liệu lên Neon' });
    }
  }
);

// Setup Vite middleware in dev or static files in production
async function startServer() {
  // Tự động khởi tạo bảng cơ sở dữ liệu, tài khoản Admin gốc & cài đặt trên Neon PostgreSQL ngay khi khởi động
  ensureNeonBootstrapped()
    .then((ready) => {
      if (ready) {
        console.log('Neon PostgreSQL schema & Admin security initialized.');
      }
    })
    .catch((err) => {
      console.warn('Neon startup bootstrap skipped:', err?.message || err);
    });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`CastTube Server running at http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error('Server listen error:', err);
  });
}

startServer();
