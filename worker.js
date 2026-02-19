/**
 * Cloudflare Worker - File Upload Tool
 *
 * 環境変数 (wrangler.toml または Cloudflare Dashboard で設定):
 *   AUTH_USERNAME       - ログインユーザー名
 *   AUTH_PASSWORD       - ログインパスワード
 *   SLACK_WEBHOOK_URL   - Slack Incoming Webhook URL
 *   R2_PUBLIC_URL       - R2バケットのパブリックURL (例: https://pub-xxxx.r2.dev)
 *                         ※ R2バケットでパブリックアクセスを有効にした場合
 *
 * R2バインディング (wrangler.toml):
 *   [[r2_buckets]]
 *   binding = "R2_BUCKET"
 *   bucket_name = "your-bucket-name"
 */

// ─── HTML ────────────────────────────────────────────────────────────────────

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>File Uploader — Login</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0a0f;
    --surface: #111118;
    --border: #1e1e2e;
    --accent: #7c6af7;
    --accent-glow: rgba(124,106,247,0.35);
    --text: #e8e6ff;
    --muted: #6b6a8a;
    --error: #f56565;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'DM Mono', monospace;
    min-height: 100vh;
    display: grid;
    place-items: center;
    overflow: hidden;
  }

  /* animated grid background */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(var(--border) 1px, transparent 1px),
      linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
    animation: gridFade 8s ease-in-out infinite alternate;
    z-index: 0;
  }

  @keyframes gridFade { from { opacity: 0.4; } to { opacity: 0.8; } }

  .orb {
    position: fixed;
    border-radius: 50%;
    filter: blur(80px);
    animation: orbFloat 12s ease-in-out infinite alternate;
    z-index: 0;
    pointer-events: none;
  }
  .orb-1 { width: 400px; height: 400px; background: rgba(124,106,247,0.15); top: -100px; left: -100px; }
  .orb-2 { width: 300px; height: 300px; background: rgba(99,179,237,0.1); bottom: -80px; right: -80px; animation-delay: -6s; }
  @keyframes orbFloat {
    from { transform: translate(0,0) scale(1); }
    to   { transform: translate(30px,20px) scale(1.1); }
  }

  .card {
    position: relative;
    z-index: 1;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 48px 40px;
    width: 380px;
    box-shadow: 0 0 60px rgba(124,106,247,0.08), 0 24px 48px rgba(0,0,0,0.6);
    animation: cardIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards;
  }

  @keyframes cardIn {
    from { opacity: 0; transform: translateY(24px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .logo {
    font-family: 'Syne', sans-serif;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: var(--text);
    margin-bottom: 8px;
  }
  .logo span { color: var(--accent); }

  .subtitle {
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 36px;
  }

  label {
    display: block;
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 8px;
    margin-top: 20px;
  }

  input[type="text"], input[type="password"] {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-family: 'DM Mono', monospace;
    font-size: 14px;
    padding: 12px 16px;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }

  .btn {
    margin-top: 28px;
    width: 100%;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-family: 'Syne', sans-serif;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 14px;
    cursor: pointer;
    transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
    position: relative;
    overflow: hidden;
  }
  .btn:hover { background: #9585f9; box-shadow: 0 8px 24px var(--accent-glow); }
  .btn:active { transform: scale(0.98); }

  .error-msg {
    margin-top: 16px;
    color: var(--error);
    font-size: 12px;
    text-align: center;
    animation: shake 0.3s ease;
  }
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    25%      { transform: translateX(-6px); }
    75%      { transform: translateX(6px); }
  }
</style>
</head>
<body>
<div class="orb orb-1"></div>
<div class="orb orb-2"></div>
<div class="card">
  <div class="logo">FILE<span>DROP</span></div>
  <div class="subtitle">Secure Upload Portal</div>
  <form method="POST" action="/login">
    <label for="username">Username</label>
    <input type="text" id="username" name="username" autocomplete="username" required autofocus>
    <label for="password">Password</label>
    <input type="password" id="password" name="password" autocomplete="current-password" required>
    <button class="btn" type="submit">Sign In →</button>
    __ERROR__
  </form>
</div>
</body>
</html>`;

const UPLOAD_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>File Uploader — Upload</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0a0f;
    --surface: #111118;
    --surface2: #16161f;
    --border: #1e1e2e;
    --accent: #7c6af7;
    --accent-glow: rgba(124,106,247,0.35);
    --green: #68d391;
    --text: #e8e6ff;
    --muted: #6b6a8a;
    --error: #f56565;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'DM Mono', monospace;
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
  }

  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(var(--border) 1px, transparent 1px),
      linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 48px 48px;
    opacity: 0.5;
    z-index: 0;
  }

  .orb {
    position: fixed;
    border-radius: 50%;
    filter: blur(100px);
    z-index: 0;
    pointer-events: none;
  }
  .orb-1 { width: 500px; height: 500px; background: rgba(124,106,247,0.12); top: -150px; right: -100px; }
  .orb-2 { width: 400px; height: 400px; background: rgba(104,211,145,0.07); bottom: -100px; left: -100px; }

  .container {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 560px;
    animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 32px;
  }

  .logo {
    font-family: 'Syne', sans-serif;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.5px;
  }
  .logo span { color: var(--accent); }

  .logout {
    font-size: 11px;
    color: var(--muted);
    text-decoration: none;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 6px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    transition: color 0.2s, border-color 0.2s;
  }
  .logout:hover { color: var(--text); border-color: var(--muted); }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 36px;
    box-shadow: 0 24px 60px rgba(0,0,0,0.5), 0 0 40px rgba(124,106,247,0.05);
  }

  .card-title {
    font-family: 'Syne', sans-serif;
    font-size: 18px;
    font-weight: 800;
    margin-bottom: 6px;
  }
  .card-subtitle {
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 28px;
  }

  /* Drop Zone */
  .drop-zone {
    border: 2px dashed var(--border);
    border-radius: 12px;
    padding: 40px 24px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s, transform 0.2s;
    position: relative;
    margin-bottom: 20px;
    background: var(--surface2);
  }
  .drop-zone:hover, .drop-zone.drag-over {
    border-color: var(--accent);
    background: rgba(124,106,247,0.04);
    transform: scale(1.01);
  }
  .drop-zone input[type="file"] {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
    width: 100%;
    height: 100%;
  }

  .drop-icon {
    font-size: 36px;
    margin-bottom: 12px;
    display: block;
    transition: transform 0.2s;
  }
  .drop-zone:hover .drop-icon { transform: translateY(-4px); }

  .drop-label {
    font-size: 13px;
    color: var(--text);
    margin-bottom: 4px;
  }
  .drop-hint {
    font-size: 11px;
    color: var(--muted);
  }

  .file-selected {
    display: none;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
    padding: 10px 14px;
    background: rgba(124,106,247,0.08);
    border: 1px solid rgba(124,106,247,0.3);
    border-radius: 8px;
    font-size: 12px;
    color: var(--accent);
  }
  .file-selected.visible { display: flex; }
  .file-selected .fname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  label {
    display: block;
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 8px;
    margin-top: 20px;
  }

  textarea {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-family: 'DM Mono', monospace;
    font-size: 13px;
    padding: 12px 16px;
    resize: vertical;
    min-height: 100px;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    line-height: 1.6;
  }
  textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }

  .btn {
    margin-top: 24px;
    width: 100%;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-family: 'Syne', sans-serif;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 14px;
    cursor: pointer;
    transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
    position: relative;
  }
  .btn:hover:not(:disabled) { background: #9585f9; box-shadow: 0 8px 24px var(--accent-glow); }
  .btn:active:not(:disabled) { transform: scale(0.98); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Progress */
  .progress-wrap {
    display: none;
    margin-top: 20px;
  }
  .progress-wrap.visible { display: block; }
  .progress-label {
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
  }
  .progress-bar {
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), #63b3ed);
    border-radius: 2px;
    width: 0%;
    transition: width 0.3s ease;
    animation: shimmer 1.5s infinite;
    background-size: 200% 100%;
  }
  @keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* Toast */
  .toast {
    position: fixed;
    bottom: 28px;
    right: 28px;
    z-index: 100;
    padding: 14px 20px;
    border-radius: 10px;
    font-size: 13px;
    max-width: 320px;
    transform: translateY(80px);
    opacity: 0;
    transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
    border: 1px solid;
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }
  .toast.show { transform: translateY(0); opacity: 1; }
  .toast.success {
    background: rgba(104,211,145,0.12);
    border-color: rgba(104,211,145,0.4);
    color: var(--green);
  }
  .toast.error {
    background: rgba(245,101,101,0.12);
    border-color: rgba(245,101,101,0.4);
    color: var(--error);
  }
  .toast-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
  .toast-body { line-height: 1.5; }
  .toast-title { font-family: 'Syne', sans-serif; font-weight: 700; margin-bottom: 2px; }
  .toast-msg { font-size: 11px; opacity: 0.8; }
</style>
</head>
<body>
<div class="orb orb-1"></div>
<div class="orb orb-2"></div>

<div class="container">
  <header>
    <div class="logo">FILE<span>DROP</span></div>
    <a class="logout" href="/logout">Logout</a>
  </header>

  <div class="card">
    <div class="card-title">Upload a File</div>
    <div class="card-subtitle">R2 Storage → Slack Notification</div>

    <form id="uploadForm" enctype="multipart/form-data">
      <div class="drop-zone" id="dropZone">
        <input type="file" name="file" id="fileInput" required>
        <span class="drop-icon">📂</span>
        <div class="drop-label">Drop file here or click to browse</div>
        <div class="drop-hint">Any file type accepted</div>
      </div>

      <div class="file-selected" id="fileSelected">
        <span>📄</span>
        <span class="fname" id="fileName"></span>
        <span id="fileSize" style="margin-left:auto;flex-shrink:0;color:var(--muted);"></span>
      </div>

      <label for="message">Slack Message</label>
      <textarea id="message" name="message" placeholder="Enter a message to include in the Slack notification..." required></textarea>

      <button class="btn" type="submit" id="submitBtn">Upload &amp; Notify Slack →</button>

      <div class="progress-wrap" id="progressWrap">
        <div class="progress-label"><span id="progressStatus">Uploading...</span><span id="progressPct">0%</span></div>
        <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
      </div>
    </form>
  </div>
</div>

<div class="toast" id="toast">
  <span class="toast-icon" id="toastIcon"></span>
  <div class="toast-body">
    <div class="toast-title" id="toastTitle"></div>
    <div class="toast-msg" id="toastMsg"></div>
  </div>
</div>

<script>
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileSelected = document.getElementById('fileSelected');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const form = document.getElementById('uploadForm');
const submitBtn = document.getElementById('submitBtn');
const progressWrap = document.getElementById('progressWrap');
const progressFill = document.getElementById('progressFill');
const progressStatus = document.getElementById('progressStatus');
const progressPct = document.getElementById('progressPct');

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024*1024) return (b/1024).toFixed(1) + ' KB';
  return (b/1024/1024).toFixed(1) + ' MB';
}

fileInput.addEventListener('change', () => {
  const f = fileInput.files[0];
  if (f) {
    fileName.textContent = f.name;
    fileSize.textContent = formatBytes(f.size);
    fileSelected.classList.add('visible');
    dropZone.querySelector('.drop-label').textContent = 'File selected!';
  }
});

['dragover','dragenter'].forEach(e => {
  dropZone.addEventListener(e, ev => { ev.preventDefault(); dropZone.classList.add('drag-over'); });
});
['dragleave','drop'].forEach(e => {
  dropZone.addEventListener(e, ev => { ev.preventDefault(); dropZone.classList.remove('drag-over'); });
});

function showToast(type, title, msg) {
  const toast = document.getElementById('toast');
  toast.className = 'toast ' + type;
  document.getElementById('toastIcon').textContent = type === 'success' ? '✓' : '✕';
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastMsg').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 5000);
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!fileInput.files[0]) { showToast('error','No File','Please select a file to upload.'); return; }

  submitBtn.disabled = true;
  progressWrap.classList.add('visible');

  // Fake progress while uploading
  let pct = 0;
  const ticker = setInterval(() => {
    pct = Math.min(pct + Math.random() * 8, 85);
    progressFill.style.width = pct + '%';
    progressPct.textContent = Math.round(pct) + '%';
  }, 200);

  try {
    const fd = new FormData(form);
    const res = await fetch('/upload', { method: 'POST', body: fd });
    const data = await res.json();

    clearInterval(ticker);
    progressFill.style.width = '100%';
    progressPct.textContent = '100%';

    if (res.ok && data.ok) {
      progressStatus.textContent = 'Done!';
      showToast('success', 'Upload Complete', 'File uploaded to R2 and Slack notified.');
      setTimeout(() => {
        form.reset();
        fileSelected.classList.remove('visible');
        dropZone.querySelector('.drop-label').textContent = 'Drop file here or click to browse';
        progressWrap.classList.remove('visible');
        progressFill.style.width = '0%';
        submitBtn.disabled = false;
      }, 2000);
    } else {
      throw new Error(data.error || 'Upload failed');
    }
  } catch (err) {
    clearInterval(ticker);
    progressWrap.classList.remove('visible');
    submitBtn.disabled = false;
    showToast('error', 'Upload Failed', err.message);
  }
});
</script>
</body>
</html>`;

// ─── Session helpers (signed cookie) ─────────────────────────────────────────

const SESSION_COOKIE = 'fdup_session';

async function signValue(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return value + '.' + btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function verifyValue(signed, secret) {
  const idx = signed.lastIndexOf('.');
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const expected = await signValue(value, secret);
  return expected === signed ? value : null;
}

function getSessionCookie(request) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(SESSION_COOKIE + '=([^;]+)'));
  return match ? decodeURIComponent(match[1]) : null;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const SESSION_SECRET = env.AUTH_PASSWORD + '_session_secret_v1';

    // ── GET / or /upload → check auth, show upload page ──────────────────────
    if (method === 'GET' && (url.pathname === '/' || url.pathname === '/upload')) {
      const cookie = getSessionCookie(request);
      if (cookie) {
        const val = await verifyValue(cookie, SESSION_SECRET);
        if (val === 'authenticated') {
          return new Response(UPLOAD_HTML, { headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
        }
      }
      return Response.redirect(new URL('/login', request.url).toString(), 302);
    }

    // ── GET /login ────────────────────────────────────────────────────────────
    if (method === 'GET' && url.pathname === '/login') {
      const html = LOGIN_HTML.replace('__ERROR__', '');
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
    }

    // ── POST /login ───────────────────────────────────────────────────────────
    if (method === 'POST' && url.pathname === '/login') {
      const body = await request.formData();
      const username = body.get('username') || '';
      const password = body.get('password') || '';

      if (username !== env.AUTH_USERNAME || password !== env.AUTH_PASSWORD) {
        const html = LOGIN_HTML.replace(
          '__ERROR__',
          '<p class="error-msg">Incorrect username or password.</p>'
        );
        return new Response(html, { status: 401, headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
      }

      const signed = await signValue('authenticated', SESSION_SECRET);
      const headers = new Headers({
        'Content-Type': 'text/html; charset=UTF-8',
        'Set-Cookie': `${SESSION_COOKIE}=${encodeURIComponent(signed)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`,
      });
      headers.append('Location', '/');
      return new Response(null, { status: 302, headers });
    }

    // ── GET /logout ───────────────────────────────────────────────────────────
    if (method === 'GET' && url.pathname === '/logout') {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/login',
          'Set-Cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
        },
      });
    }

    // ── POST /upload ──────────────────────────────────────────────────────────
    if (method === 'POST' && url.pathname === '/upload') {
      // Auth check
      const cookie = getSessionCookie(request);
      if (!cookie || (await verifyValue(cookie, SESSION_SECRET)) !== 'authenticated') {
        return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
          status: 401, headers: { 'Content-Type': 'application/json' }
        });
      }

      let formData;
      try {
        formData = await request.formData();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid form data' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }

      const file = formData.get('file');
      const message = (formData.get('message') || '').trim();

      if (!file || typeof file === 'string') {
        return new Response(JSON.stringify({ ok: false, error: 'No file provided' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }

      // Build unique filename: timestamp_originalname
      const ts = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, '_');
      const key = `${ts}_${safeName}`;

      // Upload to R2
      try {
        await env.R2_BUCKET.put(key, file.stream(), {
          httpMetadata: { contentType: file.type || 'application/octet-stream' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: 'R2 upload failed: ' + err.message }), {
          status: 500, headers: { 'Content-Type': 'application/json' }
        });
      }

      // Build public URL
      const publicBase = (env.R2_PUBLIC_URL || '').replace(/\/$/, '');
      const fileUrl = publicBase ? `${publicBase}/${key}` : `[R2 key: ${key}]`;

      // Post to Slack
      const slackPayload = {
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: '📁 New File Uploaded', emoji: true }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Message:*\n${message || '_(no message)_'}`
            }
          },
          { type: 'divider' },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*File Name:*\n${file.name}` },
              { type: 'mrkdwn', text: `*Size:*\n${(file.size / 1024).toFixed(1)} KB` },
              { type: 'mrkdwn', text: `*Type:*\n${file.type || 'unknown'}` },
              { type: 'mrkdwn', text: `*Uploaded At:*\n<!date^${Math.floor(ts/1000)}^{date_short_pretty} {time}|${new Date(ts).toISOString()}>` },
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: publicBase
                ? `*Download Link:*\n<${fileUrl}|Click here to download ${file.name}>`
                : `*R2 Key:*\n\`${key}\`  _(Public URL not configured)_`
            }
          },
          {
            type: 'context',
            elements: [{ type: 'mrkdwn', text: `Uploaded via FileDrop Worker` }]
          }
        ]
      };

      try {
        const slackRes = await fetch(env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload),
        });
        if (!slackRes.ok) {
          const text = await slackRes.text();
          throw new Error(`Slack responded ${slackRes.status}: ${text}`);
        }
      } catch (err) {
        // R2 upload succeeded but Slack failed — still return partial success
        return new Response(JSON.stringify({ ok: false, error: 'File uploaded but Slack notification failed: ' + err.message }), {
          status: 502, headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ ok: true, key, url: fileUrl }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 404
    return new Response('Not Found', { status: 404 });
  }
};
