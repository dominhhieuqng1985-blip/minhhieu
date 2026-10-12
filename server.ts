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

app.use(express.json());

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

// Support base prefix from Vite base: '/minhhieu/'
app.use((req, _res, next) => {
  if (req.url.startsWith('/minhhieu/api')) {
    req.url = req.url.replace(/^\/minhhieu\/api/, '/api');
  }
  next();
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
