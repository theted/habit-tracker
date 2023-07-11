<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="p-4 bg-white fixed top-0 left-0 right-0">
    <nav class="flex space-x-4">
      <RouterLink class="text-blue-500 hover:text-blue-700" to="/">Home</RouterLink>
      <RouterLink class="text-blue-500 hover:text-blue-700" to="/about">About</RouterLink>
      <RouterLink class="text-blue-500 hover:text-blue-700" to="/settings">Settings</RouterLink>
      <RouterLink class="text-blue-500 hover:text-blue-700" to="/test">Test</RouterLink>
    </nav>
  </div>

  <div
    :class="[
      'w-full h-screen',
      'flex items-center justify-center items-grow',
      'bg-gradient-to-r from-blue-900 via-blue-700 to-blue-500'
    ]"
  >
    <div class="w-full max-w-8xl p-12">
      <RouterView />
    </div>
  </div>
</template>
