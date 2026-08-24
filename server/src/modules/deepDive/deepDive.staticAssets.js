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
