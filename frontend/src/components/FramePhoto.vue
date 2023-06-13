<script lang="ts" setup>
import { ref, watch, onMounted, computed, onBeforeUnmount } from 'vue';

import time from '@/utils/time';
import constants from '@/utils/constants';
import emitter from '@/services/emitter.service';

interface FramePhotoProps {
  image: { [name: string]: any };
  summary: { summary: string; visible: boolean };
}

const props = defineProps<FramePhotoProps>();
const currentSrc = ref<string>(props.image.filename);
const delayed = ref({
  credit: '',
  summary: '',
  createdAt: '',
});
const frameClass = ref<string>('first-load');
const aspectRatio = ref({
  window: 0,
  image: 0,
});

const setImageAspectRatio = (img: HTMLImageElement): void => {
  aspectRatio.value.image = img.width / img.height;
};

const setWindowAspectRatio = (): void => {
  aspectRatio.value.window = parseFloat((window.innerWidth / window.innerHeight).toFixed(2));
};

watch(
  () => props.image,
  (newSrc) => {
    const img = new Image();
    img.onload = () => {
      currentSrc.value = newSrc.filename;
      setImageAspectRatio(img);
    };
    img.src = `${constants().api}/storage/image/${newSrc.filename}`;

    setTimeout(() => {
      delayed.value.credit = `${newSrc.meta.style} by ${newSrc.meta.ai}`;
    }, 2000);

    setTimeout(() => {
      delayed.value.summary = props.summary.summary;
    }, 2000);

    setTimeout(() => {
      delayed.value.createdAt = time.ago(props.image.createdAt);
    }, 2000);
  },
  { deep: true },
);

const imageUrl = computed(() => {
  return `${constants().api}/storage/image/${currentSrc.value}`;
});

const credit = (image: { [name: string]: any }) => {
  return `${image.meta.style} by ${image.meta.ai}`;
};

onMounted(() => {
  const img = new Image();
  img.onload = () => {
    setImageAspectRatio(img);
  };
  img.src = imageUrl.value;

  delayed.value.summary = props.summary.summary;
  delayed.value.credit = credit(props.image);
  delayed.value.createdAt = time.ago(props.image.createdAt);
  emitter.emit('isAnimating', true);
  setTimeout(() => {
    frameClass.value = 'first-load fade';
  }, 150);
  setTimeout(() => {
    frameClass.value = '';
    emitter.emit('isAnimating', false);
  }, 2650);
  setWindowAspectRatio();
  window.addEventListener('resize', setWindowAspectRatio);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', setWindowAspectRatio);
});
</script>

<template>
  <Transition name="fade">
    <div
      :key="imageUrl"
      :class="frameClass"
      class="frame-photo flex w-full h-full align-items-center justify-content-center"
    >
      <div class="background" :style="{ backgroundImage: `url('${imageUrl}')` }"></div>
      <div class="credit border-round" v-if="summary.visible">
        <div class="p-1">{{ delayed.credit }}</div>
      </div>
      <div class="credit created-at border-round" v-if="summary.visible">
        <div class="p-1">{{ delayed.createdAt }}</div>
      </div>
      <div
        class="image-wrapper"
        :class="
          aspectRatio.window === aspectRatio.image
            ? ''
            : aspectRatio.window < aspectRatio.image
            ? 'full-width'
            : 'full-height'
        "
        :style="{ aspectRatio: aspectRatio.image }"
      >
        <div class="summary" v-if="summary.visible">
          <div class="p-3 border-round">
            {{ delayed.summary }}
          </div>
        </div>
        <img :src="imageUrl" />
      </div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.frame-photo {
  position: absolute;

  .image-wrapper {
    text-align: center;
    width: 100%;

    &.full-width {
      width: 100%;
      height: auto;
    }

    &.full-height {
      height: 100%;
      width: auto;
    }

    .summary {
      position: absolute;
      right: 25px;
      left: 25px;
      bottom: 25px;
      z-index: 1;

      div {
        display: inline-block;
        background: rgba(0, 0, 0, 0.5);
        font-size: 0.95rem;
        color: #fff;
        line-height: 150%;
      }
    }

    img {
      width: 100%;
      display: block;
      box-shadow: 0 0 25px 15px rgba(0, 0, 0, 0.5);
    }
  }

  .background {
    background-size: cover;
    backface-visibility: hidden;
    transform: translate3d(0, 0, 0);
    -webkit-backface-visibility: hidden;
    -webkit-transform: translate3d(0, 0, 0);
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    filter: blur(30px);
    scale: 1.1;
    background-position: center;
  }

  .credit {
    position: absolute;
    bottom: 0;
    right: 0;
    font-size: 0.75rem;
    background: rgba(0, 0, 0, 0.8);
    opacity: 0.25;
    z-index: 1;
    border-bottom-right-radius: 0 !important;
    border-bottom-left-radius: 0 !important;
    border-top-right-radius: 0 !important;

    &.created-at {
      right: auto;
      left: 0;
      border-top-right-radius: var(--border-radius) !important;
      border-top-left-radius: 0 !important;
    }
  }
}

.fade {
  &-enter-active,
  &-leave-active {
    transition: opacity 3s 2s ease;

    .credit,
    .summary {
      transition: opacity 1s ease;
    }

    img {
      transition: opacity 1s 0.5s ease;
    }
  }

  &-enter-active {
    img {
      transition: opacity 1s 3s ease;
    }

    .credit,
    .summary {
      transition: opacity 1s 3.5s ease;
    }
  }

  &-enter-from,
  &-leave-to {
    opacity: 0;

    img {
      opacity: 0;
    }

    .credit,
    .summary {
      opacity: 0;
    }
  }
}

.first-load {
  opacity: 0;
  img,
  .credit,
  .summary {
    opacity: 0;
  }
}

.first-load.fade {
  opacity: 1;
  transition: opacity 3s ease;

  img {
    opacity: 1;
    transition: opacity 1s 1s ease;
  }
  .summary {
    opacity: 1;
    transition: opacity 1s 1.5s ease;
  }
  .credit {
    opacity: 0.25;
    transition: opacity 1s 1.5s ease;
  }
}
</style>
