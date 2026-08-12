const SLIDE_DELIMITER = /<!--\s*SLIDE\s*-->/i;
const HEADING_RE = /<h1[\s>]|<h2[\s>]/i;

export class InvalidSlidesError extends Error {}

export function parseSlides(content) {
  if (!content || !content.trim()) {
    return [];
  }

  const pages = content
    .split(SLIDE_DELIMITER)
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 0);

  return pages;
}

export function validateSlides(pages) {
  if (pages.length < 1 || pages.length > 2) {
    throw new InvalidSlidesError(`Expected 1-2 slides, got ${pages.length}`);
  }
  for (const page of pages) {
    if (!HEADING_RE.test(page)) {
      throw new InvalidSlidesError('Each slide must contain at least one heading (<h1> or <h2>)');
    }
  }
  return pages;
}

export function serializeSlides(pages) {
  return pages.join('\n<!-- SLIDE -->\n');
}
