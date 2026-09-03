const SLIDE_DELIMITER = /<!--\s*SLIDE\s*-->/i;
// A slide only counts as having real content if it has at least one list
// item or content block beyond its heading(s) — a page that's just an
// <h1>/<h2> with nothing under it is empty and shouldn't be shown. A lone
// <video> counts too: a demo-clip-only page is a legitimate slide.
const CONTENT_RE = /<li[\s>]|<div[\s>]|<video[\s>]/i;

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

// Locates which rendered slide contains a search query, so a search result
// can jump to the right page even though filterMeaningfulSlides/autoPaginate
// may have dropped or re-split pages since the query was first matched.
export function findSlideIndexContaining(pages, query) {
  const q = query?.trim().toLowerCase();
  if (!q) return -1;
  const div = document.createElement('div');
  for (let i = 0; i < pages.length; i += 1) {
    div.innerHTML = pages[i];
    if ((div.textContent || '').toLowerCase().includes(q)) return i;
  }
  return -1;
}

const CONTINUED_SUFFIX = '（續）';

function cloneWithContinuedSuffix(el) {
  const clone = el.cloneNode(true);
  if (!clone.textContent.includes(CONTINUED_SUFFIX)) {
    clone.textContent = `${clone.textContent}${CONTINUED_SUFFIX}`;
  }
  return clone;
}

// A "section" is an <h2> plus every sibling node up to (not including) the
// next <h2> — the natural unit a real report page is built from (heading +
// its list/card). Nodes appearing before any <h2> are grouped headless.
function groupIntoSections(bodyNodes) {
  const sections = [];
  let current = null;
  for (const node of bodyNodes) {
    if (node.tagName === 'H2' || !current) {
      current = { heading: node.tagName === 'H2' ? node : null, blocks: node.tagName === 'H2' ? [] : [node] };
      sections.push(current);
    } else {
      current.blocks.push(node);
    }
  }
  return sections;
}

// Sections that only make sense next to the one above them. 「補充說明
// (Why)」 is the rationale for the 「核心重點 (Key Highlights)」 bullets and
// the screenshots that go with them, so an <h2> page break between the two
// strands the Why on a page of its own with nothing to explain — the exact
// symptom this guards against. Matched on the heading text, since the
// prompts number the headings ("2. 補充說明 (Why)").
const STICKY_HEADING_RE = /補充說明|[(（]\s*why\s*[)）]/i;

// Folds every sticky section into the section it belongs to, producing one
// indivisible unit (heading + list + images/video + Why card). `atomic`
// marks those merged units so pagination keeps them whole on one page —
// letting an oversized one scroll — instead of splitting them.
function mergeStickySections(sections) {
  const merged = [];
  for (const section of sections) {
    const prev = merged[merged.length - 1];
    if (prev && section.heading && STICKY_HEADING_RE.test(section.heading.textContent || '')) {
      prev.blocks.push(section.heading, ...section.blocks);
      prev.atomic = true;
      continue;
    }
    merged.push(section);
  }
  return merged;
}

// Finds the <ul>/<ol> that carries a section's bulk content, so an
// oversized section can be split item-by-item instead of all-or-nothing.
// Returns the wrapping element too (e.g. <div class="card">) if the list
// isn't a direct top-level block, so it can be reconstructed per chunk.
function findListBlock(blocks) {
  for (const block of blocks) {
    if (block.tagName === 'UL' || block.tagName === 'OL') return { list: block, wrapper: null };
    const nested = block.querySelector?.('ul, ol');
    if (nested) return { list: nested, wrapper: block };
  }
  return null;
}

// Splits a single rendered slide's HTML into as many slides as needed to
// fit within `height` at the given `width`, measured against the real
// .presentation-slide styling. Breaks preferably at <h2> section boundaries,
// falling back to splitting a section's own list item-by-item when even one
// section alone overflows a full page. Best-effort: content that still
// can't be split further (no list to break) is left to overflow/scroll
// rather than dropped.
export function autoPaginateHtml(html, { width, height } = {}) {
  if (typeof document === 'undefined' || !html || !html.trim()) return [html];
  if (!(width > 0) || !(height > 0)) return [html];

  const measurer = document.createElement('div');
  measurer.className = 'presentation-slide';
  measurer.style.position = 'fixed';
  measurer.style.top = '0';
  measurer.style.left = '-99999px';
  measurer.style.visibility = 'hidden';
  measurer.style.overflow = 'visible';
  measurer.style.height = 'auto';
  measurer.style.width = `${width}px`;
  measurer.style.pointerEvents = 'none';
  document.body.appendChild(measurer);

  const fits = () => measurer.scrollHeight <= height + 1;
  const setMeasurerContent = (elements) => {
    measurer.innerHTML = '';
    elements.forEach((el) => measurer.appendChild(el));
  };

  try {
    const template = document.createElement('template');
    template.innerHTML = html;
    const nodes = Array.from(template.content.childNodes).filter((n) => n.nodeType === 1);
    if (nodes.length === 0) return [html];

    const titleNode = nodes[0].tagName === 'H1' ? nodes[0] : null;
    const sections = mergeStickySections(groupIntoSections(titleNode ? nodes.slice(1) : nodes));

    const pages = [];
    let pageNodes = [];

    const startNewPage = (isContinuation) => {
      if (pageNodes.length) pages.push(pageNodes.map((n) => n.outerHTML).join(''));
      pageNodes = titleNode ? [isContinuation ? cloneWithContinuedSuffix(titleNode) : titleNode.cloneNode(true)] : [];
      setMeasurerContent(pageNodes);
    };

    startNewPage(false);

    for (const section of sections) {
      const candidateNodes = section.heading ? [section.heading, ...section.blocks] : section.blocks;
      const trial = [...pageNodes, ...candidateNodes.map((n) => n.cloneNode(true))];
      setMeasurerContent(trial);
      if (fits()) {
        pageNodes = trial;
        continue;
      }

      const hasOtherContent = pageNodes.length > (titleNode ? 1 : 0);
      if (hasOtherContent) {
        startNewPage(true);
        const freshTrial = [...pageNodes, ...candidateNodes.map((n) => n.cloneNode(true))];
        setMeasurerContent(freshTrial);
        if (fits()) {
          pageNodes = freshTrial;
          continue;
        }
      }

      // 核心重點 + 圖片 + 補充說明 is one indivisible unit. It has a page to
      // itself by this point and still doesn't fit, so keep it whole at full
      // size and let the slide scroll — never split it across pages.
      if (section.atomic) {
        pageNodes = [...pageNodes, ...candidateNodes.map((n) => n.cloneNode(true))];
        setMeasurerContent(pageNodes);
        continue;
      }

      const listInfo = findListBlock(section.blocks);
      if (!listInfo || listInfo.list.children.length === 0) {
        // Nothing left to split on — place as-is and let it scroll within the slide.
        pageNodes = [...pageNodes, ...candidateNodes.map((n) => n.cloneNode(true))];
        setMeasurerContent(pageNodes);
        continue;
      }

      const { list, wrapper } = listInfo;
      // Splitting rebuilds the section from heading + list chunks, so every
      // sibling block around the list (most visibly the
      // <div class="image-row"> of screenshots the prompts emit *after* the
      // </ul>) has to be carried onto the split pages explicitly — otherwise
      // it's silently dropped, and the images vanish from the deck at exactly
      // the window sizes where a section grows big enough to need splitting.
      const listBlockIndex = section.blocks.indexOf(wrapper || list);
      const leadingBlocks = listBlockIndex > 0 ? section.blocks.slice(0, listBlockIndex) : [];
      const trailingBlocks = listBlockIndex === -1 ? [] : section.blocks.slice(listBlockIndex + 1);
      const items = Array.from(list.children);
      let firstChunk = true;
      let i = 0;
      while (i < items.length) {
        if (!firstChunk) startNewPage(true);
        const headingClone = section.heading
          ? firstChunk
            ? section.heading.cloneNode(true)
            : cloneWithContinuedSuffix(section.heading)
          : null;
        const listClone = list.cloneNode(false);
        const containerNode = wrapper ? wrapper.cloneNode(false) : listClone;
        if (wrapper) containerNode.appendChild(listClone);

        const baseNodes = [
          ...pageNodes,
          ...(headingClone ? [headingClone] : []),
          // Anything before the list belongs above the first chunk only.
          ...(firstChunk ? leadingBlocks.map((n) => n.cloneNode(true)) : []),
        ];
        let addedAny = false;
        while (i < items.length) {
          const candidateLi = items[i].cloneNode(true);
          listClone.appendChild(candidateLi);
          setMeasurerContent([...baseNodes, containerNode]);
          if (fits() || !addedAny) {
            addedAny = true;
            i += 1;
          } else {
            listClone.removeChild(candidateLi);
            break;
          }
        }

        pageNodes = [...baseNodes, containerNode];
        firstChunk = false;
      }

      // Blocks after the list (the image-row) stay with the section's last
      // chunk when they still fit, and otherwise get a continuation page of
      // their own rather than being dropped.
      if (trailingBlocks.length) {
        const trial = [...pageNodes, ...trailingBlocks.map((n) => n.cloneNode(true))];
        setMeasurerContent(trial);
        if (fits()) {
          pageNodes = trial;
        } else {
          startNewPage(true);
          pageNodes = [
            ...pageNodes,
            ...(section.heading ? [cloneWithContinuedSuffix(section.heading)] : []),
            ...trailingBlocks.map((n) => n.cloneNode(true)),
          ];
          setMeasurerContent(pageNodes);
        }
      }
    }

    if (pageNodes.length) pages.push(pageNodes.map((n) => n.outerHTML).join(''));
    return pages.length > 0 ? pages : [html];
  } finally {
    document.body.removeChild(measurer);
  }
}
