import { APP, WINDOW_KEY, getAppUrl } from './config.js';
/** @param {Pick<typeof chrome, 'windows' | 'storage'>} api */
export function createLauncher(api) {
  /** @type {Promise<number> | undefined} */
  let inFlight;
  // Retain ID if storage fails after creation, so retry cannot duplicate it.
  /** @type {number | undefined} */
  let liveId;
  async function open() {
    const stored = await api.storage.session.get(WINDOW_KEY);
    const id = liveId ?? stored[WINDOW_KEY];
    if (typeof id === 'number' && Number.isInteger(id) && id >= 0) {
      /** @type {chrome.windows.Window | undefined} */
      let existing;
      try {
        existing = await api.windows.get(id);
      } catch (error) {
        // Only a missing window is a reason to create another.
        if (
          !(error instanceof Error) ||
          !/No window with id/i.test(error.message)
        )
          throw error;
      }
      if (existing?.type === 'popup') {
        if (existing.state === 'minimized')
          await api.windows.update(id, { state: 'normal' });
        await api.windows.update(id, { focused: true });
        await api.storage.session.set({ [WINDOW_KEY]: id });
        liveId = id;
        return id;
      }
      liveId = undefined;
      await api.storage.session.remove(WINDOW_KEY);
    }
    const created = await api.windows.create({
      url: await getAppUrl(api),
      type: 'popup',
      focused: true,
      width: APP.width,
      height: APP.height,
    });
    if (created?.id === undefined)
      throw new Error('Chrome did not return an application window ID.');
    liveId = created.id;
    await api.storage.session.set({ [WINDOW_KEY]: created.id });
    return created.id;
  }
  return {
    open() {
      // Assign before any await; every popup shares this worker.
      if (!inFlight)
        inFlight = open().finally(() => {
          inFlight = undefined;
        });
      return inFlight;
    },
  };
}
