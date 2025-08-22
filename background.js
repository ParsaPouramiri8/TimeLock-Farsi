const STORAGE_KEY = 'blocks';
async function cleanup() {
  const { [STORAGE_KEY]: blocks = {} } = await chrome.storage.sync.get(STORAGE_KEY);
  const now = Date.now();
  let changed = false;

  for (const d of Object.keys(blocks)) {
    if (!blocks[d] || typeof blocks[d].until !== 'number' || blocks[d].until <= now) {
      delete blocks[d];
      changed = true;
    }
  }
  if (changed) await chrome.storage.sync.set({ [STORAGE_KEY]: blocks });
}
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('timelock_cleanup', { periodInMinutes: 1 });
  cleanup();
});
chrome.alarms.onAlarm.addListener(a => {
  if (a.name === 'timelock_cleanup') cleanup();
});
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'GET_BLOCKS') {
    chrome.storage.sync.get(STORAGE_KEY).then(data => sendResponse(data[STORAGE_KEY] || {}));
    return true;
  }
  if (msg?.type === 'ADD_BLOCK') {
    (async () => {
      const { domain, minutes } = msg.payload;
      const until = Date.now() + Math.max(1, minutes) * 60 * 1000;
      const store = await chrome.storage.sync.get(STORAGE_KEY);
      const blocks = store[STORAGE_KEY] || {};
      blocks[domain] = { until };
      await chrome.storage.sync.set({ [STORAGE_KEY]: blocks });
      sendResponse({ ok: true, until });
    })();
    return true;
  }
  if (msg?.type === 'REMOVE_BLOCK') {
    (async () => {
      const { domain } = msg.payload;
      const store = await chrome.storage.sync.get(STORAGE_KEY);
      const blocks = store[STORAGE_KEY] || {};
      delete blocks[domain];
      await chrome.storage.sync.set({ [STORAGE_KEY]: blocks });
      sendResponse({ ok: true });
    })();
    return true;
  }
});