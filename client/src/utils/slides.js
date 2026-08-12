const SLIDE_DELIMITER = /<!--\s*SLIDE\s*-->/i;
// A slide only counts as having real content if it has at least one list
// item or content block beyond its heading(s) — a page that's just an
// <h1>/<h2> with nothing under it is empty and shouldn't be shown.
const CONTENT_RE = /<li[\s>]|<div[\s>]/i;

export function parseSlides(content) {
  if (!content || !content.trim()) return [];
  return content
    .split(SLIDE_DELIMITER)
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 0);
}

export function serializeSlides(pages) {
  return pages.join('\n<!-- SLIDE -->\n');
}

// Drops pages that carry no real content (e.g. a trailing "下週計畫與討論"
// page whose sections were all empty), so slideshow playback doesn't land
// on a blank page. Falls back to the unfiltered pages if that would leave
// nothing to show.
export function filterMeaningfulSlides(pages) {
  const filtered = pages.filter((page) => CONTENT_RE.test(page));
  return filtered.length > 0 ? filtered : pages;
}
