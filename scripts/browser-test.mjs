import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
const executablePath = process.env.CHROME_PATH;
if (!executablePath)
  throw new Error('Set CHROME_PATH to a Chrome for Testing executable.');
const profile = await mkdtemp(join(tmpdir(), 'difffind-test-'));
let browser;
try {
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    userDataDir: profile,
    args: [
      `--disable-extensions-except=${resolve('.')}`,
      `--load-extension=${resolve('.')}`,
    ],
  });
  const target = await browser.waitForTarget(
    (t) => t.type() === 'service_worker',
  );
  const worker = await target.worker();
  const workerUrl = new URL(target.url());
  const origin = `${workerUrl.protocol}//${workerUrl.host}`;
  // Open the actual extension popup document and click its actual button.
  const popup = await browser.newPage();
  await popup.goto(`${origin}/popup.html`);
  await popup.setViewport({ width: 380, height: 340 });
  await mkdir('dist', { recursive: true });
  await popup.screenshot({ path: 'dist/popup-preview.png' });
  await popup.click('#openDiffFind');
  async function state() {
    return worker.evaluate(async () => ({
      data: await chrome.storage.session.get('difffindWindowId'),
      windows: await chrome.windows.getAll(),
    }));
  }
  let first;
  for (let attempt = 0; attempt < 50; attempt++) {
    first = await state();
    if (first.data.difffindWindowId !== undefined) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  const id = first.data.difffindWindowId;
  assert.equal(typeof id, 'number');
  assert.equal(first.windows.find((w) => w.id === id).type, 'popup');
  await browser.waitForTarget(
    (t) => t.url().startsWith('https://app.difffind.com'),
    { timeout: 15000 },
  );
  // Messaging from a separate extension page exercises the shared worker.
  const control = await browser.newPage();
  await control.goto(`${origin}/popup.html`);
  const open = () =>
    control.evaluate(() =>
      chrome.runtime.sendMessage({ type: 'OPEN_DIFF_FIND' }),
    );
  assert.equal((await open()).windowId, id);
  assert.equal((await state()).windows.find((w) => w.id === id).focused, true);
  const responses = await control.evaluate(() =>
    Promise.all(
      Array.from({ length: 50 }, () =>
        chrome.runtime.sendMessage({ type: 'OPEN_DIFF_FIND' }),
      ),
    ),
  );
  assert.ok(responses.every((r) => r.ok && r.windowId === id));
  await worker.evaluate((id) => chrome.windows.remove(id), id);
  const reopened = await open();
  assert.ok(reopened.ok);
  assert.notEqual(reopened.windowId, id);
  await worker.evaluate((id) => chrome.windows.remove(id), reopened.windowId);
  const burst = await control.evaluate(() =>
    Promise.all(
      Array.from({ length: 50 }, () =>
        chrome.runtime.sendMessage({ type: 'OPEN_DIFF_FIND' }),
      ),
    ),
  );
  assert.ok(burst.every((r) => r.ok));
  assert.equal(new Set(burst.map((r) => r.windowId)).size, 1);
  assert.equal(
    (await state()).windows.filter((w) => w.type === 'popup').length,
    1,
  );
  // Simulate a fresh launcher instance to verify storage-backed recovery.
  assert.equal(
    await worker.evaluate(async () => {
      const { createLauncher } = await import(
        chrome.runtime.getURL('launcher.js')
      );
      return createLauncher(chrome).open();
    }),
    burst[0].windowId,
  );
  console.log(
    'Browser PASS: popup click, hosted URL, focus, close/reopen, 50-click bursts, persisted recovery, one application window.',
  );
} finally {
  await browser?.close();
  await rm(profile, { recursive: true, force: true });
}
