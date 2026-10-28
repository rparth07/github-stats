const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
let browser, server, base;
const root = path.resolve(__dirname, '..', 'dist');
const people = Array.from({ length: 100 }, (_, i) => ({ login: i === 0 ? 'test-bot[bot]' : `developer-${i}`, contributions: 1000 - i * 9, avatar_url: 'https://avatars.githubusercontent.com/u/1', html_url: 'https://github.com/example' }));
before(async () => {
  server = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    const resolved = fs.existsSync(file) && fs.statSync(file).isDirectory() ? path.join(file, 'index.html') : file;
    if (!resolved.startsWith(root + path.sep) || !fs.existsSync(resolved)) { res.writeHead(404).end(); return; }
    const ext = path.extname(resolved);
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' })[ext] || 'application/octet-stream');
    for (const line of fs.readFileSync(path.join(root, '_headers'), 'utf8').split('\n').slice(1)) {
      const i = line.indexOf(':'); if (i > 0) res.setHeader(line.slice(0, i).trim(), line.slice(i + 1).trim());
    }
    res.end(fs.readFileSync(resolved));
  }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {});
});
after(async () => { await browser?.close(); server?.close(); });
async function pageWithData(options = {}) {
  const page = await browser.newPage({ viewport: options.mobile ? { width: 375, height: 812 } : { width: 1440, height: 1000 } });
  await page.route('https://avatars.githubusercontent.com/**', (route) => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPuYAAAAASUVORK5CYII=', 'base64'), headers: { 'access-control-allow-origin': '*' } }));
  await page.route('https://api.github.com/**', (route) => {
    const url = route.request().url();
    const headers = { 'access-control-allow-origin': '*' };
    if (url.includes('/users/')) return route.fulfill({ json: { blog: 'https://example.com' }, headers });
    if (url.includes('/search/')) return route.fulfill({ json: { items: [{ full_name: 'example/project' }] }, headers });
    if (url.includes('/missing/')) return route.fulfill({ status: 404, json: {}, headers });
    if (url.includes('/limited/')) return route.fulfill({ status: 403, json: {}, headers });
    if (url.includes('/empty/')) return route.fulfill({ status: 204, headers });
    return route.fulfill({ json: options.people || people, headers });
  });
  return page;
}
async function ready(page, suffix = '/') { await page.goto(base + suffix); await page.waitForFunction(() => document.getElementById('summary').textContent.includes('100 contributors')); }
test('treemap fits desktop and mobile, ranks tiles and has no runtime errors', async () => {
  for (const mobile of [false, true]) {
    const page = await pageWithData({ mobile }); const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await ready(page);
    assert.equal(await page.locator('.tile').count(), 100);
    assert.match(await page.locator('.tile').first().getAttribute('title'), /#1.*1000|#1.*1,000/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await page.locator('.tile').evaluateAll((tiles) => tiles.every((tile) => { const t = tile.getBoundingClientRect(), p = tile.parentElement.getBoundingClientRect(); return t.right <= p.right + 1 && t.bottom <= p.bottom + 1; })), true);
    await page.screenshot({ path: `.test-results/${mobile ? 'mobile' : 'desktop'}.png`, fullPage: true });
    assert.deepEqual(errors, []); await page.close();
  }
});
test('bot share links highlight safely, preserve repo across views, and missing contributors do not crash', async () => {
  const page = await pageWithData();
  await ready(page, '/ListView/?repo-owner=example&repo-name=project&contributor=test-bot%5Bbot%5D');
  assert.equal(await page.locator('.contributor.highlight').count(), 1);
  await page.locator('.contributor.highlight button').click();
  await page.locator('#portfolio a').waitFor();
  assert.equal(await page.locator('#portfolio a').getAttribute('href'), 'https://example.com/');
  assert.match(await page.locator('#treemap-link').getAttribute('href'), /contributor=test-bot/);
  await page.locator('#close-profile').click();
  await page.waitForFunction(() => !new URL(location.href).searchParams.has('contributor'));
  assert.equal(new URL(page.url()).searchParams.has('contributor'), false);
  await ready(page, '/?repo-owner=example&repo-name=project&contributor=missing');
  assert.match(await page.locator('#status').textContent(), /not in this repository/);
  await page.close();
});
test('Generate handles direct URLs, search selection, empty repos, 404 and rate limits', async () => {
  const page = await pageWithData(); await ready(page);
  assert.equal(await page.locator('#map-state').isVisible(), false);
  for (const [input, expected] of [['https://github.com/example/another', '100 contributors'], ['missing/repo', 'Unable to load'], ['limited/repo', 'Unable to load'], ['empty/repo', '0 contributors']]) {
    await page.locator('#repo-search').fill(input); await page.locator('#generate').click();
    await page.waitForFunction((text) => document.getElementById('summary').textContent.includes(text), expected);
    if (input.startsWith('limited')) assert.match(await page.locator('#status').textContent(), /rate limit/);
    if (!input.startsWith('https')) {
      assert.equal(await page.locator('[data-export=svg]').isDisabled(), true);
      assert.equal(await page.locator('#map-state').isVisible(), true);
      assert.match(await page.locator('#map-state-title').textContent(), input.startsWith('empty') ? /No contributors/ : /couldn’t load/);
    }
  }
  await page.locator('#repo-search').fill('example'); await page.locator('#suggestions button').waitFor();
  await page.locator('#suggestions button').click();
  await page.waitForFunction(() => document.getElementById('summary').textContent.includes('100 contributors'));
  assert.match(page.url(), /repo-owner=example&repo-name=project/);
  assert.equal(await page.locator('#map-state').isVisible(), false);
  await page.close();
});
test('keyboard navigation can skip the header and reach labeled repository controls', async () => {
  const page = await pageWithData(); await ready(page);
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('.skip-link').evaluate(link => document.activeElement === link), true);
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'main');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'repo-search');
  assert.equal(await page.locator('#treemap-link').getAttribute('aria-current'), 'page');
  await page.close();
});
test('SVG, PNG and JPEG exports download valid images with CSP enabled', async () => {
  const page = await pageWithData(); await ready(page);
  for (const format of ['svg', 'png', 'jpeg']) {
    const pending = page.waitForEvent('download'); await page.locator(`[data-export=${format}]`).click();
    const download = await pending, file = await download.path(), bytes = fs.readFileSync(file);
    assert.ok(bytes.length > 100);
    if (format === 'svg') assert.match(bytes.toString(), /data:image\/png;base64/);
    if (format === 'png') assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    if (format === 'jpeg') assert.equal(bytes[0], 255);
  }
  await page.emulateMedia({ media: 'print' }); assert.equal(await page.locator('.exports').isVisible(), false);
  await page.pdf({ path: '.test-results/contributors.pdf' });
  await page.close();
});
async function tileBoxes(page) {
  return page.locator('.tile').evaluateAll((tiles) => tiles.map((tile) => {
    const { x, y, width, height } = tile.getBoundingClientRect(); return { x, y, width, height };
  }));
}
async function finishMotion(page) {
  await page.waitForFunction(() => document.querySelectorAll('.tile').length > 0 && [...document.querySelectorAll('.tile, .contributor-preview')].every((tile) => tile.getAnimations().length === 0));
}
async function pointAtTile(page, index) {
  await page.mouse.move(0, 0);
  const box = await page.locator('.tile').nth(index).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await waitForPreview(page, people[index].login);
}
async function waitForPreview(page, login) {
  await page.waitForFunction((login) => {
    const card = document.querySelector('.contributor-preview');
    return card && !card.hidden && !card.classList.contains('closing') && card.dataset.login === login;
  }, login);
  await finishMotion(page);
}
function assertTiling(boxes, bounds) {
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i];
    assert.ok(a.x >= bounds.x - 1 && a.y >= bounds.y - 1 && a.x + a.width <= bounds.x + bounds.width + 1 && a.y + a.height <= bounds.y + bounds.height + 1, 'tile stays inside the treemap');
    for (let j = i + 1; j < boxes.length; j++) {
      const b = boxes[j];
      assert.ok(Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) < .5 || Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) < .5, 'tiles do not overlap');
    }
  }
}
test('hover shows a readable full-image card without shifting the surrounding grid, then dismisses it', async () => {
  const page = await pageWithData(); await page.setViewportSize({ width: 1440, height: 1600 }); await ready(page);
  const original = await tileBoxes(page), bounds = await page.locator('#visualization').boundingBox();
  for (const index of [0, 50, 99]) {
    const box = original[index];
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await waitForPreview(page, people[index].login);
    const preview = page.locator('.contributor-preview');
    const expandedBox = await preview.boundingBox();
    assert.ok(expandedBox.width >= 240 && expandedBox.height >= 290, 'preview has readable minimum dimensions');
    assert.equal(await preview.locator('img').evaluate(img => getComputedStyle(img).objectFit), 'contain');
    (await tileBoxes(page)).forEach((b, i) => {
      for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(b[key] - original[i][key]) < .1, 'grid stays in place');
    });
    assert.ok(expandedBox.x >= 15 && expandedBox.x + expandedBox.width <= 1425, 'preview remains inside the window');
    await page.screenshot({ path: `.test-results/hover-${index}.png`, fullPage: true });
    assert.equal(await page.locator('.tile.expanded').getAttribute('data-login'), people[index].login, 'stationary pointer retains the same expanded tile');
    await page.mouse.move(0, 0);
    await preview.waitFor({ state: 'hidden' });
    await finishMotion(page);
    assert.equal(await preview.isVisible(), false);
    const restored = await tileBoxes(page);
    restored.forEach((b, i) => { for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(b[key] - original[i][key]) < .1, 'original geometry returns'); });
  }
  await page.close();
});
test('the source tile stays clickable and touch does not leave a sticky zoom', async () => {
  const page = await pageWithData(); await page.setViewportSize({ width: 1440, height: 1600 }); await ready(page);
  const tile = page.locator('.tile').nth(50), original = await tile.boundingBox();
  await pointAtTile(page, 50); await finishMotion(page);
  await page.mouse.click(original.x + original.width / 2, original.y + original.height / 2);
  await page.locator('#profile-dialog[open]').waitFor();
  assert.match(await page.locator('#profile-name').textContent(), /developer-50/);
  await page.locator('#close-profile').click();
  await page.mouse.move(0, 0); await page.locator('#repo-search').focus(); await finishMotion(page);
  assert.ok(Math.abs((await tile.boundingBox()).width - original.width) < .1);
  await page.close();
  const touch = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const touchPage = await touch.newPage();
  await touchPage.route('https://api.github.com/**', route => route.fulfill({ json: route.request().url().includes('/users/') ? {} : people, headers: { 'access-control-allow-origin': '*' } }));
  await ready(touchPage);
  await touchPage.locator('.tile').first().tap();
  await touchPage.locator('#profile-dialog[open]').waitFor();
  assert.equal(await touchPage.locator('.tile.expanded').count(), 0);
  await touch.close();
});
test('keyboard expansion supports reduced motion, rapid retargeting and resize', async () => {
  const page = await pageWithData(); await page.setViewportSize({ width: 1440, height: 1600 }); await ready(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const before = await tileBoxes(page);
  await page.locator('.tile').nth(40).focus();
  assert.equal(await page.locator('.tile.expanded').getAttribute('data-login'), people[40].login);
  assert.ok((await page.locator('.contributor-preview').boundingBox()).width >= 240);
  assert.equal(await page.locator('.tile').evaluateAll(tiles => tiles.flatMap(t => t.getAnimations()).length), 0);
  await page.locator('#repo-search').focus();
  for (const index of [2, 61, 98, 20]) await pointAtTile(page, index);
  await page.mouse.move(0, 0);
  await page.setViewportSize({ width: 700, height: 1000 });
  await page.waitForFunction(() => [...document.querySelectorAll('.tile')].every(tile => tile.getBoundingClientRect().right <= document.getElementById('visualization').getBoundingClientRect().right + 1));
  assertTiling(await tileBoxes(page), await page.locator('#visualization').boundingBox());
  await page.close();
});
test('every small card has a full image and unclipped footer at the reported viewport, including long bot names', async () => {
  const data = people.map((c, i) => ({ ...c, contributions: Math.max(1, Math.round(1000000 / (i + 1) ** 3)) }));
  data[63].login = 'rwoll';
  data[99].login = 'github-enterprise-automation-service[bot]';
  const page = await pageWithData({ people: data });
  await page.setViewportSize({ width: 726, height: 1532 });
  await page.emulateMedia({ reducedMotion: 'reduce' }); await ready(page);
  for (let i = 0; i < 100; i++) {
    await page.locator('.tile').nth(i).focus();
    const card = page.locator('.contributor-preview');
    const box = await card.boundingBox();
    const source = await page.locator('.tile').nth(i).boundingBox();
    const gaps = [box.x - source.x - source.width, source.x - box.x - box.width, box.y - source.y - source.height, source.y - box.y - box.height];
    assert.ok(gaps.some(gap => Math.abs(gap - 12) < 1), `card ${i + 1} stays 12px from its source tile`);
    assert.ok(box.width >= 240 && box.x >= 15 && box.x + box.width <= 711 && box.y >= 15 && box.y + box.height <= 1517, `card ${i + 1} is readable and fits the viewport`);
    assert.equal(await card.locator('strong').textContent(), `#${i + 1} @${data[i].login}`);
    assert.equal(await card.locator('img').evaluate(img => getComputedStyle(img).objectFit), 'contain');
    assert.equal(await card.locator('.preview-footer').evaluate(footer => [footer, ...footer.children].every(e => e.scrollWidth <= e.clientWidth && e.scrollHeight <= e.clientHeight && getComputedStyle(e).textOverflow !== 'ellipsis')), true, `card ${i + 1} footer is not clipped`);
  }
  await page.mouse.move(0, 0); await page.locator('#repo-search').focus();
  const tile = page.locator('.tile').nth(63);
  const source = await tile.boundingBox();
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await waitForPreview(page, 'rwoll');
  await page.mouse.click(source.x + source.width / 2, source.y + source.height / 2);
  await page.locator('#profile-dialog[open]').waitFor();
  assert.equal(await page.locator('#profile-name').textContent(), '@rwoll');
  await page.close();
});
test('crossing the grid from the right does not open previews, and paused previews stay beside their source', async () => {
  const page = await pageWithData();
  await page.setViewportSize({ width: 726, height: 1532 }); await ready(page);
  const grid = await page.locator('#visualization').boundingBox();
  const target = page.locator('.tile').nth(63);
  const box = await target.boundingBox();
  await page.mouse.move(725, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
  assert.equal(await page.locator('.contributor-preview:visible').count(), 0, 'moving through tiles opens no card');
  await page.waitForTimeout(150);
  assert.equal(await page.locator('.contributor-preview:visible').count(), 0, 'preview waits for a deliberate pause');
  await waitForPreview(page, people[63].login);
  const card = await page.locator('.contributor-preview').boundingBox();
  const gap = box.x - card.x - card.width;
  assert.ok(Math.abs(gap - 12) < 1 || Math.abs(card.x - box.x - box.width - 12) < 1, 'preview sits 12px beside the source');
  const other = page.locator('.tile').nth(90), otherBox = await other.boundingBox();
  await page.mouse.move(otherBox.x + otherBox.width / 2, otherBox.y + otherBox.height / 2, { steps: 8 });
  await page.mouse.click(otherBox.x + otherBox.width / 2, otherBox.y + otherBox.height / 2);
  await page.locator('#profile-dialog[open]').waitFor();
  assert.equal(await page.locator('#profile-name').textContent(), `@${people[90].login}`, 'click opens the intended tile immediately');
  await page.locator('#close-profile').click();
  await page.locator('#repo-search').focus(); await page.mouse.move(0, 0);
  await page.waitForTimeout(450);
  assert.equal(await page.locator('.contributor-preview:visible').count(), 0, 'pending previews are cancelled after opening a profile');
  await page.close();
});
test('a preview cannot intercept other tiles when the window has no space outside the grid', async () => {
  const page = await pageWithData(); await page.setViewportSize({ width: 726, height: 600 }); await ready(page);
  await page.evaluate(() => window.scrollTo(0, document.getElementById('visualization').offsetTop - 16));
  await page.waitForFunction(() => Math.abs(document.getElementById('visualization').getBoundingClientRect().top - 16) < 2);
  await pointAtTile(page, 63);
  assert.equal(await page.locator('.contributor-preview').evaluate(card => getComputedStyle(card).pointerEvents), 'none');
  const box = await page.locator('.tile').nth(80).boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.locator('#profile-dialog[open]').waitFor();
  assert.equal(await page.locator('#profile-name').textContent(), `@${people[80].login}`);
  await page.close();
});
