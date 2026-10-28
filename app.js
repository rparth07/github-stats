'use strict';
const $ = (id) => document.getElementById(id);
const listView = location.pathname.toLowerCase().includes('/listview');
let contributors = [], repository = '', loadController, searchController, searchTimer, profileVersion = 0;
let selected = new URLSearchParams(location.search).get('contributor');
const profileCache = new Map();

function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}
function parseRepository(value) {
  const match = value.trim().match(/^(?:https?:\/\/github\.com\/)?([a-z\d](?:[a-z\d-]*[a-z\d])?)\/([a-z\d_.-]+)\/?$/i);
  return match && match[2] !== '.' && match[2] !== '..' ? `${match[1]}/${match[2].replace(/\.git$/, '')}` : null;
}
function syncURL() {
  const params = new URLSearchParams();
  const [owner, repo] = repository.split('/');
  params.set('repo-owner', owner);
  params.set('repo-name', repo);
  if (selected) params.set('contributor', selected);
  history.replaceState(null, '', `${location.pathname}?${params}`);
  $('treemap-link').href = `/Treemap/?${params}`;
  $('list-link').href = `/ListView/?${params}`;
}
async function github(path, signal) {
  const response = await fetch(`https://api.github.com${path}`, { signal, headers: { Accept: 'application/vnd.github+json' } });
  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      const reset = Number(response.headers.get('x-ratelimit-reset'));
      throw new Error(`GitHub API rate limit reached or access restricted. ${reset ? `Try again after ${new Date(reset * 1000).toLocaleTimeString()}.` : 'Please try again later.'}`);
    }
    if (response.status === 404) throw new Error('Repository or profile not found. Check the name and make sure it is public.');
    throw new Error(`GitHub could not complete the request (${response.status}). Please try again.`);
  }
  return response.status === 204 ? [] : response.json();
}
function hideSuggestions() {
  $('suggestions').hidden = true;
  $('repo-search').setAttribute('aria-expanded', 'false');
}
function cancelSearch() {
  clearTimeout(searchTimer);
  searchController?.abort();
  hideSuggestions();
}
async function searchRepositories(query) {
  searchController?.abort();
  const controller = searchController = new AbortController();
  try {
    const data = await github(`/search/repositories?q=${encodeURIComponent(query)}&per_page=8`, controller.signal);
    if (controller.signal.aborted) return;
    $('suggestions').replaceChildren();
    for (const repo of data.items || []) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = repo.full_name;
      button.addEventListener('click', () => loadRepository(repo.full_name));
      $('suggestions').append(button);
    }
    $('suggestions').hidden = !data.items?.length;
    $('repo-search').setAttribute('aria-expanded', String(!!data.items?.length));
    if (!data.items?.length) status('No matching repositories. Try owner/repository.');
  } catch (error) {
    if (error.name !== 'AbortError') status(error.message, true);
  }
}
async function loadRepository(value, preserveSelection = false) {
  const parsed = parseRepository(value);
  cancelSearch();
  if (!parsed) { status('Enter a repository as owner/repository, paste a GitHub URL, or select a search result.', true); return; }
  loadController?.abort();
  const controller = loadController = new AbortController();
  if ($('profile-dialog').open) $('profile-dialog').close();
  profileVersion++;
  if (!preserveSelection) selected = null;
  contributors = [];
  $('visualization').replaceChildren();
  $('contributors').replaceChildren();
  $('visualization').hidden = true;
  $('contributors').hidden = true;
  document.querySelectorAll('[data-export], #print').forEach((el) => el.disabled = true);
  $('repo-search').value = parsed;
  $('repo-title').textContent = parsed;
  $('summary').textContent = 'Loading contributors…';
  $('generate').textContent = 'Loading…';
  $('search-form').setAttribute('aria-busy', 'true');
  status('Fetching public GitHub contributors…');
  try {
    const data = await github(`/repos/${parsed.split('/').map(encodeURIComponent).join('/')}/contributors?per_page=100`, controller.signal);
    if (controller.signal.aborted) return;
    repository = parsed;
    contributors = data.filter((c) => c.login && Number.isFinite(c.contributions)).sort((a, b) => b.contributions - a.contributions).map((c, i) => ({ ...c, rank: i + 1 }));
    $('summary').textContent = `${contributors.length} contributors · ${contributors.reduce((sum, c) => sum + c.contributions, 0).toLocaleString()} commits shown`;
    if (selected && !contributors.some((c) => c.login.toLowerCase() === selected.toLowerCase())) {
      selected = null;
      status('The shared contributor is not in this repository’s top 100. Showing available contributors.');
    } else status(contributors.length ? 'Select a contributor to see their profile and share link.' : 'No contributors found. This repository may be empty or its statistics may still be processing.');
    syncURL();
    render();
    document.querySelectorAll('[data-export], #print').forEach((el) => el.disabled = !contributors.length);
    if (selected) {
      const contributor = contributors.find((c) => c.login.toLowerCase() === selected.toLowerCase());
      const target = [...document.querySelectorAll('[data-login]')].find((el) => el.dataset.login === contributor.login);
      target?.scrollIntoView({ block: 'center' });
      if (!listView) openProfile(contributor);
    }
  } catch (error) {
    if (error.name !== 'AbortError') { $('summary').textContent = 'Unable to load contributors'; status(error.message || 'Network error. Check your connection and retry.', true); }
  } finally {
    if (loadController === controller) { $('generate').textContent = 'Generate'; $('search-form').removeAttribute('aria-busy'); }
  }
}
function avatar(c) {
  const img = document.createElement('img');
  img.src = c.avatar_url;
  img.alt = '';
  img.loading = 'lazy';
  img.addEventListener('error', () => { img.hidden = true; }, { once: true });
  return img;
}
function render() {
  if (!contributors.length) return;
  const container = listView ? $('contributors') : $('visualization');
  container.hidden = false;
  container.replaceChildren();
  if (listView) {
    for (const c of contributors) {
      const card = document.createElement('article');
      card.className = 'contributor';
      card.dataset.login = c.login;
      card.classList.toggle('highlight', c.login.toLowerCase() === selected?.toLowerCase());
      const rank = document.createElement('span'); rank.className = 'rank'; rank.textContent = `#${c.rank}`;
      const name = document.createElement('h2'); name.textContent = `@${c.login}`;
      const count = document.createElement('p'); count.textContent = `${c.contributions.toLocaleString()} contributions`;
      const button = document.createElement('button'); button.textContent = 'Profile & share'; button.addEventListener('click', () => openProfile(c));
      card.append(rank, avatar(c), name, count, button); container.append(card);
    }
  } else {
    if (!window.d3) { status('The treemap library could not load. Please reload or use the list view.', true); return; }
    for (const leaf of layout(container.clientWidth, container.clientHeight)) {
      const c = leaf.data;
      const tile = document.createElement('button');
      tile.className = 'tile'; tile.type = 'button'; tile.dataset.login = c.login;
      tile.style.left = `${leaf.x0}px`; tile.style.top = `${leaf.y0}px`;
      tile.style.width = `${leaf.x1 - leaf.x0}px`; tile.style.height = `${leaf.y1 - leaf.y0}px`;
      tile.classList.toggle('small-label', leaf.x1 - leaf.x0 < 85 || leaf.y1 - leaf.y0 < 45);
      tile.classList.toggle('highlight', c.login.toLowerCase() === selected?.toLowerCase());
      const label = `#${c.rank} @${c.login}: ${c.contributions.toLocaleString()} contributions`;
      tile.title = label; tile.setAttribute('aria-label', label);
      const caption = document.createElement('span'); caption.textContent = `#${c.rank} ${c.login}`;
      tile.append(avatar(c), caption); tile.addEventListener('click', () => openProfile(c)); container.append(tile);
    }
  }
}
function layout(width, height) {
  const root = d3.hierarchy({ children: contributors }).sum((d) => d.contributions === undefined ? 0 : Math.sqrt(Math.max(1, d.contributions))).sort((a, b) => b.value - a.value);
  d3.treemap().size([width, height]).padding(2)(root);
  return root.leaves();
}
function safeWebsite(value) {
  if (!value?.trim()) return null;
  try { const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && !/[\s:]/.test(url.hostname) ? url.href : null; } catch { return null; }
}
async function openProfile(c) {
  const version = ++profileVersion;
  selected = c.login; syncURL();
  document.querySelectorAll('[data-login]').forEach((el) => el.classList.toggle('highlight', el.dataset.login === selected));
  $('profile-avatar').src = c.avatar_url;
  $('profile-name').textContent = `@${c.login}`;
  $('profile-count').textContent = `Rank #${c.rank} · ${c.contributions.toLocaleString()} contributions`;
  $('profile-link').href = `https://github.com/${encodeURIComponent(c.login)}`;
  $('share').textContent = 'Copy share link';
  $('portfolio').textContent = 'Checking public portfolio…';
  if (!$('profile-dialog').open) $('profile-dialog').showModal();
  try {
    let profile = profileCache.get(c.login);
    if (!profile) { profile = await github(`/users/${encodeURIComponent(c.login)}`); profileCache.set(c.login, profile); }
    if (version !== profileVersion) return;
    $('portfolio').replaceChildren();
    const website = safeWebsite(profile.blog);
    if (website) { const link = document.createElement('a'); link.href = website; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Visit public website / portfolio'; $('portfolio').append(link); }
    else $('portfolio').textContent = 'No public website listed on GitHub.';
  } catch { if (version === profileVersion) $('portfolio').textContent = 'Public website unavailable. You can still visit the GitHub profile.'; }
}
async function shareProfile() {
  try {
    if (navigator.share) await navigator.share({ title: `${selected} · ${repository}`, url: location.href });
    else { await navigator.clipboard.writeText(location.href); $('share').textContent = 'Link copied!'; }
  } catch (error) { if (error.name !== 'AbortError') { $('share').textContent = 'Copy link from address bar'; status('Sharing was unavailable. Copy the link from your browser’s address bar.'); } }
}
function download(blob, extension) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = `${repository.replace('/', '-')}-contributors.${extension}`;
  a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
const xml = (value) => String(value).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
async function exportVisualization(format) {
  const snapshot = contributors;
  const repo = repository;
  document.querySelectorAll('[data-export]').forEach((el) => el.disabled = true);
  status('Preparing export and downloading avatars…');
  try {
    // Inline avatars so exported SVGs work offline and can safely be rasterized.
    const pictures = await Promise.all(snapshot.map(async (c) => {
      try {
        const response = await fetch(c.avatar_url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) return '';
        const blob = await response.blob();
        if (!/^image\/(png|jpeg|webp|gif)$/.test(blob.type)) return '';
        return await new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => resolve(''); reader.readAsDataURL(blob); });
      } catch { return ''; }
    }));
    if (snapshot !== contributors || repo !== repository) { status('Repository changed. Please export the current results again.'); return; }
    const width = 1200, height = listView ? 80 + Math.ceil(snapshot.length / 4) * 104 : 880;
    const tiles = listView ? snapshot.map((c, i) => ({ data: c, x0: (i % 4) * 300, y0: Math.floor(i / 4) * 104, x1: (i % 4 + 1) * 300 - 4, y1: (Math.floor(i / 4) + 1) * 104 - 4 })) : layout(width, 800);
    let body = `<rect width="100%" height="100%" fill="#f6f8f6"/><text x="16" y="30" font-size="24" fill="#193d29">${xml(repo)} · contributors</text><text x="16" y="56" font-size="14" fill="#526458">Top ${snapshot.length} · GitHub commit counts · square-root treemap weighting</text>`;
    for (const leaf of tiles) {
      const c = leaf.data, x = leaf.x0, y = leaf.y0 + 80, w = leaf.x1 - x, h = leaf.y1 - leaf.y0;
      const pic = pictures[c.rank - 1];
      const shareURL = new URL('/Treemap/', location.origin);
      shareURL.searchParams.set('repo-owner', repo.split('/')[0]);
      shareURL.searchParams.set('repo-name', repo.split('/')[1]);
      shareURL.searchParams.set('contributor', c.login);
      body += `<a href="${xml(shareURL.href)}" target="_blank" rel="noopener noreferrer"><g><title>${xml(`#${c.rank} ${c.login}: ${c.contributions} contributions`)}</title><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#235b37"/>`;
      if (pic) body += `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><image href="${xml(pic)}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/></svg>`;
      if (w > 70 && h > 35) body += `<rect x="${x}" y="${y + h - 30}" width="${w}" height="30" fill="#10291d"/><text x="${x + 6}" y="${y + h - 10}" font-size="12" fill="white">${xml(`#${c.rank} ${c.login}`.slice(0, Math.floor(w / 7)))}</text>`;
      body += '</g></a>';
    }
    const blob = new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="sans-serif">${body}</svg>`], { type: 'image/svg+xml;charset=utf-8' });
    if (format === 'svg') download(blob, 'svg');
    else {
      const url = URL.createObjectURL(blob);
      try {
        const img = new Image(); img.src = url; await img.decode();
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        const imageBlob = await new Promise((resolve) => canvas.toBlob(resolve, `image/${format}`, .94));
        if (!imageBlob) throw new Error('Image export failed. Please try SVG.');
        download(imageBlob, format);
      } finally { URL.revokeObjectURL(url); }
    }
    status('Export downloaded.');
  } catch (error) { status(error.message || 'Export failed. Please try again.', true); }
  finally { document.querySelectorAll('[data-export]').forEach((el) => el.disabled = !contributors.length); }
}

$('search-form').addEventListener('submit', (event) => { event.preventDefault(); loadRepository($('repo-search').value); });
$('clear').addEventListener('click', () => { cancelSearch(); $('repo-search').value = ''; $('repo-search').focus(); });
$('repo-search').addEventListener('input', (event) => {
  cancelSearch(); const query = event.target.value.trim();
  if (query.length >= 2) searchTimer = setTimeout(() => searchRepositories(query), 500);
});
$('repo-search').addEventListener('keydown', (event) => { if (event.key === 'Escape') cancelSearch(); if (event.key === 'ArrowDown' && !$('suggestions').hidden) { event.preventDefault(); $('suggestions').querySelector('button')?.focus(); } });
document.addEventListener('click', (event) => { if (!$('search-form').contains(event.target)) cancelSearch(); });
$('close-profile').addEventListener('click', () => $('profile-dialog').close());
$('profile-dialog').addEventListener('close', () => { profileVersion++; selected = null; syncURL(); document.querySelectorAll('.highlight').forEach((el) => el.classList.remove('highlight')); });
$('share').addEventListener('click', shareProfile);
$('print').addEventListener('click', () => window.print());
document.querySelectorAll('[data-export]').forEach((el) => el.addEventListener('click', () => exportVisualization(el.dataset.export)));
let resizeTimer;
new ResizeObserver(() => { if (!listView) { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 100); } }).observe($('visualization'));
$(listView ? 'list-link' : 'treemap-link').setAttribute('aria-current', 'page');
const params = new URLSearchParams(location.search);
const initial = params.has('repo-owner') && params.has('repo-name') ? `${params.get('repo-owner')}/${params.get('repo-name')}` : 'microsoft/vscode';
loadRepository(initial, true);
