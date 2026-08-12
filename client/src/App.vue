<script setup>
import AiProcessingOverlay from './components/common/AiProcessingOverlay.vue';
import PresentationModal from './components/presentation/PresentationModal.vue';
</script>

<template>
  <router-view />
  <AiProcessingOverlay />
  <PresentationModal />
</template>
