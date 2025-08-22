const STORAGE_KEY = 'blocks';

function normalizeDomain(input) {
  if (!input) return '';
  let d = input.trim();
  try {
    if (d.startsWith('http://') || d.startsWith('https://')) {
      d = new URL(d).hostname;
    }
  } catch {}
  d = d.replace(/^www\./i, '').replace(/\/.*$/, '');
  if (!/^[a-z0-9.-]+$/i.test(d)) return '';
  return d.toLowerCase();
}

async function getCurrentTabDomain() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    const url = new URL(tab.url || '');
    return normalizeDomain(url.hostname);
  } catch { return ''; }
}

function msToClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  return `${m}:${ss}`;
}

async function refreshList() {
  const list = document.getElementById('list');
  const { [STORAGE_KEY]: blocks = {} } = await chrome.storage.sync.get(STORAGE_KEY);
  const now = Date.now();
  const entries = Object.entries(blocks).sort((a,b) => a[0].localeCompare(b[0]));

  list.innerHTML = '';
  if (!entries.length) {
    list.innerHTML = '<div class="empty">فعلاً چیزی قفل نشده.</div>';
    return;
  }

  for (const [domain, info] of entries) {
    const remain = (info?.until ?? 0) - now;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div>
        <div class="title">${domain}</div>
        <div class="time">
          ${remain > 0 ? 'باقی‌مانده: ' + msToClock(remain) : 'منقضی شده (به‌زودی حذف می‌شود)'}
        </div>
      </div>
    `;
    list.appendChild(card);
  }
}

document.getElementById('add').addEventListener('click', async () => {
  const domainInput = document.getElementById('domain');
  const minutesInput = document.getElementById('minutes');
  let domain = normalizeDomain(domainInput.value);
  if (!domain) {
    domain = await getCurrentTabDomain();
  }
  const minutes = Math.max(1, parseInt(minutesInput.value || '0', 10));
  if (!domain) {
    domainInput.focus();
    domainInput.placeholder = "دامنه نامعتبر!";
    return;
  }
  await chrome.runtime.sendMessage({ type: 'ADD_BLOCK', payload: { domain, minutes } });
  domainInput.value = '';
  refreshList();
});
(async function init() {
  const d = await getCurrentTabDomain();
  if (d) document.getElementById('domain').placeholder = d;
  refreshList();
  setInterval(refreshList, 1000);
})();