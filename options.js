import { APP, URL_KEY, getAppUrl, parseAppUrl } from './config.js';
const form = document.querySelector('#form');
const input = document.querySelector('#url');
const reset = document.querySelector('#reset');
const status = document.querySelector('#status');
if (
  !(form instanceof HTMLFormElement) ||
  !(input instanceof HTMLInputElement) ||
  !(reset instanceof HTMLButtonElement) ||
  !(status instanceof HTMLElement)
)
  throw new Error('Missing settings controls');
getAppUrl(chrome).then((href) => {
  input.value = href;
});
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const href = parseAppUrl(input.value);
  if (!href) {
    status.className = 'err';
    status.textContent = 'Enter a valid http(s) URL.';
    return;
  }
  await chrome.storage.local.set({ [URL_KEY]: href });
  input.value = href;
  status.className = 'ok';
  status.textContent =
    'Saved. An already-open DiffFind window keeps its current page.';
});
reset.addEventListener('click', async () => {
  await chrome.storage.local.remove(URL_KEY);
  input.value = APP.url;
  status.className = 'ok';
  status.textContent = 'Reset to default.';
});
