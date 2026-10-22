/**
 * Clothwork Creator Dashboard companion.
 * All API edits stay inside the user's explicitly opened Clothwork workspace.
 * This widget only displays sanitized, locally saved progress.
 */
(() => {
  if (document.getElementById('clothwork-companion-root')) return;

  const LIVE_KEY = 'clothwork_live_v03';
  const THEME_KEY = 'clothwork_theme_v04';
  const DATA_KEY = 'clothwork_v01_state';
  const PANEL_KEY = 'clothwork_widget_open_v03';
  const CONTROL_KEY = 'clothwork_control_v03';
  const CREATIONS_URL = 'https://create.roblox.com/dashboard/creations?activeTab=AvatarItems-classics';
  const root = document.createElement('div');
  root.id = 'clothwork-companion-root';
  const shadow = root.attachShadow({ mode: 'closed' });
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = chrome.runtime.getURL('widget.css');
  shadow.append(css);

  // HTML below contains no data from Roblox or extension storage. All user / asset
  // names enter the interface through textContent, never through innerHTML.
  const shell = document.createElement('div');
  shell.className = 'cw-shell';
  shell.innerHTML = `
    <button id="cw-toggle" class="cw-toggle" aria-label="Open Clothwork activity" aria-expanded="false" title="Clothwork activity">
      <img src="${chrome.runtime.getURL('icon48.png')}" alt="" /><span id="cw-dot" class="cw-dot"></span>
    </button>
    <aside id="cw-panel" class="cw-panel" hidden aria-label="Clothwork activity panel">
      <header class="cw-header"><div class="cw-brand"><img src="${chrome.runtime.getURL('icon48.png')}" alt="" />
        <span><b>clothwork<span class="cw-brand-dot">.</span></b><small>your clothing helper · <span class="cw-cat">🐈 ✧</span></small></span></div>
        <button id="cw-close" class="cw-icon-button" aria-label="Close Clothwork">×</button></header>
      <nav class="cw-tabs" aria-label="Clothwork sections">
        <button class="cw-tab is-active" data-tab="activity">Activity</button>
        <button class="cw-tab" data-tab="results">Results</button>
        <button class="cw-tab" data-tab="settings">Settings</button>
      </nav>
      <section id="cw-activity" class="cw-view">
        <div class="cw-statusline"><span id="cw-status" class="cw-status">Ready</span>
          <span id="cw-updated" class="cw-faint"></span></div>
        <div class="cw-group"><span>Configured group</span><strong id="cw-group">Not selected</strong></div>
        <div id="cw-current" class="cw-current"><small>WORKSPACE</small><strong id="cw-item">Ready to start</strong>
          <span id="cw-stage">Open Clothwork to plan names and descriptions, then save in Roblox.</span></div>
        <div class="cw-progress-label"><b id="cw-progress">0 / 0</b><span id="cw-pct">0%</span></div>
        <div class="cw-meter"><div id="cw-bar"></div></div>
        <div class="cw-stats"><div><strong id="cw-done">0</strong><small>Completed</small></div><div><strong id="cw-failed">0</strong><small>Failed</small></div><div><strong id="cw-skipped">0</strong><small>Skipped</small></div></div>
        <h3>Recent activity</h3><div id="cw-feed" class="cw-feed"><p class="cw-empty">No activity yet.</p></div>
        <button id="cw-pause" class="cw-secondary" hidden>Pause after current item</button>
      </section>
      <section id="cw-results" class="cw-view" hidden>
        <h3>Saved progress</h3><div id="cw-result-summary" class="cw-result-summary">No completed batch yet.</div>
        <h3>Completed / failed items</h3><div id="cw-result-items" class="cw-result-items"><p class="cw-empty">Your finished items will appear here.</p></div>
        <p class="cw-caption">View asset links or open the full dashboard for CSV and JSON reports.</p>
      </section>
      <section id="cw-settings" class="cw-view" hidden>
        <h3>Public edition / privacy</h3>
        <div class="cw-settingsbox"><b>No keys or accounts to connect</b><p>Prepare your changes in Clothwork and save through Roblox Creator Hub.</p>
        <span id="cw-key-info">No key saved by Clothwork</span></div>
        <a id="cw-api-link" class="cw-secondary cw-link" href="${CREATIONS_URL}" target="_blank" rel="noopener noreferrer">Open Roblox Creator Hub ↗</a>
        <a class="cw-mutedlink" href="https://github.com/bordersz/clothwork/blob/main/docs/USER_GUIDE.md" target="_blank" rel="noopener noreferrer">How to use Clothwork ↗</a>
        <h3>Appearance</h3><button id="cw-theme" class="cw-secondary">Switch to light mode</button>
        <h3>Your privacy</h3><p class="cw-caption">No analytics, accounts, or tracking. Clothing and activity are retained locally for resume and reports until you clear them in the editor. Credentials are not collected.</p>
        <h3>About this sidebar</h3><p class="cw-caption">Clothwork shows progress from the local editor. It does not click or type inside Roblox's pages. Use Roblox Creator Hub to save each edit. The sidebar never modifies Roblox pages.</p>
      </section>
      <footer><button id="cw-open" class="cw-primary">Open Clothwork editor ↗</button><span>Independent project · Not affiliated with Roblox</span></footer>
    </aside>`;
  shadow.append(shell);
  document.documentElement.append(root);

  const $ = id => shadow.getElementById(id);
  let opened = false;
  let currentTheme = 'dark';
  function applyWidgetTheme(next){
    currentTheme=next==='light'?'light':'dark';
    shell.dataset.theme=currentTheme;
    const button=$('cw-theme');
    if(button)button.textContent=currentTheme==='dark'?'Switch to light mode':'Switch to dark mode';
  }
  let tab = 'activity';
  let live = {};
  let saved = {};
  let lastHeartbeat = 0;
  let now = Date.now();

  function setText(id, value) { $(id).textContent = String(value ?? ''); }
  function assetUrl(id) {
    return `https://create.roblox.com/dashboard/creations/catalog/${encodeURIComponent(String(id))}/configure`;
  }
  function setOpen(value) {
    opened = Boolean(value);
    $('cw-panel').hidden = !opened;
    $('cw-toggle').setAttribute('aria-expanded', String(opened));
    $('cw-toggle').setAttribute('aria-label', opened ? 'Close Clothwork activity' : 'Open Clothwork activity');
    chrome.storage.local.set({ [PANEL_KEY]: opened }).catch(() => {});
  }
  function switchTab(next) {
    tab = next;
    for (const button of shadow.querySelectorAll('[data-tab]')) {
      button.classList.toggle('is-active', button.dataset.tab === next);
    }
    for (const view of ['activity', 'results', 'settings']) {
      $(`cw-${view}`).hidden = view !== next;
    }
  }
  function makeRow(item, isLog = false) {
    const el = document.createElement('div');
    el.className = 'cw-row';
    const label = document.createElement('div');
    label.className = 'cw-row-detail';
    const first = document.createElement('strong');
    first.textContent = isLog ? String(item.message || '') : String(item.name || `Asset #${item.id}`);
    const second = document.createElement('small');
    second.textContent = isLog ? `${String(item.status || '')} · ${new Date(item.time).toLocaleTimeString()}` : `${String(item.status || 'pending')} · #${item.id}`;
    label.append(first, second);
    el.append(label);
    if (item.id && /^\d+$/.test(String(item.id))) {
      const link = document.createElement('a');
      link.href = assetUrl(item.id);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'View ↗';
      link.setAttribute('aria-label', `Open Roblox asset ${item.id}`);
      el.append(link);
    }
    return el;
  }
  function drawList(container, items, empty, isLog = false) {
    const target = $(container);
    target.replaceChildren();
    if (!items.length) {
      const el = document.createElement('p');
      el.className = 'cw-empty';
      el.textContent = empty;
      target.append(el);
      return;
    }
    for (const item of items) target.append(makeRow(item, isLog));
  }
  function render() {
    const age = now - Number(live.updatedAt || 0);
    const stale = live.phase === 'running' && age > 15000;
    const phase = stale ? 'interrupted' : (live.phase || 'idle');
    const statusLabels = {
      idle: 'Ready', loading: 'Loading clothing', preview: 'Preview ready',
      running: 'Working', finished: 'Finished', paused: 'Paused', interrupted: 'Editor disconnected'
    };
    const status = statusLabels[phase] || 'Ready';
    setText('cw-status', status);
    $('cw-status').className = 'cw-status cw-phase-' + phase;
    $('cw-dot').className = 'cw-dot cw-phase-' + phase;
    setText('cw-updated', live.updatedAt ? new Date(live.updatedAt).toLocaleTimeString() : '');
    setText('cw-group', live.groupName || saved.groupName || 'Not selected');
    setText('cw-item', live.currentName || (phase === 'finished' ? 'Review your saved items' : 'Choose items in the editor'));
    setText('cw-stage', stale ? 'Open the editor to review the latest information.' : (live.message || 'Open the editor to prepare your next item.'));
    const current = Number(live.current || 0);
    const total = Number(live.total || 0);
    setText('cw-progress', `${current} / ${total}`);
    const percent = total > 0 ? Math.min(100, Math.round(current / total * 100)) : 0;
    $('cw-bar').style.width = `${percent}%`;
    setText('cw-pct', `${percent}%`);
    setText('cw-done', (Array.isArray(saved.items)?saved.items:[]).filter(x=>x.status==='edited'||x.status==='already').length);
    setText('cw-failed', live.failed ?? 0);
    setText('cw-skipped', live.skipped ?? 0);
    $('cw-pause').hidden = phase !== 'running' && phase !== 'loading';
    const logs = Array.isArray(live.recent) ? live.recent.slice(0, 7) : [];
    drawList('cw-feed', logs, 'Activity from your editor appears here.', true);

    const result = live.lastBatch;
    setText('cw-result-summary', result
      ? `${result.paused ? 'Paused' : 'Finished'} · ${result.done || 0} completed · ${result.failed || 0} failed · ${result.skipped || 0} skipped · ${new Date(result.finishedAt).toLocaleString()}`
      : 'No completed batch yet.');
    const all = Array.isArray(saved.items) ? saved.items : [];
    const eligible = all.filter(x => ['edited', 'already', 'failed', 'skipped'].includes(x.status));
    // Show failures first, then successfully edited items; all individual results remain in the editor.
    eligible.sort((a, b) => Number(['failed','skipped'].includes(b.status)) - Number(['failed','skipped'].includes(a.status)));
    drawList('cw-result-items', eligible.slice(0, 35), 'No individual results saved yet.');
    setText('cw-key-info', 'Your clothing workspace works without an API key.');
  }
  async function refresh() {
    try {
      const values = await chrome.storage.local.get([LIVE_KEY, DATA_KEY]);
      live = values[LIVE_KEY] || {};
      saved = values[DATA_KEY] || {};
      now = Date.now();
      render();
    } catch { /* A browser reload may temporarily invalidate this content script. */ }
  }

  $('cw-toggle').addEventListener('click', () => setOpen(!opened));
  $('cw-close').addEventListener('click', () => setOpen(false));
  for (const button of shadow.querySelectorAll('[data-tab]')) {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  }
  $('cw-open').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'OPEN_EDITOR' }));
  $('cw-theme').addEventListener('click',()=>chrome.storage.local.set({[THEME_KEY]:currentTheme==='dark'?'light':'dark'}));
  $('cw-pause').addEventListener('click', async () => {
    await chrome.storage.local.set({ [CONTROL_KEY]: { action: 'pause', nonce: Date.now() } });
    $('cw-pause').disabled = true;
    $('cw-pause').textContent = 'Pause requested…';
    setTimeout(() => { $('cw-pause').disabled = false; $('cw-pause').textContent = 'Pause after current item'; }, 2500);
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[LIVE_KEY] || changes[DATA_KEY]) refresh();
    if (changes[THEME_KEY]) applyWidgetTheme(changes[THEME_KEY].newValue);
  });
  chrome.storage.local.get(PANEL_KEY).then(data => {
    // Open for new users; remember explicit close/open choices after that.
    opened = data[PANEL_KEY] === undefined ? true : Boolean(data[PANEL_KEY]);
    $('cw-panel').hidden = !opened;
    $('cw-toggle').setAttribute('aria-expanded', String(opened));
  }).catch(() => {});
  chrome.storage.local.get(THEME_KEY).then(x=>applyWidgetTheme(x[THEME_KEY])).catch(()=>{});
  refresh();
  setInterval(() => {
    now = Date.now();
    if (live.phase === 'running' || live.phase === 'loading') render();
  }, 5000);
})();
