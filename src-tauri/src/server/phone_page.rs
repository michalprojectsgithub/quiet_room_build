//! Embedded HTML page for phone uploads.

/// The HTML page served at /phone for mobile uploads.
pub const PHONE_UPLOAD_HTML: &str = r#"<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Quiet room · Upload to References</title>
    <style>
      :root {
        color-scheme: dark;
        --bg-app: #0B0D10;
        --bg-canvas: #0E1116;
        --surface: #141820;
        --surface-raised: #1A1F2A;
        --text-primary: #E7EAF0;
        --text-secondary: #B3BAC7;
        --text-muted: #7D8594;
        --border-default: #2E3542;
        --border-strong: #3A4456;
        --accent: #7C6FF2;
        --accent-hover: #8A7AF7;
        --radius-md: 12px;
        --radius-lg: 16px;
        --shadow-strong: 0 18px 40px rgba(0,0,0,0.6);
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: system-ui, -apple-system, Segoe UI, Inter, Roboto, Arial, sans-serif;
        background: var(--bg-app);
        color: var(--text-primary);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }

      .card {
        width: min(520px, 92vw);
        background: var(--surface-raised);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-strong);
        padding: 24px;
      }

      h1 {
        margin: 0 0 8px 0;
        font-size: 22px;
      }

      p {
        margin: 0 0 18px 0;
        color: var(--text-secondary);
        line-height: 1.5;
      }

      .steps {
        margin: 0 0 18px 0;
        padding-left: 18px;
        color: var(--text-muted);
      }

      .upload-area {
        background: var(--surface);
        border: 1px dashed var(--border-strong);
        border-radius: var(--radius-md);
        padding: 16px;
        text-align: center;
      }

      .token-banner {
        display: none;
        margin-top: 12px;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid rgba(242, 109, 109, 0.35);
        background: rgba(242, 109, 109, 0.12);
        color: #F26D6D;
        font-size: 13px;
        line-height: 1.4;
        text-align: left;
      }

      .token-banner.active { display: block; }

      .upload-options {
        margin-top: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        color: var(--text-secondary);
        font-size: 13px;
      }

      .upload-options input {
        accent-color: var(--accent);
      }

      .progress {
        margin-top: 12px;
        width: 100%;
        height: 10px;
        border-radius: 999px;
        background: #101522;
        border: 1px solid var(--border-default);
        overflow: hidden;
      }

      .progress-bar {
        height: 100%;
        width: 0%;
        background: linear-gradient(135deg, #7c6ff2 0%, #5f7cf9 100%);
        transition: width 0.2s ease;
      }

      .upload-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 18px;
        border-radius: 10px;
        border: 1px solid var(--border-strong);
        background: var(--accent);
        color: #fff;
        font-weight: 600;
        cursor: pointer;
      }

      .upload-button:hover { background: var(--accent-hover); }

      input[type="file"] { display: none; }

      .status {
        margin-top: 14px;
        font-size: 13px;
        color: var(--text-muted);
      }

      .list {
        margin-top: 10px;
        display: grid;
        gap: 8px;
      }

      .list-item {
        padding: 10px 12px;
        border-radius: 10px;
        background: #111622;
        border: 1px solid var(--border-default);
        color: var(--text-secondary);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }

      .pill {
        padding: 4px 8px;
        border-radius: 999px;
        border: 1px solid var(--border-strong);
        font-size: 12px;
      }

      .pill.ok { color: #3CCB7F; border-color: rgba(60, 203, 127, 0.4); }
      .pill.err { color: #F26D6D; border-color: rgba(242, 109, 109, 0.4); }
    </style>
  </head>
  <body>
    <div class="card">
      <h1 id="page-title">Upload to References</h1>
      <p id="page-subtitle">Send images from your phone directly to the References tab on your desktop.</p>
      <ol class="steps">
        <li>Select one or more images</li>
        <li>Wait for the confirmation</li>
        <li>Check the References grid</li>
      </ol>
      <div class="upload-area">
        <label class="upload-button" for="file-input">Choose photos</label>
        <input id="file-input" type="file" accept="image/*" multiple />
        <div class="status" id="status">No files selected.</div>
        <label class="upload-options">
          <input id="optimize-toggle" type="checkbox" checked />
          Fast upload (optimize images)
        </label>
        <div class="token-banner" id="token-banner">
          This upload link has expired. Please rescan the QR code on your desktop to get a new link.
        </div>
        <div class="progress" aria-hidden="true">
          <div class="progress-bar" id="progress-bar"></div>
        </div>
        <div class="list" id="results"></div>
      </div>
    </div>

    <script>
      const input = document.getElementById('file-input');
      const status = document.getElementById('status');
      const results = document.getElementById('results');
      const progressBar = document.getElementById('progress-bar');
      const optimizeToggle = document.getElementById('optimize-toggle');
      const tokenBanner = document.getElementById('token-banner');
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const target = params.get('target') || 'references';
      const targetLabel = target === 'photo_journal' ? 'Artwork Journal' : 'References';
      const endpointBase = target === 'photo_journal' ? '/api/photo-journal' : '/api/references';
      const title = document.getElementById('page-title');
      const subtitle = document.getElementById('page-subtitle');
      if (title) title.textContent = `Upload to ${targetLabel}`;
      if (subtitle) subtitle.textContent = `Send images from your phone directly to the ${targetLabel} tab on your desktop.`;

      function setProgress(value) {
        const pct = Math.max(0, Math.min(100, value));
        progressBar.style.width = pct + '%';
      }

      function showTokenExpired() {
        tokenBanner.classList.add('active');
        status.textContent = 'Upload link expired. Rescan QR code.';
        input.disabled = true;
      }

      async function loadBitmap(file) {
        if ('createImageBitmap' in window) {
          try {
            return await createImageBitmap(file);
          } catch {}
        }
        return await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = URL.createObjectURL(file);
        });
      }

      async function optimizeFile(file) {
        if (!optimizeToggle.checked) return file;
        if (!file.type || !file.type.startsWith('image/')) return file;

        const maxDim = 2048;
        const shouldOptimize = file.size > 2 * 1024 * 1024;
        if (!shouldOptimize) return file;

        const bitmap = await loadBitmap(file);
        const w = bitmap.width || bitmap.naturalWidth;
        const h = bitmap.height || bitmap.naturalHeight;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        const targetW = Math.max(1, Math.round(w * scale));
        const targetH = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return file;
        ctx.drawImage(bitmap, 0, 0, targetW, targetH);

        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', 0.85)
        );
        if (!blob) return file;

        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const optimizedName = baseName + '.jpg';
        return new File([blob], optimizedName, { type: 'image/jpeg' });
      }

      async function prepareFiles(files) {
        if (!optimizeToggle.checked) return files;
        const optimized = [];
        for (const file of files) {
          try {
            optimized.push(await optimizeFile(file));
          } catch {
            optimized.push(file);
          }
        }
        return optimized;
      }

      async function uploadFile(file) {
        if (!token) return { ok: false, error: 'Missing upload token' };
        const form = new FormData();
        form.append('image', file, file.name);
        try {
          const res = await fetch(endpointBase + '?token=' + encodeURIComponent(token), { method: 'POST', body: form });
          if (!res.ok) {
            if (res.status === 401) {
              showTokenExpired();
            }
            const text = await res.text();
            throw new Error(text || 'Upload failed');
          }
          return { ok: true };
        } catch (e) {
          return { ok: false, error: e?.message || 'Upload failed' };
        }
      }

      async function uploadBatch(files) {
        if (!token) throw new Error('Missing upload token');
        const form = new FormData();
        files.forEach((file) => form.append('image', file, file.name));
        return await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', endpointBase + '/batch?token=' + encodeURIComponent(token));
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const pct = Math.round((event.loaded / event.total) * 100);
              setProgress(pct);
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch {
                reject(new Error('Invalid server response'));
              }
            } else {
              if (xhr.status === 401) {
                showTokenExpired();
              }
              reject(new Error(xhr.responseText || 'Batch upload failed'));
            }
          };
          xhr.onerror = () => reject(new Error('Network error'));
          xhr.send(form);
        });
      }

      input.addEventListener('change', async () => {
        if (!token) {
          status.textContent = 'This upload link is invalid or expired. Please rescan the QR code.';
          return;
        }
        const files = Array.from(input.files || []);
        if (!files.length) {
          status.textContent = 'No files selected.';
          return;
        }
        status.textContent = `Uploading ${files.length} image${files.length > 1 ? 's' : ''}...`;
        setProgress(0);
        results.innerHTML = '';

        const items = files.map((file) => {
          const item = document.createElement('div');
          item.className = 'list-item';
          item.innerHTML = `<span>${file.name}</span><span class="pill">Queued</span>`;
          results.appendChild(item);
          return item;
        });

        try {
          if (optimizeToggle.checked) {
            status.textContent = 'Optimizing images for faster upload...';
          }
          const preparedFiles = await prepareFiles(files);
          status.textContent = `Uploading ${preparedFiles.length} image${preparedFiles.length > 1 ? 's' : ''}...`;
          const batch = await uploadBatch(preparedFiles);
          const byIndex = new Map();
          (batch.items || []).forEach((it) => byIndex.set(it.index, { ok: true }));
          (batch.failures || []).forEach((it) => byIndex.set(it.index, { ok: false, error: it.error || 'Failed' }));

          items.forEach((item, index) => {
            const pill = item.querySelector('.pill');
            const result = byIndex.get(index) || { ok: false, error: 'Failed' };
            pill.textContent = result.ok ? 'Sent' : 'Failed';
            pill.className = `pill ${result.ok ? 'ok' : 'err'}`;
            if (!result.ok && result.error) {
              const err = document.createElement('div');
              err.style.color = '#F26D6D';
              err.style.fontSize = '12px';
              err.textContent = result.error;
              item.appendChild(err);
            }
          });
          setProgress(100);
          status.textContent = 'Done. You can upload more images anytime.';
        } catch (e) {
          status.textContent = 'Batch failed. Retrying one by one...';
          setProgress(0);
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const item = items[i];
            const pill = item.querySelector('.pill');
            pill.textContent = 'Uploading';
            const result = await uploadFile(file);
            setProgress(Math.round(((i + 1) / files.length) * 100));
            pill.textContent = result.ok ? 'Sent' : 'Failed';
            pill.className = `pill ${result.ok ? 'ok' : 'err'}`;
            if (!result.ok && result.error) {
              const err = document.createElement('div');
              err.style.color = '#F26D6D';
              err.style.fontSize = '12px';
              err.textContent = result.error;
              item.appendChild(err);
            }
          }
          setProgress(100);
          status.textContent = 'Done. You can upload more images anytime.';
        }
        input.value = '';
      });

      if (!token) {
        status.textContent = 'This upload link is missing a token. Please rescan the QR code.';
        input.disabled = true;
      }
    </script>
  </body>
</html>
"#;
