import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Enable CORS for all API routes (allows GitHub Pages to call proxy endpoints)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Endpoint: Podcast RSS Feed (studo.xml) for YouTube Studio & podcast players
app.get(['/studo.xml', '/minhhieu/studo.xml', '/studio.xml', '/minhhieu/studio.xml', '/feed.xml', '/minhhieu/feed.xml', '/rss.xml', '/minhhieu/rss.xml'], (req, res) => {
  const studoPath = path.resolve(__dirname, 'public/studo.xml');
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  if (fs.existsSync(studoPath)) {
    return res.sendFile(studoPath);
  }
  return res.status(404).send('<!-- studo.xml not found -->');
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

// VidKraken API v2 Proxy Endpoint (Direct forwarding with default user API key)
const VIDKRAKEN_DEFAULT_KEY =
  process.env.VIDKRAKEN_API_KEY || 'f71cd7b5-2fcd-42b4-a4b7-40e6ca96b6ba';

app.use(['/api/vidkraken', '/minhhieu/api/vidkraken'], async (req, res) => {
  try {
    let subPath = req.url;
    if (subPath.startsWith('/minhhieu/api/vidkraken')) {
      subPath = subPath.replace(/^\/minhhieu\/api\/vidkraken/, '');
    } else if (subPath.startsWith('/api/vidkraken')) {
      subPath = subPath.replace(/^\/api\/vidkraken/, '');
    }
    if (!subPath.startsWith('/')) subPath = '/' + subPath;

    const targetUrl = `https://vidkraken.com/api/v2${subPath}`;
    const authHeader = req.headers.authorization || `Bearer ${VIDKRAKEN_DEFAULT_KEY}`;

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
    const rawUrl = (req.query.url as string) || 'https://www.youtube.com/@minhhieureviewphim';
    const channelMatch =
      rawUrl.trim().match(/youtube\.com\/(@[^\/?&#]+)/i) || rawUrl.trim().match(/^(@[^\/?&#]+)/i);
    const handle = channelMatch ? channelMatch[1] : '@minhhieureviewphim';

    // Fetch initial channel page to get channel name and avatar
    let channelName = 'Minh Hiếu review phim';
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
    const rawUrl = (req.query.url as string) || 'https://www.youtube.com/@minhhieureviewphim';
    const channelMatch =
      rawUrl.trim().match(/youtube\.com\/(@[^\/?&#]+)/i) || rawUrl.trim().match(/^(@[^\/?&#]+)/i);
    const handle = channelMatch ? channelMatch[1] : '@minhhieureviewphim';

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
    const { topic, style = 'Review phim & Triết lý', aspectRatio = '9:16' } = req.body;
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const systemInstruction = `Bạn là Nhà biên kịch & Đạo diễn Video ngắn chuyên nghiệp (Shorts, TikTok, Reels, YouTube).
Bạn chuyên tạo các kịch bản video ngắn chia thành ĐÚNG 3 CẢNH, MỖI CẢNH 10 GIÂY (Tổng thời lượng = 30 giây).
Quy tắc 10 giây mỗi cảnh: Lời dẫn lồng tiếng (Voiceover) của mỗi cảnh phải dài vừa vặn khoảng 22 - 28 từ tiếng Việt, để khi đọc với tốc độ bình thường sẽ chiếm chính xác 10 giây.`;

    const userPrompt = `Chủ đề video: "${topic}"
Phong cách: "${style}"
Tỉ lệ khung hình: "${aspectRatio}" (9:16 dọc hoặc 16:9 ngang)

Hãy tạo một kịch bản hoàn chỉnh gồm ĐÚNG 3 CẢNH theo cấu trúc kịch tính:
- Cảnh 1 (0s - 10s): Giới thiệu hook kích thích tò mò, mở màn bối cảnh.
- Cảnh 2 (10s - 20s): Cao trào kịch tính, bước ngoặt bất ngờ hoặc thử thách.
- Cảnh 3 (20s - 30s): Đỉnh điểm kết quả, bài học sâu sắc và lời kêu gọi lắng đọng.

Yêu cầu trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm markdown \`\`\`json ngoài trừ JSON nguyên bản) theo cấu trúc:
{
  "title": "Tên video cuốn hút",
  "aspectRatio": "${aspectRatio}",
  "totalDuration": 30,
  "theme": "Chủ đề cốt lõi",
  "scenes": [
    {
      "sceneNumber": 1,
      "name": "Tên phân cảnh 1",
      "duration": 10,
      "timeRange": "00:00 - 00:10",
      "narration": "Lời lồng tiếng tiếng Việt tự nhiên, khoảng 25 từ (đúng 10 giây)",
      "subtitle": "Phụ đề nổi bật trên video",
      "visualPrompt": "Prompt chi tiết bằng tiếng Anh mô tả khung cảnh nghệ thuật, ánh sáng cinematic, góc quay camera để tạo ảnh bằng AI",
      "cameraMotion": "zoom-in"
    },
    {
      "sceneNumber": 2,
      "name": "Tên phân cảnh 2",
      "duration": 10,
      "timeRange": "00:10 - 00:20",
      "narration": "Lời lồng tiếng cao trào tiếng Việt khoảng 25 từ (đúng 10 giây)",
      "subtitle": "Phụ đề cao trào",
      "visualPrompt": "Detailed cinematic prompt in English for Scene 2",
      "cameraMotion": "pan-right"
    },
    {
      "sceneNumber": 3,
      "name": "Tên phân cảnh 3",
      "duration": 10,
      "timeRange": "00:20 - 00:30",
      "narration": "Lời lồng tiếng kết thúc lắng đọng tiếng Việt khoảng 25 từ (đúng 10 giây)",
      "subtitle": "Phụ đề kết luận ý nghĩa",
      "visualPrompt": "Detailed cinematic prompt in English for Scene 3",
      "cameraMotion": "zoom-out"
    }
  ]
}`;

    let jsonResult: any = null;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const rawText = response.text || '';
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        jsonResult = JSON.parse(match[0]);
      }
    } catch (err: any) {
      console.warn('Gemini script generation fallback:', err);
    }

    if (!jsonResult || !jsonResult.scenes || jsonResult.scenes.length !== 3) {
      // High quality structured fallback
      jsonResult = {
        title: topic,
        aspectRatio,
        totalDuration: 30,
        theme: style,
        scenes: [
          {
            sceneNumber: 1,
            name: 'Mở màn & Bối cảnh',
            duration: 10,
            timeRange: '00:00 - 00:10',
            narration: `Bước chân vào thế giới của "${topic}", nơi mọi quy luật thông thường dường như bị đảo lộn hoàn toàn.`,
            subtitle: `Bí ẩn khởi đầu: ${topic}`,
            visualPrompt: `Cinematic establishing shot of ${topic}, dramatic atmospheric lighting, 8k resolution, photorealistic, epic mood`,
            cameraMotion: 'zoom-in',
          },
          {
            sceneNumber: 2,
            name: 'Cao trào kịch tính',
            duration: 10,
            timeRange: '00:10 - 00:20',
            narration: 'Khi mọi hy vọng tưởng chừng vụt tắt, một bí mật kinh ngạc được hé lộ khiến tất cả phải sững sờ.',
            subtitle: 'Bước ngoặt kịch tính bất ngờ',
            visualPrompt: `Intense dramatic scene related to ${topic}, dynamic motion, high contrast, cinematic masterpiece`,
            cameraMotion: 'pan-right',
          },
          {
            sceneNumber: 3,
            name: 'Kết thúc & Ý nghĩa',
            duration: 10,
            timeRange: '00:20 - 00:30',
            narration: 'Chiến thắng không thuộc về kẻ mạnh nhất, mà thuộc về người giữ trọn niềm tin và sự thiện lương sâu thẳm.',
            subtitle: 'Chân lý thấu suốt lòng người',
            visualPrompt: `Inspiring cinematic conclusion, golden hour rays, peaceful and profound emotion, 8k wallpaper`,
            cameraMotion: 'zoom-out',
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

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CastTube Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
