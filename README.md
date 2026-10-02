# DiffFind Launcher

A Manifest V3 Chrome extension that opens **https://app.difffind.com** in a dedicated application window and returns to that window on later launches.

This launcher-focused first iteration is intended for development and validation. Additional browser-integrated functionality may be necessary before Chrome Web Store publication.

## Install and build

Requires Node.js 22+, npm, Make, zip, and Chrome 102+.

```sh
npm ci
npm run check
npm run build
```

The extension has no runtime dependencies. Development dependencies provide formatting, linting, JavaScript type checking, and browser testing. The plain JavaScript/HTML/CSS sources run directly without bundling or remote scripts. `make build` creates `dist/difffind-launcher-0.1.0.zip`; `make clean` removes build artifacts.

## Load unpacked

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select `/Users/since/projects/difffind-chrome-extension` (the directory containing `manifest.json`, not the ZIP or `dist`).
4. Pin **DiffFind Launcher** using Chrome's extensions menu.
5. Click its toolbar icon, then **Open DiffFind** in the popup.

The toolbar popup and its explicit launch button follow the reference architecture. Clicking the toolbar icon alone shows the popup; the button launches the application.

## Window lifecycle

The module service worker owns a single launcher and serializes concurrent requests using a shared promise. It calls `chrome.windows.create` with the fixed hosted URL, `type: 'popup'`, and a 1280×900 size suitable for side-by-side comparison. The reference opened an existing browser tab and specified no window bounds. Chrome chooses the new window's position and adjusts bounds for the display.

The logical application window is named **DiffFind** in configuration and tracked under `difffindWindowId` in `chrome.storage.session`. This persists across service-worker suspension/restarts. Chrome window IDs are only unique within a browser session, so they are deliberately not retained across browser restarts. No JavaScript `window.name` or DOM injection is needed, and the website controls the operating-system window title.

On later launches, the worker checks that ID with `chrome.windows.get`, restores it if minimized, then focuses it without navigating, resizing, or reloading the page. If it has been closed, the stale ID is replaced when the next launch creates a window. Unrelated API failures are surfaced rather than treated as a reason to create a duplicate. A failed storage write retains the newly created ID in the running worker for retry.

Chrome API references: [Windows](https://developer.chrome.com/docs/extensions/reference/api/windows) and [Storage](https://developer.chrome.com/docs/extensions/reference/api/storage).

## Project structure

- `manifest.json`: MV3 configuration, action, worker, icons, and security policy.
- `config.js`: product name, fixed hosted destination, and initial dimensions; future configuration boundary.
- `launcher.js`: window creation, focus, persisted ID, and concurrency coordination.
- `background.js`: message handling shared by every popup instance.
- `popup.html`, `popup.js`, `styles.css`: branded launcher and accessible status feedback.
- `icons/`: 16, 32, 48, and 128 pixel PNGs resized from the existing marketing icon.
- `assets/wordmark.png`: existing DiffFind marketing wordmark.
- `tests/launcher.test.js`: lifecycle, concurrency, and failure regression tests.
- `scripts/validate.mjs`: manifest, icon dimensions, branding, and packaging checks.
- `scripts/browser-test.mjs`: actual extension integration test in isolated Chrome for Testing.
- `Makefile`: allowlisted production ZIP packaging; excludes tests and dependencies.
- `store-assets/`: draft listing and publication checklist; not packaged.

## Verification

```sh
npm run format       # apply formatting
npm run check        # formatting, lint, type checks, unit tests, validation
npm run build
CHROME_PATH='/path/to/Google Chrome for Testing' npm run test:browser
```

Browser testing uses a disposable profile and the real Chrome extension APIs. It clicks the popup button, checks the hosted destination, focus, close/reopen, 50 concurrent requests, and storage-backed recovery. It writes `dist/popup-preview.png`. Use Chrome for Testing because regular branded Chrome versions may reject extension-loading command-line flags.

Manual checks in regular Chrome:

1. Click the toolbar icon and **Open DiffFind**: one dedicated window opens at the hosted URL.
2. Move/resize it and start a comparison; launch again: the same window gains focus without losing its state.
3. Minimize the window; launch again: it is restored.
4. Close it; launch again: a new window opens.
5. Rapidly repeat launch: only one application window remains.
6. Let the worker become inactive at `chrome://extensions`; launch again: the existing window is reused.
7. Check the toolbar icons, popup logo, keyboard focus, and error feedback.

## Permissions and privacy

Only `storage` is requested, for the session-persisted application window ID. The Windows API operations used here require no additional permission. No browsing history, tab content, host access, arbitrary webpage scripts, document content, AI-provider keys, analytics, remote executable JavaScript, or `eval` are used. The hosted application operates under its own privacy policy and may make its own network requests independently of this launcher.

## Configuration and limitations

The destination is currently fixed at **https://app.difffind.com**. `config.js` is the single boundary for a future validated configuration supporting hosted, custom self-hosted, and local instances. No options screen, URL editor, local Docker controls, or connectivity preflight is included.

- This is a launcher; there is no comparison engine or document handling inside the extension.
- An internet connection and access to the hosted application are required. Browser navigation errors appear in the application window.
- Manually opened application tabs are not discovered or adopted.
- Window association resets on browser restart, extension reload/update, or disable/re-enable. Close any old app window before relaunching after those events to avoid an untracked duplicate.
- Reuse tracks the window identity even if the user navigates it elsewhere; the extension does not inspect URLs or page content.
- Browser/process crashes during window creation are outside the rapid-click guarantee.
- Popup text uses the application's system-font approach; the existing wordmark preserves brand typography without remote fonts.

## Before publication

See `store-assets/README.md`. Validate in regular Chrome on target platforms, review current store minimum-functionality requirements, prepare accurate screenshots and listing assets, and complete the privacy and permission declarations. The ZIP is a development build, not a claim of store approval.
