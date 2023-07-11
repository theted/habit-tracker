<template>
  <label :for="name" class="text-md text-gray-600 capitalize">{{ name }}</label>
</template>

<script setup lang="ts">
defineProps({
  name: {
    type: String,
    required: true
  }
})
</script>
