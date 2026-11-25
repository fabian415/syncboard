import path from 'node:path';
import fs from 'node:fs/promises';
import express from 'express';

// Runs inside the uploaded deck's own document (same opaque sandboxed
// origin as the deck itself — see HtmlAssetViewerModal.vue for why we
// can't just focus() the iframe from the parent page). Re-dispatches
// nav-key messages forwarded by the parent as a normal `keydown`, which
// the deck's own existing key handler picks up exactly like a real
// keypress. Restricted to messages from window.parent since targetOrigin
// has to be '*' for an opaque-origin frame (there's no origin string the
// parent could name instead).
const NAV_KEY_SHIM = `
<script>
addEventListener('message', function (e) {
  if (e.source !== window.parent) return;
  var data = e.data;
  if (!data || data.type !== 'syncboard:key') return;
  document.dispatchEvent(new KeyboardEvent('keydown', {
    key: data.key,
    code: data.code,
    bubbles: true,
    cancelable: true,
  }));
});
// Everything below only applies while playing inside the SyncBoard player
// iframe. Opened as its own tab, the deck runs as a normal page (still
// sandboxed by the CSP header set below).
var inPlayer = window.parent !== window;
// The player frame is sandboxed without allow-popups, so a link click
// can't open a new window from here — and a cross-site page usually
// refuses to load inside the frame anyway. Hand links to the parent
// instead, which opens them in a new tab.
document.addEventListener('click', function (e) {
  if (!inPlayer) return;
  var a = e.target && e.target.closest && e.target.closest('a[href]');
  if (!a || !/^https?:$/.test(a.protocol)) return;
  // A link back into this same deck (only the #fragment differs, e.g.
  // "#slide-3") is in-deck navigation: follow it here instead of popping
  // the deck open a second time.
  if (a.origin === location.origin && a.pathname === location.pathname && a.search === location.search) {
    if (a.target && a.target !== '_self') {
      e.preventDefault();
      location.hash = a.hash;
    }
    return;
  }
  e.preventDefault();
  window.parent.postMessage({ type: 'syncboard:open-link', url: a.href }, '*');
}, true);
// The sandboxed frame isn't allowed to go fullscreen itself, so the deck's
// own fullscreen button / F key would silently fail. Route those requests
// to the parent, which fullscreens the whole player (the click/keypress
// inside the frame grants user activation to the parent too).
if (inPlayer) (function () {
  function forwardFullscreen() {
    window.parent.postMessage({ type: 'syncboard:fullscreen' }, '*');
    return Promise.resolve();
  }
  var proto = Element.prototype;
  proto.requestFullscreen = forwardFullscreen;
  proto.webkitRequestFullscreen = forwardFullscreen;
  proto.webkitRequestFullScreen = forwardFullscreen;
})();
</script>
`;

function injectNavKeyShim(html) {
  if (html.includes('</head>')) return html.replace('</head>', `${NAV_KEY_SHIM}</head>`);
  const bodyTag = html.match(/<body[^>]*>/i);
  if (bodyTag) return html.replace(bodyTag[0], `${bodyTag[0]}${NAV_KEY_SHIM}`);
  return NAV_KEY_SHIM + html;
}

// Bypassing express.static for the html branch below means its built-in
// path-traversal guard doesn't apply here, so re-derive the same guarantee:
// decode, resolve against root, and reject anything that resolves outside it.
function resolveWithinRoot(root, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const resolved = path.resolve(root, `.${decoded}`);
  const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) return null;
  return resolved;
}

// Serves the same subtree express.static would, except .html/.htm files get
// the shim above injected before serving — keeps deck HTML on disk
// untouched (re-injected fresh on every request) and everything else
// (slide PNGs, etc.) on the ordinary express.static path.
export function deepDiveAssetsMiddleware(staticRoot) {
  const serveStatic = express.static(staticRoot);

  return async function deepDiveAssets(req, res, next) {
    if (!/\.html?$/i.test(req.path)) return serveStatic(req, res, next);

    const filePath = resolveWithinRoot(staticRoot, req.path);
    if (!filePath) return res.status(400).end();

    try {
      const html = await fs.readFile(filePath, 'utf-8');
      // Uploaded HTML is untrusted. The player's iframe sandbox only protects
      // it while it's inside that iframe; this header sandboxes the document
      // itself, so it stays on an opaque origin (no access to this app's
      // cookies/storage/API) even when opened directly as its own tab — e.g.
      // via a link in another deck. That's what makes it safe for the player
      // to open same-origin /deep-dive-assets links in a new tab.
      res.set('Content-Security-Policy', 'sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox');
      res.type('html').send(injectNavKeyShim(html));
    } catch (err) {
      if (err.code === 'ENOENT') return next();
      next(err);
    }
  };
}
