/**
 * VAST 2.0 / 3.0 / 4.0 In-Stream Video Ad Parser & Tracker
 * Primary Adcash VAST Tag (Zone 12358098):
 * https://youradexchange.com/video/select.php?r=12358098
 */

export const ADCASH_INSTREAM_VAST_TAG_URL =
  'https://youradexchange.com/video/select.php?r=12358098';

export interface VastTrackingEvents {
  start: string[];
  firstQuartile: string[];
  midpoint: string[];
  thirdQuartile: string[];
  complete: string[];
  skip: string[];
  mute: string[];
  unmute: string[];
  pause: string[];
  resume: string[];
}

export interface ParsedVastAd {
  mediaUrl: string;
  mimeType: string;
  adTitle: string;
  clickThroughUrl: string;
  clickTrackingUrls: string[];
  impressionUrls: string[];
  errorUrls: string[];
  skipOffsetSeconds: number | null;
  durationSeconds: number | null;
  trackingEvents: VastTrackingEvents;
}

function createEmptyTrackingEvents(): VastTrackingEvents {
  return {
    start: [],
    firstQuartile: [],
    midpoint: [],
    thirdQuartile: [],
    complete: [],
    skip: [],
    mute: [],
    unmute: [],
    pause: [],
    resume: [],
  };
}

function mergeTrackingEvents(
  target: VastTrackingEvents,
  source: VastTrackingEvents
): VastTrackingEvents {
  return {
    start: [...target.start, ...source.start],
    firstQuartile: [...target.firstQuartile, ...source.firstQuartile],
    midpoint: [...target.midpoint, ...source.midpoint],
    thirdQuartile: [...target.thirdQuartile, ...source.thirdQuartile],
    complete: [...target.complete, ...source.complete],
    skip: [...target.skip, ...source.skip],
    mute: [...target.mute, ...source.mute],
    unmute: [...target.unmute, ...source.unmute],
    pause: [...target.pause, ...source.pause],
    resume: [...target.resume, ...source.resume],
  };
}

/**
 * Replace standard VAST 3.0/4.0 macros in tracking/tag URLs
 */
export function expandVastMacros(url: string, errorCode = '405'): string {
  if (!url) return '';
  const cacheBust = String(Math.floor(10000000 + Math.random() * 90000000));
  const timestamp = encodeURIComponent(new Date().toISOString());
  return url
    .trim()
    .replace(/\[CACHEBUSTING\]/gi, cacheBust)
    .replace(/\[TIMESTAMP\]/gi, timestamp)
    .replace(/\[ERRORCODE\]/gi, errorCode)
    .replace(/\[CONTENTPLAYHEAD\]/gi, '00:00:00.000');
}

/**
 * Fire VAST tracking pixels (Impressions, Quartiles, ClickTracking, Error)
 */
export function fireVastPixels(urls: string[], errorCode?: string): void {
  if (!urls || urls.length === 0 || typeof window === 'undefined') return;
  for (const rawUrl of urls) {
    const finalUrl = expandVastMacros(rawUrl, errorCode);
    if (!finalUrl || (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://'))) {
      continue;
    }
    try {
      fetch(finalUrl, {
        method: 'GET',
        mode: 'no-cors',
        keepalive: true,
        credentials: 'omit',
      }).catch(() => {
        const img = new Image();
        img.src = finalUrl;
      });
    } catch {
      try {
        const img = new Image();
        img.src = finalUrl;
      } catch {}
    }
  }
}

/**
 * Parse HH:MM:SS(.mmm) duration string into seconds
 */
function parseTimeCodeToSeconds(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const secs = parseFloat(match[3]);
    return Math.round(hours * 3600 + mins * 60 + secs);
  }
  const numericSec = Number(trimmed);
  if (!Number.isNaN(numericSec) && numericSec >= 0) {
    return Math.round(numericSec);
  }
  return null;
}

/**
 * Parse skipoffset attribute ("00:00:05" or "15%")
 */
function parseSkipOffset(
  skipOffsetAttr: string | null,
  durationSeconds: number | null
): number | null {
  if (!skipOffsetAttr) return null;
  const trimmed = skipOffsetAttr.trim();
  if (trimmed.endsWith('%')) {
    const pct = parseFloat(trimmed.slice(0, -1));
    if (!Number.isNaN(pct) && durationSeconds && durationSeconds > 0) {
      return Math.max(0, Math.round((pct / 100) * durationSeconds));
    }
    return null;
  }
  return parseTimeCodeToSeconds(trimmed);
}

function getElementsTextList(parent: Element | Document, tagName: string): string[] {
  const nodes = Array.from(parent.getElementsByTagName(tagName));
  const results: string[] = [];
  for (const node of nodes) {
    const txt = (node.textContent || '').trim();
    if (txt) results.push(txt);
  }
  return results;
}

function extractTrackingEventsFromNode(parent: Element | Document): VastTrackingEvents {
  const events = createEmptyTrackingEvents();
  const trackingNodes = Array.from(parent.getElementsByTagName('Tracking'));
  for (const node of trackingNodes) {
    const eventName = (node.getAttribute('event') || '').trim();
    const url = (node.textContent || '').trim();
    if (!url) continue;
    if (eventName in events) {
      events[eventName as keyof VastTrackingEvents].push(url);
    } else if (eventName === 'skip' || eventName === 'closeLinear' || eventName === 'close') {
      events.skip.push(url);
    }
  }
  return events;
}

/**
 * Fetch VAST XML string with fast timeout, direct browser fetch first (preserves real visitor IP/geo),
 * falling back to server proxy ONLY if a downstream Wrapper tag blocks browser CORS.
 */
async function fetchVastXmlString(tagUrl: string, timeoutMs = 3500): Promise<string | null> {
  const expandedUrl = expandVastMacros(tagUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(expandedUrl, {
      method: 'GET',
      headers: { Accept: 'application/xml, text/xml, */*' },
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      return await res.text();
    }
  } catch {
    clearTimeout(timer);
    // Fallback to backend proxy if CORS blocked a wrapped third-party VAST tag
    try {
      const proxyController = new AbortController();
      const proxyTimer = setTimeout(() => proxyController.abort(), 2500);
      const proxyRes = await fetch(
        `/api/vast-proxy?url=${encodeURIComponent(expandedUrl)}`,
        {
          cache: 'no-store',
          signal: proxyController.signal,
        }
      );
      clearTimeout(proxyTimer);
      if (proxyRes.ok) {
        return await proxyRes.text();
      }
    } catch {}
  }

  return null;
}

/**
 * Pick best HTML5-playable <MediaFile> from Linear creative
 */
function selectBestMediaFile(
  mediaFileNodes: Element[]
): { url: string; mimeType: string } | null {
  const candidates: Array<{
    url: string;
    mimeType: string;
    width: number;
    bitrate: number;
    score: number;
  }> = [];

  for (const node of mediaFileNodes) {
    const rawUrl = (node.textContent || '').trim();
    if (!rawUrl || (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://'))) {
      continue;
    }

    const mimeType = (node.getAttribute('type') || '').toLowerCase().trim();
    const apiFramework = (node.getAttribute('apiFramework') || '').toLowerCase().trim();

    // Skip legacy VPAID JS / Flash creatives that cannot play in HTML5 <video>
    if (
      apiFramework === 'vpaid' ||
      mimeType.includes('javascript') ||
      mimeType.includes('shockwave-flash') ||
      mimeType.includes('x-flv')
    ) {
      continue;
    }

    let score = 0;
    if (mimeType === 'video/mp4' || rawUrl.toLowerCase().includes('.mp4')) {
      score = 100;
    } else if (mimeType === 'video/webm' || rawUrl.toLowerCase().includes('.webm')) {
      score = 85;
    } else if (
      mimeType.includes('mpegurl') ||
      rawUrl.toLowerCase().includes('.m3u8')
    ) {
      score = 75;
    } else if (mimeType === 'video/ogg') {
      score = 50;
    } else if (!mimeType) {
      score = 40;
    } else {
      continue;
    }

    const width = parseInt(node.getAttribute('width') || '0', 10) || 0;
    const bitrate = parseInt(node.getAttribute('bitrate') || '0', 10) || 0;

    // Prefer 480p - 1080p HD streams for crisp playback without buffering
    if (width >= 640 && width <= 1920) {
      score += 15;
    }

    candidates.push({
      url: rawUrl,
      mimeType: mimeType || 'video/mp4',
      width,
      bitrate,
      score,
    });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.width - a.width || b.bitrate - a.bitrate;
  });

  return {
    url: candidates[0].url,
    mimeType: candidates[0].mimeType,
  };
}

/**
 * Recursively resolve VAST XML (supports <Wrapper> chains and <InLine> creatives).
 * Returns null if VAST is empty (<VAST version="4.0"></VAST>) or no playable video exists.
 */
export async function fetchAndParseVastAd(
  vastTagUrl: string = ADCASH_INSTREAM_VAST_TAG_URL,
  maxWrapperDepth = 4
): Promise<ParsedVastAd | null> {
  if (typeof window === 'undefined' || !vastTagUrl) return null;

  let currentTagUrl = vastTagUrl;
  let accumulatedImpressions: string[] = [];
  let accumulatedErrors: string[] = [];
  let accumulatedClickTracking: string[] = [];
  let accumulatedTracking = createEmptyTrackingEvents();

  for (let depth = 0; depth <= maxWrapperDepth; depth++) {
    const xmlText = await fetchVastXmlString(currentTagUrl);
    if (!xmlText || !xmlText.includes('<VAST')) {
      return null;
    }

    let xmlDoc: Document;
    try {
      const parser = new DOMParser();
      xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    } catch {
      return null;
    }

    const adNode = xmlDoc.getElementsByTagName('Ad')[0];
    if (!adNode) {
      // Empty VAST response (no ad fill right now -> fallback to default ad)
      return null;
    }

    const wrapperNode = adNode.getElementsByTagName('Wrapper')[0];
    if (wrapperNode) {
      accumulatedImpressions.push(...getElementsTextList(wrapperNode, 'Impression'));
      accumulatedErrors.push(...getElementsTextList(wrapperNode, 'Error'));
      accumulatedClickTracking.push(...getElementsTextList(wrapperNode, 'ClickTracking'));
      accumulatedTracking = mergeTrackingEvents(
        accumulatedTracking,
        extractTrackingEventsFromNode(wrapperNode)
      );

      const nextVastTagUri =
        getElementsTextList(wrapperNode, 'VASTAdTagURI')[0] ||
        getElementsTextList(wrapperNode, 'VASTAdTagURL')[0];

      if (!nextVastTagUri) {
        return null;
      }
      currentTagUrl = nextVastTagUri;
      continue;
    }

    const inlineNode = adNode.getElementsByTagName('InLine')[0] || adNode;
    const mediaFileNodes = Array.from(inlineNode.getElementsByTagName('MediaFile'));
    const bestMedia = selectBestMediaFile(mediaFileNodes);

    if (!bestMedia) {
      const errUrls = [
        ...accumulatedErrors,
        ...getElementsTextList(inlineNode, 'Error'),
      ];
      fireVastPixels(errUrls, '403');
      return null;
    }

    const adTitle =
      getElementsTextList(inlineNode, 'AdTitle')[0] || 'Quảng cáo tài trợ';

    const linearNode = inlineNode.getElementsByTagName('Linear')[0];
    const durationRaw = linearNode
      ? getElementsTextList(linearNode, 'Duration')[0]
      : undefined;
    const durationSeconds = parseTimeCodeToSeconds(durationRaw);
    const skipOffsetSeconds = linearNode
      ? parseSkipOffset(linearNode.getAttribute('skipoffset'), durationSeconds)
      : null;

    const clickThroughUrl =
      getElementsTextList(inlineNode, 'ClickThrough')[0] || '';
    const clickTrackingUrls = [
      ...accumulatedClickTracking,
      ...getElementsTextList(inlineNode, 'ClickTracking'),
    ];
    const impressionUrls = [
      ...accumulatedImpressions,
      ...getElementsTextList(inlineNode, 'Impression'),
    ];
    const errorUrls = [
      ...accumulatedErrors,
      ...getElementsTextList(inlineNode, 'Error'),
    ];
    const trackingEvents = mergeTrackingEvents(
      accumulatedTracking,
      extractTrackingEventsFromNode(inlineNode)
    );

    return {
      mediaUrl: bestMedia.url,
      mimeType: bestMedia.mimeType,
      adTitle,
      clickThroughUrl,
      clickTrackingUrls,
      impressionUrls,
      errorUrls,
      skipOffsetSeconds,
      durationSeconds,
      trackingEvents,
    };
  }

  return null;
}
