<script setup>
import AppHeader from '../components/common/AppHeader.vue';
</script>

<template>
  <div class="min-h-screen bg-slate-100 flex flex-col font-sans">
    <AppHeader />
    <main class="flex-1 min-h-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6 w-full flex flex-col">
      <router-view />
    </main>
  </div>
</template>
