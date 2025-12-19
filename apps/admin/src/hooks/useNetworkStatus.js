import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../../../shared/firebase';

const PING_DOC_PATH = 'academicPeriod/jan-25';
const SLOW_THRESHOLD_MS = 1500;   // >1.5s considered slow
const SLOW_CHECK_INTERVAL_MS = 1000; // slow network checks every 1s
const SYNC_INTERVAL_MS = 30000;  // cloud sync confirmation every 30s
const CONNECTION_LOST_THRESHOLD_MS = 5000; 
const RECONNECT_TIMEOUT_MS = 3000; 
const MAX_CONSECUTIVE_FAILURES = 3; // offline after 3 failed pings
const CLOUD_SYNC_THROTTLE_MS = 10000; // min 10s between cloud sync toasts

export const useNetworkStatus = () => {
  const lastStatus = useRef('online'); // 'online' | 'offline' | 'slow' | 'no-internet' | 'reconnecting'
  const slowInterval = useRef(null);
  const syncInterval = useRef(null);
  const failureCount = useRef(0);
  const lastSuccessfulPing = useRef(Date.now());
  const reconnectTimer = useRef(null);
  const lastCloudSyncToast = useRef(0);

  /** Show toast using Toaster */
  const showToast = (message, type = 'info', icon = null) => {
    switch(type) {
      case 'success':
        toast.success(message);
        break;
      case 'error':
        toast.error(message);
        break;
      default:
        toast(message, icon ? { icon } : {});
    }
    console.log(`[Network] Toast: ${message}`);
  };

  /** Ping Firestore with latency measurement */
  const pingFirestore = async (timeout = 8000) => {
    const start = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const pingDoc = await getDoc(doc(firestore, ...PING_DOC_PATH.split('/')), { signal: controller.signal });
      clearTimeout(timeoutId);
      const latency = performance.now() - start;
      return { reachable: pingDoc.exists(), latency, success: true };
    } catch (error) {
      clearTimeout(timeoutId);
      const latency = performance.now() - start;
      const errorType = error.name === 'AbortError' ? 'timeout' : 'firestore-error';
      return { reachable: false, latency, success: false, error: errorType };
    }
  };

  /** Start reconnecting toast timer */
  const startReconnectingTimer = () => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);

    reconnectTimer.current = setTimeout(() => {
      if (lastStatus.current !== 'online' && lastStatus.current !== 'reconnecting') {
        lastStatus.current = 'reconnecting';
        showToast('Reconnecting...', 'info', '⏳');
      }
    }, RECONNECT_TIMEOUT_MS);
  };

  const clearReconnectingTimer = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  };

  /** Check network connectivity in real-time */
  const checkNetworkConnectivity = async () => {
    if (!navigator.onLine) {
      clearReconnectingTimer();
      if (lastStatus.current !== 'offline') {
        lastStatus.current = 'offline';
        failureCount.current = 0;
        showToast('Internet lost', 'error', '❌');
      }
      return;
    }

    if (lastStatus.current === 'offline' || lastStatus.current === 'no-internet') {
      startReconnectingTimer();
    }

    const { reachable, latency, success, error } = await pingFirestore();

    if (success && reachable) {
      clearReconnectingTimer();
      failureCount.current = 0;
      lastSuccessfulPing.current = Date.now();

      if (latency > SLOW_THRESHOLD_MS) {
        if (lastStatus.current !== 'slow') {
          lastStatus.current = 'slow';
          showToast('Internet seems slow...', 'info', '⚠️');
        }
      } else {
        if (lastStatus.current !== 'online') {
          const previousStatus = lastStatus.current;
          lastStatus.current = 'online';
          if (previousStatus === 'reconnecting') showToast('Connected', 'success', '✅');
          else if (previousStatus === 'no-internet' || previousStatus === 'offline') showToast('Internet restored', 'success', '✅');
        }
      }
    } else {
      // Handle failures
      failureCount.current++;
      const timeSinceLastSuccess = Date.now() - lastSuccessfulPing.current;

      if (failureCount.current >= MAX_CONSECUTIVE_FAILURES || timeSinceLastSuccess > 10000) {
        if (lastStatus.current !== 'no-internet') {
          lastStatus.current = 'no-internet';
          clearReconnectingTimer();
          showToast('Connected to network but no internet access', 'info', '⚠️');
        }
      } else if (lastStatus.current === 'online' || lastStatus.current === 'slow') {
        startReconnectingTimer();
      }

      if (error === 'timeout' && latency > CONNECTION_LOST_THRESHOLD_MS) {
        lastStatus.current = 'offline';
        clearReconnectingTimer();
        showToast('Network connection lost', 'error', '❌');
      }
    }
  };

  /** Cloud sync check with throttle to prevent flooding */
  const checkCloudSync = async () => {
    if (!navigator.onLine) return;
    const { reachable, latency, success } = await pingFirestore();
    if (success && reachable && latency <= SLOW_THRESHOLD_MS) {
      const now = Date.now();
      if (now - lastCloudSyncToast.current > CLOUD_SYNC_THROTTLE_MS) {
        showToast('Cloud synced', 'success', '✅');
        lastCloudSyncToast.current = now;
      }
      lastStatus.current = 'online';
      failureCount.current = 0;
      lastSuccessfulPing.current = now;
      clearReconnectingTimer();
    }
  };

  /** Force immediate network check */
  const forceNetworkCheck = async () => {
    await checkNetworkConnectivity();
  };

  useEffect(() => {
    // Initial check
    checkNetworkConnectivity();

    // Intervals
    slowInterval.current = setInterval(checkNetworkConnectivity, SLOW_CHECK_INTERVAL_MS);
    syncInterval.current = setInterval(checkCloudSync, SYNC_INTERVAL_MS);

    // Listen to browser events
    const handleOnline = () => checkNetworkConnectivity();
    const handleOffline = () => {
      failureCount.current = MAX_CONSECUTIVE_FAILURES;
      clearReconnectingTimer();
      checkNetworkConnectivity();
    };
    const handleVisibilityChange = () => { if (!document.hidden) checkNetworkConnectivity(); };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(slowInterval.current);
      clearInterval(syncInterval.current);
      clearReconnectingTimer();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { 
    networkStatus: lastStatus.current,
    forceNetworkCheck 
  };
};
