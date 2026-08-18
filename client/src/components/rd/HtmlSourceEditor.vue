<script setup>
defineProps({
  modelValue: { type: String, required: true },
});
defineEmits(['update:modelValue']);
</script>

<template>
  <div class="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
    <div class="bg-gray-50 border-b border-gray-200 px-4 py-1.5 flex items-center">
      <div class="flex space-x-2">
        <div class="w-3 h-3 rounded-full bg-red-400"></div>
        <div class="w-3 h-3 rounded-full bg-yellow-400"></div>
        <div class="w-3 h-3 rounded-full bg-green-400"></div>
      </div>
      <span class="ml-4 text-xs font-mono text-gray-500">presentation.html</span>
    </div>
    <textarea
      :value="modelValue"
      class="flex-1 w-full p-5 bg-slate-900 text-gray-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 leading-relaxed min-h-[320px]"
      spellcheck="false"
      @input="$emit('update:modelValue', $event.target.value)"
    ></textarea>
  </div>
</template>
