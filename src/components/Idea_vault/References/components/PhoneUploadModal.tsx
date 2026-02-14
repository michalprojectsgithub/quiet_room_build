import React from 'react';

interface PhoneUploadModalProps {
  onClose: () => void;
  qrCodeDataUrl: string | null;
  qrStatus: 'idle' | 'loading' | 'error';
  phoneUploadEnabled: boolean;
  primaryPhoneUrl: string | null;
  phoneUploadBase: string | null;
  phoneTokenError: string | null;
  phoneUploadStatusError: string | null;
  phoneUploadInfoError: string | null;
  onTogglePhoneUpload: (enabled: boolean) => void;
  onLoadPhoneToken: () => void;
}

const PhoneUploadModal: React.FC<PhoneUploadModalProps> = ({
  onClose,
  qrCodeDataUrl,
  qrStatus,
  phoneUploadEnabled,
  primaryPhoneUrl,
  phoneUploadBase,
  phoneTokenError,
  phoneUploadStatusError,
  phoneUploadInfoError,
  onTogglePhoneUpload,
  onLoadPhoneToken
}) => {
  return (
    <div className="references-modal-overlay" onMouseDown={onClose}>
      <div
        className="references-modal-content references-phone-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="references-phone-modal-header">
          <h3 className="references-phone-modal-title">Upload from Phone</h3>
          <button
            className="references-phone-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="references-phone-modal-subtitle">
          Scan the QR code or open the link on your phone. Photos sent there will appear here automatically.
        </p>
        <div className="references-phone-toggle-row">
          <div className="references-phone-toggle-text">
            <div className="references-phone-toggle-title">Local upload server</div>
            <div className="references-phone-toggle-subtitle">
              Off keeps Wi‑Fi uploads disabled. Auto turns off after 10 minutes.
            </div>
          </div>
          <label className="references-phone-toggle">
            <input
              type="checkbox"
              checked={phoneUploadEnabled}
              onChange={(e) => onTogglePhoneUpload(e.target.checked)}
            />
            <span className="references-phone-toggle-slider" />
            <span className="references-phone-toggle-state">
              {phoneUploadEnabled ? 'On' : 'Off'}
            </span>
          </label>
        </div>
        <div className="references-phone-modal-body">
          <div className="references-phone-qr">
            {!phoneUploadEnabled ? (
              <div className="references-phone-qr-placeholder">
                Server is off. Turn it on to generate a QR code.
              </div>
            ) : qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="Upload from phone QR code" />
            ) : (
              <div className="references-phone-qr-placeholder">
                {qrStatus === 'loading' ? 'Generating QR…' : 'QR unavailable'}
              </div>
            )}
          </div>
          <div className="references-phone-info">
            <div className="references-phone-url-label">Local upload URL</div>
            <div className="references-phone-url">
              {!phoneUploadEnabled
                ? 'Server is off'
                : primaryPhoneUrl || phoneUploadBase || 'Detecting local network URL...'}
            </div>
            <div className="references-phone-actions">
              <button
                className="references-phone-action-button"
                onClick={async () => {
                  if (!primaryPhoneUrl) return;
                  try {
                    await navigator.clipboard?.writeText(primaryPhoneUrl);
                  } catch {
                    window.prompt('Copy this URL', primaryPhoneUrl);
                  }
                }}
                disabled={!phoneUploadEnabled || !primaryPhoneUrl}
              >
                Copy link
              </button>
              <button
                className="references-phone-action-button secondary"
                onClick={onLoadPhoneToken}
                disabled={!phoneUploadEnabled}
              >
                New link
              </button>
            </div>
            {phoneTokenError && (
              <div className="references-phone-error">
                {phoneTokenError}
              </div>
            )}
            {phoneUploadStatusError && (
              <div className="references-phone-error">
                {phoneUploadStatusError}
              </div>
            )}
            {phoneUploadInfoError && (
              <div className="references-phone-error">
                {phoneUploadInfoError}
              </div>
            )}
            <div className="references-phone-hint">
              Link is valid for ~10 minutes. Make sure your phone and desktop are on the same Wi‑Fi.
            </div>
          </div>
        </div>
        <div className="references-phone-footer">
          Photos you send will appear instantly in the References grid.
        </div>
      </div>
    </div>
  );
};

export default PhoneUploadModal;
