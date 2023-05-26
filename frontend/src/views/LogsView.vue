<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import Button from 'primevue/button';
import { useConfirm } from 'primevue/useconfirm';

import emitter from '@/services/emitter.service';
import { ApiService } from '@/services/api.service';
import sleep from '@/utils/sleep';

const confirm = useConfirm();
const loading = ref(true);
const logs = ref<string | null>(null);
const size = ref<string | null>(null);
let timeout: ReturnType<typeof setTimeout>;
const scroll = ref<HTMLElement | null>(null);

const getLogs = async () => {
  try {
    const firstLoad = !logs.value;
    const { data } = await ApiService.get('logs');
    const hasChanged = logs.value !== data.logs;
    logs.value = data.logs;
    size.value = data.size;
    loading.value = false;

    if (hasChanged)
      nextTick(() => {
        if (scroll.value) {
          const isAtBottom = scroll.value.scrollHeight - scroll.value.scrollTop - scroll.value.clientHeight <= 100;
          if (firstLoad || isAtBottom) scroll.value.scrollTop = scroll.value.scrollHeight;
        }
      });
  } catch (error) {
    emitter.emit('error', error);
  }
  clearTimeout(timeout);
  timeout = setTimeout(getLogs, 5000);
};

const deleteLogs = () => {
  confirm.require({
    header: 'Confirmation',
    message: 'Do you want to clear the log file?',
    accept: async () => {
      await ApiService.delete('logs');
      await getLogs();
    },
    reject: () => {},
  });
};

onBeforeUnmount(() => {
  clearTimeout(timeout);
});

onMounted(async () => {
  await sleep(250);
  await getLogs();
});
</script>

<template>
  <main class="subpage">
    <div v-if="loading" class="flex justify-content-center h-full">
      <i class="pi pi-spin pi-spinner align-self-center" style="font-size: 2rem"></i>
    </div>
    <div v-else id="logs" ref="scroll" class="border-round">
      <div class="button-wrapper">
        <Button
          v-if="size"
          type="button"
          :label="size"
          icon="pi pi-trash"
          class="p-button-sm p-button-danger mt-2 mr-2"
          @click="deleteLogs"
          :disabled="size === '0 Bytes'"
        />
      </div>
      <pre v-if="logs">{{ logs }}</pre>
      <div v-else class="flex justify-content-center h-full">
        <strong class="align-self-center">Log file is empty</strong>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
#logs {
  height: 100%;
  overflow: auto;
  background: var(--surface-a);

  .button-wrapper {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    height: 0;
    z-index: 1;
    text-align: right;
  }
}
pre {
  position: absolute;
  width: 100%;
  font-size: 0.85rem;
  margin: 0;

  padding: 0.25rem;
  min-height: 55px;
}
</style>
