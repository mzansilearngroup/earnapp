export interface ExpoProjectFile {
  id: string;
  filename: string;
  language: string;
  summary: string;
  code: string;
}

export const EXPO_PROJECT_FILES: ExpoProjectFile[] = [
  {
    id: 'app/_layout.tsx',
    filename: 'app/_layout.tsx',
    language: 'typescript',
    summary: 'Expo Router root Tabs layout for Home, Earn, Store, and Settings with #6B21A8 Purple & White theme.',
    code: `// app/_layout.tsx
// Expo Router root Tabs layout with Purple (#6B21A8) & White (#FFFFFF) theme.

import React, { useEffect } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY_PURPLE = '#6B21A8';
const BACKGROUND_WHITE = '#FFFFFF';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  // Redirect initial root "/" to "/home"
  useEffect(() => {
    if (segments.length === 0) {
      router.replace('/home');
    }
  }, [segments, router]);

  return (
    <>
      <StatusBar style="dark" backgroundColor={BACKGROUND_WHITE} />
      <Tabs
        initialRouteName="home"
        screenOptions={{
          headerStyle: { backgroundColor: BACKGROUND_WHITE },
          headerShadowVisible: false,
          headerTitleStyle: {
            color: PRIMARY_PURPLE,
            fontWeight: '800',
            fontSize: 20,
          },
          tabBarActiveTintColor: PRIMARY_PURPLE,
          tabBarInactiveTintColor: '#64748B',
          tabBarStyle: {
            backgroundColor: BACKGROUND_WHITE,
            borderTopColor: '#E2E8F0',
            borderTopWidth: 1,
            height: 64,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          sceneStyle: {
            backgroundColor: BACKGROUND_WHITE,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'PointsPoolSA',
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="earn"
          options={{
            title: 'Earn Points',
            tabBarLabel: 'Earn',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'play-circle' : 'play-circle-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="store"
          options={{
            title: 'Airtime Store',
            tabBarLabel: 'Store',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'bag' : 'bag-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarLabel: 'Settings',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'settings' : 'settings-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
`,
  },
  {
    id: 'app/home.tsx',
    filename: 'app/home.tsx',
    language: 'typescript',
    summary: 'Home screen (/home) with 1000-start pool, remaining pool progress bar, once-per-day 8am claim lock with live countdown, and sound + vibration.',
    code: `// app/home.tsx
// Home Screen (/home):
// - Pool starts at 1000 (auto-resets daily at 8:00 AM)
// - CLAIM 100 POINTS reduces pool by 100 (e.g., 1000 -> 900) and credits user wallet +100
// - ProgressBar shows REMAINING pool (dailyPool / 1000)
// - Claim Lock: user can claim only once per day, with live countdown until 8am reset
// - Vibration + sound chime on claim

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import {
  doc,
  onSnapshot,
  runTransaction,
  setDoc,
  increment,
} from 'firebase/firestore';
import {
  db,
  POOL_COLLECTION,
  POOL_DOC_ID,
  USER_DOC_ID,
  DAILY_POOL_MAX,
  getCurrent8amCycleInfo,
  formatCountdown,
} from '../firebaseConfig';

const PRIMARY_PURPLE = '#6B21A8';

// Embedded 160ms chime WAV (base64) so claim sound plays out of the box with no external MP3 files
const CHIME_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRiQFAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAFAACAudjOoWQ1KEN6tNbQpWo5KUB1r9PRqnA+Kj5wqdDRrnVCKzxrpMzRsXtHLTpmn8nRtYBMLzhimcXRuIVQMjdelMHQuopVNDZaj73PvY9aNzZWirnOv5NfOjVThbTMwJhkPTZQgLDKwpxpQTZNe6zIw59uRDdLd6fFxKNySDhIcqPDxKZ3TDlHbp7AxKl8UDpFapq9xKyAVDxEZ5W6xK+EWD5DY5G3w7GIXEBCYIyzwrOMYENCXYiwwbWQZEVBWoSswLaUaEhBWICovreXbUtCVXylvLiacU5CU3ihurmddVFDUXWduLmgeFREUHGZtrmjfFhGTm6Ws7mlgFtHTWuSsbmnhF5JTWiOrriph2JLTGWKq7irimVNTGOHqLesjmlPS2CDpbWtkWxRTF6AorSuk3BUTFx9n7OvlnNWTFp6nLGwmXZZTVl2mK+wm3pbTld0la2wnX1eT1Zxkquwn4BhUFVuj6mwoYNkUlVsjKavo4ZnU1RpiaSvpIlqVVRnhqKupYttV1Rlg5+tpo5vWVRjgJysp5ByW1RifZqqqJN1XVVge5epqJV4X1VfeJWnqJd7YVZedpKmqJh9ZFddc4+kqJqAZlhccY2iqJyDaFlcb4qgqJ2Fa1pbbYeep56HbVxba4Wcp5+KcF1baoKapqCMcl9baICYpaGOdWFbZ36WpKGQd2JcZXuToqKReWRcZHmRoaKTfGZdY3ePoKKVfmhdY3WNnqKWgGpeYnOLnaKXgmxfYnKIm6GYhG5gYXCGmaGZhnBiYW+EmKCaiHJjYW2ClqCbinRkYWyAlJ+bjHZmYWt+kp6cjXhnYWp8kJ2cj3ppYml6jpyckHxqYmh5jZuchGlle5abhmpkeZWciGxkeJOciW5kdpGci29kdJCcjXFkco6cjnNlcYybkHVlcIqbkXdmboiaknlmbYaZk3pnbIWZlHxoa4OYlX5paoGXloBqan+Vl4JraX2Ul4NsaXyTmIVuaHqSmIdvaHiQmIhxaHePmIpyaHaNmIt0aHSMmIx1aXOKl453aXKIl494anGHlpB6anCFlpF8a2+ElZJ9bG6ClJJ/bG2Bk5OAbW1/kpOCbmx+kZSDcGx8kJSFcWx7j5SGcmx5jpSHc2x4jJSJdGx3i5SKdmx2ipSLd2x1iJSMeGx0h5ONem1zhpOOe21yhJKOfG5xg5KPfm9xgpGQf29wgJCQgHBwf4+RgnFvfo6Rg3JvfI2RhHNve4yRhXRveouRhnVveYqRiHZveImRiHdvd4iRiXlvdoeRinpvdYaQi3twdYWQjHxwdIOQjH1xc4KPjX5xc4GOjn9ycoCOjoFzcn+NjoJzcn6Mj4N0cX2Lj4R1cXyKj4V2cXuKj4Z3cXqJj4d4cXmIj4d5cXiHj4h6cneGjol7cneFjop8cnaEjop9c3aDjYt+c3WCjYt/dHWBjIyAdHSAjIyBdXR/i4yCdXR+ioyDdnN9io2Dd3N8iY2EeHN7iI2FeHN7h42GeXN6ho2GenN5hoyHe3R5hYyIfHR4hIyIfXR3g4yJfXV3gouJfnV3gYuKf3V2gIqKgHZ2gIqKgXZ2f4mLgnd1fomLgnh1fYiLg3h1fYeLhHl1fIeLhHp1e4aLhXp1e4WLhnt1eoWLhnx2eoSKh3x2eYOKh312eYKKiH52eIKKiH93eIGJiH93eICJiYB3d4CIiYF4d3+IiYF4d36HiYJ5dw==';

export default function HomeScreen() {
  const [dailyPool, setDailyPool] = useState<number>(DAILY_POOL_MAX);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [lastClaimCycleKey, setLastClaimCycleKey] = useState<string | null>(null);
  const [cycleInfo, setCycleInfo] = useState(() => getCurrent8amCycleInfo());
  const [loading, setLoading] = useState<boolean>(true);
  const [claiming, setClaiming] = useState<boolean>(false);

  // Tick every second to update the countdown timer until 8:00 AM reset
  useEffect(() => {
    const interval = setInterval(() => {
      setCycleInfo(getCurrent8amCycleInfo());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to Firestore: appData/pool and appData/userProfile
  useEffect(() => {
    const poolRef = doc(db, POOL_COLLECTION, POOL_DOC_ID);
    const userRef = doc(db, POOL_COLLECTION, USER_DOC_ID);

    const unsubPool = onSnapshot(
      poolRef,
      async (snapshot) => {
        const currentCycle = getCurrent8amCycleInfo().cycleKey;
        if (!snapshot.exists()) {
          // Initialize pool at 1000 for current 8am cycle
          try {
            await setDoc(poolRef, {
              dailyPool: DAILY_POOL_MAX,
              cycleKey: currentCycle,
            });
            setDailyPool(DAILY_POOL_MAX);
          } catch (err) {
            console.warn('Could not initialize pool document:', err);
          }
        } else {
          const data = snapshot.data();
          if (data?.cycleKey !== currentCycle) {
            // Auto-reset pool to 1000 when a new 8am daily cycle starts
            try {
              await setDoc(
                poolRef,
                { dailyPool: DAILY_POOL_MAX, cycleKey: currentCycle },
                { merge: true }
              );
              setDailyPool(DAILY_POOL_MAX);
            } catch {
              const val = data?.dailyPool;
              setDailyPool(typeof val === 'number' ? val : DAILY_POOL_MAX);
            }
          } else {
            const val = data?.dailyPool;
            setDailyPool(typeof val === 'number' ? val : 0);
          }
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Firestore pool snapshot error:', error);
        setLoading(false);
      }
    );

    const unsubUser = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUserPoints(typeof data?.points === 'number' ? data.points : 0);
        setLastClaimCycleKey(
          typeof data?.lastClaimCycleKey === 'string'
            ? data.lastClaimCycleKey
            : null
        );
      }
    });

    return () => {
      unsubPool();
      unsubUser();
    };
  }, [cycleInfo.cycleKey]);

  // Play embedded chime sound via expo-av
  const playClaimSound = async () => {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: CHIME_WAV_DATA_URI },
        { shouldPlay: true }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (err) {
      console.warn('Sound playback skipped:', err);
    }
  };

  const alreadyClaimedToday = lastClaimCycleKey === cycleInfo.cycleKey;

  // Claim 100 points from the shared daily pool (once per 8am cycle)
  const handleClaimPoints = async () => {
    if (claiming || alreadyClaimedToday) return;

    if (dailyPool < 100) {
      Alert.alert(
        'Pool Too Low',
        'Pool has less than 100 points. Watch an ad on Earn or wait for the 8am reset!'
      );
      return;
    }

    setClaiming(true);
    const poolRef = doc(db, POOL_COLLECTION, POOL_DOC_ID);
    const userRef = doc(db, POOL_COLLECTION, USER_DOC_ID);
    const activeCycle = getCurrent8amCycleInfo().cycleKey;

    try {
      await runTransaction(db, async (transaction) => {
        const poolSnap = await transaction.get(poolRef);
        const userSnap = await transaction.get(userRef);

        const userCycle = userSnap.exists()
          ? userSnap.data()?.lastClaimCycleKey
          : null;
        if (userCycle === activeCycle) {
          throw new Error('ALREADY_CLAIMED');
        }

        const currentPool = poolSnap.exists()
          ? poolSnap.data()?.cycleKey === activeCycle
            ? Number(poolSnap.data()?.dailyPool ?? 0)
            : DAILY_POOL_MAX
          : DAILY_POOL_MAX;

        if (currentPool < 100) {
          throw new Error('INSUFFICIENT_POOL');
        }

        // Reduce remaining pool by 100 (e.g., 1000 -> 900)
        transaction.set(
          poolRef,
          { dailyPool: currentPool - 100, cycleKey: activeCycle },
          { merge: true }
        );

        // Credit +100 points and set today's claim lock
        transaction.set(
          userRef,
          { points: increment(100), lastClaimCycleKey: activeCycle },
          { merge: true }
        );
      });

      // Vibrate and play claim chime
      Vibration.vibrate(120);
      await playClaimSound();
    } catch (error: any) {
      if (error?.message === 'ALREADY_CLAIMED') {
        Alert.alert(
          'Already Claimed Today',
          'You can only claim once per day. Come back after the 8am reset!'
        );
      } else if (error?.message === 'INSUFFICIENT_POOL') {
        Alert.alert('Pool Empty', 'The daily pool dropped below 100 points.');
      } else {
        Alert.alert(
          'Firebase Error',
          'Could not update Firestore. Check your firebaseConfig.ts credentials and Firestore rules.'
        );
      }
    } finally {
      setClaiming(false);
    }
  };

  // Remaining pool progress bar (0 - 100%)
  const remainingPercent = Math.min(
    100,
    Math.max(0, Math.round((dailyPool / DAILY_POOL_MAX) * 100))
  );
  const canClaim =
    !alreadyClaimedToday && dailyPool >= 100 && !claiming && !loading;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        {/* User Claimed Balance */}
        <View style={styles.walletRow}>
          <Text style={styles.walletLabel}>Your Claimed Balance</Text>
          <Text style={styles.walletValue}>{userPoints} pts</Text>
        </View>

        {/* Remaining Daily Pool Card */}
        <View style={styles.poolCard}>
          {loading ? (
            <ActivityIndicator size="large" color={PRIMARY_PURPLE} />
          ) : (
            <>
              <Text style={styles.bigPoolText}>
                Today's Points Pool: {dailyPool}
              </Text>

              {/* ProgressBar showing REMAINING pool / 1000 */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: \`\${remainingPercent}%\` },
                  ]}
                />
              </View>

              <View style={styles.progressMeta}>
                <Text style={styles.progressNumbers}>
                  Remaining: {dailyPool} / {DAILY_POOL_MAX}
                </Text>
                <Text style={styles.progressNumbers}>{remainingPercent}%</Text>
              </View>

              <Text style={styles.refillText}>Refills daily at 8am</Text>
            </>
          )}
        </View>

        {/* Claim Lock Timer or Claim Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!canClaim}
          onPress={handleClaimPoints}
          style={[
            styles.claimButton,
            !canClaim && styles.claimButtonDisabled,
          ]}
        >
          <Text style={styles.claimButtonText}>
            {claiming
              ? 'CLAIMING...'
              : alreadyClaimedToday
              ? 'CLAIMED TODAY (LOCKED)'
              : 'CLAIM 100 POINTS'}
          </Text>
        </TouchableOpacity>

        {/* Countdown Timer until 8:00 AM Reset */}
        <View style={styles.timerBox}>
          <Text style={styles.timerLabel}>
            {alreadyClaimedToday
              ? 'Next claim unlocks at 8:00 AM in:'
              : 'Daily 8:00 AM pool reset in:'}
          </Text>
          <Text style={styles.timerValue}>
            {formatCountdown(cycleInfo.msUntilReset)}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    justifyContent: 'center',
  },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  walletLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_PURPLE,
  },
  walletValue: {
    fontSize: 16,
    fontWeight: '800',
    color: PRIMARY_PURPLE,
  },
  poolCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: PRIMARY_PURPLE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  bigPoolText: {
    fontSize: 27,
    fontWeight: '800',
    color: '#1E1B4B',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressTrack: {
    height: 16,
    width: '100%',
    backgroundColor: '#F3E8FF',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PRIMARY_PURPLE,
    borderRadius: 999,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressNumbers: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  refillText: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_PURPLE,
  },
  claimButton: {
    backgroundColor: PRIMARY_PURPLE,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonDisabled: {
    backgroundColor: '#C4B5FD',
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  timerBox: {
    marginTop: 14,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  timerValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '800',
    color: PRIMARY_PURPLE,
    fontVariant: ['tabular-nums'],
  },
});
`,
  },
  {
    id: 'app/earn.tsx',
    filename: 'app/earn.tsx',
    language: 'typescript',
    summary: 'Earn screen (/earn) with TEST MODE: Adblocker OFF switch, non-skippable 15s fake video ad player, real AdMob check, and 0/5 daily limit.',
    code: `// app/earn.tsx
// Earn Screen (/earn):
// - Top switch: "TEST MODE: Adblocker OFF"
// - TEST MODE ON: plays non-skippable 15s fake video ad (no skip/close before 15s), auto-rewards +20 and shows "Ad fully watched +20"
// - TEST MODE OFF: runs real AdMob / adblocker check; if blocked or failed, gives 0 points
// - Keeps 0/5 daily ad limit (resets at 8:00 AM) and #6B21A8 Purple theme

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  NativeModules,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot, runTransaction, increment } from 'firebase/firestore';
import {
  db,
  POOL_COLLECTION,
  POOL_DOC_ID,
  USER_DOC_ID,
  DAILY_POOL_MAX,
  MAX_ADS_PER_DAY,
  getCurrent8amCycleInfo,
  formatCountdown,
} from '../firebaseConfig';

const PRIMARY_PURPLE = '#6B21A8';
const AD_WATCH_SECONDS = 15;
const AD_BLOCKED_ERROR =
  'Ad blocked - Turn off adblocker to earn, 0 points given';

// Real Google AdMob Rewarded Ad Unit ID
const adUnitId = 'ca-app-pub-8005746012564327/1940590329';

let MobileAdsModule: typeof import('react-native-google-mobile-ads') | null = null;
if (NativeModules.RNGoogleMobileAdsModule) {
  try {
    MobileAdsModule = require('react-native-google-mobile-ads');
  } catch {
    MobileAdsModule = null;
  }
}

// Probe real AdMob servers to detect DNS/network adblockers (AdGuard, Private DNS, Pi-hole, Blokada)
async function checkAdServersReachable(): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
      method: 'HEAD',
      signal: controller.signal,
    });
    await fetch('https://googleads.g.doubleclick.net/favicon.ico', {
      method: 'HEAD',
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

export default function EarnScreen() {
  const [testMode, setTestMode] = useState<boolean>(false);
  const [adsUsedToday, setAdsUsedToday] = useState<number>(0);
  const [cycleInfo, setCycleInfo] = useState(() => getCurrent8amCycleInfo());

  const [checkingAd, setCheckingAd] = useState<boolean>(false);
  const [adLoaded, setAdLoaded] = useState<boolean>(false);
  const [adStatusError, setAdStatusError] = useState<string | null>(null);
  const [adSuccessMessage, setAdSuccessMessage] = useState<string | null>(null);
  const [updatingPool, setUpdatingPool] = useState<boolean>(false);

  // Non-skippable 15-second fake video ad modal state (when TEST MODE is ON)
  const [testAdVisible, setTestAdVisible] = useState<boolean>(false);
  const [adSecondsLeft, setAdSecondsLeft] = useState<number>(AD_WATCH_SECONDS);

  const rewardedRef = useRef<any>(null);
  const earnedNativeRewardRef = useRef<boolean>(false);
  const autoRewardTriggeredRef = useRef<boolean>(false);

  // Keep 8am cycle countdown fresh
  useEffect(() => {
    const interval = setInterval(() => {
      setCycleInfo(getCurrent8amCycleInfo());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen to daily ad count in Firestore appData/userProfile
  useEffect(() => {
    const userRef = doc(db, POOL_COLLECTION, USER_DOC_ID);
    const unsub = onSnapshot(userRef, (snapshot) => {
      const activeCycle = getCurrent8amCycleInfo().cycleKey;
      if (!snapshot.exists()) {
        setAdsUsedToday(0);
        return;
      }
      const data = snapshot.data();
      if (data?.adsCycleKey === activeCycle) {
        setAdsUsedToday(
          typeof data?.adsWatchedToday === 'number' ? data.adsWatchedToday : 0
        );
      } else {
        setAdsUsedToday(0);
      }
    });
    return () => unsub();
  }, [cycleInfo.cycleKey]);

  // Credit +20 points ONLY when ad is fully watched / rewarded
  const creditPoolReward = useCallback(async () => {
    setUpdatingPool(true);
    const poolRef = doc(db, POOL_COLLECTION, POOL_DOC_ID);
    const userRef = doc(db, POOL_COLLECTION, USER_DOC_ID);
    const activeCycle = getCurrent8amCycleInfo().cycleKey;

    try {
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        const poolSnap = await transaction.get(poolRef);

        const existingUsed =
          userSnap.exists() && userSnap.data()?.adsCycleKey === activeCycle
            ? Number(userSnap.data()?.adsWatchedToday ?? 0)
            : 0;

        if (existingUsed >= MAX_ADS_PER_DAY) {
          throw new Error('MAX_ADS_REACHED');
        }

        const currentPool = poolSnap.exists()
          ? poolSnap.data()?.cycleKey === activeCycle
            ? Number(poolSnap.data()?.dailyPool ?? 0)
            : DAILY_POOL_MAX
          : DAILY_POOL_MAX;

        transaction.set(
          poolRef,
          { dailyPool: currentPool + 20, cycleKey: activeCycle },
          { merge: true }
        );

        transaction.set(
          userRef,
          {
            adsWatchedToday: existingUsed + 1,
            adsCycleKey: activeCycle,
            points: increment(0),
          },
          { merge: true }
        );
      });

      setAdSuccessMessage('Ad fully watched +20');
      Alert.alert('Ad fully watched +20', '+20 points added to Today’s Points Pool.');
    } catch (error: any) {
      if (error?.message === 'MAX_ADS_REACHED') {
        Alert.alert(
          'Daily Limit Reached',
          'You have already watched 5/5 ads today. Come back after 8:00 AM!'
        );
      } else {
        Alert.alert(
          'Firestore Error',
          'Could not add +20 points. Verify firebaseConfig.ts and Firestore rules.'
        );
      }
    } finally {
      setUpdatingPool(false);
    }
  }, []);

  // Preload native Google Mobile Ads Rewarded Ad when running in a Dev/Standalone build
  useEffect(() => {
    if (!MobileAdsModule) return;

    const { RewardedAd, RewardedAdEventType, AdEventType } = MobileAdsModule;

    const rewarded = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });
    rewardedRef.current = rewarded;

    const unsubLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        setAdLoaded(true);
        setAdStatusError(null);
      }
    );

    // Reward ONLY fires on AdMob onRewarded (EARNED_REWARD) callback
    const unsubEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        earnedNativeRewardRef.current = true;
        creditPoolReward();
      }
    );

    // Never grant points on CLOSED
    const unsubClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      if (!earnedNativeRewardRef.current) {
        Alert.alert(
          'Ad Not Completed',
          'Watch the full ad to earn +20 points. 0 points given.'
        );
      }
      earnedNativeRewardRef.current = false;
      setAdLoaded(false);
      rewarded.load();
    });

    const unsubError = rewarded.addAdEventListener(AdEventType.ERROR, () => {
      setAdLoaded(false);
      setAdStatusError(AD_BLOCKED_ERROR);
    });

    rewarded.load();

    return () => {
      unsubLoaded();
      unsubEarned();
      unsubClosed();
      unsubError();
    };
  }, [creditPoolReward]);

  // 15-second non-skippable countdown when TEST MODE is ON
  useEffect(() => {
    if (!testAdVisible) return;

    if (adSecondsLeft <= 0) {
      if (!autoRewardTriggeredRef.current) {
        autoRewardTriggeredRef.current = true;
        setTestAdVisible(false);
        creditPoolReward();
      }
      return;
    }

    const timer = setTimeout(() => {
      setAdSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [testAdVisible, adSecondsLeft, creditPoolReward]);

  const limitReached = adsUsedToday >= MAX_ADS_PER_DAY;

  const handleWatchAd = async () => {
    if (updatingPool || checkingAd || limitReached) return;

    setAdStatusError(null);
    setAdSuccessMessage(null);

    // TEST MODE ON: Play non-skippable 15s fake video ad, then auto-reward +20
    if (testMode) {
      autoRewardTriggeredRef.current = false;
      setAdSecondsLeft(AD_WATCH_SECONDS);
      setTestAdVisible(true);
      return;
    }

    // TEST MODE OFF: Use real AdMob & adblocker check; if blocked, give 0 points
    setCheckingAd(true);
    try {
      const adServerOk = await checkAdServersReachable();
      if (!adServerOk) {
        setAdStatusError(AD_BLOCKED_ERROR);
        Alert.alert('Ad Blocked', AD_BLOCKED_ERROR);
        return;
      }

      if (MobileAdsModule && rewardedRef.current) {
        if (!adLoaded) {
          rewardedRef.current.load();
          setAdStatusError(AD_BLOCKED_ERROR);
          Alert.alert('Ad Blocked', AD_BLOCKED_ERROR);
          return;
        }
        earnedNativeRewardRef.current = false;
        rewardedRef.current.show();
        return;
      }

      // In Expo Go without native AdMob binary, TEST MODE OFF cannot display real AdMob video
      const expoGoNotice =
        'Real AdMob requires a Dev Build — turn TEST MODE ON above to test the 15s ad (0 points given)';
      setAdStatusError(expoGoNotice);
      Alert.alert('Real AdMob Check', expoGoNotice);
    } finally {
      setCheckingAd(false);
    }
  };

  const isButtonDisabled = limitReached || updatingPool || checkingAd;
  const elapsedSeconds = AD_WATCH_SECONDS - adSecondsLeft;
  const adProgressPct = Math.round((elapsedSeconds / AD_WATCH_SECONDS) * 100);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Small Switch at top of Earn page */}
      <View style={styles.testModeRow}>
        <View style={styles.testModeTextWrap}>
          <Text style={styles.testModeLabel}>TEST MODE: Adblocker OFF</Text>
          <Text style={styles.testModeSub}>
            {testMode
              ? 'ON: Non-skippable 15s test video ad'
              : 'OFF: Real AdMob + adblocker check'}
          </Text>
        </View>
        <Switch
          value={testMode}
          onValueChange={(val) => {
            setTestMode(val);
            setAdStatusError(null);
            setAdSuccessMessage(null);
          }}
          trackColor={{ false: '#CBD5E1', true: '#C084FC' }}
          thumbColor={testMode ? PRIMARY_PURPLE : '#F8FAFC'}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Boost the Daily Pool</Text>
        <Text style={styles.subtitle}>
          Watch a full 15-second rewarded video ad to add +20 points straight
          into Today’s Points Pool.
        </Text>

        {/* Daily Ad Usage Counter (0/5 used) */}
        <View style={styles.usageBox}>
          <Text style={styles.usageLabel}>Daily Ads Watched</Text>
          <Text style={styles.usageValue}>
            {adsUsedToday}/{MAX_ADS_PER_DAY} used
          </Text>
        </View>

        {adStatusError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{adStatusError}</Text>
          </View>
        )}

        {adSuccessMessage && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{adSuccessMessage}</Text>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={isButtonDisabled}
          onPress={handleWatchAd}
          style={[
            styles.watchButton,
            isButtonDisabled && styles.watchButtonDisabled,
          ]}
        >
          {updatingPool || checkingAd ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.watchButtonText}>
                {checkingAd ? '  CHECKING ADMOB...' : '  CREDITING +20...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.watchButtonText}>
              {limitReached
                ? 'DAILY LIMIT REACHED (5/5)'
                : 'WATCH AD +20 POINTS'}
            </Text>
          )}
        </TouchableOpacity>

        {limitReached && (
          <Text style={styles.resetNote}>
            Resets at 8:00 AM in {formatCountdown(cycleInfo.msUntilReset)}
          </Text>
        )}

        <Text style={styles.testIdNote}>
          AdMob Rewarded Unit ID: {adUnitId}
        </Text>
      </View>

      {/* Non-skippable 15-second Fake Video Ad Modal (TEST MODE ON) */}
      {/* onRequestClose is intentionally empty so Android back button cannot skip before 15s */}
      <Modal
        visible={testAdVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalKicker}>
              SPONSORED REWARDED VIDEO · TEST MODE
            </Text>

            {/* Fake Video Player Surface */}
            <View style={styles.fakeVideoBox}>
              <Ionicons name="videocam" size={38} color="#E9D5FF" />
              <Text style={styles.fakeVideoBrand}>PointsPoolSA Partner Ad</Text>
              <Text style={styles.fakeVideoMeta}>
                Playing video · Cannot skip before 15s
              </Text>
              <View style={styles.fakeVideoTimeBadge}>
                <Text style={styles.fakeVideoTimeText}>
                  00:{String(adSecondsLeft).padStart(2, '0')}
                </Text>
              </View>
            </View>

            <View style={styles.adProgressTrack}>
              <View
                style={[styles.adProgressFill, { width: \`\${adProgressPct}%\` }]}
              />
            </View>

            <View style={styles.countdownBox}>
              <Text style={styles.countdownText}>
                Reward unlocks automatically in {adSecondsLeft}s
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    justifyContent: 'center',
  },
  testModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  testModeTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  testModeLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: PRIMARY_PURPLE,
  },
  testModeSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    borderRadius: 20,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: PRIMARY_PURPLE,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
  },
  usageBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  usageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_PURPLE,
  },
  usageValue: {
    fontSize: 16,
    fontWeight: '800',
    color: PRIMARY_PURPLE,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B91C1C',
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#D8B4FE',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  successText: {
    fontSize: 14,
    fontWeight: '800',
    color: PRIMARY_PURPLE,
    textAlign: 'center',
  },
  watchButton: {
    backgroundColor: PRIMARY_PURPLE,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchButtonDisabled: {
    backgroundColor: '#C4B5FD',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resetNote: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: PRIMARY_PURPLE,
  },
  testIdNote: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 11,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  modalKicker: {
    fontSize: 11,
    fontWeight: '800',
    color: PRIMARY_PURPLE,
    marginBottom: 12,
  },
  fakeVideoBox: {
    width: '100%',
    height: 190,
    backgroundColor: '#1E1B4B',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    position: 'relative',
  },
  fakeVideoBrand: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  fakeVideoMeta: {
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  fakeVideoTimeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fakeVideoTimeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  adProgressTrack: {
    width: '100%',
    height: 10,
    backgroundColor: '#F3E8FF',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 14,
  },
  adProgressFill: {
    height: '100%',
    backgroundColor: PRIMARY_PURPLE,
    borderRadius: 999,
  },
  countdownBox: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '800',
    color: PRIMARY_PURPLE,
  },
});
`,
  },
  {
    id: 'app/store.tsx',
    filename: 'app/store.tsx',
    language: 'typescript',
    summary: 'Store screen (/store) with 100pts=R1, 500pts=R5, 1000pts=R10 Airtime cards locked until phone number is saved in Settings.',
    code: `// app/store.tsx
// Store Screen (/store):
// Lists 3 Airtime redemption cards:
// 1. "100 Points = R1 Airtime"
// 2. "500 Points = R5 Airtime"
// 3. "1000 Points = R10 Airtime"
// LOCKED until a valid phone number is saved in Settings.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  doc,
  onSnapshot,
  runTransaction,
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db, POOL_COLLECTION, USER_DOC_ID } from '../firebaseConfig';

const PRIMARY_PURPLE = '#6B21A8';

interface StoreItem {
  id: string;
  cost: number;
  title: string;
  airtimeValue: string;
}

const AIRTIME_OFFERS: StoreItem[] = [
  { id: 'r1', cost: 100, title: '100 Points = R1 Airtime', airtimeValue: 'R1' },
  { id: 'r5', cost: 500, title: '500 Points = R5 Airtime', airtimeValue: 'R5' },
  { id: 'r10', cost: 1000, title: '1000 Points = R10 Airtime', airtimeValue: 'R10' },
];

export default function StoreScreen() {
  const router = useRouter();
  const [userPoints, setUserPoints] = useState<number>(0);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  // Listen to user's Firestore points & saved phone number
  useEffect(() => {
    const userRef = doc(db, POOL_COLLECTION, USER_DOC_ID);
    const unsub = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUserPoints(typeof data?.points === 'number' ? data.points : 0);
        setPhoneNumber(
          typeof data?.phoneNumber === 'string' ? data.phoneNumber : ''
        );
      }
    });
    return () => unsub();
  }, []);

  const hasSavedPhone = phoneNumber.trim().length >= 9;

  const handleRedeem = async (item: StoreItem) => {
    if (redeemingId || !hasSavedPhone) return;

    if (userPoints < item.cost) {
      Alert.alert(
        'Not Enough Points',
        \`You need \${item.cost} points for \${item.airtimeValue} Airtime. You currently have \${userPoints} points.\`
      );
      return;
    }

    setRedeemingId(item.id);
    const userRef = doc(db, POOL_COLLECTION, USER_DOC_ID);

    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(userRef);
        const currentPts = snap.exists() ? Number(snap.data()?.points ?? 0) : 0;
        if (currentPts < item.cost) {
          throw new Error('INSUFFICIENT_POINTS');
        }
        transaction.update(userRef, { points: currentPts - item.cost });
      });

      await addDoc(collection(db, 'redemptions'), {
        phoneNumber,
        airtimeValue: item.airtimeValue,
        cost: item.cost,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        'Redemption Submitted',
        \`\${item.airtimeValue} Airtime request for \${phoneNumber} has been queued!\`
      );
    } catch (error: any) {
      if (error?.message === 'INSUFFICIENT_POINTS') {
        Alert.alert('Not Enough Points', 'Your balance is too low for this reward.');
      } else {
        Alert.alert('Firebase Error', 'Could not complete redemption. Check Firestore rules.');
      }
    } finally {
      setRedeemingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Balance Banner */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Points</Text>
          <Text style={styles.balanceAmount}>{userPoints} pts</Text>
          <Text style={styles.phonePreview}>
            {hasSavedPhone
              ? \`Sending to: \${phoneNumber}\`
              : 'Store Locked: Save your phone number in Settings'}
          </Text>
        </View>

        {/* Store Lock Prompt when no phone number is saved */}
        {!hasSavedPhone && (
          <View style={styles.lockBanner}>
            <Text style={styles.lockTitle}>Store Locked</Text>
            <Text style={styles.lockBody}>
              Save your South African phone number in Settings to unlock airtime redemptions.
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/settings')}
              style={styles.goSettingsBtn}
            >
              <Text style={styles.goSettingsBtnText}>Go to Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 3 Airtime Cards */}
        {AIRTIME_OFFERS.map((item) => {
          const affordable = userPoints >= item.cost;
          const unlockedAndAffordable = hasSavedPhone && affordable;
          const isBusy = redeemingId === item.id;

          return (
            <View
              key={item.id}
              style={[
                styles.offerCard,
                !hasSavedPhone && styles.offerCardLocked,
              ]}
            >
              <View style={styles.offerTextGroup}>
                <Text style={styles.offerTitle}>{item.title}</Text>
                <Text style={styles.offerSub}>
                  {!hasSavedPhone
                    ? 'Locked — save phone number first'
                    : affordable
                    ? 'Ready to redeem'
                    : \`Need \${item.cost - userPoints} more points\`}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={!hasSavedPhone || Boolean(redeemingId)}
                onPress={() => handleRedeem(item)}
                style={[
                  styles.redeemButton,
                  !unlockedAndAffordable && styles.redeemButtonMuted,
                  !hasSavedPhone && styles.redeemButtonLocked,
                ]}
              >
                <Text style={styles.redeemButtonText}>
                  {isBusy ? '...' : !hasSavedPhone ? 'LOCKED' : 'REDEEM'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    gap: 14,
  },
  balanceCard: {
    backgroundColor: '#F3E8FF',
    borderRadius: 16,
    padding: 20,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: PRIMARY_PURPLE,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: PRIMARY_PURPLE,
    marginTop: 4,
  },
  phonePreview: {
    fontSize: 13,
    color: '#581C87',
    marginTop: 6,
  },
  lockBanner: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: '#D8B4FE',
    borderRadius: 16,
    padding: 18,
  },
  lockTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: PRIMARY_PURPLE,
    marginBottom: 4,
  },
  lockBody: {
    fontSize: 13,
    lineHeight: 19,
    color: '#475569',
    marginBottom: 14,
  },
  goSettingsBtn: {
    backgroundColor: PRIMARY_PURPLE,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  goSettingsBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  offerCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  offerCardLocked: {
    opacity: 0.65,
  },
  offerTextGroup: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  offerSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  redeemButton: {
    backgroundColor: PRIMARY_PURPLE,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  redeemButtonMuted: {
    backgroundColor: '#A855F7',
  },
  redeemButtonLocked: {
    backgroundColor: '#94A3B8',
  },
  redeemButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
`,
  },
  {
    id: 'app/settings.tsx',
    filename: 'app/settings.tsx',
    language: 'typescript',
    summary: 'Settings screen (/settings) with Phone Number TextInput and Save button persisted in Firestore.',
    code: `// app/settings.tsx
// Settings Screen (/settings):
// - TextInput for Phone Number
// - Save Button storing the number in Firestore appData/userProfile (unlocks Store)

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  db,
  POOL_COLLECTION,
  POOL_DOC_ID,
  USER_DOC_ID,
  DAILY_POOL_MAX,
  getCurrent8amCycleInfo,
} from '../firebaseConfig';

const PRIMARY_PURPLE = '#6B21A8';

export default function SettingsScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  // Load saved phone number from Firestore on mount
  useEffect(() => {
    const userRef = doc(db, POOL_COLLECTION, USER_DOC_ID);
    getDoc(userRef)
      .then((snap) => {
        if (snap.exists() && typeof snap.data()?.phoneNumber === 'string') {
          setPhoneNumber(snap.data().phoneNumber);
        }
      })
      .catch((err) => console.warn('Could not load saved phone number:', err));
  }, []);

  const handleSave = async () => {
    const cleaned = phoneNumber.trim();
    if (cleaned.length < 9) {
      Alert.alert(
        'Invalid Phone Number',
        'Please enter a valid phone number (for example: 082 123 4567).'
      );
      return;
    }

    setSaving(true);
    try {
      const userRef = doc(db, POOL_COLLECTION, USER_DOC_ID);
      await setDoc(userRef, { phoneNumber: cleaned }, { merge: true });
      setSavedNotice(true);
      Alert.alert('Saved', \`Airtime phone number saved: \${cleaned}. Store is now unlocked!\`);
    } catch {
      Alert.alert(
        'Firebase Error',
        'Could not save phone number. Check your firebaseConfig.ts and Firestore rules.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Dev-only Day 1 reset: clears balance, pool, claim lock, and ad count while keeping phoneNumber
  const handleTestReset = () => {
    Alert.alert('Reset everything to Day 1?', 'Your saved phone number will be kept.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'YES',
        style: 'destructive',
        onPress: async () => {
          setResetting(true);
          try {
            const { cycleKey } = getCurrent8amCycleInfo();
            await setDoc(
              doc(db, POOL_COLLECTION, POOL_DOC_ID),
              { dailyPool: DAILY_POOL_MAX, cycleKey },
              { merge: true }
            );
            await setDoc(
              doc(db, POOL_COLLECTION, USER_DOC_ID),
              {
                points: 0,
                lastClaimCycleKey: '',
                adsWatchedToday: 0,
                adsCycleKey: '',
              },
              { merge: true }
            );
            router.replace('/home');
          } catch {
            Alert.alert('Reset Error', 'Could not reset Firestore state.');
          } finally {
            setResetting(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <View style={styles.card}>
          <Text style={styles.heading}>Airtime Delivery Number</Text>
          <Text style={styles.description}>
            Enter the South African mobile number where your redeemed airtime
            should be sent. Saving your number unlocks the Store tab.
          </Text>

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            value={phoneNumber}
            onChangeText={(text) => {
              setPhoneNumber(text);
              setSavedNotice(false);
            }}
            placeholder="e.g. 082 123 4567"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            style={styles.input}
          />

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={saving}
            onPress={handleSave}
            style={styles.saveButton}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>

          {savedNotice && (
            <Text style={styles.savedConfirmation}>
              Number saved! Store redemptions are now unlocked.
            </Text>
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={resetting}
          onPress={handleTestReset}
          style={styles.testResetButton}
        >
          <Text style={styles.testResetButtonText}>
            {resetting ? 'Resetting...' : 'RESET FOR TESTING (Dev Only)'}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  inner: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    borderRadius: 20,
    padding: 24,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: PRIMARY_PURPLE,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    marginBottom: 18,
  },
  saveButton: {
    backgroundColor: PRIMARY_PURPLE,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  savedConfirmation: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: PRIMARY_PURPLE,
  },
  testResetButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  testResetButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
`,
  },
  {
    id: 'firebaseConfig.ts',
    filename: 'firebaseConfig.ts',
    language: 'typescript',
    summary: 'Firebase init with placeholder keys plus daily 8:00 AM reset cycle helpers.',
    code: `// firebaseConfig.ts
// Initializes Firebase App, Cloud Firestore, and daily 8:00 AM cycle helpers.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Replace these placeholder values with your Firebase Console Web App config
const firebaseConfig = {
  apiKey: 'YOUR_FIREBASE_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.firebasestorage.app',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_FIREBASE_APP_ID',
};

// Prevent duplicate initialization during Fast Refresh
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Export Firestore instance
export const db = getFirestore(app);

// Firestore paths:
// Pool doc: appData/pool -> { dailyPool: number, cycleKey: string }
// User profile doc: appData/userProfile -> { points: number, phoneNumber: string, lastClaimCycleKey: string, adsWatchedToday: number, adsCycleKey: string }
export const POOL_COLLECTION = 'appData';
export const POOL_DOC_ID = 'pool';
export const USER_DOC_ID = 'userProfile';
export const DAILY_POOL_MAX = 1000;
export const MAX_ADS_PER_DAY = 5;

// Computes the current 8:00 AM daily cycle key and milliseconds until the next 8:00 AM reset
export function getCurrent8amCycleInfo(now: Date = new Date()) {
  const today8am = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    8,
    0,
    0,
    0
  );

  let cycleStart: Date;
  let nextReset: Date;

  if (now >= today8am) {
    cycleStart = today8am;
    nextReset = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      8,
      0,
      0,
      0
    );
  } else {
    cycleStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      8,
      0,
      0,
      0
    );
    nextReset = today8am;
  }

  const y = cycleStart.getFullYear();
  const m = String(cycleStart.getMonth() + 1).padStart(2, '0');
  const d = String(cycleStart.getDate()).padStart(2, '0');

  return {
    cycleKey: \`\${y}-\${m}-\${d}-08\`,
    msUntilReset: Math.max(0, nextReset.getTime() - now.getTime()),
  };
}

// Formats remaining milliseconds into HH:MM:SS
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return \`\${hours}:\${minutes}:\${seconds}\`;
}
`,
  },
  {
    id: 'app.json',
    filename: 'app.json',
    language: 'json',
    summary: 'Expo configuration with react-native-google-mobile-ads androidAppId and iosAppId.',
    code: `{
  "expo": {
    "name": "PointsPoolSA",
    "slug": "pointspoolsa",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "pointspoolsa",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.pointspoolsa.app"
    },
    "android": {
      "package": "com.pointspoolsa.app",
      "adaptiveIcon": {
        "backgroundColor": "#6B21A8"
      }
    },
    "plugins": [
      "expo-router",
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-8005746012564327~1060633820",
          "iosAppId": "ca-app-pub-8005746012564327~1060633820"
        }
      ]
    ]
  }
}
`,
  },
];

export const EXPO_SETUP_STEPS = [
  {
    step: '01',
    title: 'Use your existing package.json',
    command: 'npx expo install expo-router expo-av firebase react-native-google-mobile-ads',
    detail:
      'Ensure your existing package.json includes expo-router, expo-av (for claim chime), firebase, and react-native-google-mobile-ads, with "main": "expo-router/entry".',
  },
  {
    step: '02',
    title: 'Add firebaseConfig.ts and the 5 app/ files',
    command: 'Create firebaseConfig.ts and app/{_layout,home,earn,store,settings}.tsx',
    detail:
      'Replace the placeholder keys in firebaseConfig.ts with your Firebase project config and enable Cloud Firestore with collection "appData" -> doc "pool" -> field "dailyPool" (starting at 1000).',
  },
  {
    step: '03',
    title: 'Run with Expo Go',
    command: 'npx expo start -c',
    detail:
      'Scan the QR code in Expo Go. Native AdMob calls in app/earn.tsx are automatically guarded in Expo Go so TEST MODE works without crashing, while live Rewarded Ads activate in a Dev or EAS Build.',
  },
];
