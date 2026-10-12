const https = require('https');
const fs = require('fs');
const path = require('path');

const CHANNEL_ID = 'UCUr78N1iiRNyg_UoBgtPPhw';
const CHANNEL_HANDLE = '@minhhieureviewphim';
const CHANNEL_NAME = 'Minh Hiếu review phim';
const CHANNEL_AVATAR = 'https://yt3.googleusercontent.com/IAZc3hD-MjzJAtG3Eainm3ueaTvyalzFYEeBqHm-1rkIbUCmIz9--aemFtvSsV-eQIZS0AS0EQ=s900-c-k-c0x00ffffff-no-rj';
const CHANNEL_BANNER = 'https://yt3.googleusercontent.com/nXC6CfLFHVL0mQjAJtqBxNqZM3nPyjtdk-zs9b9RIdblNxB_9CMOSBDc8iIFho4WiUMHbrU-zQ=w2560-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj';

const YOUTUBE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8'
};

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: YOUTUBE_HEADERS }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseDurationSeconds(dur) {
  if (!dur) return 600;
  const parts = dur.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 600;
}

async function main() {
  console.log('--- Đang đồng bộ hóa video mới nhất từ YouTube ---');

  // Read existing minhhieuChannelData.ts if available
  const dataPath = path.resolve(__dirname, '../src/data/minhhieuChannelData.ts');
  let existingDataContent = '';
  if (fs.existsSync(dataPath)) {
    existingDataContent = fs.readFileSync(dataPath, 'utf8');
  }

  // 1. Fetch RSS feed for instant newly uploaded videos
  console.log('1. Đang nạp YouTube RSS Feed...');
  const rssXml = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`);
  const rssEntries = rssXml.split('<entry>');
  const rssVideos = [];
  for (let i = 1; i < rssEntries.length; i++) {
    const e = rssEntries[i];
    const idM = e.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
    const titleM = e.match(/<title>(.*?)<\/title>/);
    const pubM = e.match(/<published>(.*?)<\/published>/);
    if (idM && titleM) {
      rssVideos.push({
        youtubeId: idM[1],
        title: titleM[1],
        published: pubM ? pubM[1] : ''
      });
    }
  }
  console.log(`Tìm thấy ${rssVideos.length} video trong RSS feed.`);

  // 2. Fetch /videos page
  console.log('2. Đang nạp danh sách video đầy đủ từ /videos...');
  const vHtml = await fetchText(`https://www.youtube.com/${CHANNEL_HANDLE}/videos`);
  const scrapedLong = [];
  const blocks = vHtml.split('"lockupViewModel":');
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    const idM = b.match(/"(?:videoId|contentId)":"([a-zA-Z0-9_-]{11})"/);
    const titleM = b.match(/"lockupMetadataViewModel":\{"title":\{"content":"(.*?)"\}/);
    const timeM = b.match(/"thumbnailBadgeViewModel":\{"text":"(.*?)"/);
    const labelM = b.match(/"accessibilityContext":\{"label":"(.*?)"\}/);
    const viewM = b.match(/"accessibilityLabel":"([^"]*lượt xem[^"]*)"/);

    if (idM && titleM) {
      let title = titleM[1];
      try { title = JSON.parse('"' + title + '"'); } catch {}
      let dur = timeM ? timeM[1] : '';
      if (!dur && labelM) {
        const lbl = labelM[1];
        const hM = lbl.match(/(\d+)\s*giờ/);
        const mM = lbl.match(/(\d+)\s*phút/);
        const sM = lbl.match(/(\d+)\s*giây/);
        const h = hM ? parseInt(hM[1], 10) : 0;
        const m = mM ? parseInt(mM[1], 10) : 0;
        const s = sM ? parseInt(sM[1], 10) : 0;
        if (h > 0) dur = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        else if (m > 0 || s > 0) dur = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }
      if (!dur) dur = '03:30';

      if (!scrapedLong.some((x) => x.youtubeId === idM[1])) {
        scrapedLong.push({
          youtubeId: idM[1],
          title,
          duration: dur,
          durationSeconds: parseDurationSeconds(dur),
          views: viewM ? viewM[1] : undefined,
          isShort: false
        });
      }
    }
  }

  // Also include any RSS video not in scrapedLong as long video or short
  for (const rv of rssVideos) {
    if (!scrapedLong.some(v => v.youtubeId === rv.youtubeId)) {
      // Determine if short
      const isShort = rv.title.toLowerCase().includes('#shorts') || rv.title.toLowerCase().includes('video ngắn');
      scrapedLong.push({
        youtubeId: rv.youtubeId,
        title: rv.title,
        duration: isShort ? '00:60' : '03:30',
        durationSeconds: isShort ? 60 : 210,
        isShort
      });
    }
  }

  // 3. Fetch /shorts page
  console.log('3. Đang nạp danh sách Shorts...');
  const sHtml = await fetchText(`https://www.youtube.com/${CHANNEL_HANDLE}/shorts`);
  const scrapedShorts = [];
  const sBlocks = sHtml.split('"shortsLockupViewModel":');
  for (let i = 1; i < sBlocks.length; i++) {
    const b = sBlocks[i];
    const idM = b.match(/"(?:videoId|entityId)":"([a-zA-Z0-9_-]{11})"/);
    const titleM = b.match(/"headline":\{"content":"(.*?)"\}/) || b.match(/"accessibilityText":"(.*?)"/);
    if (idM) {
      let title = titleM ? titleM[1] : 'YouTube Shorts';
      try { title = JSON.parse('"' + title + '"'); } catch {}
      title = title.replace(/,\s*\d+\s*lượt xem.*$/i, '').trim();
      if (!scrapedShorts.some((x) => x.youtubeId === idM[1])) {
        scrapedShorts.push({
          youtubeId: idM[1],
          title,
          duration: '00:60',
          durationSeconds: 60,
          isShort: true
        });
      }
    }
  }

  // Combine with existing items to preserve older indexed videos
  const allVideosMap = new Map();

  // Add all scraped long videos
  for (const v of scrapedLong) {
    if (!v.isShort) {
      allVideosMap.set(v.youtubeId, {
        youtubeId: v.youtubeId,
        title: v.title,
        channel: CHANNEL_NAME,
        channelAvatar: CHANNEL_AVATAR,
        category: v.title.includes('đức phật') || v.title.includes('Đức Phật') || v.title.includes('A Nan') ? 'tam-ly-doi-song' : 'nghe-thuat-sang-tao',
        duration: v.duration || '03:30',
        durationSeconds: v.durationSeconds || 210,
        thumbnail: `https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`,
        description: `${v.title} - Kênh ${CHANNEL_NAME}.`,
        publishedDate: v.views ? 'Video chính thức' : 'Mới cập nhật',
        isShort: false,
        views: v.views
      });
    }
  }

  // Extract older videos from previous data file if not present
  if (existingDataContent) {
    const matchJson = existingDataContent.match(/export const DEFAULT_VIDEOS: PodcastEpisode\[\] = (\[[\s\S]*?\]);\s*\n/);
    if (matchJson) {
      try {
        const prevList = JSON.parse(matchJson[1]);
        for (const item of prevList) {
          if (!allVideosMap.has(item.youtubeId) && !item.isShort) {
            allVideosMap.set(item.youtubeId, item);
          }
        }
      } catch (err) {
        console.warn('Could not parse previous DEFAULT_VIDEOS JSON:', err.message);
      }
    }
  }

  // Add all shorts
  const allShortsMap = new Map();
  for (const s of scrapedShorts) {
    allShortsMap.set(s.youtubeId, {
      youtubeId: s.youtubeId,
      title: s.title,
      channel: CHANNEL_NAME,
      channelAvatar: CHANNEL_AVATAR,
      category: 'nghe-thuat-sang-tao',
      duration: '00:60',
      durationSeconds: 60,
      thumbnail: `https://i.ytimg.com/vi/${s.youtubeId}/hqdefault.jpg`,
      description: `Shorts: ${s.title} - Kênh ${CHANNEL_NAME}.`,
      publishedDate: 'YouTube Shorts',
      isShort: true
    });
  }

  // Also include previous shorts
  if (existingDataContent) {
    const matchJson = existingDataContent.match(/export const DEFAULT_VIDEOS: PodcastEpisode\[\] = (\[[\s\S]*?\]);\s*\n/);
    if (matchJson) {
      try {
        const prevList = JSON.parse(matchJson[1]);
        for (const item of prevList) {
          if (item.isShort && !allShortsMap.has(item.youtubeId)) {
            allShortsMap.set(item.youtubeId, item);
          }
        }
      } catch (err) {}
    }
  }

  const finalLongVideos = Array.from(allVideosMap.values());
  const finalShorts = Array.from(allShortsMap.values());
  const finalAllVideos = [...finalLongVideos, ...finalShorts].map((v, i) => ({
    id: `mh-v${i + 1}`,
    ...v
  }));

  console.log(`Tổng kết: ${finalLongVideos.length} video dài + ${finalShorts.length} shorts = ${finalAllVideos.length} video.`);

  // Playlists and podcast series
  const phatIds = ['oB3xmS-kP0Y', 'CbpHoTtUulQ', 'f1nk0-rwyI4', 'aUVV8wlj1KE', 'P0MxHN62ZMs', 'RLuGfOlOVvo', 'sFx3g_fZAcY'];
  const canNhaIds = ['NmUVqZoAcWk', 'MVFNVguGR4Q'];
  const truyenMaIds = ['CA0LEy6twmE', 'lpiKfekPrgc', 'OILEwjXxeRY', 'CfhZWC1nfLQ', 'f3VvN2W4f6g'];

  const tsFileContent = `import { PodcastEpisode, PodcastSeries, PodcastPlaylist } from '../types/podcast';

export const DEFAULT_CHANNEL_INFO = {
  name: 'Minh Hiếu review phim',
  handle: '@minhhieureviewphim',
  avatar: 'https://yt3.googleusercontent.com/IAZc3hD-MjzJAtG3Eainm3ueaTvyalzFYEeBqHm-1rkIbUCmIz9--aemFtvSsV-eQIZS0AS0EQ=s900-c-k-c0x00ffffff-no-rj',
  banner: 'https://yt3.googleusercontent.com/nXC6CfLFHVL0mQjAJtqBxNqZM3nPyjtdk-zs9b9RIdblNxB_9CMOSBDc8iIFho4WiUMHbrU-zQ=w2560-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
  subscribers: 'Kênh YouTube Review Phim & Podcast',
  youtubeUrl: 'https://www.youtube.com/@minhhieureviewphim',
  subscribeUrl: 'https://www.youtube.com/@minhhieureviewphim?sub_confirmation=1',
};

export const DEFAULT_PODCAST_SERIES: PodcastSeries[] = [
  {
    playlistId: 'PLfQBkoKlGBNU',
    title: 'Phim cuộc đời đức phật',
    url: 'https://www.youtube.com/playlist?list=PLfQBkoKlGBNU',
    episodeCount: ${phatIds.length},
    thumbnail: 'https://i.ytimg.com/vi/oB3xmS-kP0Y/hqdefault.jpg',
  },
  {
    playlistId: 'PLadgIbzzZS0k',
    title: 'Căn nhà bị khóa',
    url: 'https://www.youtube.com/playlist?list=PLadgIbzzZS0k',
    episodeCount: ${canNhaIds.length},
    thumbnail: 'https://i.ytimg.com/vi/MVFNVguGR4Q/hqdefault.jpg',
  },
  {
    playlistId: 'PLNpMHx0k8QfE',
    title: 'Truyện ma căn nhà cuối con đường',
    url: 'https://www.youtube.com/playlist?list=PLNpMHx0k8QfE',
    episodeCount: ${truyenMaIds.length},
    thumbnail: 'https://i.ytimg.com/vi/CA0LEy6twmE/hqdefault.jpg',
  },
];

export const DEFAULT_CHANNEL_PLAYLISTS: PodcastPlaylist[] = [
  {
    playlistId: 'PLfQBkoKlGBNU',
    title: 'Phim cuộc đời đức phật',
    url: 'https://www.youtube.com/playlist?list=PLfQBkoKlGBNU',
    thumbnail: 'https://i.ytimg.com/vi/oB3xmS-kP0Y/hqdefault.jpg',
  },
  {
    playlistId: 'PLadgIbzzZS0k',
    title: 'Căn nhà bị khóa',
    url: 'https://www.youtube.com/playlist?list=PLadgIbzzZS0k',
    thumbnail: 'https://i.ytimg.com/vi/MVFNVguGR4Q/hqdefault.jpg',
  },
  {
    playlistId: 'PLNpMHx0k8QfE',
    title: 'Truyện ma căn nhà cuối con đường',
    url: 'https://www.youtube.com/playlist?list=PLNpMHx0k8QfE',
    thumbnail: 'https://i.ytimg.com/vi/CA0LEy6twmE/hqdefault.jpg',
  },
  {
    playlistId: 'PLdZp1hLRnA7Q',
    title: 'Âm nhạc miễn phí',
    url: 'https://www.youtube.com/playlist?list=PLdZp1hLRnA7Q',
    thumbnail: 'https://i.ytimg.com/vi/U7ucFrkJ6ok/hqdefault.jpg',
  },
];

// Danh sách toàn bộ ${finalAllVideos.length} video chính thức từ kênh @minhhieureviewphim
export const DEFAULT_VIDEOS: PodcastEpisode[] = ${JSON.stringify(finalAllVideos, null, 2)};

export const DEFAULT_PODCASTS: PodcastEpisode[] = [
  ...DEFAULT_VIDEOS.filter(v => ${JSON.stringify(phatIds)}.includes(v.youtubeId)).map(v => ({
    ...v,
    seriesTitle: 'Phim cuộc đời đức phật',
  })),
  ...DEFAULT_VIDEOS.filter(v => ${JSON.stringify(canNhaIds)}.includes(v.youtubeId)).map(v => ({
    ...v,
    seriesTitle: 'Căn nhà bị khóa',
  })),
  ...DEFAULT_VIDEOS.filter(v => ${JSON.stringify(truyenMaIds)}.includes(v.youtubeId)).map(v => ({
    ...v,
    seriesTitle: 'Truyện ma căn nhà cuối con đường',
  })),
];
`;

  fs.writeFileSync(dataPath, tsFileContent, 'utf8');
  console.log(`✅ Đã cập nhật thành công ${dataPath} với ${finalAllVideos.length} video thực tế của kênh!`);
}

main().catch(console.error);
