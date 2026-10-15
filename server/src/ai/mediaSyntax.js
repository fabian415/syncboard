// Shared media (image/video) rules for every prompt that lays report
// Markdown out as slide HTML. Kept in one place because the four layout
// prompts must agree exactly on the emitted markup — the slide viewer's CSS
// (.presentation-slide .video-block, see client/src/styles/presentation.css)
// and the Markdown export round-trip (client/src/utils/exportSlides.js) both
// key off this structure.

// Appended to each prompt's "allowed tags" line.
export const VIDEO_TAG_WHITELIST = `<div class="video-block">（內部僅能包一個 <video>）, <video src="..." controls preload="metadata" playsinline title="...">`;

// Appended to each prompt's existing image rule, so no rule needs renumbering.
// Inline hyperlinks. The slide viewer opens any non-"#" <a href> in a new tab
// (handleSlideClick in PresentationModal.vue), so the prompt only has to emit it.
export const LINK_SYNTAX_RULE = `原文任何地方（條列項目、子項目、風險與阻礙、需要的決策或協助等）出現的 Markdown 連結 \`[顯示文字](網址)\`（前面沒有驚嘆號 !），都必須轉換成 <a href="網址">顯示文字</a>，原位保留在該段文字裡；絕對不能把 \`[顯示文字](網址)\` 這種方括號＋括號的原始寫法直接留在輸出的 HTML 裡，也不能省略連結或改寫網址。這種連結的方括號不是範本殘留標記，不適用「去掉方括號」的規則。`;

export const VIDEO_SYNTAX_RULE =`原文中若有獨立成行的影片語法 \`!video[標題](網址)\`（該行本身只有影片語法，不是某個項目文字的一部分），要轉換成 <div class="video-block"><video src="網址" controls preload="metadata" playsinline title="標題"></video></div>，擺放位置與圖片相同（放在該影片在原文中所屬的區塊裡）。每支影片各自獨立成一個 <div class="video-block">，**絕對不能**放進 <div class="image-row">、不能轉成 <img> 或 <a>、不能輸出成 <li>，也不能省略任何一支影片或新增原文沒有的影片。<video> 只能有 src、controls、preload="metadata"、playsinline、title 這幾個屬性，不可加 inline style、autoplay 或其他屬性。若圖片語法 \`![標題](網址)\` 的網址副檔名是 .mp4、.webm、.m4v 或 .mov，一律視為影片、依本規則輸出。`;
