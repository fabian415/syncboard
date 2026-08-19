<script setup>
defineProps({
  modelValue: { type: String, required: true },
});
const emit = defineEmits(['update:modelValue']);

const INDENT = '  ';

function dedentLine(line) {
  if (line.startsWith(INDENT)) return { line: line.slice(INDENT.length), removed: INDENT.length };
  if (line.startsWith(' ')) return { line: line.slice(1), removed: 1 };
  return { line, removed: 0 };
}

function handleKeydown(event) {
  if (event.key !== 'Tab') return;
  event.preventDefault();

  const textarea = event.target;
  const { value, selectionStart, selectionEnd } = textarea;
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  const multiLine = value.slice(selectionStart, selectionEnd).includes('\n');

  // Single cursor (no selection), plain Tab: insert indent at the caret.
  if (!event.shiftKey && !multiLine) {
    const next = value.slice(0, selectionStart) + INDENT + value.slice(selectionEnd);
    emit('update:modelValue', next);
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = selectionStart + INDENT.length;
    });
    return;
  }

  // Otherwise indent/dedent every line touched by the selection (or the
  // current line, for a collapsed Shift+Tab), keeping the selection in place.
  let lineEnd = value.indexOf('\n', Math.max(selectionEnd - 1, lineStart));
  if (lineEnd === -1) lineEnd = value.length;
  const block = value.slice(lineStart, lineEnd);
  const lines = block.split('\n');

  let firstLineDelta = 0;
  const newLines = lines.map((line, index) => {
    if (event.shiftKey) {
      const { line: deduced, removed } = dedentLine(line);
      if (index === 0) firstLineDelta = -removed;
      return deduced;
    }
    if (index === 0) firstLineDelta = INDENT.length;
    return INDENT + line;
  });

  const newBlock = newLines.join('\n');
  const next = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
  emit('update:modelValue', next);
  requestAnimationFrame(() => {
    textarea.selectionStart = Math.max(lineStart, selectionStart + firstLineDelta);
    textarea.selectionEnd = lineStart + newBlock.length;
  });
}
</script>

<template>
  <div class="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
    <div class="bg-gray-50 border-b border-gray-200 px-4 py-1.5 flex items-center">
      <div class="flex space-x-2">
        <div class="w-3 h-3 rounded-full bg-red-400"></div>
        <div class="w-3 h-3 rounded-full bg-yellow-400"></div>
        <div class="w-3 h-3 rounded-full bg-green-400"></div>
      </div>
      <span class="ml-4 text-xs font-mono text-gray-500">report.md</span>
    </div>
    <textarea
      :value="modelValue"
      class="flex-1 w-full p-5 bg-slate-900 text-gray-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 leading-relaxed min-h-[320px]"
      spellcheck="false"
      @input="$emit('update:modelValue', $event.target.value)"
      @keydown="handleKeydown"
    ></textarea>
  </div>
</template>
