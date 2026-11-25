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
// The frame is sandboxed without allow-popups, so a link click (or the
// deck's own window.open) can't open a new window from here — and a
// cross-site page usually refuses to load inside the frame anyway. Hand
// external links to the parent instead, which opens them in a new tab.
// Same-origin / in-page links keep their normal in-frame behavior.
document.addEventListener('click', function (e) {
  var a = e.target && e.target.closest && e.target.closest('a[href]');
  if (!a || !/^https?:$/.test(a.protocol) || a.origin === location.origin) return;
  e.preventDefault();
  window.parent.postMessage({ type: 'syncboard:open-link', url: a.href }, '*');
}, true);
// The sandboxed frame isn't allowed to go fullscreen itself, so the deck's
// own fullscreen button / F key would silently fail. Route those requests
// to the parent, which fullscreens the whole player (the click/keypress
// inside the frame grants user activation to the parent too).
(function () {
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
      res.type('html').send(injectNavKeyShim(html));
    } catch (err) {
      if (err.code === 'ENOENT') return next();
      next(err);
    }
  };
}
