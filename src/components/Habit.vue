<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import Panel from '@/components/Panel.vue'
import Button from '@/components/Button.vue'
import Text from '@/components/Text.vue'
import { incrementTrack } from '@/api'
import AnimatedCounter from '@/components/AnimatedCounter.vue'

const props = defineProps<{
  id: number
  title?: string
  target?: number
  count?: number
  habit: any
}>()

const localCount = ref(props.count || 0)

const addTrack = () => {
  incrementTrack(props.id).then((result) => {
    localCount.value += 1
  })
}
</script>
<template>
  <div class="flex grid-flow-row">
    <Panel>
      <div class="w-full relative">
        <Text variant="title">
          <RouterLink :to="`/habit/${id}`">{{ title }}</RouterLink>
        </Text>
        <animated-counter :count="localCount" />
        <Button @click="addTrack()" class="bg-green-600 rounded-full">+</Button>
      </div>
    </Panel>
  </div>
</template>

<style scoped></style>
