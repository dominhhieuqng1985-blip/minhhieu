import { useState, useEffect, useRef, useCallback } from 'react';
import { AdSettings } from '../types/adConfig';

export type AdBreakSlotType = 'preroll' | 'midroll' | 'random' | 'postroll' | 'manual';

interface ScheduledBreak {
  id: string;
  type: 'midroll' | 'random' | 'postroll';
  triggerAtSec: number;
  fired: boolean;
}

interface UseVideoAdSchedulerOptions {
  mediaKey: string;
  adSettings: AdSettings;
  scopeEnabled: boolean;
  currentTime: number;
  duration: number;
  isMainPlaying: boolean;
  isEmbedWithoutTimeline?: boolean;
  onPauseMainVideo: () => void;
  onResumeMainVideo: () => void;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(min + Math.random() * Math.max(1, max - min));
}

export function useVideoAdScheduler({
  mediaKey,
  adSettings,
  scopeEnabled,
  currentTime,
  duration,
  isMainPlaying,
  isEmbedWithoutTimeline = false,
  onPauseMainVideo,
  onResumeMainVideo,
}: UseVideoAdSchedulerOptions) {
  const [isAdOpen, setIsAdOpen] = useState<boolean>(false);
  const [adInstanceKey, setAdInstanceKey] = useState<number>(0);
  const [activeBreakType, setActiveBreakType] = useState<AdBreakSlotType>('preroll');
  const [preAdCountdown, setPreAdCountdown] = useState<number | null>(null);
  const [pendingBreakType, setPendingBreakType] = useState<'midroll' | 'random' | 'postroll' | null>(null);

  const scheduledBreaksRef = useRef<ScheduledBreak[]>([]);
  const builtScheduleKeyRef = useRef<string>('');
  const postRollPlayedRef = useRef<boolean>(false);
  const pendingEndedActionRef = useRef<(() => void) | null>(null);
  const embedWatchSecRef = useRef<number>(0);

  const onPauseRef = useRef(onPauseMainVideo);
  const onResumeRef = useRef(onResumeMainVideo);
  useEffect(() => {
    onPauseRef.current = onPauseMainVideo;
    onResumeRef.current = onResumeMainVideo;
  }, [onPauseMainVideo, onResumeMainVideo]);

  const enablePreRoll = adSettings.enablePreRoll !== false;
  const enableMidRoll = adSettings.enableMidRoll !== false;
  const enablePostRoll = adSettings.enablePostRoll !== false;
  const enableRandomRoll = adSettings.enableRandomRoll !== false;
  const noticeSeconds = Math.max(2, Math.min(10, adSettings.preAdNoticeSeconds ?? 5));

  // 1. Reset state & trigger Pre-roll when mediaKey changes
  useEffect(() => {
    scheduledBreaksRef.current = [];
    builtScheduleKeyRef.current = '';
    postRollPlayedRef.current = false;
    pendingEndedActionRef.current = null;
    embedWatchSecRef.current = 0;
    setPreAdCountdown(null);
    setPendingBreakType(null);

    if (scopeEnabled && enablePreRoll) {
      setActiveBreakType('preroll');
      setAdInstanceKey((k) => k + 1);
      setIsAdOpen(true);
      onPauseRef.current();
    } else {
      setIsAdOpen(false);
    }
  }, [mediaKey, scopeEnabled, enablePreRoll]);

  // Keep main video paused if it auto-starts while an ad is already open (e.g. YouTube autoplay on ready)
  useEffect(() => {
    if (isAdOpen && isMainPlaying) {
      onPauseRef.current();
    }
  }, [isAdOpen, isMainPlaying]);

  // 2. Build timeline-based ad break schedule (Mid-roll, Random-roll, Post-roll) once duration is known
  useEffect(() => {
    if (!scopeEnabled || isEmbedWithoutTimeline) return;
    if (!duration || duration < 40 || Number.isNaN(duration)) return;

    const bucketedDur = Math.round(duration / 10) * 10;
    const scheduleKey = `${mediaKey}|${bucketedDur}|${enableMidRoll}|${enableRandomRoll}|${enablePostRoll}|${noticeSeconds}`;
    if (builtScheduleKeyRef.current === scheduleKey) return;
    builtScheduleKeyRef.current = scheduleKey;

    const rawBreaks: ScheduledBreak[] = [];

    // Mid-roll (~50% of video)
    if (enableMidRoll && duration >= 50) {
      const midTarget = Math.max(15, Math.floor(duration * 0.5) - noticeSeconds);
      rawBreaks.push({
        id: `mid-${mediaKey}`,
        type: 'midroll',
        triggerAtSec: midTarget,
        fired: false,
      });
    }

    // Random-roll (1-3 randomized timestamps depending on video length)
    if (enableRandomRoll && duration >= 45) {
      if (duration >= 240) {
        const r1 = Math.max(18, randomBetween(duration * 0.2, duration * 0.36) - noticeSeconds);
        const r2 = Math.max(r1 + 45, randomBetween(duration * 0.66, duration * 0.82) - noticeSeconds);
        rawBreaks.push(
          { id: `rand1-${mediaKey}`, type: 'random', triggerAtSec: r1, fired: false },
          { id: `rand2-${mediaKey}`, type: 'random', triggerAtSec: r2, fired: false }
        );

        // Extra random breaks for long podcasts / movies (> 20 mins)
        if (duration >= 1200) {
          let cursor = Math.floor(duration * 0.38);
          let idx = 3;
          while (cursor + 420 < duration * 0.88) {
            cursor += randomBetween(390, 600);
            if (cursor < duration * 0.88) {
              rawBreaks.push({
                id: `rand${idx}-${mediaKey}`,
                type: 'random',
                triggerAtSec: Math.max(30, cursor - noticeSeconds),
                fired: false,
              });
              idx += 1;
            }
          }
        }
      } else {
        // Medium clip (45s - 240s): pick 1 random spot away from 50% if mid-roll is active
        const pickFirstHalf = Math.random() < 0.5;
        const pct = enableMidRoll
          ? pickFirstHalf
            ? 0.24 + Math.random() * 0.13
            : 0.66 + Math.random() * 0.14
          : 0.28 + Math.random() * 0.44;
        const rSec = Math.max(12, Math.floor(duration * pct) - noticeSeconds);
        rawBreaks.push({
          id: `rand1-${mediaKey}`,
          type: 'random',
          triggerAtSec: rSec,
          fired: false,
        });
      }
    }

    // Sort and enforce minimum spacing (at least 25s apart) for mid/random breaks
    rawBreaks.sort((a, b) => a.triggerAtSec - b.triggerAtSec);
    const spacedBreaks: ScheduledBreak[] = [];
    for (const br of rawBreaks) {
      const prev = spacedBreaks[spacedBreaks.length - 1];
      if (!prev || br.triggerAtSec - prev.triggerAtSec >= 25) {
        spacedBreaks.push(br);
      }
    }

    // Post-roll (near end of video, with countdown before video finishes)
    if (enablePostRoll && duration >= 45) {
      const postTrigger = Math.max(25, Math.floor(duration - (noticeSeconds + 2.5)));
      // Keep post-roll even if close, just ensure it doesn't collide within 12s of previous break
      const last = spacedBreaks[spacedBreaks.length - 1];
      if (last && postTrigger - last.triggerAtSec < 15 && last.type !== 'midroll') {
        spacedBreaks.pop();
      }
      spacedBreaks.push({
        id: `post-${mediaKey}`,
        type: 'postroll',
        triggerAtSec: postTrigger,
        fired: false,
      });
    }

    scheduledBreaksRef.current = spacedBreaks;
  }, [
    mediaKey,
    duration,
    scopeEnabled,
    isEmbedWithoutTimeline,
    enableMidRoll,
    enableRandomRoll,
    enablePostRoll,
    noticeSeconds,
  ]);

  // 3. Build watch-time schedule for cross-origin iframe embeds (where duration/currentTime aren't readable)
  useEffect(() => {
    if (!scopeEnabled || !isEmbedWithoutTimeline) return;
    const scheduleKey = `embed|${mediaKey}|${enableMidRoll}|${enableRandomRoll}|${noticeSeconds}`;
    if (builtScheduleKeyRef.current === scheduleKey) return;
    builtScheduleKeyRef.current = scheduleKey;

    const breaks: ScheduledBreak[] = [];
    if (enableRandomRoll) {
      breaks.push(
        { id: `emb-r1-${mediaKey}`, type: 'random', triggerAtSec: randomBetween(65, 110), fired: false },
        { id: `emb-r2-${mediaKey}`, type: 'random', triggerAtSec: randomBetween(280, 380), fired: false },
        { id: `emb-r3-${mediaKey}`, type: 'random', triggerAtSec: randomBetween(560, 720), fired: false },
        { id: `emb-r4-${mediaKey}`, type: 'random', triggerAtSec: randomBetween(920, 1140), fired: false }
      );
    }
    if (enableMidRoll) {
      breaks.push({
        id: `emb-mid-${mediaKey}`,
        type: 'midroll',
        triggerAtSec: 185,
        fired: false,
      });
    }
    breaks.sort((a, b) => a.triggerAtSec - b.triggerAtSec);
    scheduledBreaksRef.current = breaks;
  }, [mediaKey, scopeEnabled, isEmbedWithoutTimeline, enableMidRoll, enableRandomRoll, noticeSeconds]);

  // Helper to start pre-ad countdown for a break
  const beginPreAdCountdown = useCallback(
    (type: 'midroll' | 'random' | 'postroll') => {
      if (type === 'postroll') {
        postRollPlayedRef.current = true;
      }
      setPendingBreakType(type);
      setPreAdCountdown(noticeSeconds);
    },
    [noticeSeconds]
  );

  // 4. Monitor timeline `currentTime` in HTML5 / YouTube players
  useEffect(() => {
    if (!scopeEnabled || isEmbedWithoutTimeline || isAdOpen || preAdCountdown !== null) return;
    if (!isMainPlaying || currentTime <= 3) return;

    const breaks = scheduledBreaksRef.current;
    for (const br of breaks) {
      if (br.fired) continue;

      // If user scrubbed far past an earlier break (> 20s past trigger), mark skipped so seek doesn't ambush immediately
      if (currentTime > br.triggerAtSec + 20 && br.type !== 'postroll') {
        br.fired = true;
        continue;
      }

      if (currentTime >= br.triggerAtSec) {
        br.fired = true;
        beginPreAdCountdown(br.type);
        break;
      }
    }
  }, [
    currentTime,
    isMainPlaying,
    scopeEnabled,
    isEmbedWithoutTimeline,
    isAdOpen,
    preAdCountdown,
    beginPreAdCountdown,
  ]);

  // 5. Monitor elapsed watch time in Embed Iframe mode
  useEffect(() => {
    if (!scopeEnabled || !isEmbedWithoutTimeline || isAdOpen || preAdCountdown !== null) return;

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      embedWatchSecRef.current += 1;
      const elapsed = embedWatchSecRef.current;

      for (const br of scheduledBreaksRef.current) {
        if (!br.fired && elapsed >= br.triggerAtSec) {
          br.fired = true;
          beginPreAdCountdown(br.type);
          break;
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [scopeEnabled, isEmbedWithoutTimeline, isAdOpen, preAdCountdown, beginPreAdCountdown]);

  // 6. Tick down `preAdCountdown` ("Quảng cáo sắp bắt đầu sau Xs") -> pause video & launch VideoAdOverlay
  useEffect(() => {
    if (preAdCountdown === null) return;

    if (preAdCountdown <= 0) {
      const nextType = pendingBreakType || 'random';
      setPreAdCountdown(null);
      setPendingBreakType(null);
      setActiveBreakType(nextType);
      setAdInstanceKey((k) => k + 1);
      onPauseRef.current();
      setIsAdOpen(true);
      return;
    }

    const timer = setTimeout(() => {
      setPreAdCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [preAdCountdown, pendingBreakType]);

  // 7. Called when VideoAdOverlay finishes or user clicks "Bỏ qua"
  const handleAdFinished = useCallback(() => {
    setIsAdOpen(false);
    if (pendingEndedActionRef.current) {
      const endedFn = pendingEndedActionRef.current;
      pendingEndedActionRef.current = null;
      endedFn();
      return;
    }
    onResumeRef.current();
  }, []);

  // 8. Intercept main video ended event so Post-roll always plays if it hasn't fired yet
  const interceptVideoEnded = useCallback(
    (proceedEnded: () => void) => {
      if (scopeEnabled && enablePostRoll && !postRollPlayedRef.current) {
        postRollPlayedRef.current = true;
        pendingEndedActionRef.current = proceedEnded;
        setPreAdCountdown(null);
        setPendingBreakType(null);
        setActiveBreakType('postroll');
        setAdInstanceKey((k) => k + 1);
        setIsAdOpen(true);
        return;
      }
      proceedEnded();
    },
    [scopeEnabled, enablePostRoll]
  );

  // 9. Manual test trigger from AdSettingsModal
  const triggerManualAd = useCallback(() => {
    setPreAdCountdown(null);
    setPendingBreakType(null);
    setActiveBreakType('manual');
    setAdInstanceKey((k) => k + 1);
    onPauseRef.current();
    setIsAdOpen(true);
  }, []);

  return {
    isAdOpen,
    adInstanceKey,
    activeBreakType,
    preAdCountdown,
    preAdTotalSeconds: noticeSeconds,
    handleAdFinished,
    interceptVideoEnded,
    triggerManualAd,
  };
}
