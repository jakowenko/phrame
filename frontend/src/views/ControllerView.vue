<script lang="ts" setup>
import { ref, reactive, watch, computed, onMounted, onBeforeMount, onBeforeUnmount, nextTick } from 'vue';
import { inflect } from 'inflection';

import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import ToggleButton from 'primevue/togglebutton';
import Textarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';

import socket from '@/utils/socket';
import { ApiService } from '@/services/api.service';
import sleep from '@/utils/sleep';
import ControllerTranscript from '@/components/ControllerTranscript.vue';
import emitter from '@/services/emitter.service';

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

const confirm = useConfirm();
const toast = useToast();
const props = defineProps<{
  toolbarHeight: number;
  hasMic: boolean;
}>();
const loading = ref(true);
const loadingRandom = ref(false);
const noMicClick = ref(false);
const scrollIds: number[] = [];
const status = reactive<{ volume: number | null; recognition: string | null; [name: string]: any }>({
  volume: null,
  recognition: null,
});
const transcripts = reactive<{
  count: number | null;
  all: { id: number }[];
  summary: string;
  lastSummary: string;
  selected: number[];
}>({
  count: null,
  all: [],
  summary: '',
  lastSummary: '',
  selected: [],
});
const iosAddressBarHeight = ref(0);
const state = ref<{ [name: string]: any }>({});

const volumeColor = computed(() => {
  // eslint-disable-next-line no-nested-ternary
  return !status.volume ? '' : status.volume < 20 ? 'red' : status.volume < 70 ? 'yellow' : 'green';
});

const processManualSummary = async () => {
  try {
    await ApiService.post('summary', { summary: transcripts.summary });
    toast.add({
      severity: 'info',
      detail: 'Summary sent for processing',
      life: 3000,
    });
  } catch (error) {
    emitter.emit('error', error);
  }
  transcripts.summary = '';
  transcripts.lastSummary = '';
};

const getState = async () => {
  try {
    const { data } = await ApiService.get('state');
    state.value = data;
  } catch (error) {
    emitter.emit('error', error);
  }
};

const getRandomSummary = async () => {
  try {
    loadingRandom.value = true;
    const summary = transcripts.summary !== transcripts.lastSummary ? transcripts.summary : null;
    transcripts.summary = '';
    const { data } = await ApiService.get('summary/random', {
      summary,
    });
    transcripts.summary = data;
    transcripts.lastSummary = data;
    loadingRandom.value = false;
  } catch (error) {
    loadingRandom.value = false;
    emitter.emit('error', error);
  }
};

const toggle = async (key: 'cron' | 'mic' | 'summary' | 'autogen') => {
  if (key === 'cron') {
    socket.emit('state:patch', { cron: state.value.cron });
    toast.add({
      severity: 'info',
      detail: `Transcript Processing ${state.value.cron ? 'Enabled' : 'Disabled'}`,
      life: 3000,
    });
  }
  if (key === 'mic') {
    socket.emit('state:patch', { to: 'frame', microphone: { enabled: state.value.microphone.enabled } });
    toast.add({
      severity: 'info',
      detail: `Microphone ${state.value.microphone.enabled ? 'Enabled' : 'Disabled'}`,
      life: 3000,
    });
  }
  if (key === 'summary') {
    socket.emit('state:patch', {
      to: 'frame',
      image: { summary: state.value.image.summary },
    });
    toast.add({
      severity: 'info',
      detail: `Summary ${state.value.image.summary ? 'Enabled' : 'Disabled'}`,
      life: 3000,
    });
  }
  if (key === 'autogen') {
    socket.emit('state:patch', { to: 'controller', autogen: state.value.autogen });
    toast.add({
      severity: 'info',
      detail: `Autogen Processing ${state.value.autogen ? 'Enabled' : 'Disabled'}`,
      life: 3000,
    });
  }
};

const imageControl = (task: 'prev' | 'next' | 'toggle') => {
  if (task === 'toggle') {
    state.value.image.cycle = !state.value.image.cycle;
    socket.emit('state:patch', { to: 'frame', image: { cycle: state.value.image.cycle } });
    toast.add({
      severity: 'info',
      detail: `Auto Play ${state.value.image.cycle ? 'Enabled' : 'Paused'}`,
      life: 3000,
    });
  } else socket.emit('to', { to: 'frame', action: 'image-control', task });
};

const getTranscriptsAndCount = async () => {
  try {
    const { data } = await ApiService.get('transcript');
    transcripts.all = data.transcripts;
    transcripts.count = data.count;
  } catch (error) {
    emitter.emit('error', error);
  }
};

const getTranscriptsCount = async () => {
  try {
    const { data } = await ApiService.get('transcript');
    transcripts.count = data.count;
  } catch (error) {
    emitter.emit('error', error);
  }
};

const processTranscript = async () => {
  confirm.require({
    header: 'Confirmation',
    message: `Do you want to process ${transcripts.count} ${inflect('transcript', transcripts.count || 0)}?`,
    acceptClass: 'p-button-success',
    accept: async () => {
      try {
        try {
          await ApiService.post('transcript/process');
          toast.add({
            severity: 'info',
            detail: 'Processing Transcripts',
            life: 3000,
          });
        } catch (error) {
          emitter.emit('error', error);
        }
      } catch (error) {
        emitter.emit('error', error);
      }
    },
    reject: () => {},
  });
};

const deleteTranscript = async () => {
  confirm.require({
    header: 'Confirmation',
    message:
      transcripts.selected.length === 0
        ? `Do you want to delete all ${transcripts.count}  ${inflect('transcript', transcripts.count || 0)}?`
        : `Do you want to delete the ${transcripts.selected.length} selected  ${inflect(
            'transcript',
            transcripts.selected.length,
          )}?`,
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await ApiService.delete('transcript', {
          ids: transcripts.selected.length === 0 ? null : transcripts.selected,
        });
        toast.add({
          severity: 'info',
          detail: 'Deleted Transcripts',
          life: 3000,
        });
        transcripts.all =
          transcripts.selected.length === 0
            ? []
            : transcripts.all.filter(({ id }) => !transcripts.selected.includes(id));
        transcripts.selected = [];
        await getTranscriptsCount();
      } catch (error) {
        emitter.emit('error', error);
      }
    },
    reject: () => {},
  });
};
const controls = ref<any>(null);
const transcriptHeaderTop = ref<number | null>(null);
const handleScroll = async () => {
  const totalScrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  if (window.scrollY + 50 >= totalScrollableHeight) {
    const { id: beforeId } = transcripts.all[transcripts.all.length - 1];
    if (scrollIds.includes(beforeId)) return;
    scrollIds.push(beforeId);
    const { data } = await ApiService.get(`transcript?beforeId=${beforeId}`);
    transcripts.all.push(...data.transcripts);
  }
};

const setTranscriptHeaderHeight = () => {
  if (controls.value) {
    transcriptHeaderTop.value = controls.value.offsetHeight + props.toolbarHeight;
  }
};

const launchMic = () => {
  noMicClick.value = false;
  window.open(`${window.location.origin}/phrame?mic`);
};

const getHeight = computed(() => controls.value?.clientHeight || 0);

onBeforeUnmount(() => {
  ['to', 'state:get', 'toggle:selected', 'realtime'].forEach((sock) => {
    socket.off(sock);
  });
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('resize', setTranscriptHeaderHeight);
});

onBeforeMount(() => {
  socket.on('state:get', ({ to, ...obj }: { [name: string]: any }) => {
    if (to !== 'controller' && !to.includes('controller')) return;
    state.value = obj;
  });

  socket.on('to', async ({ to, ...obj }: { to: string; [name: string]: any }) => {
    if (to !== 'controller' && !to.includes('controller')) return;
    if (obj.transcript) {
      await getTranscriptsCount();
      transcripts.all.unshift(obj.transcript);
    }
    if (obj.reloadTranscript) getTranscriptsAndCount();
  });

  socket.on('realtime', ({ to, ...message }: { to: string; [name: string]: any }) => {
    if (to !== 'controller' && !to.includes('controller')) return;

    Object.keys(message).forEach((key) => {
      if (['volume', 'recognition'].includes(key)) {
        if (key === 'volume') {
          message[key] = parseInt(message[key], 10);
          if (!status.recognition) status.recognition = 'active';
        }
        status[key] = message[key];
      }
    });
  });

  emitter.on('toggle:selected', (message: any) => {
    if (message.toggleSelected) {
      const index = transcripts.selected.findIndex((transcript) => transcript === message.toggleSelected);
      if (index === -1) transcripts.selected.push(message.toggleSelected);
      else transcripts.selected.splice(index, 1);
    }
  });

  if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !(navigator as NavigatorStandalone).standalone)
    iosAddressBarHeight.value = 75;

  window.addEventListener('scroll', handleScroll);
});

onMounted(async () => {
  await sleep(250);
  await Promise.all([getState(), getTranscriptsAndCount()]);
  loading.value = false;
  nextTick(setTranscriptHeaderHeight);
  window.addEventListener('resize', setTranscriptHeaderHeight);
});

watch(
  () => state.value.microphone?.enabled,
  async (value: any) => {
    if (value === null) status.volume = 0;
  },
);
</script>

<template>
  <main class="subpage" :style="{ paddingTop: getHeight + 'px' }">
    <div v-if="loading" class="flex justify-content-center h-full">
      <i class="pi pi-spin pi-spinner align-self-center" style="font-size: 2rem"></i>
    </div>
    <div v-else>
      <div id="controls" ref="controls" class="fixed shadow-5 w-full" :style="{ top: props.toolbarHeight + 'px' }">
        <div class="grid">
          <div class="col-12">
            <div class="surface-card shadow-2 border-round">
              <div
                class="volume-meter border-round"
                :class="volumeColor"
                :style="'width: ' + status.volume + '%'"
              ></div>
              <div class="flex justify-content-between p-3 pt-2 pb-2">
                <div>
                  <span class="block text-500 font-medium">Volume</span>
                </div>
              </div>
            </div>
          </div>
          <div class="col-8">
            <div class="surface-card shadow-2 p-3 border-round">
              <div class="flex justify-content-between">
                <div class="w-full">
                  <span class="block text-500 font-medium mb-2">Recognition</span>
                  <div class="text-900 font-medium ellipsis" style="text-transform: capitalize">
                    {{ status.recognition || 'N/A' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-4">
            <div class="surface-card shadow-2 p-3 border-round">
              <div class="flex justify-content-between">
                <div>
                  <span class="block text-500 font-medium mb-2">Transcripts</span>
                  <div class="text-900 font-medium">
                    {{ transcripts.count }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid mt-0 pb-1">
          <div class="col-12 md:col-6">
            <div class="grid mt-0 flex h-full">
              <div
                class="col-2"
                v-tooltip.left="state.microphone.enabled === null ? 'Click for instructions' : ''"
                @click="noMicClick = state.microphone.enabled === null ? true : false"
              >
                <ToggleButton
                  v-model="state.microphone.enabled"
                  onLabel=""
                  offLabel=""
                  onIcon="pi pi-microphone"
                  offIcon="pi pi-microphone"
                  :disabled="state.microphone.enabled === null"
                  @click="toggle('mic')"
                  class="p-button-sm w-full h-full"
                  v-tooltip.right="'Toggle Microphone'"
                />
              </div>
              <div class="col-2">
                <ToggleButton
                  v-model="state.cron"
                  onLabel=""
                  offLabel=""
                  onIcon="fa-regular fa-clock"
                  offIcon="fa-regular fa-clock"
                  @click="toggle('cron')"
                  class="p-button-sm w-full h-full"
                  v-tooltip.bottom="'Toggle Transcript Processing'"
                />
              </div>
              <div class="col-2">
                <ToggleButton
                  v-if="state.image"
                  v-model="state.image.summary"
                  onLabel=""
                  offLabel=""
                  onIcon="pi pi-book"
                  offIcon="pi pi-book"
                  @click="toggle('summary')"
                  class="p-button-sm w-full h-full"
                  v-tooltip.bottom="'Toggle Summary Visibility'"
                />
              </div>
              <div class="col-2">
                <Button
                  icon="pi pi-angle-left"
                  @click="imageControl('prev')"
                  size="small"
                  class="w-full h-full"
                  v-tooltip.bottom="'Previous Image'"
                />
              </div>
              <div class="col-2">
                <Button
                  :icon="state.image.cycle ? 'pi pi-pause' : 'pi pi-play'"
                  @click="imageControl('toggle')"
                  size="small"
                  class="w-full h-full"
                  v-tooltip.bottom="'Toggle Image Cycling'"
                />
              </div>
              <div class="col-2">
                <Button
                  icon="pi pi-angle-right"
                  @click="imageControl('next')"
                  size="small"
                  class="w-full h-full"
                  v-tooltip.bottom="'Next Image'"
                />
              </div>
            </div>
          </div>
          <div class="col-12 md:col-6">
            <Textarea
              placeholder="Image summary"
              v-model="transcripts.summary"
              class="w-full h-full"
              style="resize: none; padding-right: 100px"
              :disabled="loadingRandom"
            />
            <div class="action-buttons">
              <Button
                v-tooltip.left="
                  transcripts.summary && transcripts.summary !== transcripts.lastSummary
                    ? 'Generate Random AI Summary About: ' + transcripts.summary
                    : 'Generate Random AI Summary'
                "
                :icon="loadingRandom ? 'pi pi-spinner pi-spin' : 'fa-solid fa-shuffle'"
                size="small"
                class="mr-2"
                @click="getRandomSummary"
                :disabled="loadingRandom"
              />
              <Button
                icon="pi pi-check"
                size="small"
                @click="processManualSummary"
                :disabled="!transcripts.summary || loadingRandom"
              />
            </div>
          </div>
        </div>
        <div class="transcript-buttons" v-if="transcripts.all.length">
          <div class="flex justify-content-end">
            <Button
              icon="pi pi-trash"
              :label="transcripts.selected.length > 0 ? '(' + transcripts.selected.length + ')' : ''"
              @click="deleteTranscript"
              size="small"
              class="mr-2"
            />
            <Button @click="processTranscript" size="small" icon="pi pi-check" />
          </div>
        </div>
      </div>
      <div class="grid mt-6" v-if="transcripts.all.length">
        <div class="col-12">
          <div class="card-holder border-round">
            <ul v-if="transcripts.all.length" class="pb-2" style="padding-top: 0.75rem">
              <ControllerTranscript
                v-for="transcript in transcripts.all"
                :key="transcript.id"
                :transcript="transcript"
              />
            </ul>
          </div>
        </div>
      </div>
      <div
        v-else
        class="flex justify-content-center"
        :style="`height: calc(100vh - ${transcriptHeaderTop}px - ${iosAddressBarHeight}px - 1.5rem);`"
      >
        <strong class="align-self-center">No transcripts found</strong>
      </div>
    </div>
  </main>
  <Dialog v-model:visible="noMicClick" header="&nbsp;" :style="{ width: '80%', maxWidth: '500px' }">
    <p class="text-center">
      To enable microphone access, click on the following button to launch a new window. Follow the instructions and
      allow microphone access.
    </p>
    <div class="flex justify-content-center mt-5">
      <Button icon="pi pi-external-link" size="small" label="Launch Phrame with Microphone" @click="launchMic" />
    </div>
  </Dialog>
</template>

<style scoped lang="scss">
.fixed {
  max-width: 1440px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--surface-a);
  padding: 1rem 1rem 0;
  z-index: 1;
}

.transcript-buttons {
  position: absolute;
  top: calc(100% + 1rem);
  left: 0;
  right: 1.5rem;
}

.action-buttons {
  position: absolute;
  bottom: 1.25rem;
  right: 1rem;
}

.surface-card {
  background-color: var(--surface-b) !important;
}

.card-holder {
  ul {
    list-style: none;
    padding: 0;

    li:last-child {
      margin-bottom: 0 !important;
    }
  }
}

.ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.volume-meter {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  transition: width 0.25s ease-in-out, background 0.5s;
  max-width: 100%;
}
.volume-meter.red {
  background: var(--red-400);
}
.volume-meter.yellow {
  background: var(--yellow-400);
}
.volume-meter.green {
  background: var(--green-400);
}

@media only screen and (max-width: 576px) {
  .responsive-button {
    width: auto;
    min-width: auto;
    :deep(.p-button-icon) {
      margin-right: 0;
    }
    :deep(.p-button-label) {
      font-size: 0;
      display: none;
    }
  }
}
</style>
