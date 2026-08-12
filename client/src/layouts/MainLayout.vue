<script setup>
import AppHeader from '../components/common/AppHeader.vue';
</script>

<template>
  <div class="min-h-screen bg-slate-100 flex flex-col font-sans">
    <AppHeader />
    <main class="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <router-view />
    </main>
  </div>
</template>
