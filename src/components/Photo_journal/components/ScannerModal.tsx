import React from 'react';

interface Scanner {
  id: string;
  name: string;
}

interface ScannerModalProps {
  onClose: () => void;
  scanners: Scanner[];
  selectedScanner: string;
  onSelectScanner: (scannerId: string) => void;
  scannersLoading: boolean;
  scannerError: string | null;
  scanningDevice: boolean;
  scanPageSize: 'A4' | 'A5';
  onSetScanPageSize: (size: 'A4' | 'A5') => void;
  onRefresh: () => void;
  onScan: () => void;
}

/**
 * Modal component for scanner selection and scanning options.
 * Allows selecting a scanner device and page size.
 */
const ScannerModal: React.FC<ScannerModalProps> = ({
  onClose,
  scanners,
  selectedScanner,
  onSelectScanner,
  scannersLoading,
  scannerError,
  scanningDevice,
  scanPageSize,
  onSetScanPageSize,
  onRefresh,
  onScan
}) => {
  return (
    <div className="scan-modal-overlay" onClick={onClose}>
      <div className="scan-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scan-modal-header">
          <h3>Select Scanner</h3>
          <button className="scan-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="scan-modal-body">
          {scannersLoading ? (
            <div className="scan-modal-loading">Loading scanners...</div>
          ) : scanners.length === 0 ? (
            <div className="scan-modal-empty">No scanners detected. Please connect a scanner.</div>
          ) : (
            <select
              className="scan-modal-select"
              value={selectedScanner}
              onChange={(e) => onSelectScanner(e.target.value)}
              disabled={scanningDevice}
            >
              {scanners.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          {scannerError && <div className="scan-modal-error">{scannerError}</div>}
          {scanners.length > 0 && (
            <>
              <div className="scan-modal-row">
                <label htmlFor="scan-size">Page size:</label>
                <select
                  id="scan-size"
                  className="scan-modal-select"
                  value={scanPageSize}
                  onChange={(e) => onSetScanPageSize(e.target.value as 'A4' | 'A5')}
                  disabled={scanningDevice}
                >
                  <option value="A4">A4 (210 × 297 mm)</option>
                  <option value="A5">A5 (148 × 210 mm)</option>
                </select>
              </div>
            </>
          )}
        </div>
        <div className="scan-modal-actions">
          <button className="scan-modal-button" onClick={onRefresh} disabled={scannersLoading || scanningDevice}>
            Refresh
          </button>
          <button
            className="scan-modal-button primary"
            onClick={onScan}
            disabled={scanningDevice || !selectedScanner}
          >
            {scanningDevice ? 'Scanning…' : 'Scan'}
          </button>
          <button className="scan-modal-button" onClick={onClose} disabled={scanningDevice}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScannerModal;
