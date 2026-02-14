import React from 'react';

interface PhoneUploadModalProps {
  onClose: () => void;
  qrCodeDataUrl: string | null;
  qrStatus: 'idle' | 'loading' | 'error';
  phoneUploadEnabled: boolean;
  phoneUploadLink: string | null;
  phoneUploadBase: string | null;
  phoneTokenError: string | null;
  phoneUploadStatusError: string | null;
  phoneUploadInfoError: string | null;
  onTogglePhoneUpload: (enabled: boolean) => void;
  onLoadPhoneToken: () => void;
}

/**
 * Modal component for phone upload functionality.
 * Displays QR code and upload URL for mobile uploads.
 */
const PhoneUploadModal: React.FC<PhoneUploadModalProps> = ({
  onClose,
  qrCodeDataUrl,
  qrStatus,
  phoneUploadEnabled,
  phoneUploadLink,
  phoneUploadBase,
  phoneTokenError,
  phoneUploadStatusError,
  phoneUploadInfoError,
  onTogglePhoneUpload,
  onLoadPhoneToken
}) => {
  return (
    <div className="photo-phone-modal-overlay" onMouseDown={onClose}>
      <div className="photo-phone-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="photo-phone-modal-header">
          <h3 className="photo-phone-modal-title">Upload from Phone</h3>
          <button
            className="photo-phone-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="photo-phone-modal-subtitle">
          Scan the QR code or open the link on your phone. Photos sent there will appear here automatically.
        </p>
        <div className="photo-phone-toggle-row">
          <div className="photo-phone-toggle-text">
            <div className="photo-phone-toggle-title">Local upload server</div>
            <div className="photo-phone-toggle-subtitle">
              Off keeps Wi‑Fi uploads disabled. Auto turns off after 10 minutes.
            </div>
          </div>
          <label className="photo-phone-toggle">
            <input
              type="checkbox"
              checked={phoneUploadEnabled}
              onChange={(e) => onTogglePhoneUpload(e.target.checked)}
            />
            <span className="photo-phone-toggle-slider" />
            <span className="photo-phone-toggle-state">
              {phoneUploadEnabled ? 'On' : 'Off'}
            </span>
          </label>
        </div>
        <div className="photo-phone-modal-body">
          <div className="photo-phone-qr">
            {!phoneUploadEnabled ? (
              <div className="photo-phone-qr-placeholder">
                Server is off. Turn it on to generate a QR code.
              </div>
            ) : qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="Upload from phone QR code" />
            ) : (
              <div className="photo-phone-qr-placeholder">
                {qrStatus === 'loading' ? 'Generating QR…' : 'QR unavailable'}
              </div>
            )}
          </div>
          <div className="photo-phone-info">
            <div className="photo-phone-url-label">Local upload URL</div>
            <div className="photo-phone-url">
              {!phoneUploadEnabled
                ? 'Server is off'
                : phoneUploadLink || phoneUploadBase || 'Detecting local network URL...'}
            </div>
            <div className="photo-phone-actions">
              <button
                className="photo-phone-action-button"
                onClick={async () => {
                  if (!phoneUploadLink) return;
                  try {
                    await navigator.clipboard?.writeText(phoneUploadLink);
                  } catch {
                    window.prompt('Copy this URL', phoneUploadLink);
                  }
                }}
                disabled={!phoneUploadEnabled || !phoneUploadLink}
              >
                Copy link
              </button>
              <button
                className="photo-phone-action-button secondary"
                onClick={onLoadPhoneToken}
                disabled={!phoneUploadEnabled}
              >
                New link
              </button>
            </div>
            {phoneTokenError && (
              <div className="photo-phone-error">
                {phoneTokenError}
              </div>
            )}
            {phoneUploadStatusError && (
              <div className="photo-phone-error">
                {phoneUploadStatusError}
              </div>
            )}
            {phoneUploadInfoError && (
              <div className="photo-phone-error">
                {phoneUploadInfoError}
              </div>
            )}
            <div className="photo-phone-hint">
              Link is valid for ~10 minutes. Make sure your phone and desktop are on the same Wi‑Fi.
            </div>
          </div>
        </div>
        <div className="photo-phone-footer">
          Photos you send will appear instantly in the Artwork Journal grid.
        </div>
      </div>
    </div>
  );
};

export default PhoneUploadModal;
