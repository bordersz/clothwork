// One editor page; the floating Creator Dashboard companion is read-only.
async function openEditor() {
  const url = chrome.runtime.getURL('app.html');
  const matches = await chrome.tabs.query({ url });
  if (matches.length) {
    await chrome.tabs.update(matches[0].id, { active: true });
    await chrome.windows.update(matches[0].windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url });
  }
}
chrome.action.onClicked.addListener(openEditor);
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'OPEN_EDITOR') openEditor().catch(console.error);
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.clothwork_live_v03) return;
  const progress = changes.clothwork_live_v03.newValue || {};
  const phase = progress.phase;
  const label = phase === 'finished' ? '✓' : phase === 'running' ? String(Math.min(99, progress.current || 0)) : '';
  chrome.action.setBadgeText({ text: label }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ color: phase === 'finished' ? '#367b95' : '#394d48' }).catch(() => {});
});
