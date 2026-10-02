import { createLauncher } from './launcher.js';
const launcher = createLauncher(chrome);
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || message?.type !== 'OPEN_DIFF_FIND')
    return false;
  launcher.open().then(
    (windowId) => sendResponse({ ok: true, windowId }),
    (error) => {
      console.error('Unable to open DiffFind:', error);
      sendResponse({ ok: false });
    },
  );
  return true;
});
