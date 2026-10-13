<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import ToastHost from './components/ToastHost.vue'

const route = useRoute()
</script>

<template>
  <AppHeader v-if="route.name && route.name !== 'login'" />
  <main>
    <RouterView v-slot="{ Component, route: current }">
      <Transition name="page" mode="out-in">
        <component :is="Component" :key="current.path" />
      </Transition>
    </RouterView>
  </main>
  <ToastHost />
</template>
