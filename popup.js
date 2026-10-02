const button = document.querySelector('#openDiffFind');
const status = document.querySelector('#status');
if (!(button instanceof HTMLButtonElement) || !(status instanceof HTMLElement))
  throw new Error('Missing launcher controls');
button.addEventListener('click', async () => {
  if (button.disabled) return;
  button.disabled = true;
  status.textContent = 'Opening DiffFind…';
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'OPEN_DIFF_FIND',
    });
    if (!response?.ok) throw new Error('Launch failed');
    window.close();
  } catch {
    status.textContent = 'Unable to open DiffFind. Please try again.';
  } finally {
    button.disabled = false;
  }
});
