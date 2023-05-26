<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

import emitter from '@/services/emitter.service';
import time from '@/utils/time';

const props = defineProps<{
  transcript: { [name: string]: any };
}>();
const selected = ref(false);
const timestamp = ref<number | null>(null);
let interval: ReturnType<typeof setInterval>;
const createdAt = computed(() => {
  return { ago: time.ago(props.transcript.createdAt), createdAt: timestamp.value };
});

const toggleSelected = () => {
  selected.value = !selected.value;
  emitter.emit('toggle:selected', { toggleSelected: props.transcript.id });
};

onBeforeUnmount(() => {
  clearInterval(interval);
});

onMounted(() => {
  interval = setInterval(() => {
    timestamp.value = Date.now();
  }, 1000);
});
</script>

<template>
  <li class="mb-3 border-round" :class="{ selected }" @click="toggleSelected">
    {{ transcript.transcript }}
    <small class="block mt-2">{{ createdAt.ago }}</small>
  </li>
</template>

<style scoped lang="scss">
li {
  cursor: pointer;
  padding: 1rem;
  width: 100%;
  display: inline-block;
  vertical-align: middle;
  background: var(--surface-c);
}
li.selected {
  outline: 3px solid var(--highlight-text-color);
  outline-offset: -3px;
}

@media only screen and (max-width: 576px) {
  li {
    width: 100%;
    margin-left: 0;
  }
}
</style>
