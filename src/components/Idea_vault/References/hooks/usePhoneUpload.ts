import { useState, useCallback, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import TauriService from '../../../../services/tauriService';

// Port is dynamic - we'll get it from the phone upload info API
const getPhoneServerBase = (port: number) => `http://127.0.0.1:${port}`;

interface UsePhoneUploadReturn {
  phoneUploadOpen: boolean;
  setPhoneUploadOpen: (open: boolean) => void;
  qrCodeDataUrl: string | null;
  qrStatus: 'idle' | 'loading' | 'error';
  phoneUploadEnabled: boolean;
  primaryPhoneUrl: string | null;
  phoneUploadBase: string | null;
  phoneTokenError: string | null;
  phoneUploadStatusError: string | null;
  phoneUploadInfoError: string | null;
  togglePhoneUpload: (enabled: boolean) => Promise<void>;
  loadPhoneToken: () => Promise<void>;
}

export const usePhoneUpload = (): UsePhoneUploadReturn => {
  const [phoneUploadOpen, setPhoneUploadOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [phoneToken, setPhoneToken] = useState<string | null>(null);
  const [phoneTokenError, setPhoneTokenError] = useState<string | null>(null);
  const [phoneUploadBaseUrl, setPhoneUploadBaseUrl] = useState<string | null>(null);
  const [serverPort, setServerPort] = useState<number>(8787); // Dynamic port from server
  const [phoneUploadEnabled, setPhoneUploadEnabled] = useState(false);
  const [phoneUploadExpiresAt, setPhoneUploadExpiresAt] = useState<number | null>(null);
  const [phoneUploadStatusError, setPhoneUploadStatusError] = useState<string | null>(null);
  const [phoneUploadInfoError, setPhoneUploadInfoError] = useState<string | null>(null);

  const phoneUploadBase = useMemo(() => {
    if (!phoneUploadBaseUrl) return null;
    return `${phoneUploadBaseUrl}${phoneUploadBaseUrl.includes('?') ? '&' : '?'}target=references`;
  }, [phoneUploadBaseUrl]);

  const primaryPhoneUrl = useMemo(() => {
    if (!phoneToken || !phoneUploadBase) return null;
    return `${phoneUploadBase}&token=${encodeURIComponent(phoneToken)}`;
  }, [phoneToken, phoneUploadBase]);

  const loadPhoneToken = useCallback(async () => {
    setPhoneTokenError(null);
    try {
      const res = await fetch(`${getPhoneServerBase(serverPort)}/api/phone-token`);
      if (!res.ok) {
        throw new Error('Failed to create upload token');
      }
      const data = await res.json();
      setPhoneToken(String(data.token || ''));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create upload token';
      setPhoneTokenError(message);
      setPhoneToken(null);
    }
  }, [serverPort]);

  const loadPhoneUploadStatus = useCallback(async () => {
    setPhoneUploadStatusError(null);
    try {
      const data = await TauriService.getPhoneUploadStatus();
      setPhoneUploadEnabled(Boolean(data.enabled));
      setPhoneUploadExpiresAt(Number(data.expires_at) || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to check upload status';
      setPhoneUploadStatusError(message);
      setPhoneUploadEnabled(false);
      setPhoneUploadExpiresAt(null);
    }
  }, []);

  const loadPhoneUploadInfo = useCallback(async () => {
    setPhoneUploadInfoError(null);
    try {
      const info = await TauriService.getPhoneUploadInfo();
      setPhoneUploadBaseUrl(info.preferred_url || null);
      // Update the server port from the info response
      if (info.port) {
        setServerPort(info.port);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to detect local network URL';
      setPhoneUploadInfoError(message);
      setPhoneUploadBaseUrl(null);
    }
  }, []);

  const togglePhoneUpload = useCallback(async (enabled: boolean) => {
    setPhoneUploadStatusError(null);
    try {
      const data = await TauriService.setPhoneUploadEnabled(
        enabled,
        enabled ? 10 * 60 * 1000 : 0
      );
      setPhoneUploadEnabled(Boolean(data.enabled));
      setPhoneUploadExpiresAt(Number(data.expires_at) || null);
      if (!data.enabled) {
        setPhoneToken(null);
        setQrCodeDataUrl(null);
        setQrStatus('idle');
      }
    } catch (err) {
      // Tauri errors are often strings, not Error objects
      const message = typeof err === 'string' ? err : (err instanceof Error ? err.message : 'Unable to update upload status');
      console.error('Phone upload toggle error:', err);
      setPhoneUploadStatusError(message);
      setPhoneUploadEnabled(false);
      setPhoneUploadExpiresAt(null);
    }
  }, []);

  // Load status and info when modal opens
  useEffect(() => {
    if (!phoneUploadOpen) return;
    loadPhoneUploadStatus();
    loadPhoneUploadInfo();
  }, [phoneUploadOpen, loadPhoneUploadStatus, loadPhoneUploadInfo]);

  // Load token when enabled
  useEffect(() => {
    if (!phoneUploadOpen) return;
    if (!phoneUploadEnabled) {
      setPhoneToken(null);
      setQrCodeDataUrl(null);
      setQrStatus('idle');
      return;
    }
    loadPhoneToken();
  }, [phoneUploadOpen, phoneUploadEnabled, loadPhoneToken]);

  // Auto-disable when expires
  useEffect(() => {
    if (!phoneUploadEnabled || !phoneUploadExpiresAt) return;
    const remaining = phoneUploadExpiresAt - Date.now();
    if (remaining <= 0) {
      setPhoneUploadEnabled(false);
      setPhoneUploadExpiresAt(null);
      setPhoneToken(null);
      setQrCodeDataUrl(null);
      setQrStatus('idle');
      return;
    }
    const timer = window.setTimeout(() => {
      setPhoneUploadEnabled(false);
      setPhoneUploadExpiresAt(null);
      setPhoneToken(null);
      setQrCodeDataUrl(null);
      setQrStatus('idle');
      togglePhoneUpload(false);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [phoneUploadEnabled, phoneUploadExpiresAt, togglePhoneUpload]);

  // Generate QR code
  useEffect(() => {
    if (!primaryPhoneUrl || !phoneUploadEnabled) {
      setQrCodeDataUrl(null);
      setQrStatus('idle');
      return;
    }
    let cancelled = false;
    setQrStatus('loading');
    QRCode.toDataURL(primaryPhoneUrl, {
      width: 220,
      margin: 1,
      color: { dark: '#E7EAF0', light: '#0B0D10' }
    })
      .then((url) => {
        if (!cancelled) {
          setQrCodeDataUrl(url);
          setQrStatus('idle');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrCodeDataUrl(null);
          setQrStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [primaryPhoneUrl, phoneUploadEnabled]);

  return {
    phoneUploadOpen,
    setPhoneUploadOpen,
    qrCodeDataUrl,
    qrStatus,
    phoneUploadEnabled,
    primaryPhoneUrl,
    phoneUploadBase,
    phoneTokenError,
    phoneUploadStatusError,
    phoneUploadInfoError,
    togglePhoneUpload,
    loadPhoneToken
  };
};
