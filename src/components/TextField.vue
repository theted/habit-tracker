<template>
  <div class="flex flex-col space-y-4">
    <Label :name="name" />
    <input
      :id="name"
      :value="value"
      @input="updateValue"
      class="p-4 text-lg bg-gray-100 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import Label from './Label.vue'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  defaultValue: {
    type: String,
    default: ''
  }
})

const value = ref(props.defaultValue)

watchEffect(() => {
  value.value = props.defaultValue
})

const emit = defineEmits(['update:modelValue'])

const updateValue = (event: Event) => {
  const inputElement = event.target as HTMLInputElement
  value.value = inputElement.value
  emit('update:modelValue', value.value)
}
</script>
