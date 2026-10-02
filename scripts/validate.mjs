import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions, ['storage']);
assert.equal(manifest.background.type, 'module');
assert.equal(manifest.action.default_popup, 'popup.html');
assert.equal(manifest.options_page, 'options.html');
for (const forbidden of [
  'host_permissions',
  'content_scripts',
  'externally_connectable',
  'key',
  'update_url',
])
  assert.equal(manifest[forbidden], undefined);
assert.equal(
  manifest.content_security_policy.extension_pages,
  "script-src 'self'; object-src 'none'",
);
for (const size of [16, 32, 48, 128]) {
  const file = manifest.icons[size];
  assert.equal(manifest.action.default_icon[size], file);
  const png = await readFile(file);
  assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), size);
  assert.equal(png.readUInt32BE(20), size);
}
for (const file of [
  manifest.background.service_worker,
  manifest.action.default_popup,
  'config.js',
  'launcher.js',
  'popup.js',
  'options.html',
  'options.js',
  'styles.css',
  'assets/wordmark.png',
])
  await readFile(file);
async function scan(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      await scan(path);
      continue;
    }
    if (/\.(png|zip)$/.test(path)) continue;
    const text = await readFile(path, 'utf8');
    assert.ok(
      !new RegExp('perf' + 'load', 'i').test(text),
      `Old branding in ${path}`,
    );
    if (/\.(js|html)$/.test(path))
      assert.ok(
        !/\beval\s*\(|<script[^>]+src=["']https?:/i.test(text),
        `Unsafe script in ${path}`,
      );
  }
}
await scan('.');
console.log(
  'Manifest V3, minimal permissions, icon dimensions, packaged files and branding validated.',
);
