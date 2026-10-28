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
    return route.fulfill({ json: people, headers });
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
  for (const [input, expected] of [['https://github.com/example/another', '100 contributors'], ['missing/repo', 'Unable to load'], ['limited/repo', 'Unable to load'], ['empty/repo', '0 contributors']]) {
    await page.locator('#repo-search').fill(input); await page.locator('#generate').click();
    await page.waitForFunction((text) => document.getElementById('summary').textContent.includes(text), expected);
    if (input.startsWith('limited')) assert.match(await page.locator('#status').textContent(), /rate limit/);
    if (!input.startsWith('https')) assert.equal(await page.locator('[data-export=svg]').isDisabled(), true);
  }
  await page.locator('#repo-search').fill('example'); await page.locator('#suggestions button').waitFor();
  await page.locator('#suggestions button').click();
  await page.waitForFunction(() => document.getElementById('summary').textContent.includes('100 contributors'));
  assert.match(page.url(), /repo-owner=example&repo-name=project/);
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
  await page.waitForFunction(() => document.querySelectorAll('.tile').length > 0 && [...document.querySelectorAll('.tile')].every((tile) => tile.getAnimations().length === 0));
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
test('hover expands tiles, moves neighbors without overlap, stays stable, and restores the layout', async () => {
  const page = await pageWithData(); await page.setViewportSize({ width: 1440, height: 1600 }); await ready(page);
  const original = await tileBoxes(page), bounds = await page.locator('#visualization').boundingBox();
  for (const index of [0, 50, 99]) {
    const box = original[index];
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await finishMotion(page);
    const expanded = await tileBoxes(page);
    assert.ok(expanded[index].width > box.width && expanded[index].height > box.height, `hovered photo ${index} expands in both dimensions: ${JSON.stringify({ before: box, after: expanded[index] })}`);
    assert.ok(expanded.some((b, i) => i !== index && (Math.abs(b.x - original[i].x) > 1 || Math.abs(b.y - original[i].y) > 1)), 'neighbors move aside');
    assertTiling(expanded, bounds);
    await page.screenshot({ path: `.test-results/hover-${index}.png`, fullPage: true });
    assert.equal(await page.locator('.tile.expanded').getAttribute('data-login'), people[index].login, 'stationary pointer retains the same expanded tile');
    const expandedBox = expanded[index];
    await page.mouse.move(expandedBox.x + expandedBox.width - 5, expandedBox.y + expandedBox.height / 2);
    assert.equal(await page.locator('.tile.expanded').getAttribute('data-login'), people[index].login, 'expanded hit area remains interactive');
    await page.mouse.move(bounds.x - 10, bounds.y - 10);
    await finishMotion(page);
    const restored = await tileBoxes(page);
    restored.forEach((b, i) => { for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(b[key] - original[i][key]) < .1, 'original geometry returns'); });
  }
  await page.close();
});
test('keyboard expansion supports reduced motion, rapid retargeting and resize', async () => {
  const page = await pageWithData(); await ready(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const before = await tileBoxes(page);
  await page.locator('.tile').nth(40).focus();
  assert.equal(await page.locator('.tile.expanded').getAttribute('data-login'), people[40].login);
  assert.ok((await tileBoxes(page))[40].width > before[40].width);
  assert.equal(await page.locator('.tile').evaluateAll(tiles => tiles.flatMap(t => t.getAnimations()).length), 0);
  await page.locator('#repo-search').focus();
  for (const index of [2, 61, 98, 20]) await page.locator('.tile').nth(index).hover();
  await page.mouse.move(0, 0);
  await page.setViewportSize({ width: 700, height: 1000 });
  await page.waitForFunction(() => [...document.querySelectorAll('.tile')].every(tile => tile.getBoundingClientRect().right <= document.getElementById('visualization').getBoundingClientRect().right + 1));
  assertTiling(await tileBoxes(page), await page.locator('#visualization').boundingBox());
  await page.close();
});
