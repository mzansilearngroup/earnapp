import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Home,
  Lock,
  PlayCircle,
  RotateCcw,
  Settings,
  ShoppingBag,
  Smartphone,
  Terminal,
  Video,
  Volume2,
} from 'lucide-react';
import { EXPO_PROJECT_FILES, EXPO_SETUP_STEPS } from './expoProjectFiles';

type ScreenRoute = '/home' | '/earn' | '/store' | '/settings';
type WorkspaceSection = 'both' | 'files' | 'setup';

interface StoreOffer {
  id: string;
  cost: number;
  title: string;
  airtime: string;
}

const AIRTIME_OFFERS: StoreOffer[] = [
  { id: 'r1', cost: 100, title: '100 Points = R1 Airtime', airtime: 'R1' },
  { id: 'r5', cost: 500, title: '500 Points = R5 Airtime', airtime: 'R5' },
  { id: 'r10', cost: 1000, title: '1000 Points = R10 Airtime', airtime: 'R10' },
];

const DAILY_POOL_MAX = 1000;
const MAX_ADS_PER_DAY = 5;

function getMsUntil8am(now: Date = new Date()): number {
  const today8am = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    8,
    0,
    0,
    0
  );
  const nextReset =
    now >= today8am
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 0, 0, 0)
      : today8am;
  return Math.max(0, nextReset.getTime() - now.getTime());
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function playWebChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1318.5, now + 0.08);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);
  } catch {
    // AudioContext may be blocked if not triggered by user gesture
  }
}

interface PersistedState {
  balance: number;
  pool: number;
  poolDate: string;
  claimedToday: boolean;
  dailyAdsWatched: number;
  lastClaimDate: string;
  lastAdDate: string;
  phoneNumber: string;
  lastRewardDate: string;
}

function getTodayDateString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function savePersistedState(state: PersistedState): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem('balance', String(state.balance));
    window.localStorage.setItem('pool', String(state.pool));
    window.localStorage.setItem('poolDate', state.poolDate);
    window.localStorage.setItem('claimedToday', String(state.claimedToday));
    window.localStorage.setItem('dailyAdsWatched', String(state.dailyAdsWatched));
    window.localStorage.setItem('lastClaimDate', state.lastClaimDate);
    window.localStorage.setItem('lastAdDate', state.lastAdDate);
    window.localStorage.setItem('phoneNumber', state.phoneNumber);
    window.localStorage.setItem('lastRewardDate', state.lastRewardDate);
  } catch {
    // Ignore storage quota / restricted iframe storage errors
  }
}

function loadPersistedState(): PersistedState {
  const today = getTodayDateString();
  const defaults: PersistedState = {
    balance: 0,
    pool: DAILY_POOL_MAX,
    poolDate: today,
    claimedToday: false,
    dailyAdsWatched: 0,
    lastClaimDate: '',
    lastAdDate: '',
    phoneNumber: '',
    lastRewardDate: '',
  };

  if (typeof window === 'undefined' || !window.localStorage) {
    return defaults;
  }

  try {
    const rawBalance = window.localStorage.getItem('balance');
    const rawPool = window.localStorage.getItem('pool');
    const rawPoolDate = window.localStorage.getItem('poolDate') ?? '';
    const rawClaimedToday = window.localStorage.getItem('claimedToday');
    const rawDailyAds = window.localStorage.getItem('dailyAdsWatched');
    const rawLastClaimDate = window.localStorage.getItem('lastClaimDate') ?? '';
    const rawLastAdDate = window.localStorage.getItem('lastAdDate') ?? '';
    const rawPhoneNumber = window.localStorage.getItem('phoneNumber') ?? '';
    const rawLastRewardDate = window.localStorage.getItem('lastRewardDate') ?? '';

    const parsedBalance = rawBalance !== null ? parseInt(rawBalance, 10) : 0;
    const balance = Number.isNaN(parsedBalance) ? 0 : parsedBalance;

    const parsedPool = rawPool !== null ? parseInt(rawPool, 10) : DAILY_POOL_MAX;
    let pool = Number.isNaN(parsedPool) ? DAILY_POOL_MAX : parsedPool;
    let poolDate = rawPoolDate;

    // Rule 4: If pool date is NOT today, reset pool to 1000 for the new day
    if (poolDate !== today) {
      pool = DAILY_POOL_MAX;
      poolDate = today;
    }

    // Rule 2: If lastClaimDate is NOT today, reset claimedToday = false
    let claimedToday = rawClaimedToday === 'true';
    if (rawLastClaimDate !== today) {
      claimedToday = false;
    }

    // Rule 3: If lastAdDate is NOT today, reset dailyAdsWatched = 0
    const parsedAds = rawDailyAds !== null ? parseInt(rawDailyAds, 10) : 0;
    let dailyAdsWatched = Number.isNaN(parsedAds) ? 0 : parsedAds;
    if (rawLastAdDate !== today) {
      dailyAdsWatched = 0;
    }

    const loaded: PersistedState = {
      balance,
      pool,
      poolDate,
      claimedToday,
      dailyAdsWatched: Math.min(MAX_ADS_PER_DAY, Math.max(0, dailyAdsWatched)),
      lastClaimDate: rawLastClaimDate,
      lastAdDate: rawLastAdDate,
      phoneNumber: rawPhoneNumber,
      lastRewardDate: rawLastRewardDate,
    };

    savePersistedState(loaded);
    return loaded;
  } catch {
    return defaults;
  }
}

export default function App() {
  // Load ALL persisted state synchronously from localStorage first (never resets to 0 / 1000 on load)
  const [persisted, setPersisted] = useState<PersistedState>(() => loadPersistedState());
  const [activeRoute, setActiveRoute] = useState<ScreenRoute>('/home');
  const [msUntilReset, setMsUntilReset] = useState<number>(() => getMsUntil8am());

  const [phoneInput, setPhoneInput] = useState<string>(() => persisted.phoneNumber);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Simulated Rewarded Ad modal inside phone preview (TEST MODE switch + real adblocker check)
  const [testMode, setTestMode] = useState<boolean>(false);
  const [checkingAdMob, setCheckingAdMob] = useState<boolean>(false);
  const [earnError, setEarnError] = useState<string | null>(null);
  const [earnSuccess, setEarnSuccess] = useState<string | null>(null);
  const [rewardModalOpen, setRewardModalOpen] = useState<boolean>(false);
  const [rewardSecondsLeft, setRewardSecondsLeft] = useState<number>(15);
  const [resetConfirmOpen, setResetConfirmOpen] = useState<boolean>(false);

  // Code bundle inspector state
  const [workspaceSection, setWorkspaceSection] = useState<WorkspaceSection>('both');
  const [selectedFileId, setSelectedFileId] = useState<string>(EXPO_PROJECT_FILES[2].id);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  const selectedFile =
    EXPO_PROJECT_FILES.find((f) => f.id === selectedFileId) ?? EXPO_PROJECT_FILES[0];

  const userPoints = persisted.balance;
  const dailyPool = persisted.pool;
  const claimedToday = persisted.claimedToday;
  const adsUsedToday = persisted.dailyAdsWatched;
  const phoneNumber = persisted.phoneNumber;

  // Update state and immediately persist to localStorage
  const commitState = (updater: (prev: PersistedState) => PersistedState) => {
    setPersisted((prev) => {
      const next = updater(prev);
      savePersistedState(next);
      return next;
    });
  };

  // Live 1-second timer until 8:00 AM reset + automatic midnight date rollover check
  useEffect(() => {
    const timer = window.setInterval(() => {
      setMsUntilReset(getMsUntil8am());
      const today = getTodayDateString();
      setPersisted((prev) => {
        if (
          prev.poolDate === today &&
          (prev.lastClaimDate === today || !prev.claimedToday) &&
          (prev.lastAdDate === today || prev.dailyAdsWatched === 0)
        ) {
          return prev;
        }
        const rolled: PersistedState = {
          ...prev,
          pool: prev.poolDate !== today ? DAILY_POOL_MAX : prev.pool,
          poolDate: today,
          claimedToday: prev.lastClaimDate !== today ? false : prev.claimedToday,
          dailyAdsWatched: prev.lastAdDate !== today ? 0 : prev.dailyAdsWatched,
        };
        savePersistedState(rolled);
        return rolled;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // 15-second non-skippable fake video ad timer -> auto-reward +20 points at 0s and save immediately
  useEffect(() => {
    if (!rewardModalOpen) return;

    if (rewardSecondsLeft <= 0) {
      const today = getTodayDateString();
      setRewardModalOpen(false);
      commitState((prev) => ({
        ...prev,
        pool: prev.pool + 20,
        poolDate: today,
        dailyAdsWatched: Math.min(MAX_ADS_PER_DAY, prev.dailyAdsWatched + 1),
        lastAdDate: today,
        lastRewardDate: today,
      }));
      setEarnError(null);
      setEarnSuccess('Ad fully watched +20');
      showToast('Ad fully watched +20');
      return;
    }

    const timer = window.setTimeout(() => {
      setRewardSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [rewardModalOpen, rewardSecondsLeft]);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    window.setTimeout(() => {
      setStatusMessage((current) => (current === msg ? null : current));
    }, 3200);
  };

  const handleClaimPoints = () => {
    if (claimedToday) {
      showToast('Already claimed today. Next claim unlocks at 8:00 AM.');
      return;
    }
    if (dailyPool < 100) {
      showToast('Pool below 100 points. Watch an ad on Earn or wait for 8am refill.');
      return;
    }

    const today = getTodayDateString();
    commitState((prev) => ({
      ...prev,
      pool: prev.pool - 100,
      poolDate: today,
      balance: prev.balance + 100,
      claimedToday: true,
      lastClaimDate: today,
      lastRewardDate: today,
    }));

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(120);
    }
    playWebChime();
    showToast('Claimed 100 points! Saved to localStorage.');
  };

  const handleStartRewardedAd = async () => {
    if (adsUsedToday >= MAX_ADS_PER_DAY || checkingAdMob) {
      if (adsUsedToday >= MAX_ADS_PER_DAY) {
        showToast('Daily limit reached (5/5 used). Resets at 8:00 AM.');
      }
      return;
    }

    setEarnError(null);
    setEarnSuccess(null);

    if (testMode) {
      setRewardSecondsLeft(15);
      setRewardModalOpen(true);
      return;
    }

    // TEST MODE OFF: real browser AdMob server probe (fails if browser/DNS adblocker blocks AdMob)
    setCheckingAdMob(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 3500);
    try {
      await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
      });
      const msg =
        'Real AdMob requires native binary — toggle TEST MODE ON above to run the 15s test video ad (0 points given)';
      setEarnError(msg);
      showToast(msg);
    } catch {
      const msg = 'Ad blocked - Turn off adblocker to earn, 0 points given';
      setEarnError(msg);
      showToast(msg);
    } finally {
      window.clearTimeout(timeoutId);
      setCheckingAdMob(false);
    }
  };

  const hasSavedPhone = phoneNumber.trim().length >= 9;

  const handleRedeem = (offer: StoreOffer) => {
    if (!hasSavedPhone) {
      showToast('Store locked: save your phone number in Settings first.');
      setActiveRoute('/settings');
      return;
    }
    if (userPoints < offer.cost) {
      showToast(`Need ${offer.cost - userPoints} more points for ${offer.airtime} Airtime.`);
      return;
    }

    const today = getTodayDateString();
    commitState((prev) => ({
      ...prev,
      balance: prev.balance - offer.cost,
      lastRewardDate: today,
    }));
    showToast(`${offer.airtime} Airtime queued for ${phoneNumber}.`);
  };

  const handleSavePhone = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = phoneInput.trim();
    if (trimmed.length < 9) {
      showToast('Enter a valid SA phone number (e.g. 082 123 4567).');
      return;
    }
    commitState((prev) => ({
      ...prev,
      phoneNumber: trimmed,
    }));
    showToast(`Saved ${trimmed}. Store redemptions unlocked!`);
  };

  const handleResetDemo = () => {
    const today = getTodayDateString();
    const resetState: PersistedState = {
      balance: 0,
      pool: DAILY_POOL_MAX,
      poolDate: today,
      claimedToday: false,
      dailyAdsWatched: 0,
      lastClaimDate: '',
      lastAdDate: '',
      phoneNumber: '',
      lastRewardDate: '',
    };
    setPersisted(resetState);
    savePersistedState(resetState);
    setPhoneInput('');
    setTestMode(false);
    setEarnError(null);
    setEarnSuccess(null);
    setStatusMessage(null);
    showToast('Demo state reset & saved to localStorage.');
  };

  const handleTestResetDayOne = () => {
    const today = getTodayDateString();
    const preservedPhone =
      (typeof window !== 'undefined' && window.localStorage
        ? window.localStorage.getItem('phoneNumber')
        : null) ?? persisted.phoneNumber;

    if (typeof window !== 'undefined' && window.localStorage) {
      [
        'balance',
        'pool',
        'poolDate',
        'claimedToday',
        'dailyAdsWatched',
        'lastClaimDate',
        'lastAdDate',
        'phoneNumber',
        'lastRewardDate',
      ].forEach((key) => {
        window.localStorage.removeItem(key);
      });
    }

    const dayOneState: PersistedState = {
      balance: 0,
      pool: DAILY_POOL_MAX,
      poolDate: today,
      claimedToday: false,
      dailyAdsWatched: 0,
      lastClaimDate: '',
      lastAdDate: '',
      phoneNumber: preservedPhone,
      lastRewardDate: '',
    };

    savePersistedState(dayOneState);
    setPersisted(dayOneState);
    setResetConfirmOpen(false);
    setEarnError(null);
    setEarnSuccess(null);

    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleCopySingleFile = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('Clipboard blocked by browser.');
    }
  };

  const handleCopyAllFiles = async () => {
    const bundle = EXPO_PROJECT_FILES.map(
      (file) => `// ===== ${file.filename} =====\n${file.code}`
    ).join('\n\n');
    try {
      await navigator.clipboard.writeText(bundle);
      setCopiedAll(true);
      window.setTimeout(() => setCopiedAll(false), 2200);
    } catch {
      showToast('Clipboard blocked by browser.');
    }
  };

  const remainingPercent = Math.min(
    100,
    Math.max(0, Math.round((dailyPool / DAILY_POOL_MAX) * 100))
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setWorkspaceSection('both');
            }}
            className="text-xl font-extrabold tracking-tight text-[#6B21A8] whitespace-nowrap shrink-0"
          >
            PointsPoolSA
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setWorkspaceSection('both')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                workspaceSection === 'both'
                  ? 'border-[#6B21A8] text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Simulator &amp; Code
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceSection('files')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                workspaceSection === 'files'
                  ? 'border-[#6B21A8] text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Expo Files (7)
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceSection('setup')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                workspaceSection === 'setup'
                  ? 'border-[#6B21A8] text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Expo Go Setup
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleCopyAllFiles}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#6B21A8] hover:bg-[#581C87] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAll ? 'Copied All Files' : 'Copy All Files'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main id="top" className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <p className="text-xs font-semibold text-[#6B21A8] mb-1">
              Expo SDK 52 · Expo Router · Firebase Firestore · Google Mobile Ads
            </p>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 text-balance">
              PointsPoolSA Mobile Preview &amp; Project Bundle
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 tabular-nums">
            <span>Pool: {dailyPool}/1000</span>
            <span aria-hidden="true">·</span>
            <span>Ads: {adsUsedToday}/5</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={handleResetDemo}
              className="inline-flex items-center gap-1.5 font-semibold text-[#6B21A8] hover:underline cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo State</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Phone Simulator */}
          {workspaceSection === 'both' && (
            <section aria-label="Interactive Mobile Simulator" className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full max-w-[380px] bg-slate-900 rounded-[2.5rem] p-3 shadow-xl">
                <div className="bg-white rounded-[2rem] overflow-hidden flex flex-col h-[700px] relative">
                  {/* Mobile App Header */}
                  <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between bg-white">
                    <span className="text-lg font-extrabold text-[#6B21A8]">
                      {activeRoute === '/home' && 'PointsPoolSA'}
                      {activeRoute === '/earn' && 'Earn Points'}
                      {activeRoute === '/store' && 'Airtime Store'}
                      {activeRoute === '/settings' && 'Settings'}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 font-mono tabular-nums">
                      {activeRoute}
                    </span>
                  </div>

                  {/* Toast Feedback Banner */}
                  {statusMessage && (
                    <div
                      role="status"
                      className="mx-4 mt-3 px-3.5 py-2.5 bg-[#F3E8FF] text-[#581C87] text-xs font-semibold rounded-xl flex items-center gap-2"
                    >
                      <Volume2 className="w-4 h-4 shrink-0 text-[#6B21A8]" />
                      <span>{statusMessage}</span>
                    </div>
                  )}

                  {/* Active Route Content */}
                  <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col justify-between">
                    {activeRoute === '/home' && (
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="flex items-center justify-between bg-[#F3E8FF] px-4 py-3 rounded-xl mb-4">
                          <span className="text-xs font-semibold text-[#6B21A8]">
                            Your Claimed Balance
                          </span>
                          <span className="text-sm font-extrabold text-[#6B21A8] tabular-nums">
                            {userPoints} pts
                          </span>
                        </div>

                        <div className="border border-purple-200 rounded-2xl p-5 mb-4 bg-white shadow-sm">
                          <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-4 tabular-nums">
                            Today&apos;s Points Pool: {dailyPool}
                          </h2>

                          <div className="w-full h-4 bg-[#F3E8FF] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#6B21A8] rounded-full transition-all duration-200"
                              style={{ width: `${remainingPercent}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between mt-2 text-xs font-semibold text-slate-500 tabular-nums">
                            <span>
                              Remaining: {dailyPool} / {DAILY_POOL_MAX}
                            </span>
                            <span>{remainingPercent}%</span>
                          </div>

                          <p className="mt-3 text-center text-xs font-semibold text-[#6B21A8]">
                            Refills daily at 8am
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleClaimPoints}
                          disabled={claimedToday || dailyPool < 100}
                          className="w-full py-4 px-5 rounded-xl bg-[#6B21A8] hover:bg-[#581C87] disabled:bg-purple-300 text-white font-extrabold text-sm tracking-wide transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                          {claimedToday ? 'CLAIMED TODAY (LOCKED)' : 'CLAIM 100 POINTS'}
                        </button>

                        {/* 8am Reset Countdown Timer */}
                        <div className="mt-3.5 bg-[#FAF5FF] border border-purple-200 rounded-xl py-2.5 px-4 text-center">
                          <p className="text-[11px] font-semibold text-slate-500">
                            {claimedToday
                              ? 'Next claim unlocks at 8:00 AM in:'
                              : 'Daily 8:00 AM pool reset in:'}
                          </p>
                          <p className="text-lg font-extrabold text-[#6B21A8] font-mono tabular-nums mt-0.5">
                            {formatCountdown(msUntilReset)}
                          </p>
                        </div>
                      </div>
                    )}

                    {activeRoute === '/earn' && (
                      <div className="flex-1 flex flex-col justify-center">
                        {/* Small Switch at top of Earn page */}
                        <label className="flex items-center justify-between bg-[#FAF5FF] border border-purple-200 rounded-xl px-3.5 py-2.5 mb-3.5 cursor-pointer">
                          <div>
                            <p className="text-xs font-extrabold text-[#6B21A8]">
                              TEST MODE: Adblocker OFF
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {testMode
                                ? 'ON: Non-skippable 15s test video ad'
                                : 'OFF: Real AdMob + adblocker check'}
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={testMode}
                            onChange={(e) => {
                              setTestMode(e.target.checked);
                              setEarnError(null);
                              setEarnSuccess(null);
                            }}
                            className="accent-[#6B21A8] h-4 w-4 shrink-0"
                          />
                        </label>

                        <div className="border border-purple-200 rounded-2xl p-5 bg-white text-center">
                          <h2 className="text-xl font-extrabold text-[#6B21A8] mb-2">
                            Boost the Daily Pool
                          </h2>
                          <p className="text-sm text-slate-600 leading-relaxed mb-4">
                            Watch a full 15-second rewarded video ad to add +20 points straight
                            into Today&apos;s Points Pool.
                          </p>

                          <div className="flex items-center justify-between bg-[#F3E8FF] rounded-xl px-4 py-3 mb-4">
                            <span className="text-xs font-semibold text-[#6B21A8]">
                              Daily Ads Watched
                            </span>
                            <span className="text-sm font-extrabold text-[#6B21A8] tabular-nums">
                              {adsUsedToday}/{MAX_ADS_PER_DAY} used
                            </span>
                          </div>

                          {earnError && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 mb-4">
                              <p className="text-xs font-bold text-red-700">{earnError}</p>
                            </div>
                          )}

                          {earnSuccess && (
                            <div className="bg-[#F3E8FF] border border-purple-200 rounded-xl px-3.5 py-2.5 mb-4">
                              <p className="text-xs font-extrabold text-[#6B21A8]">
                                {earnSuccess}
                              </p>
                            </div>
                          )}

                          <button
                            type="button"
                            disabled={adsUsedToday >= MAX_ADS_PER_DAY || checkingAdMob}
                            onClick={handleStartRewardedAd}
                            className="w-full py-4 px-5 rounded-xl bg-[#6B21A8] hover:bg-[#581C87] disabled:bg-purple-300 text-white font-extrabold text-sm tracking-wide transition-colors cursor-pointer disabled:cursor-not-allowed"
                          >
                            {checkingAdMob
                              ? 'CHECKING ADMOB...'
                              : adsUsedToday >= MAX_ADS_PER_DAY
                              ? 'DAILY LIMIT REACHED (5/5)'
                              : 'WATCH AD +20 POINTS'}
                          </button>

                          {adsUsedToday >= MAX_ADS_PER_DAY && (
                            <p className="mt-3 text-xs font-bold text-[#6B21A8] tabular-nums">
                              Resets at 8:00 AM in {formatCountdown(msUntilReset)}
                            </p>
                          )}

                          <p className="mt-4 text-[11px] font-mono text-slate-400">
                            Ad Unit ID: ca-app-pub-8005746012564327/1940590329
                          </p>
                        </div>
                      </div>
                    )}

                    {activeRoute === '/store' && (
                      <div className="space-y-3">
                        <div className="bg-[#F3E8FF] rounded-2xl p-4">
                          <p className="text-xs font-bold text-[#6B21A8]">Available Points</p>
                          <p className="text-2xl font-extrabold text-[#6B21A8] tabular-nums mt-0.5">
                            {userPoints} pts
                          </p>
                          <p className="text-xs text-[#581C87] mt-1">
                            {hasSavedPhone
                              ? `Sending to: ${phoneNumber}`
                              : 'Store Locked: Save your phone number in Settings'}
                          </p>
                        </div>

                        {!hasSavedPhone && (
                          <div className="bg-[#FAF5FF] border border-purple-200 rounded-2xl p-4">
                            <div className="flex items-center gap-2 text-sm font-extrabold text-[#6B21A8] mb-1">
                              <Lock className="w-4 h-4" />
                              <span>Store Locked</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed mb-3">
                              Save your South African phone number in Settings to unlock airtime
                              redemptions.
                            </p>
                            <button
                              type="button"
                              onClick={() => setActiveRoute('/settings')}
                              className="w-full py-2.5 rounded-xl bg-[#6B21A8] hover:bg-[#581C87] text-white text-xs font-extrabold cursor-pointer"
                            >
                              Go to Settings
                            </button>
                          </div>
                        )}

                        {AIRTIME_OFFERS.map((offer) => {
                          const canAfford = userPoints >= offer.cost;
                          return (
                            <div
                              key={offer.id}
                              className={`border border-purple-200 rounded-2xl p-4 flex items-center justify-between gap-3 bg-white ${
                                !hasSavedPhone ? 'opacity-65' : ''
                              }`}
                            >
                              <div>
                                <p className="text-sm font-extrabold text-slate-900">
                                  {offer.title}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                                  {!hasSavedPhone
                                    ? 'Locked — save phone number first'
                                    : canAfford
                                    ? 'Ready to redeem'
                                    : `Need ${offer.cost - userPoints} more points`}
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled={!hasSavedPhone}
                                onClick={() => handleRedeem(offer)}
                                className={`px-4 py-2.5 rounded-lg text-xs font-extrabold text-white transition-colors shrink-0 ${
                                  !hasSavedPhone
                                    ? 'bg-slate-400 cursor-not-allowed'
                                    : canAfford
                                    ? 'bg-[#6B21A8] hover:bg-[#581C87] cursor-pointer'
                                    : 'bg-purple-400 hover:bg-purple-500 cursor-pointer'
                                }`}
                              >
                                {!hasSavedPhone ? 'LOCKED' : 'REDEEM'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {activeRoute === '/settings' && (
                      <div className="flex-1 flex flex-col justify-between gap-4 pt-2">
                        <form
                          onSubmit={handleSavePhone}
                          className="border border-purple-200 rounded-2xl p-5 bg-white"
                        >
                          <h2 className="text-lg font-extrabold text-[#6B21A8] mb-2">
                            Airtime Delivery Number
                          </h2>
                          <p className="text-xs text-slate-600 leading-relaxed mb-5">
                            Enter the South African mobile number where your redeemed airtime
                            should be sent. Saving your number unlocks the Store tab.
                          </p>
                          <label
                            htmlFor="sim-phone"
                            className="block text-xs font-bold text-slate-700 mb-2"
                          >
                            Phone Number
                          </label>
                          <input
                            id="sim-phone"
                            type="tel"
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value)}
                            placeholder="e.g. 082 123 4567"
                            className="w-full border border-slate-300 rounded-xl px-3.5 py-3 text-sm text-slate-900 bg-slate-50 focus:outline-none focus:border-[#6B21A8] mb-4"
                          />
                          <button
                            type="submit"
                            className="w-full py-3.5 rounded-xl bg-[#6B21A8] hover:bg-[#581C87] text-white font-extrabold text-sm transition-colors cursor-pointer"
                          >
                            Save
                          </button>
                        </form>

                        <button
                          type="button"
                          onClick={() => setResetConfirmOpen(true)}
                          className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs tracking-wide transition-colors cursor-pointer"
                        >
                          RESET FOR TESTING (Dev Only)
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bottom Tab Navigation */}
                  <nav
                    aria-label="Mobile app tabs"
                    className="grid grid-cols-4 border-t border-slate-200 bg-white h-16"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveRoute('/home')}
                      className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer ${
                        activeRoute === '/home' ? 'text-[#6B21A8]' : 'text-slate-500'
                      }`}
                    >
                      <Home className="w-5 h-5" />
                      <span>Home</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveRoute('/earn')}
                      className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer ${
                        activeRoute === '/earn' ? 'text-[#6B21A8]' : 'text-slate-500'
                      }`}
                    >
                      <PlayCircle className="w-5 h-5" />
                      <span>Earn</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveRoute('/store')}
                      className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer ${
                        activeRoute === '/store' ? 'text-[#6B21A8]' : 'text-slate-500'
                      }`}
                    >
                      <ShoppingBag className="w-5 h-5" />
                      <span>Store</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveRoute('/settings')}
                      className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer ${
                        activeRoute === '/settings' ? 'text-[#6B21A8]' : 'text-slate-500'
                      }`}
                    >
                      <Settings className="w-5 h-5" />
                      <span>Settings</span>
                    </button>
                  </nav>

                  {/* Non-skippable 15-second Fake Video Ad Modal (TEST MODE ON, no skip/close allowed) */}
                  {rewardModalOpen && (
                    <div className="absolute inset-0 bg-slate-900/90 flex items-center justify-center p-5 z-20">
                      <div className="w-full bg-white rounded-2xl p-4 text-center">
                        <p className="text-[11px] font-extrabold text-[#6B21A8] mb-3">
                          SPONSORED REWARDED VIDEO · TEST MODE
                        </p>

                        <div className="relative w-full h-44 bg-[#1E1B4B] rounded-xl flex flex-col items-center justify-center p-4 mb-4">
                          <Video className="w-9 h-9 text-purple-200" />
                          <p className="text-white text-base font-extrabold mt-2">
                            PointsPoolSA Partner Ad
                          </p>
                          <p className="text-purple-200 text-[11px] font-semibold mt-1">
                            Playing video · Cannot skip before 15s
                          </p>
                          <span className="absolute top-2.5 right-2.5 bg-slate-900/80 text-white text-xs font-extrabold font-mono tabular-nums px-2 py-0.5 rounded">
                            00:{String(rewardSecondsLeft).padStart(2, '0')}
                          </span>
                        </div>

                        <div className="w-full h-2.5 bg-[#F3E8FF] rounded-full overflow-hidden mb-3">
                          <div
                            className="h-full bg-[#6B21A8] rounded-full transition-all duration-300"
                            style={{ width: `${Math.round(((15 - rewardSecondsLeft) / 15) * 100)}%` }}
                          />
                        </div>

                        <div className="py-3 rounded-xl bg-[#F3E8FF] text-[#6B21A8] text-xs font-extrabold tabular-nums">
                          Reward unlocks automatically in {rewardSecondsLeft}s
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Confirm Popup: Reset everything to Day 1? */}
                  {resetConfirmOpen && (
                    <div
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="reset-confirm-title"
                      className="absolute inset-0 bg-slate-900/80 flex items-center justify-center p-5 z-30"
                    >
                      <div className="w-full bg-white rounded-2xl p-5 shadow-xl border border-slate-200">
                        <h3
                          id="reset-confirm-title"
                          className="text-base font-extrabold text-slate-900 mb-2"
                        >
                          Reset everything to Day 1?
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed mb-5">
                          This will reset balance to 0, pool to 1000, claimedToday to false,
                          dailyAdsWatched to 0, clear localStorage, and reload the app. Your saved
                          phone number will be kept.
                        </p>
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => setResetConfirmOpen(false)}
                            className="py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleTestResetDayOne}
                            className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold cursor-pointer"
                          >
                            YES
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500 text-center max-w-[340px]">
                Test daily claim lock (1/day until 8am), Earn ad cap (0/5 used), and Store unlock
                after saving a phone number in Settings.
              </p>
            </section>
          )}

          {/* Right Column / Full Width Code & Setup Inspector */}
          <section
            aria-label="Expo Project Files and Setup"
            className={workspaceSection === 'both' ? 'lg:col-span-7' : 'lg:col-span-12'}
          >
            {workspaceSection !== 'setup' && (
              <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden mb-8">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {EXPO_PROJECT_FILES.map((file) => {
                      const isActive = file.id === selectedFile.id;
                      return (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => setSelectedFileId(file.id)}
                          className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            isActive
                              ? 'bg-[#6B21A8] text-white font-semibold'
                              : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {file.filename}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopySingleFile(selectedFile.id, selectedFile.code)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#6B21A8] bg-[#F3E8FF] hover:bg-purple-200/70 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copiedId === selectedFile.id ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedId === selectedFile.id ? 'Copied' : 'Copy File'}</span>
                  </button>
                </div>

                <div className="px-5 py-3 border-b border-slate-100 bg-white flex items-center justify-between gap-4">
                  <p className="text-xs text-slate-600">{selectedFile.summary}</p>
                  <span className="text-xs font-mono text-slate-400 shrink-0">
                    {selectedFile.code.split('\n').length} lines
                  </span>
                </div>

                <pre className="p-5 bg-slate-950 text-slate-100 text-xs leading-relaxed overflow-x-auto max-h-[540px] font-mono">
                  <code>{selectedFile.code}</code>
                </pre>
              </div>
            )}

            <div className="border border-slate-200 rounded-2xl bg-white p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <Terminal className="w-5 h-5 text-[#6B21A8]" />
                <h2 className="text-lg font-extrabold text-slate-900">
                  Run with npx expo start &amp; Expo Go
                </h2>
              </div>

              <div className="space-y-4">
                {EXPO_SETUP_STEPS.map((item) => (
                  <div
                    key={item.step}
                    className="pb-4 border-b border-slate-100 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-baseline gap-2.5 mb-1.5">
                      <span className="text-xs font-mono font-bold text-[#6B21A8] tabular-nums">
                        {item.step}.
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-2">{item.detail}</p>
                    <div className="bg-slate-950 text-slate-100 rounded-lg px-3.5 py-2 text-xs font-mono overflow-x-auto">
                      {item.command}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
                <Smartphone className="w-4 h-4 text-[#6B21A8] shrink-0 mt-0.5" />
                <p>
                  Because standard Expo Go does not compile third-party native AdMob binaries,
                  <code className="mx-1 font-mono text-slate-800">app/earn.tsx</code> detects Expo Go
                  automatically and provides the TEST MODE 15s fallback so the app never crashes, while
                  activating live <code className="font-mono text-slate-800">react-native-google-mobile-ads</code>{' '}
                  Rewarded Ads in any Development or EAS build.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
