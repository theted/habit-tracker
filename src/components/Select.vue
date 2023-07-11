<template>
  <div class="flex flex-col space-y-4">
    <label :for="name" class="text-md text-gray-600 capitalize">{{ name }}</label>
    <select
      :id="name"
      :value="value"
      @change="updateValue"
      class="p-4 text-lg bg-gray-100 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
    >
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :selected="defaultValue"
      >
        {{ option.text }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  defaultValue: {
    type: String,
    default: ''
  },
  options: {
    type: Array,
    required: true
  }
})

const value = ref(props.defaultValue)

watchEffect(() => {
  value.value = props.defaultValue
})

const emit = defineEmits(['update:modelValue'])

const updateValue = (event: Event) => {
  const selectElement = event.target as HTMLSelectElement
  value.value = selectElement.value
  emit('update:modelValue', value.value)
}
</script>
