<!-- eslint-disable @typescript-eslint/no-use-before-define -->
<script lang="ts" setup>
import { ref, reactive, watch, onMounted, onBeforeMount, onBeforeUnmount } from 'vue';
import _ from 'lodash';

import { ApiService } from '@/services/api.service';
import sleep from '@/utils/sleep';
import emitter from '@/services/emitter.service';
import speech from '@/utils/web-speech-api';
import FramePhoto from '@/components/FramePhoto.vue';
import socket from '@/utils/socket';

const props = defineProps<{ hasMic: boolean }>();
const loading = ref(true);
const isCursorVisible = ref(true);
let mouseTimer: ReturnType<typeof setTimeout>;
const mouseTimeoutDuration = 3000;
const images = ref<Array<{ [name: string]: any }>>([]);
const image = ref<{ [name: string]: any }>({});
let cornerButtonSize: string;
let getImageAfterAnimation = false;
const state = ref<{ [name: string]: any }>({});
const imageTimeout = ref<number | null>(null);
let imageSetTimeout: ReturnType<typeof setTimeout>;
const isAnimating = ref(false);
let wakeWord = reactive({
  show: false,
  transcript: null,
  showResponse1: false,
  showResponse2: false,
});
const progress = reactive<{
  count: number;
  width: number;
  interval?: ReturnType<typeof setInterval>;
}>({
  count: 0,
  width: 100,
  interval: undefined,
});
const config = ref<{ [name: string]: any }>({});

const bodyClicked = () => {
  if (state.value.microphone.enabled === null) state.value.microphone.enabled = true;
  socket.emit('state:patch', { to: 'controller', microphone: { enabled: state.value.microphone.enabled } });
};

const toggle = (key: 'mic' | 'key' | 'summary') => {
  if (key === 'mic') {
    state.value.microphone.enabled = state.value.microphone.enabled === null ? true : !state.value.microphone.enabled;
    socket.emit('state:patch', { to: 'controller', microphone: { enabled: state.value.microphone.enabled } });
  }

  if (key === 'summary') {
    state.value.image.summary = !state.value.image.summary;
    socket.emit('state:patch', { to: 'controller', image: { summary: state.value.image.summary } });
  }
};

const resetMouseTimer = () => {
  clearTimeout(mouseTimer);
  isCursorVisible.value = true;

  mouseTimer = setTimeout(() => {
    isCursorVisible.value = false;
  }, mouseTimeoutDuration);
};

const changeImageTimeout = () => {
  if (!imageTimeout.value) return;
  clearTimeout(imageSetTimeout);
  imageSetTimeout = setTimeout(changeImage, imageTimeout.value * 1000);
  socket.emit('state:patch', {
    image: { index: state.value.image.index },
  });
};

const changeImage = (direction = 'next') => {
  if (isAnimating.value) return;
  let nextIndex = state.value.image.index + (direction === 'next' ? 1 : -1);
  if (nextIndex < 0) nextIndex = images.value.length - 1;
  state.value.image.index = nextIndex % images.value.length;
  image.value = images.value[state.value.image.index];
  changeImageTimeout();
};

const onBeforeEnter = () => {
  isAnimating.value = true;
  animateProgressBar();
};
const onAfterLeave = () => {
  isAnimating.value = false;
};
const animateProgressBar = () => {
  progress.width = 100;
  progress.count = 0;
  clearInterval(progress.interval);
  progress.interval = setInterval(() => {
    if (!imageTimeout.value) return;
    progress.count += 1;
    // the 1 second accounts for the interval not being called for 1 second
    progress.width = 100 - (progress.count / (imageTimeout.value - 1)) * 100;
  }, 1000);
};

const updateButtonSize = () => {
  const isSquare = window.innerWidth === window.innerHeight;
  const isLandscape = window.innerWidth > window.innerHeight;
  // eslint-disable-next-line no-nested-ternary
  const orientation = isSquare ? 'square' : isLandscape ? 'landscape' : 'portrait';
  let size: number;

  switch (orientation) {
    case 'square':
      size = window.innerWidth / 5;
      break;
    case 'portrait':
      size = (window.innerHeight - window.innerWidth) / 2;
      break;
    case 'landscape':
      size = (window.innerWidth - window.innerHeight) / 2;
      break;
    default:
      size = 0;
      break;
  }

  size = Math.max(100, size);
  if (size > 200) size = 200;
  cornerButtonSize = `${size}px`;
};

onBeforeUnmount(() => {
  clearTimeout(imageSetTimeout);
  window.removeEventListener('resize', updateButtonSize);
  ['realtime', 'isAnimating', 'wake-word', 'image-control'].forEach((sock) => {
    emitter.off(sock);
  });
  ['state:get', 'to'].forEach((sock) => {
    socket.off(sock);
  });
  clearTimeout(mouseTimer);
});

onBeforeMount(() => {
  socket.on('state:get', ({ to, ...obj }: { [name: string]: any }) => {
    if (to !== 'frame' && !to.includes('frame')) return;
    state.value = obj;
  });

  socket.on('to', async ({ to, ...obj }: { [name: string]: any }) => {
    if (to !== 'frame' && !to.includes('frame')) return;
    const { action, reloadImages } = obj;
    if (action === 'image-control') changeImage(obj.task);
    if (action === 'new-image') {
      if (isAnimating.value) {
        getImageAfterAnimation = true;
        return;
      }
      await getImages();
      setImage(0);
    }
    if (reloadImages) {
      const shouldSet = images.value.length;
      await getImages();
      if (shouldSet <= 1 || images.value.length <= 1) setImage();
    }
  });

  emitter.on('realtime', (message: any) => {
    socket.emit('realtime', message);
  });
  emitter.on('isAnimating', (message: any) => {
    isAnimating.value = message;
  });
  emitter.on('wake-word', (message: any) => {
    wakeWord = _.mergeWith(wakeWord, message);
    if (message.show === true) {
      wakeWord.transcript = null;
      wakeWord.showResponse1 = false;
      wakeWord.showResponse2 = false;
      setTimeout(() => {
        wakeWord.showResponse1 = true;
      }, 1000);
    }
    if (message.transcript) {
      setTimeout(() => {
        wakeWord.showResponse2 = true;
      }, 1000);
      setTimeout(() => {
        wakeWord.show = false;
      }, 6000);
    }
  });
  emitter.on('image-control', (message: any) => {
    changeImage(message);
  });
});

onMounted(async () => {
  resetMouseTimer();
  updateButtonSize();
  await sleep(250);
  await getState();
  await getConfig();
  await getImages();
  setImage();
  if (props.hasMic) socket.emit('state:patch', { to: 'controller', microphone: { enabled: null } });
  window.addEventListener('resize', updateButtonSize);
  loading.value = false;
});

const getConfig = async () => {
  try {
    const { data } = await ApiService.get('config?format=json');
    config.value = data.config;
  } catch (error) {
    emitter.emit('error', error);
  }
};

const getState = async () => {
  try {
    const { data } = await ApiService.get('state');
    data.microphone.enabled = null;
    state.value = data;
  } catch (error) {
    emitter.emit('error', error);
  }
};

const getImages = async () => {
  try {
    const { data } = await ApiService.get('image');
    images.value = data;
  } catch (error) {
    emitter.emit('error', error);
  }
};

const setImage = (index?: number) => {
  clearTimeout(imageSetTimeout);
  clearInterval(progress.interval);
  if (typeof index === 'number') state.value.image.index = index;
  image.value = images.value[state.value.image.index];
  if (!image.value) image.value = images.value[0];
  if (image.value && images.value.length > 1) {
    animateProgressBar();
    changeImageTimeout();
  }
};

watch(
  () => isAnimating.value,
  async (value) => {
    if (!value && getImageAfterAnimation) {
      getImageAfterAnimation = false;
      await getImages();
      setImage(0);
    }
  },
);

watch(
  () => state.value.microphone?.enabled,
  async (value, oldValue) => {
    if (_.isEqual(value, oldValue)) return;
    if (value === null || !props.hasMic) return;
    if (!value && oldValue !== null) {
      speech.stopSpeechRecognition();
    } else if (value) {
      try {
        await speech.getUserMedia();
        speech.speechRecognition();
      } catch (error) {
        state.value.microphone.enabled = null;
        emitter.emit('error', error);
      }
    }
  },
);

watch(
  () => state.value.image?.cycle,
  async (value, oldValue) => {
    if (_.isEqual(value, oldValue)) return;
    if (value && !_.isEmpty(image.value)) {
      animateProgressBar();
      changeImageTimeout();
      return;
    }
    clearInterval(progress.interval);
    clearTimeout(imageSetTimeout);
  },
);

watch(
  () => socket.state.connected,
  (value) => {
    if (!value) return;
    getConfig();
  },
);

watch(
  () => config.value.image?.interval,
  (value, oldValue) => {
    if (_.isEqual(value, oldValue)) return;
    imageTimeout.value = value;
    animateProgressBar();
    changeImageTimeout();
  },
);
</script>

<template>
  <main class="w-full h-full" @mousemove="resetMouseTimer" :style="{ cursor: isCursorVisible ? 'auto' : 'none' }">
    <div id="mic-click-wrapper" v-if="state?.microphone?.enabled === null && props.hasMic" @click="bodyClicked">
      <div class="flex flex-column justify-content-center h-full cursor-pointer">
        <strong class="align-self-center text-2xl">Click to Start</strong>
        <br />
        <span class="align-self-center text-lg text-center"
          >Browsers require a click before microphone access can be granted</span
        >
      </div>
    </div>
    <div class="tl-arrow" :style="'width: ' + cornerButtonSize + '; height: ' + cornerButtonSize"></div>
    <div
      v-if="props.hasMic"
      @click="toggle('mic')"
      class="tr-arrow"
      :style="'width: ' + cornerButtonSize + '; height: ' + cornerButtonSize"
    ></div>
    <div
      @click="changeImage('prev')"
      class="bl-arrow"
      :style="'width: ' + cornerButtonSize + '; height: ' + cornerButtonSize"
    ></div>
    <div
      @click="changeImage('next')"
      class="br-arrow"
      :style="'width: ' + cornerButtonSize + '; height: ' + cornerButtonSize"
    ></div>

    <div v-if="loading" class="flex justify-content-center h-full">
      <i class="pi pi-spin pi-spinner align-self-center" style="font-size: 2rem"></i>
    </div>
    <div v-else class="w-full h-full">
      <div id="recording-indicator" v-if="state.microphone.enabled"></div>
      <div id="wake-word-holder" class="flex justify-content-center" :class="{ visible: wakeWord.show }">
        <div class="align-self-center card-holder border-round">
          <div class="card-holder border-round">Hey Human!</div>
          <div v-if="wakeWord.showResponse1" class="card-holder border-round mt-2">
            Tell me what you want to see? The styles you've already configured will be used. Go ahead, I'm listening...
          </div>
          <div
            v-if="wakeWord.transcript"
            class="text-right card-holder border-round mt-2"
            v-html="wakeWord.transcript"
          ></div>
          <div v-if="wakeWord.showResponse2" class="card-holder border-round mt-2">
            Sounds great! I'll get that created for you. Hang tight while I do this in the background.
          </div>
        </div>
      </div>
      <div v-if="image" class="w-full h-full overflow-hidden">
        <div
          id="progress-bar"
          v-if="state.image.cycle && images.length > 1"
          :style="{ width: progress.width + '%' }"
        ></div>
        <i id="cycle-status" :class="!state.image.cycle ? 'pi pi-pause' : 'hidden'"></i>
        <FramePhoto
          class="picture-frame"
          :image="image"
          :summary="{ summary: image.summary, visible: state.image.summary }"
          @before-enter="onBeforeEnter"
          @after-leave="onAfterLeave"
        />
      </div>
      <div v-else class="flex flex-column justify-content-center h-full">
        <i class="pi pi-spin pi-spinner align-self-center" style="font-size: 2rem"></i>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
#mic-click-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 3;
  background: rgba(0, 0, 0, 0.75);
}

#cycle-status {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  font-size: 0.8rem;
  opacity: 0.25;
}

#progress-bar {
  position: absolute;
  top: 0;
  width: 100%;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  z-index: 1;
  transition: width 1s linear;
}

#recording-indicator {
  position: absolute;
  top: 5px;
  left: 5px;
  width: 6px;
  height: 6px;
  z-index: 1;
  opacity: 1;
  animation: fade 2s linear infinite;
  background-color: var(--red-800);
  border-radius: 100%;
}

@keyframes fade {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 0.75;
  }
}

#wake-word-holder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.5s ease;
  pointer-events: none;

  &.visible {
    opacity: 1;
  }

  .card-holder {
    padding: 1rem;
    width: 50%;
    max-width: 400px;
    background: var(--surface-b);

    .card-holder {
      width: 100%;
      background: var(--surface-d);
      &:nth-child(3) {
        background: var(--surface-c);
      }
    }
  }
}

.tl-arrow,
.tr-arrow,
.bl-arrow,
.br-arrow {
  position: absolute;
  z-index: 2;
}
.tl-arrow {
  top: 0;
  left: 0;
}
.tr-arrow {
  top: 0;
  right: 0;
}
.bl-arrow {
  bottom: 0;
  left: 0;
}
.br-arrow {
  bottom: 0;
  right: 0;
}

.top {
  z-index: 2;
  opacity: 1;
  transition: opacity 2s;
}
.bottom {
  opacity: 1;
  z-index: 1;
}
</style>
