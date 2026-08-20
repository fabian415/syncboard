import presentationCss from '../styles/presentation.css?raw';
import { filterMeaningfulSlides } from './slides.js';

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Extra layout CSS the exported page needs on top of presentation.css: the
// live app gets its flex/spacing from Tailwind utility classes on the
// PresentationModal template, which aren't available in a standalone file,
// so the structural rules those classes would've provided are written out
// here by hand instead.
const LAYOUT_CSS = `
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; overflow: hidden; }
body.presentation-shell {
  display: flex;
  flex-direction: column;
  font-family: 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', 'Noto Sans TC', system-ui, sans-serif;
}
.presentation-topbar, .presentation-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  flex: 0 0 auto;
}
.presentation-topbar { border-bottom: 1px solid var(--p-border); }
.presentation-navbar { border-top: 1px solid var(--p-border); }
.ex-group { display: flex; align-items: center; gap: 12px; }
.presentation-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
}
.presentation-body { flex: 1 1 auto; display: flex; min-height: 0; }
.presentation-outline { flex: 0 0 auto; width: 240px; }
.presentation-stage { flex: 1 1 auto; position: relative; overflow: hidden; }
.presentation-outline-item { cursor: pointer; }
.presentation-nav-btn { cursor: pointer; }
.presentation-lightbox-nav, .presentation-lightbox-close { border: none; }
.presentation-lightbox-nav:disabled { cursor: not-allowed; }
@keyframes exSlideFade {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.presentation-slide.ex-anim { animation: exSlideFade 0.25s ease; }
`;

// Vanilla-JS runtime embedded in the exported file — reimplements the
// relevant slice of PresentationModal.vue (deck/page navigation, image
// lightbox, auto-pagination against the real rendered size) without any
// framework, since the exported HTML has to run standalone once downloaded.
// Written with plain string concatenation (no template literals) so it can
// be spliced into exportSlides.js's own outer template literal safely.
const RUNTIME_JS = [
  '(function () {',
  '  var RAW_DECKS = window.__SLIDE_DECKS__;',
  '  var state = { deckIndex: 0, pageIndex: 0, outlineOpen: true };',
  '  var lightbox = { images: [], index: -1 };',
  '  var paginatedDecks = RAW_DECKS;',
  '',
  '  var stage = document.getElementById("stage");',
  '  var slideEl = document.getElementById("slide");',
  '  var topbarTitle = document.getElementById("topbarTitle");',
  '  var ownerBadge = document.getElementById("ownerBadge");',
  '  var outline = document.getElementById("outline");',
  '  var outlineList = document.getElementById("outlineList");',
  '  var outlineToggle = document.getElementById("outlineToggle");',
  '  var prevBtn = document.getElementById("prevBtn");',
  '  var nextBtn = document.getElementById("nextBtn");',
  '  var pageInfo = document.getElementById("pageInfo");',
  '  var progressFill = document.getElementById("progressFill");',
  '  var lightboxEl = document.getElementById("lightbox");',
  '  var lightboxImg = document.getElementById("lightboxImg");',
  '  var lightboxCount = document.getElementById("lightboxCount");',
  '  var lightboxPrevBtn = document.getElementById("lightboxPrev");',
  '  var lightboxNextBtn = document.getElementById("lightboxNext");',
  '  var lightboxCloseBtn = document.getElementById("lightboxClose");',
  '',
  '  var CONTINUED_SUFFIX = "（續）";',
  '  function cloneWithContinuedSuffix(el) {',
  '    var clone = el.cloneNode(true);',
  '    if (clone.textContent.indexOf(CONTINUED_SUFFIX) === -1) clone.textContent = clone.textContent + CONTINUED_SUFFIX;',
  '    return clone;',
  '  }',
  '  function groupIntoSections(bodyNodes) {',
  '    var sections = [];',
  '    var current = null;',
  '    for (var i = 0; i < bodyNodes.length; i++) {',
  '      var node = bodyNodes[i];',
  '      if (node.tagName === "H2" || !current) {',
  '        current = { heading: node.tagName === "H2" ? node : null, blocks: node.tagName === "H2" ? [] : [node] };',
  '        sections.push(current);',
  '      } else {',
  '        current.blocks.push(node);',
  '      }',
  '    }',
  '    return sections;',
  '  }',
  '  function findListBlock(blocks) {',
  '    for (var i = 0; i < blocks.length; i++) {',
  '      var block = blocks[i];',
  '      if (block.tagName === "UL" || block.tagName === "OL") return { list: block, wrapper: null };',
  '      var nested = block.querySelector ? block.querySelector("ul, ol") : null;',
  '      if (nested) return { list: nested, wrapper: block };',
  '    }',
  '    return null;',
  '  }',
  '  function autoPaginateHtml(html, width, height) {',
  '    if (!html || !html.trim()) return [html];',
  '    if (!(width > 0) || !(height > 0)) return [html];',
  '    var measurer = document.createElement("div");',
  '    measurer.className = "presentation-slide";',
  '    measurer.style.position = "fixed";',
  '    measurer.style.top = "0";',
  '    measurer.style.left = "-99999px";',
  '    measurer.style.visibility = "hidden";',
  '    measurer.style.overflow = "visible";',
  '    measurer.style.height = "auto";',
  '    measurer.style.width = width + "px";',
  '    measurer.style.pointerEvents = "none";',
  '    document.body.appendChild(measurer);',
  '    function fits() { return measurer.scrollHeight <= height + 1; }',
  '    function setMeasurerContent(elements) {',
  '      measurer.innerHTML = "";',
  '      elements.forEach(function (el) { measurer.appendChild(el); });',
  '    }',
  '    try {',
  '      var template = document.createElement("template");',
  '      template.innerHTML = html;',
  '      var nodes = Array.prototype.filter.call(template.content.childNodes, function (n) { return n.nodeType === 1; });',
  '      if (nodes.length === 0) return [html];',
  '      var titleNode = nodes[0].tagName === "H1" ? nodes[0] : null;',
  '      var sections = groupIntoSections(titleNode ? nodes.slice(1) : nodes);',
  '      var pages = [];',
  '      var pageNodes = [];',
  '      function startNewPage(isContinuation) {',
  '        if (pageNodes.length) pages.push(pageNodes.map(function (n) { return n.outerHTML; }).join(""));',
  '        pageNodes = titleNode ? [isContinuation ? cloneWithContinuedSuffix(titleNode) : titleNode.cloneNode(true)] : [];',
  '        setMeasurerContent(pageNodes);',
  '      }',
  '      startNewPage(false);',
  '      for (var s = 0; s < sections.length; s++) {',
  '        var section = sections[s];',
  '        var candidateNodes = section.heading ? [section.heading].concat(section.blocks) : section.blocks;',
  '        var trial = pageNodes.concat(candidateNodes.map(function (n) { return n.cloneNode(true); }));',
  '        setMeasurerContent(trial);',
  '        if (fits()) { pageNodes = trial; continue; }',
  '        var hasOtherContent = pageNodes.length > (titleNode ? 1 : 0);',
  '        if (hasOtherContent) {',
  '          startNewPage(true);',
  '          var freshTrial = pageNodes.concat(candidateNodes.map(function (n) { return n.cloneNode(true); }));',
  '          setMeasurerContent(freshTrial);',
  '          if (fits()) { pageNodes = freshTrial; continue; }',
  '        }',
  '        var listInfo = findListBlock(section.blocks);',
  '        if (!listInfo) {',
  '          pageNodes = pageNodes.concat(candidateNodes.map(function (n) { return n.cloneNode(true); }));',
  '          setMeasurerContent(pageNodes);',
  '          continue;',
  '        }',
  '        var list = listInfo.list, wrapper = listInfo.wrapper;',
  '        var items = Array.prototype.slice.call(list.children);',
  '        var firstChunk = true;',
  '        var i = 0;',
  '        while (i < items.length) {',
  '          if (!firstChunk) startNewPage(true);',
  '          var headingClone = section.heading ? (firstChunk ? section.heading.cloneNode(true) : cloneWithContinuedSuffix(section.heading)) : null;',
  '          var listClone = list.cloneNode(false);',
  '          var containerNode = wrapper ? wrapper.cloneNode(false) : listClone;',
  '          if (wrapper) containerNode.appendChild(listClone);',
  '          var baseNodes = pageNodes.concat(headingClone ? [headingClone] : []);',
  '          var addedAny = false;',
  '          while (i < items.length) {',
  '            var candidateLi = items[i].cloneNode(true);',
  '            listClone.appendChild(candidateLi);',
  '            setMeasurerContent(baseNodes.concat([containerNode]));',
  '            if (fits() || !addedAny) { addedAny = true; i += 1; }',
  '            else { listClone.removeChild(candidateLi); break; }',
  '          }',
  '          pageNodes = baseNodes.concat([containerNode]);',
  '          firstChunk = false;',
  '        }',
  '      }',
  '      if (pageNodes.length) pages.push(pageNodes.map(function (n) { return n.outerHTML; }).join(""));',
  '      return pages.length > 0 ? pages : [html];',
  '    } finally {',
  '      document.body.removeChild(measurer);',
  '    }',
  '  }',
  '',
  '  function currentDeck() { return paginatedDecks[state.deckIndex] || { title: "", pages: [] }; }',
  '  function currentPages() { return currentDeck().pages; }',
  '  function totalPages() { return paginatedDecks.reduce(function (sum, d) { return sum + d.pages.length; }, 0); }',
  '  function pagesBeforeCurrentDeck() {',
  '    var sum = 0;',
  '    for (var i = 0; i < state.deckIndex; i++) sum += paginatedDecks[i].pages.length;',
  '    return sum;',
  '  }',
  '',
  '  var OWNER_RE = /<h2>\\s*Owner[：:]\\s*([^<]*?)\\s*<\\/h2>\\s*/i;',
  '  function extractOwner(html) {',
  '    var match = html.match(OWNER_RE);',
  '    if (!match) return { html: html, owner: "" };',
  '    return { html: html.slice(0, match.index) + html.slice(match.index + match[0].length), owner: match[1].trim() };',
  '  }',
  '',
  '  function buildOutline() {',
  '    if (paginatedDecks.length <= 1) {',
  '      outline.style.display = "none";',
  '      outlineToggle.style.display = "none";',
  '      outlineList.innerHTML = "";',
  '      return;',
  '    }',
  '    outlineToggle.style.display = "";',
  '    outlineList.innerHTML = "";',
  '    paginatedDecks.forEach(function (deck, index) {',
  '      var li = document.createElement("li");',
  '      li.className = "presentation-outline-item";',
  '      li.innerHTML =',
  '        \'<span class="presentation-outline-index"></span>\' +',
  '        \'<div class="presentation-outline-text">\' +',
  '        \'<div class="presentation-outline-title"></div>\' +',
  '        \'<div class="presentation-outline-meta"></div>\' +',
  '        "</div>";',
  '      li.querySelector(".presentation-outline-title").textContent = deck.title;',
  '      li.addEventListener("click", function () {',
  '        if (index === state.deckIndex) return;',
  '        state.deckIndex = index;',
  '        state.pageIndex = 0;',
  '        render();',
  '      });',
  '      outlineList.appendChild(li);',
  '    });',
  '  }',
  '',
  '  function updateOutlineState() {',
  '    var items = outlineList.querySelectorAll(".presentation-outline-item");',
  '    items.forEach(function (li, index) {',
  '      li.classList.toggle("is-current", index === state.deckIndex);',
  '      li.classList.toggle("is-done", index < state.deckIndex);',
  '      li.classList.toggle("is-next", index === state.deckIndex + 1);',
  '      var indexEl = li.querySelector(".presentation-outline-index");',
  '      var metaEl = li.querySelector(".presentation-outline-meta");',
  '      indexEl.textContent = index < state.deckIndex ? "✓" : String(index + 1);',
  '      if (index === state.deckIndex) metaEl.textContent = "第 " + (state.pageIndex + 1) + "/" + currentPages().length + " 頁";',
  '      else if (index === state.deckIndex + 1) metaEl.textContent = "接下來";',
  '      else metaEl.textContent = "";',
  '    });',
  '    var currentLi = outlineList.querySelector(".presentation-outline-item.is-current");',
  '    if (currentLi && currentLi.scrollIntoView) currentLi.scrollIntoView({ block: "nearest", behavior: "smooth" });',
  '  }',
  '',
  '  function isAtFirst() { return state.pageIndex === 0 && state.deckIndex === 0; }',
  '  function isAtLast() { return state.pageIndex === currentPages().length - 1 && state.deckIndex === paginatedDecks.length - 1; }',
  '',
  '  function render() {',
  '    var pages = currentPages();',
  '    var rawHtml = pages[state.pageIndex] || "";',
  '    var extracted = extractOwner(rawHtml);',
  '    slideEl.innerHTML = extracted.html;',
  '    slideEl.classList.remove("ex-anim");',
  '    void slideEl.offsetWidth;',
  '    slideEl.classList.add("ex-anim");',
  '    if (extracted.owner) {',
  '      ownerBadge.style.display = "";',
  '      ownerBadge.textContent = "Owner：" + extracted.owner;',
  '    } else {',
  '      ownerBadge.style.display = "none";',
  '    }',
  '    topbarTitle.textContent = currentDeck().title || "";',
  '    var globalPageNumber = pagesBeforeCurrentDeck() + state.pageIndex + 1;',
  '    var total = totalPages();',
  '    pageInfo.textContent = globalPageNumber + " / " + total;',
  '    progressFill.style.width = (total ? (globalPageNumber / total) * 100 : 0) + "%";',
  '    prevBtn.disabled = isAtFirst();',
  '    nextBtn.disabled = isAtLast();',
  '    updateOutlineState();',
  '  }',
  '',
  '  function prev() {',
  '    if (state.pageIndex > 0) { state.pageIndex -= 1; }',
  '    else if (state.deckIndex > 0) { state.deckIndex -= 1; state.pageIndex = paginatedDecks[state.deckIndex].pages.length - 1; }',
  '    else return;',
  '    render();',
  '  }',
  '  function next() {',
  '    var pages = currentPages();',
  '    if (state.pageIndex < pages.length - 1) { state.pageIndex += 1; }',
  '    else if (state.deckIndex < paginatedDecks.length - 1) { state.deckIndex += 1; state.pageIndex = 0; }',
  '    else return;',
  '    render();',
  '  }',
  '',
  '  function repaginate() {',
  '    var width = stage.clientWidth;',
  '    var height = stage.clientHeight;',
  '    paginatedDecks = RAW_DECKS.map(function (deck) {',
  '      var pages = [];',
  '      deck.pages.forEach(function (page) {',
  '        autoPaginateHtml(page, width, height).forEach(function (p) { pages.push(p); });',
  '      });',
  '      return { title: deck.title, pages: pages };',
  '    });',
  '    if (state.pageIndex > currentPages().length - 1) state.pageIndex = Math.max(0, currentPages().length - 1);',
  '    buildOutline();',
  '    render();',
  '  }',
  '',
  '  prevBtn.addEventListener("click", prev);',
  '  nextBtn.addEventListener("click", next);',
  '  outlineToggle.addEventListener("click", function () {',
  '    state.outlineOpen = !state.outlineOpen;',
  '    outline.style.display = state.outlineOpen && paginatedDecks.length > 1 ? "" : "none";',
  '    setTimeout(repaginate, 0);',
  '  });',
  '',
  '  function openLightbox(images, index) {',
  '    lightbox.images = images;',
  '    lightbox.index = index;',
  '    updateLightbox();',
  '    lightboxEl.style.display = "flex";',
  '  }',
  '  function closeLightbox() {',
  '    lightboxEl.style.display = "none";',
  '    lightbox.images = [];',
  '    lightbox.index = -1;',
  '  }',
  '  function updateLightbox() {',
  '    lightboxImg.src = lightbox.images[lightbox.index];',
  '    var multi = lightbox.images.length > 1;',
  '    lightboxPrevBtn.style.display = multi ? "" : "none";',
  '    lightboxNextBtn.style.display = multi ? "" : "none";',
  '    lightboxCount.style.display = multi ? "" : "none";',
  '    lightboxCount.textContent = (lightbox.index + 1) + " / " + lightbox.images.length;',
  '    lightboxPrevBtn.disabled = lightbox.index === 0;',
  '    lightboxNextBtn.disabled = lightbox.index === lightbox.images.length - 1;',
  '  }',
  '  function lightboxPrev() { if (lightbox.index > 0) { lightbox.index -= 1; updateLightbox(); } }',
  '  function lightboxNext() { if (lightbox.index < lightbox.images.length - 1) { lightbox.index += 1; updateLightbox(); } }',
  '  lightboxCloseBtn.addEventListener("click", closeLightbox);',
  '  lightboxEl.addEventListener("click", function (e) { if (e.target === lightboxEl) closeLightbox(); });',
  '  lightboxPrevBtn.addEventListener("click", function (e) { e.stopPropagation(); lightboxPrev(); });',
  '  lightboxNextBtn.addEventListener("click", function (e) { e.stopPropagation(); lightboxNext(); });',
  '  lightboxImg.addEventListener("click", function (e) { e.stopPropagation(); });',
  '',
  '  slideEl.addEventListener("click", function (e) {',
  '    var link = e.target.closest("a[href]");',
  '    if (link) {',
  '      e.preventDefault();',
  '      window.open(link.href, "_blank", "noopener");',
  '      return;',
  '    }',
  '    var img = e.target.closest("img[src]");',
  '    if (img) {',
  '      e.preventDefault();',
  '      var imgEls = Array.prototype.slice.call(slideEl.querySelectorAll("img[src]"));',
  '      var images = imgEls.map(function (el) { return el.src; });',
  '      openLightbox(images, imgEls.indexOf(img));',
  '    }',
  '  });',
  '',
  '  window.addEventListener("keydown", function (e) {',
  '    if (e.key === "Escape") {',
  '      if (lightboxEl.style.display !== "none") closeLightbox();',
  '      return;',
  '    }',
  '    if (lightboxEl.style.display !== "none") {',
  '      if (e.key === "ArrowRight") lightboxNext();',
  '      else if (e.key === "ArrowLeft") lightboxPrev();',
  '      return;',
  '    }',
  '    if (e.key === "ArrowRight") next();',
  '    else if (e.key === "ArrowLeft") prev();',
  '  });',
  '',
  '  var resizeTimer = null;',
  '  window.addEventListener("resize", function () {',
  '    clearTimeout(resizeTimer);',
  '    resizeTimer = setTimeout(repaginate, 150);',
  '  });',
  '',
  '  repaginate();',
  '})();',
].join('\n');

// --- Markdown export -------------------------------------------------------
//
// Converts the same deck/page HTML the slide exporter consumes into a single
// Markdown document. The HTML is generated by a small fixed set of AI
// prompts (see server/src/ai/*SectionPrompt.js) that only ever emit:
// h1, h2, ul/ol/li (nested), strong, a, img, span.badge-*, and
// div.card / div.card.warning / div.kms-link / div.grid / div.image-row —
// so the converter only needs to understand that vocabulary, not arbitrary
// HTML.

function headingMark(level) {
  return '#'.repeat(Math.min(Math.max(level, 1), 6));
}

// Renders only phrasing content (text, <strong>, <a>, <img>, <span> badges,
// <br>) to a single inline Markdown string — used for heading text and for
// a <li>'s own text once its nested <ul>/<ol> children are stripped out.
function convertInline(node) {
  let result = '';
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      result += child.textContent.replace(/\s+/g, ' ');
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const tag = child.tagName.toLowerCase();
    if (tag === 'strong') {
      result += `**${convertInline(child).trim()}**`;
    } else if (tag === 'span') {
      result += `\`${convertInline(child).trim()}\``;
    } else if (tag === 'a') {
      result += `[${convertInline(child).trim()}](${child.getAttribute('href') || ''})`;
    } else if (tag === 'img') {
      result += `![${child.getAttribute('alt') || ''}](${child.getAttribute('src') || ''})`;
    } else if (tag === 'br') {
      result += '\n';
    } else {
      result += convertInline(child);
    }
  });
  return result;
}

function elementText(el) {
  return convertInline(el).trim();
}

function convertList(listEl, lines, depth) {
  const ordered = listEl.tagName.toLowerCase() === 'ol';
  const items = Array.from(listEl.children).filter((c) => c.tagName === 'LI');
  items.forEach((li, index) => {
    const nestedLists = Array.from(li.children).filter((c) => c.tagName === 'UL' || c.tagName === 'OL');
    const clone = li.cloneNode(true);
    Array.from(clone.children)
      .filter((c) => c.tagName === 'UL' || c.tagName === 'OL')
      .forEach((c) => clone.removeChild(c));
    const text = convertInline(clone).trim();
    const bullet = ordered ? `${index + 1}.` : '-';
    lines.push(`${'  '.repeat(depth)}${bullet} ${text}`);
    nestedLists.forEach((nested) => convertList(nested, lines, depth + 1));
  });
}

// Renders block-level children of `container` into `blocks`, one Markdown
// chunk (which may itself be multi-line, e.g. a whole list) per entry, so
// the caller can join them with blank lines without splitting lists apart.
function convertBlocks(container, blocks, headingBase) {
  Array.from(container.children).forEach((child) => {
    const tag = child.tagName.toLowerCase();
    if (tag === 'h1') {
      blocks.push(`${headingMark(headingBase + 1)} ${elementText(child)}`);
    } else if (tag === 'h2') {
      blocks.push(`${headingMark(headingBase + 2)} ${elementText(child)}`);
    } else if (tag === 'ul' || tag === 'ol') {
      const lines = [];
      convertList(child, lines, 0);
      if (lines.length) blocks.push(lines.join('\n'));
    } else if (tag === 'img') {
      blocks.push(convertInline(child));
    } else if (tag === 'div') {
      convertDiv(child, blocks, headingBase);
    } else {
      convertBlocks(child, blocks, headingBase);
    }
  });
}

function convertDiv(div, blocks, headingBase) {
  const cls = div.getAttribute('class') || '';
  if (cls.includes('image-row')) {
    const imgs = Array.from(div.children)
      .filter((c) => c.tagName === 'IMG')
      .map((img) => convertInline(img));
    if (imgs.length) blocks.push(imgs.join('\n'));
    return;
  }
  const inner = [];
  convertBlocks(div, inner, headingBase);
  if (!inner.length) return;
  if (cls.includes('card') || cls.includes('kms-link')) {
    const prefix = cls.includes('warning') ? '⚠️ ' : '';
    const body = inner.join('\n\n');
    blocks.push(
      `${prefix}${body}`
        .split('\n')
        .map((line) => (line ? `> ${line}` : '>'))
        .join('\n'),
    );
  } else {
    // .grid or a plain wrapper div — splice its blocks in directly.
    blocks.push(...inner);
  }
}

// `headingBase` shifts a page's own <h1>/<h2> down under the deck heading
// that already precedes it (deck title is emitted as its own heading one
// level above headingBase + 1).
function convertPageHtml(html, headingBase) {
  const template = document.createElement('template');
  template.innerHTML = html;
  const blocks = [];
  convertBlocks(template.content, blocks, headingBase);
  return blocks.join('\n\n');
}

function convertDeckToMarkdown(deck) {
  const pageBlocks = deck.pages.map((page) => convertPageHtml(page, 2)).filter(Boolean);
  return [`## ${deck.title}`, ...pageBlocks].join('\n\n');
}

// Mirrors buildSlidesExportHtml's deck cleanup/filtering, but renders the
// result as one flowing Markdown document instead of a playable slideshow.
export function buildSlidesExportMarkdown(decks, date) {
  const cleanDecks = decks
    .map((deck) => ({ title: deck.title, pages: filterMeaningfulSlides(deck.pages ?? []) }))
    .filter((deck) => deck.pages.length > 0);

  const sections = cleanDecks.map((deck) => convertDeckToMarkdown(deck));
  return [`# 成果展示匯出 - ${date}`, ...sections].join('\n\n---\n\n');
}

// Bundles every deck's slides (already-rendered HTML pages, same shape as
// the presentation store's decks) into one self-contained HTML file that
// plays back exactly like the in-app presentation viewer — arrow-key /
// button prev-next across decks, and click-to-zoom on embedded images —
// so the file is still fully usable once downloaded and opened offline.
export function buildSlidesExportHtml(decks, date) {
  const cleanDecks = decks
    .map((deck) => ({ title: deck.title, pages: filterMeaningfulSlides(deck.pages ?? []) }))
    .filter((deck) => deck.pages.length > 0);

  const decksJson = JSON.stringify(cleanDecks).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>成果展示匯出 - ${escapeHtml(date)}</title>
<style>
${presentationCss}
${LAYOUT_CSS}
</style>
</head>
<body class="presentation-shell">
  <div class="presentation-topbar">
    <div class="ex-group">
      <button id="outlineToggle" class="presentation-icon-btn" title="顯示/隱藏議程大綱">☰</button>
      <span class="presentation-title" id="topbarTitle"></span>
      <span class="presentation-owner-badge" id="ownerBadge" style="display: none"></span>
    </div>
    <div class="ex-group">
      <span style="font-size: 12px; color: var(--p-muted)">會議日期：${escapeHtml(date)}</span>
    </div>
  </div>

  <div class="presentation-body">
    <aside class="presentation-outline" id="outline">
      <div class="presentation-outline-header">
        <div class="presentation-outline-eyebrow">Outline</div>
      </div>
      <ol class="presentation-outline-list" id="outlineList"></ol>
    </aside>
    <div class="presentation-stage" id="stage">
      <div class="presentation-slide" id="slide"></div>
    </div>
  </div>

  <div class="presentation-navbar">
    <button class="presentation-nav-btn" id="prevBtn">← 上一頁</button>
    <div class="ex-group">
      <span class="presentation-page-info" id="pageInfo"></span>
      <div class="presentation-progress-bar"><div class="presentation-progress-fill" id="progressFill"></div></div>
      <span class="presentation-hint" id="hint">← → 切換頁面</span>
    </div>
    <button class="presentation-nav-btn" id="nextBtn">下一頁 →</button>
  </div>

  <div class="presentation-lightbox" id="lightbox" style="display: none">
    <button class="presentation-lightbox-close" id="lightboxClose" title="關閉">✕</button>
    <button class="presentation-lightbox-nav presentation-lightbox-prev" id="lightboxPrev" title="上一張圖">‹</button>
    <img class="presentation-lightbox-img" id="lightboxImg" alt="">
    <button class="presentation-lightbox-nav presentation-lightbox-next" id="lightboxNext" title="下一張圖">›</button>
    <span class="presentation-lightbox-count" id="lightboxCount"></span>
  </div>

<script>
window.__SLIDE_DECKS__ = ${decksJson};
<\/script>
<script>
${RUNTIME_JS}
<\/script>
</body>
</html>`;
}
