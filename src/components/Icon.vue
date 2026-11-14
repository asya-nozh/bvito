<script setup>
defineProps({ name: String, size: { type: Number, default: 20 } })

const shapes = {
  search: 'M21 21l-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4m-9 4v10M7.5 5l9 4',
  user: 'M20 21v-2a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v2m12-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  grid: 'M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z',
  plus: 'M12 5v14M5 12h14',
  bookmark: 'M6 4h12v16l-6-4-6 4V4Z',
  up: 'm5 12 7-7 7 7m-7-7v14',
  left: 'm10 6-6 6 6 6m-6-6h16',
  filter: 'M4 6h16M7 12h10m-7 6h4',
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  spark: 'M12 2c0 7-3 10-10 10 7 0 10 3 10 10 0-7 3-10 10-10-7 0-10-3-10-10Z'
}
</script>

<template>
  <svg aria-hidden="true" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path :d="shapes[name]" /></svg>
</template>
