<script lang="ts" setup>
import { ref, watch, nextTick, onMounted, onBeforeMount, onBeforeUnmount, computed } from 'vue';

import * as monaco from 'monaco-editor';
import { setDiagnosticsOptions } from 'monaco-yaml';
import Button from 'primevue/button';

import socket from '@/utils/socket';
import { ApiService } from '@/services/api.service';
import sleep from '@/utils/sleep';
import emitter from '@/services/emitter.service';
import { aiToTitleCase } from '@/utils/functions';
import theme from '@/assets/monaco-themes/phrame.json';
import constants from '@/utils/constants';

const props = defineProps<{
  toolbarHeight: number;
}>();
const loading = ref(true);
let editor: monaco.editor.IStandaloneCodeEditor;
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

const sortedServices = computed(() => {
  if (services.value.length <= 2) return services.value;
  return [services.value[0], ...services.value.slice(1).sort((a, b) => b.services.length - a.services.length)];
});

const save = async () => {
  try {
    if (waitForRestart.value) return;
    services.value.forEach((service) => {
      service.status = null;
      service.tooltip = null;
    });
    await ApiService.patch('config', { code: editor.getValue() });
    waitForRestart.value = true;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      if (!socket.state.connected) {
        emitter.emit('error', Error('Restart Error: check container logs'));
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

const checkForErrors = async () => {
  try {
    const {
      data: { errors },
    } = await ApiService.get('config?format=yaml');
    if (errors) for (const error of errors) emitter.emit('toast', { severity: 'warn', message: error });
  } catch (error) {
    emitter.emit('error', error);
  }
};

const getYaml = async () => {
  try {
    const {
      data: { config },
    } = await ApiService.get('config?format=yaml');
    loading.value = false;
    await checkForErrors();
    await nextTick();
    const element = document.getElementById('editor');
    if (element) {
      const modelUri = monaco.Uri.parse('a://b/api/config/schema.json');
      setDiagnosticsOptions({
        enableSchemaRequest: true,
        validate: false,
        schemas: [
          {
            uri: `${constants().api}/config/schema.json`,
            fileMatch: [String(modelUri)],
          },
        ],
      });
      const model =
        monaco.editor.getModels().length > 0
          ? monaco.editor.getModel(modelUri)
          : monaco.editor.createModel(config, 'yaml', modelUri);

      monaco.editor.defineTheme('phrame', theme as monaco.editor.IStandaloneThemeData);
      editor = monaco.editor.create(element, {
        value: config,
        language: 'yaml',
        model,
        theme: 'phrame',
        automaticLayout: true,
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        minimap: { enabled: false },
        overviewRulerBorder: false,
        scrollbar: { verticalScrollbarSize: 8 },
        fixedOverflowWidgets: true,
      });
    }
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

const postRestart = () => {
  waitForRestart.value = false;
  checkServices();
  emitter.emit('toast', { severity: 'success', message: 'Restart complete' });
};

watch(
  () => socket.state.connected,
  (value) => {
    if (!value) return;
    if (waitForRestart.value) {
      postRestart();
      checkForErrors();
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
          v-for="(service, index) in sortedServices"
          v-tooltip.right="
            service.tooltip === null
              ? ''
              : typeof service.tooltip === 'object'
              ? JSON.stringify(service.tooltip)
              : service.tooltip
          "
          class="flex align-items-center mr-2"
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
        <div class="editor-wrapper h-full">
          <div class="buttons mt-2 mr-2">
            <Button
              icon="fas fa-rotate-right"
              class="p-button-sm p-button-success mb-2"
              @click="reload"
              :disabled="loading"
              v-tooltip.left="'Refresh Page'"
            />
            <br />
            <div class="save-btn-wrapper border-round">
              <Button
                icon="fas fa-save"
                class="p-button p-button-sm p-button-success"
                @click="save"
                :disabled="waitForRestart"
                v-tooltip.left="'Save Config and Restart'"
              />
            </div>
          </div>
          <div id="editor"></div>
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
.editor-wrapper {
  margin-left: -1rem;
  margin-right: -1rem;
  padding-top: 0.5rem;
  background: #24252e;
  .buttons {
    position: absolute;
    top: 0;
    right: 5px;
    z-index: 1;
  }
}

#editor {
  height: 100%;
  :deep(.monaco-editor .scroll-decoration) {
    box-shadow: none;
  }
  :deep(textarea) {
    font-size: 16px !important;
  }
  :deep(.iPadShowKeyboard) {
    display: none;
  }
  :deep(.slider) {
    border-radius: 4px;
  }
  :deep(.inputarea.monaco-mouse-cursor-text) {
    opacity: 0;
  }
}

.save-btn-wrapper {
  background: var(--surface-a);
}
</style>
