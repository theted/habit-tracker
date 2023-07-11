<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps({
  count: {
    type: Number,
    default: 0
  }
})

let displayCount = ref(props.count)
let animated = ref(false)

watch(
  () => props.count,
  (newVal) => {
    animated.value = true
    let intervalId = setInterval(() => {
      if (displayCount.value < newVal) {
        displayCount.value++
      } else {
        clearInterval(intervalId)
        setTimeout(() => {
          animated.value = false
        }, 300)
      }
    }, 50)
  }
)
</script>

<template>
  <p :class="{ 'scale-up': animated }">{{ displayCount }}</p>
</template>

<style scoped>
.scale-up {
  transition: transform 0.3s ease-out;
  transform: scale(1.5);
}
</style>
