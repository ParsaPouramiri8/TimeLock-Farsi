const STORAGE_KEY = 'blocks';
function hostMatches(host, domain) {
  if (!host || !domain) return false;
  return host === domain || host.endsWith('.' + domain);
}

function renderBlockedUI(remainingMs, domain) {
  const html = `
    <div id="timelock-wrap">
      <div class="card">
        <div class="lock">🔒</div>
        <h1>دسترسی به این سایت تا پایان تایمر مسدود است</h1>
        <p class="domain">${domain}</p>
        <div class="countdown" id="tl-count">--:--</div>
        <p class="hint">برگرد به کارات 😉</p>
      </div>
    </div>
  `;
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = chrome.runtime.getURL('blocked.css');
  document.documentElement.innerHTML = '<head></head><body></body>';
  document.head.appendChild(style);
  document.body.innerHTML = html;
  const el = document.getElementById('tl-count');
  function tick() {
    const ms = Math.max(0, remainingMs - (Date.now() - start));
    const s = Math.floor(ms / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    el.textContent = `${mm}:${ss}`;
    if (ms <= 0) location.reload();
  }
  const start = Date.now();
  tick();
  setInterval(tick, 1000);
}

(async function () {
  try {
    const host = location.hostname;
    if (!host) return;
    const store = await chrome.storage.sync.get(STORAGE_KEY);
    const blocks = store[STORAGE_KEY] || {};
    const entry = Object.entries(blocks).find(([d]) => hostMatches(host, d));
    if (!entry) return;

    const [domain, info] = entry;
    const remaining = (info?.until ?? 0) - Date.now();
    if (remaining > 0) {
      renderBlockedUI(remaining, domain);
      window.addEventListener('beforeunload', (e) => {
        e.preventDefault();
        e.returnValue = '';
      });
    } else {
    }
  } catch (e) {
  }
})();