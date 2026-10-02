import test from 'node:test';
import assert from 'node:assert/strict';
import { createLauncher } from '../launcher.js';
import { APP, WINDOW_KEY } from '../config.js';
function fixture() {
  const data = {};
  const windows = new Map();
  let nextId = 1;
  const calls = [];
  const api = {
    storage: {
      session: {
        async get() {
          return { ...data };
        },
        async set(values) {
          Object.assign(data, values);
        },
        async remove(key) {
          delete data[key];
        },
      },
    },
    windows: {
      async get(id) {
        if (!windows.has(id)) throw new Error(`No window with id: ${id}.`);
        return { ...windows.get(id) };
      },
      async create(options) {
        calls.push(options);
        const w = { ...options, id: nextId++, state: 'normal' };
        windows.set(w.id, w);
        return w;
      },
      async update(id, changes) {
        const w = await this.get(id);
        Object.assign(w, changes);
        windows.set(id, w);
        return w;
      },
    },
  };
  return { api, data, windows, calls, launcher: createLauncher(api) };
}
test('first launch creates and persists a hosted popup', async () => {
  const f = fixture();
  const id = await f.launcher.open();
  assert.deepEqual(f.calls, [
    { url: APP.url, type: 'popup', focused: true, width: 1280, height: 900 },
  ]);
  assert.equal(f.data[WINDOW_KEY], id);
});
test('later launches focus without navigating or resizing', async () => {
  const f = fixture();
  const id = await f.launcher.open();
  Object.assign(f.windows.get(id), {
    focused: false,
    width: 1000,
    url: 'https://app.difffind.com/saved',
  });
  assert.equal(await f.launcher.open(), id);
  assert.equal(f.calls.length, 1);
  assert.equal(f.windows.get(id).focused, true);
  assert.equal(f.windows.get(id).width, 1000);
  assert.equal(f.windows.get(id).url, 'https://app.difffind.com/saved');
});
test('closed window is replaced and new ID persisted', async () => {
  const f = fixture();
  const id = await f.launcher.open();
  f.windows.delete(id);
  const replacement = await f.launcher.open();
  assert.notEqual(replacement, id);
  assert.equal(f.data[WINDOW_KEY], replacement);
  assert.equal(f.windows.size, 1);
});
test('100 simultaneous launches share one creation', async () => {
  const f = fixture();
  const ids = await Promise.all(
    Array.from({ length: 100 }, () => f.launcher.open()),
  );
  assert.equal(new Set(ids).size, 1);
  assert.equal(f.calls.length, 1);
});
test('new worker reuses session-persisted ID', async () => {
  const f = fixture();
  const id = await f.launcher.open();
  assert.equal(await createLauncher(f.api).open(), id);
  assert.equal(f.calls.length, 1);
});
test('minimized window is restored', async () => {
  const f = fixture();
  const id = await f.launcher.open();
  f.windows.get(id).state = 'minimized';
  await f.launcher.open();
  assert.equal(f.windows.get(id).state, 'normal');
});
test('creation failure releases concurrency lock', async () => {
  const f = fixture();
  const create = f.api.windows.create;
  f.api.windows.create = async () => {
    throw new Error('Unavailable');
  };
  await assert.rejects(f.launcher.open(), /Unavailable/);
  f.api.windows.create = create;
  await f.launcher.open();
  assert.equal(f.calls.length, 1);
});
test('focus failure does not create a duplicate', async () => {
  const f = fixture();
  await f.launcher.open();
  f.api.windows.update = async () => {
    throw new Error('Focus failed');
  };
  await assert.rejects(f.launcher.open(), /Focus failed/);
  assert.equal(f.calls.length, 1);
});
test('unexpected lookup failure does not create a duplicate', async () => {
  const f = fixture();
  await f.launcher.open();
  f.api.windows.get = async () => {
    throw new Error('API unavailable');
  };
  await assert.rejects(f.launcher.open(), /API unavailable/);
  assert.equal(f.calls.length, 1);
});
test('storage write failure retains live ID for retry', async () => {
  const f = fixture();
  const set = f.api.storage.session.set;
  f.api.storage.session.set = async () => {
    throw new Error('Storage failed');
  };
  await assert.rejects(f.launcher.open(), /Storage failed/);
  f.api.storage.session.set = set;
  await f.launcher.open();
  assert.equal(f.calls.length, 1);
});
test('unrelated normal window is not focused', async () => {
  const f = fixture();
  const id = await f.launcher.open();
  f.windows.get(id).type = 'normal';
  assert.notEqual(await f.launcher.open(), id);
});
