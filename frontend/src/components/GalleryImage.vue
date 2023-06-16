<script lang="ts" setup>
import { ref, computed } from 'vue';
import VLazyImage from 'v-lazy-image';

import Chip from 'primevue/chip';
import { useConfirm } from 'primevue/useconfirm';

import constants from '@/utils/constants';
import emitter from '@/services/emitter.service';

const confirm = useConfirm();
const props = defineProps<{
  image: { [name: string]: any };
  selected: boolean;
}>();
const loaded = ref(false);
const hasError = ref(false);
const imageUrl = computed(() => {
  return `${constants().api}/storage/image/${props.image.filename}?thumb`;
});

const loadError = () => {
  hasError.value = true;
};

const favorite = computed({
  get: () => props.image.favorite,
  set: async (value) => {
    emitter.emit('toggle:favorite', { id: props.image.id, favorite: value });
  },
});

const deleteImage = () => {
  confirm.require({
    header: 'Confirmation',
    message: 'Do you want to delete this image?',
    acceptClass: 'p-button-danger',
    accept: async () => {
      emitter.emit('delete:image', { id: props.image.id });
    },
    reject: () => {},
  });
};

const toggleSelected = () => {
  emitter.emit('toggle:selected', { id: props.image.id });
};

const openModal = () => {
  emitter.emit('modal:open', props.image.id);
};
</script>

<template>
  <main>
    <div class="cursor-pointer click-wrapper" @click="toggleSelected"></div>
    <div v-if="hasError" style="position: absolute; top: 50%; left: 50%; margin-top: -1rem; margin-left: -0.75rem">
      <i class="fas fa-circle-exclamation" style="font-size: 1.5rem"></i>
    </div>
    <div
      v-else-if="!loaded"
      class="loading-spinner"
      style="position: absolute; top: 50%; left: 50%; margin-top: -1rem; margin-left: -0.75rem"
    >
      <i class="pi pi-spin pi-spinner" style="font-size: 1.5rem"></i>
    </div>
    <div :style="{ aspectRatio: image.meta.aspectRatio }">
      <div class="btn-holder border-round text-center">
        <i
          class="favorite-btn"
          :class="favorite ? 'fas fa-star' : 'far fa-star'"
          :style="favorite ? 'color: var(--yellow-400)' : ''"
          @click="favorite = !favorite"
        ></i>
        <i class="fas fa-expand" @click="openModal"></i>
        <i class="fas fa-trash-can trash-btn" @click="deleteImage"></i>
      </div>
      <div v-if="props.selected" class="border border-round"></div>
      <VLazyImage :src="imageUrl" @error="loadError" @load="loaded = true" class="thumbnail border-round" />
    </div>
    <div class="flex justify-content-center chip-wrapper w-full">
      <Chip :label="image.meta.ai" class="text-xs mr-2" />
      <Chip :label="image.meta.style" class="text-xs" />
    </div>
  </main>
</template>

<style scoped lang="scss">
.border {
  border: 3px solid var(--highlight-text-color);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

img.thumbnail {
  max-width: 100%;
  display: block;
  transition: opacity 1s;
  opacity: 0;
}

img.v-lazy-image-loaded {
  opacity: 1;
}

.btn-holder {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 1;
  background-color: rgba(0, 0, 0, 0.5);
  border-top-left-radius: 0 !important;
  border-bottom-right-radius: 0 !important;

  i {
    font-size: 1rem;
    display: block;
    cursor: pointer;
    padding: 0.5rem;

    &:hover {
      color: var(--primary-color);
    }
  }
}

.click-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.chip-wrapper {
  position: absolute;
  bottom: 0;
  padding: 0.5rem;
  @media only screen and (max-width: 576px) {
    position: relative;
  }

  .p-chip {
    max-width: 50%;
    &:deep(.p-chip-text) {
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis !important;
      white-space: nowrap;
    }
  }
}
</style>
