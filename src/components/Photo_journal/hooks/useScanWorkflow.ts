import React from 'react';
import type { ScannerInfo, ScannedImage } from '../../../services/tauriService';
import TauriService from '../../../services/tauriService';

type UseScanWorkflowParams = {
  handleUpload: (files: File[]) => Promise<void>;
  refetch: () => Promise<void>;
};

export const useScanWorkflow = ({ handleUpload, refetch }: UseScanWorkflowParams) => {
  const [pendingScan, setPendingScan] = React.useState<ScannedImage | null>(null);
  const [cropModalOpen, setCropModalOpen] = React.useState(false);
  const [cropImageUrl, setCropImageUrl] = React.useState<string>('');
  const [cropNaturalSize, setCropNaturalSize] = React.useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [cropRect, setCropRect] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isSelecting, setIsSelecting] = React.useState(false);
  const [selectStart, setSelectStart] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [scanning, setScanning] = React.useState(false); // legacy wizard scan
  const [showScanModal, setShowScanModal] = React.useState(false);
  const [scanners, setScanners] = React.useState<ScannerInfo[]>([]);
  const [selectedScanner, setSelectedScanner] = React.useState<string>('');
  const [scannersLoading, setScannersLoading] = React.useState(false);
  const [scannerError, setScannerError] = React.useState<string | null>(null);
  const [scanningDevice, setScanningDevice] = React.useState(false);
  const [scanPageSize, setScanPageSize] = React.useState<'A4' | 'A5'>('A4');
  const scanColorMode: 'COLOR' | 'GRAYSCALE' = 'COLOR';

  // Reset crop selection when modal opens
  React.useEffect(() => {
    if (cropModalOpen) {
      setCropRect({ x: 0, y: 0, w: 1, h: 1 });
      setIsSelecting(false);
      setSelectStart({ x: 0, y: 0 });
    }
  }, [cropModalOpen]);

  const handleScan = React.useCallback(async () => {
    setScanning(true);
    try {
      const scans = await TauriService.scanArtwork();
      if (!scans || scans.length === 0) {
        alert('No scans were returned. Please ensure a scanner is selected and try again.');
        return;
      }

      for (const scan of scans) {
        try {
          const bytes = Uint8Array.from(atob(scan.data_base64), c => c.charCodeAt(0));
          const mime = scan.mime || 'image/png';
          const ext = mime === 'image/png' ? 'png' : 'jpg';
          const name = scan.filename || `scan-${Date.now()}.${ext}`;
          const file = new File([bytes], name, { type: mime });
          await handleUpload([file]);
        } catch (err) {
          console.error('Failed to process scanned image', err);
          alert('Failed to process a scanned image. Check console for details.');
        }
      }

      await refetch();
    } catch (err) {
      console.error('Scan failed', err);
      alert('Scanning failed. Make sure a scanner is connected and Windows shows the scan dialog. If the issue persists, try running the app as administrator.');
    } finally {
      setScanning(false);
    }
  }, [handleUpload, refetch]);

  const processScannedImage = React.useCallback(async (scan: ScannedImage) => {
    const bytes = Uint8Array.from(atob(scan.data_base64), c => c.charCodeAt(0));
    const mime = scan.mime || 'image/png';
    const ext = mime === 'image/png' ? 'png' : 'jpg';
    const name = scan.filename || `scan-${Date.now()}.${ext}`;
    const file = new File([bytes], name, { type: mime });
    await handleUpload([file]);
  }, [handleUpload]);

  const loadScanners = React.useCallback(async () => {
    setScannersLoading(true);
    setScannerError(null);
    try {
      const list = await TauriService.listScanners();
      setScanners(list);
      if (list.length > 0) {
        setSelectedScanner((prev) => prev || list[0].id);
      }
    } catch (err) {
      console.error('Failed to list scanners', err);
      setScannerError('Failed to list scanners. Ensure a scanner is connected.');
    } finally {
      setScannersLoading(false);
    }
  }, []);

  const openScanModal = React.useCallback(() => {
    setScannerError(null);
    setShowScanModal(true);
    loadScanners();
  }, [loadScanners]);

  const closeScanModal = React.useCallback(() => {
    setShowScanModal(false);
    setScanningDevice(false);
  }, []);

  const handleScanWithDevice = React.useCallback(async () => {
    if (!selectedScanner) {
      setScannerError('Please select a scanner.');
      return;
    }
    setScanningDevice(true);
    setScannerError(null);
    try {
      const scan = await TauriService.scanWithDevice(selectedScanner, scanPageSize);
      setPendingScan(scan);
      setCropImageUrl(`data:${scan.mime};base64,${scan.data_base64}`);
      setCropRect({ x: 0, y: 0, w: 1, h: 1 }); // start with full image selected
      setIsSelecting(false);
      setSelectStart({ x: 0, y: 0 });
      setCropModalOpen(true);
      setShowScanModal(false);
    } catch (err: any) {
      console.error('Scan failed, attempting fallback wizard', err);
      try {
        const fallback = await TauriService.scanArtwork();
        if (fallback && fallback.length > 0) {
          const first = fallback[0];
          setPendingScan(first);
          setCropImageUrl(`data:${first.mime};base64,${first.data_base64}`);
          setCropRect({ x: 0, y: 0, w: 1, h: 1 });
          setIsSelecting(false);
          setSelectStart({ x: 0, y: 0 });
          setCropModalOpen(true);
          setShowScanModal(false);
          return;
        }
      } catch (fallbackErr) {
        console.error('Fallback scan failed', fallbackErr);
      }
      const msg = err instanceof Error ? err.message : 'Scanning failed. Try a different scanner or reconnect it.';
      setScannerError(msg);
    } finally {
      setScanningDevice(false);
    }
  }, [selectedScanner, scanPageSize]);

  const onCropConfirm = React.useCallback(async () => {
    try {
      if (!cropImageUrl || !pendingScan) return;
      const img = new Image();
      img.src = cropImageUrl;
      await new Promise((res, rej) => {
        img.onload = () => res(null);
        img.onerror = rej;
      });

      const naturalW = img.naturalWidth;
      const naturalH = img.naturalHeight;
      const rect = cropRect && cropRect.w > 0 && cropRect.h > 0 ? cropRect : { x: 0, y: 0, w: 1, h: 1 };
      const sx = Math.max(0, Math.min(rect.x, 1)) * naturalW;
      const sy = Math.max(0, Math.min(rect.y, 1)) * naturalH;
      const sw = Math.max(1, Math.min(rect.w, 1 - rect.x)) * naturalW;
      const sh = Math.max(1, Math.min(rect.h, 1 - rect.y)) * naturalH;

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Cannot get canvas context');
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create blob'));
        }, 'image/jpeg', 0.9);
      });
      const file = new File([blob], pendingScan.filename || `scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
      await handleUpload([file]);
      await refetch();
    } catch (err) {
      console.error('Crop/Upload failed', err);
    } finally {
      setCropModalOpen(false);
      setPendingScan(null);
      setCropRect(null);
    }
  }, [cropImageUrl, cropRect, handleUpload, pendingScan, refetch]);

  const onCropCancel = React.useCallback(() => {
    setCropModalOpen(false);
    setPendingScan(null);
    setCropRect(null);
  }, []);

  return {
    // scan modal state & handlers
    scanning,
    scanColorMode,
    showScanModal,
    scanners,
    selectedScanner,
    setSelectedScanner,
    scannersLoading,
    scannerError,
    scanningDevice,
    scanPageSize,
    setScanPageSize,
    openScanModal,
    closeScanModal,
    handleScanWithDevice,
    handleScan,
    loadScanners,
    // crop modal state & handlers
    pendingScan,
    cropModalOpen,
    cropImageUrl,
    cropNaturalSize,
    setCropNaturalSize,
    cropRect,
    setCropRect,
    isSelecting,
    setIsSelecting,
    selectStart,
    setSelectStart,
    onCropConfirm,
    onCropCancel,
  };
};

