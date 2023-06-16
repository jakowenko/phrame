<script lang="ts" setup>
import { ref, watch, nextTick, onMounted, onBeforeMount, onBeforeUnmount } from 'vue';

import ace from 'ace-builds';
import Button from 'primevue/button';
import { VAceEditor } from 'vue3-ace-editor';

import socket from '@/utils/socket';
import { ApiService } from '@/services/api.service';
import sleep from '@/utils/sleep';
import emitter from '@/services/emitter.service';
import { aiToTitleCase } from '@/utils/functions';

ace.config.set('basePath', 'js/ace');

const props = defineProps<{
  toolbarHeight: number;
}>();
const loading = ref(true);
let editor: { [name: string]: any };
let code: string;
const waitForRestart = ref(false);
let timeout: ReturnType<typeof setTimeout>;
const status = ref<HTMLElement | null>(null);
const statusHeight = ref<number>(0);
const services = ref<Array<{ name: string; status?: any; tooltip?: any; services: string[] }>>([
  {
    name: 'Phrame',
    status: null,
    tooltip: null,
    services: [],
  },
]);

const postRestart = () => {
  waitForRestart.value = false;
  loading.value = false;
  emitter.emit('toast', { severity: 'success', message: 'Restart complete' });
};

const save = async () => {
  try {
    if (loading.value) return;
    services.value.forEach((service) => {
      service.status = null;
      service.tooltip = null;
    });
    await ApiService.patch('config', { code });
    loading.value = true;
    waitForRestart.value = true;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      if (!socket.state.connected) {
        emitter.emit('error', Error('Restart Error: check container logs'));
        loading.value = false;
        waitForRestart.value = false;
      }
    }, 10000);
  } catch (error) {
    emitter.emit('error', error);
  }
};

const saveListener = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && [83].includes(event.keyCode)) {
    if (!loading.value) save();
    event.preventDefault();
  }
};

const getYaml = async () => {
  try {
    const {
      data: { config, errors },
    } = await ApiService.get('config?format=yaml');
    loading.value = false;
    code = config;
    if (errors) for (const error of errors) emitter.emit('toast', { severity: 'warn', message: error });
    await nextTick();
    editor.session.setValue(config);
    editor.session.setTabSize(2);
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    await checkServices();
  } catch (error) {
    emitter.emit('error', error);
  }
};

const checkServices = async () => {
  try {
    const {
      data: { errors },
    } = await ApiService.get('config?format=json');

    const { data } = await ApiService.get('config/service/status');

    services.value.splice(1);
    services.value[0].status = errors.length ? 'warn' : 200;
    services.value[0].tooltip = errors.length ? errors.join(', ') : 'Configured';

    for (const configuredAI of data) {
      services.value.push({
        name: aiToTitleCase(configuredAI.ai),
        status: configuredAI.status === true ? 200 : 500,
        services: configuredAI.services,
        tooltip:
          configuredAI.status === true
            ? `Image Service ${configuredAI.services.includes('image') ? 'Enabled' : 'Disabled'}`
            : configuredAI.status,
      });
    }
  } catch (error: any) {
    services.value[0].status = 500;
    services.value[0].tooltip = error.message || error;
    emitter.emit('error', error);
  }
};

const reload = () => {
  window.location.reload();
};

const editorInit = (obj: any) => {
  editor = obj;
};

watch(
  () => socket.state.connected,
  (value) => {
    if (!value) return;
    if (waitForRestart.value) {
      postRestart();
      getYaml();
    }
  },
);

onBeforeUnmount(() => {
  window.removeEventListener('keydown', saveListener);
  clearTimeout(timeout);
});

onBeforeMount(() => {
  window.addEventListener('keydown', saveListener);
});

onMounted(async () => {
  await sleep(250);
  await getYaml();
  statusHeight.value = status.value?.clientHeight || 0;
});
</script>

<template>
  <main class="subpage">
    <div ref="status" class="status-bar shadow-5">
      <ul class="service-status text-sm flex">
        <li
          v-tooltip.right="
            service.tooltip === null
              ? ''
              : typeof service.tooltip === 'object'
              ? JSON.stringify(service.tooltip)
              : service.tooltip
          "
          class="flex align-items-center mr-2"
          v-for="(service, index) in services"
          :key="service.name"
          :class="{ 'no-image': index > 0 && !service.services.includes('image') }"
        >
          <div
            v-if="service.status"
            class="icon p-badge mr-1"
            :class="
              service.status === 200
                ? 'p-badge-success'
                : service.status === 'warn'
                ? 'p-badge-warning'
                : 'p-badge-danger'
            "
          ></div>
          <div v-else class="icon pulse p-badge mr-1"></div>
          <div>{{ service.name }}</div>
        </li>
      </ul>
    </div>
    <div :style="`height: calc(100% - ${props.toolbarHeight}px + 2rem)`">
      <div v-if="loading" class="h-full flex justify-content-center">
        <i class="pi pi-spin pi-spinner align-self-center" style="font-size: 2rem"></i>
      </div>
      <div v-else class="h-full">
        <div class="editor h-full">
          <div class="buttons mt-2 mr-2">
            <Button
              icon="fas fa-rotate-right"
              class="p-button-sm p-button-success mb-2"
              @click="reload"
              :disabled="loading"
              v-tooltip.left="'Refresh Page'"
            />
            <br />
            <Button
              icon="fas fa-save"
              class="p-button p-button-sm p-button-success"
              @click="save"
              :disabled="loading"
              v-tooltip.left="'Save Config and Restart'"
            />
          </div>
          <VAceEditor
            v-model:value="code"
            lang="yaml"
            :wrap="true"
            :printMargin="false"
            theme="dracula"
            style="height: 100%"
            @init="editorInit"
          />
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
.status-bar {
  background: var(--surface-a);
  margin: -1rem -1rem 0 -1rem;
  padding: 0.5rem 1rem 0.4rem 1rem;
  z-index: 1;
}
ul.service-status {
  list-style: none;
  margin: 0;
  padding: 0;
  white-space: nowrap;
  overflow-x: auto;

  .icon {
    width: 10px;
    height: 10px;
    border-radius: 100%;
    min-width: auto;
    padding: 0;
  }

  li {
    cursor: pointer;
    &:hover {
      text-decoration: underline;
    }
  }
  li.no-image {
    opacity: 0.35;
  }

  .icon.pulse {
    opacity: 1;
    animation: fade 1.5s linear infinite;
    background-color: gray;
  }

  @keyframes fade {
    0%,
    100% {
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
  }
}
.editor {
  margin-left: -1rem;
  margin-right: -1rem;
  padding-top: 0.5rem;
  background: #282a36;
  .buttons {
    position: absolute;
    top: 0;
    right: 5px;
    z-index: 1;
  }
}

:deep(.ace_editor) .ace_mobile-menu {
  display: none !important;
}
</style>
