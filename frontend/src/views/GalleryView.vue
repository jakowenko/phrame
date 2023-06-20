<script lang="ts" setup>
import { ref, onMounted, onBeforeMount, onBeforeUnmount, watch, computed } from 'vue';
import type { Ref } from 'vue';
import _, { last } from 'lodash';
import { inflect } from 'inflection';

import InputText from 'primevue/inputtext';
import Chip from 'primevue/chip';
import MultiSelect from 'primevue/multiselect';
import Button from 'primevue/button';
import { useConfirm } from 'primevue/useconfirm';
import type { UseSwipeDirection } from '@vueuse/core';
import { useSwipe } from '@vueuse/core';

import socket from '@/utils/socket';
import emitter from '@/services/emitter.service';
import { ApiService } from '@/services/api.service';
import time from '@/utils/time';
import GalleryRow from '@/components/GalleryRow.vue';
import sleep from '@/utils/sleep';
import { aiToTitleCase } from '@/utils/functions';
import constants from '@/utils/constants';

interface Gallery {
  id: number;
  summary: string;
  image: Image[];
}

type Image = {
  id: number;
  summaryId: number;
  filename: string;
  favorite: boolean;
  meta: {
    aspectRatio: number;
  };
};

type FilterValue = {
  name: string;
  value: string | boolean;
};

const props = defineProps<{
  toolbarHeight: number;
  hasMic: boolean;
}>();
const confirm = useConfirm();
const hasMore = ref(false);
const aspectRatio = ref({
  image: 0,
  window: 0,
});
let newImagePromise: Promise<[void, void, void]>;
const modal = ref<{ show: boolean; src: string; image: { [name: string]: any }; summary: string }>({
  show: false,
  src: '',
  image: {},
  summary: '',
});
const fixed: Ref<HTMLElement | null> = ref(null);
const loading = ref(true);
const scrollIds = ref<number[]>([]);
const galleries = ref<Gallery[]>([]);
const oldestGalleryId = ref(0);
const favoritesDefault = ref(false);
const total = ref<{ summaries: number | null; images: number | null; favorites: number | null }>({
  summaries: null,
  images: null,
  favorites: null,
});
const filters = ref<{ favorites: FilterValue[]; ais: FilterValue[]; styles: FilterValue[]; loading: boolean }>({
  favorites: [
    { name: 'Favorited', value: true },
    { name: 'Not Favorited', value: false },
  ],
  ais: [],
  styles: [],
  loading: true,
});
const selected = ref<{
  favorites: FilterValue[];
  ais: FilterValue[];
  styles: FilterValue[];
  images: number[];
  summary: string;
}>({
  favorites: filters.value.favorites,
  ais: [],
  styles: [],
  images: [],
  summary: '',
});

const allImages = computed(() =>
  galleries.value.reduce((prev: Image[], curr: Gallery) => {
    return prev.concat(curr.image);
  }, []),
);

const allImageIds = computed(() => allImages.value.map((image) => image.id));

const apiFilters = () =>
  (Object.entries(selected.value) as [string, (FilterValue | string | number)[]][])
    .filter(([key]) => key !== 'images') // Exclude 'images'
    .map(([key, values]) => {
      if (Array.isArray(values) && typeof values[0] === 'object') {
        return `${key}=${(values as FilterValue[]).map((obj) => encodeURIComponent(String(obj.value))).join(',')}`;
      }
      return `${key}=${encodeURIComponent(String(values))}`;
    })
    .join('&');

const getFilters = async () => {
  try {
    filters.value.loading = true;
    const { data } = await ApiService.get('gallery/filters');
    filters.value.ais = data.ai.map(({ name, value }: FilterValue) => ({
      name: aiToTitleCase(name),
      value,
    }));
    filters.value.styles = data.style.map(({ name, value }: FilterValue) => ({
      name: aiToTitleCase(name),
      value,
    }));
    if (!selected.value.ais.length) selected.value.ais = filters.value.ais;
    if (!selected.value.styles.length) selected.value.styles = filters.value.styles;
    filters.value.loading = false;
  } catch (error) {
    emitter.emit('error', error);
  }
};

const setWindowAspectRatio = (): void => {
  aspectRatio.value.window = parseFloat((window.innerWidth / window.innerHeight).toFixed(2));
};

const updateGalleryIds = () => {
  oldestGalleryId.value = last(galleries.value)?.id || 0;
};

const getGallery = async (firstLoad?: boolean) => {
  try {
    if (!firstLoad && loading.value) return;
    loading.value = true;
    await sleep(250);
    const { data } = await ApiService.get(`gallery?${apiFilters()}`);
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    galleries.value = data.galleries;
    total.value = data.total;
    hasMore.value = data.hasMore;
    updateGalleryIds();
    scrollIds.value = [];
    loading.value = false;
  } catch (error) {
    emitter.emit('error', error);
  }
};

const getMoreGallery = async (limit = true) => {
  const { data } = await ApiService.get(`gallery?limit=${limit}&${apiFilters()}`, {
    beforeSummaryId: oldestGalleryId.value,
  });
  galleries.value.push(...data.galleries);
  hasMore.value = data.hasMore;
  updateGalleryIds();
};

const getGalleryById = async (summaryId: number) => {
  const { data } = await ApiService.get(`gallery`, { summaryId });

  const galleryIds = galleries.value.map((gallery) => gallery.id);
  const index = galleryIds.indexOf(data.id);
  if (galleryIds.includes(data.id)) {
    data.image.forEach((image: Image) => {
      if (!galleries.value[index].image.some((i) => i.id === image.id)) {
        galleries.value[index].image.unshift(image);
      }
    });
  } else {
    galleries.value.unshift(data);
  }
};

const handleScroll = async () => {
  const totalScrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  if (window.scrollY + 50 >= totalScrollableHeight) {
    const { id: beforeId } = galleries.value[galleries.value.length - 1];
    if (scrollIds.value.includes(beforeId)) return;
    scrollIds.value.push(beforeId);
    getMoreGallery();
  }
};

const allSelected = () =>
  selected.value.images.length > 0 &&
  selected.value.images.length ===
    galleries.value.reduce((prev: number, curr: Gallery) => {
      return prev + curr.image.length;
    }, 0);

const updateFavoritesDefault = () => {
  const allFavorites =
    Boolean(selected.value.images.length) &&
    selected.value.images.every((id) => {
      const image = allImages.value.find((img) => img.id === id);
      return image?.favorite === true;
    });
  favoritesDefault.value = allFavorites;
};

const toggleSelectAll = () => {
  if (allSelected()) {
    selected.value.images = [];
  } else {
    galleries.value.forEach((gallery: Gallery) => {
      gallery.image.forEach((image) => {
        if (!selected.value.images.includes(image.id)) selected.value.images.push(image.id);
      });
    });
  }
  updateFavoritesDefault();
};

const updateTotal = async () => {
  const { data } = await ApiService.get('gallery');
  total.value = data.total;
};

const favoriteSelected = async () => {
  favoritesDefault.value = !favoritesDefault.value;
  galleries.value.forEach((gallery: Gallery) => {
    gallery.image.forEach((image) => {
      if (selected.value.images.includes(image.id)) image.favorite = favoritesDefault.value;
    });
  });
  try {
    await ApiService.patch('image', { ids: selected.value.images, favorite: favoritesDefault.value });
    await updateTotal();
  } catch (error) {
    emitter.emit('error', error);
  }
};

const deleteSelected = async () => {
  confirm.require({
    header: 'Confirmation',
    message: `Do you want to delete the ${selected.value.images.length} selected ${inflect(
      'image',
      selected.value.images.length,
    )}?`,
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        const areAllSelected = allSelected();
        galleries.value.forEach((gallery: Gallery) => {
          gallery.image = gallery.image.filter((image) => !selected.value.images.includes(image.id));
        });
        galleries.value = galleries.value.filter((gallery) => gallery.image.length);
        await ApiService.delete('image', { ids: selected.value.images });
        selected.value.images = [];

        updateTotal();

        if (hasMore.value && areAllSelected) {
          loading.value = true;
          await sleep(500);
          await getMoreGallery();
          loading.value = false;
        }
      } catch (error) {
        emitter.emit('error', error);
      }
    },
    reject: () => {},
  });
};

const getHeight = computed(() => fixed.value?.clientHeight || 0);

const fixSelectPanel = (value: boolean) => {
  const sub = document.getElementsByClassName('p-multiselect')[0];
  const [panel] = document.getElementsByClassName('p-multiselect-panel') as any;
  if (panel) {
    panel.style.position = value ? 'fixed' : 'absolute';
    panel.style.top = `${sub.getBoundingClientRect().bottom}px`;
  }
};

const closeModal = () => {
  modal.value.show = false;
  document.body.style.overflow = 'auto';
  setTimeout(() => {
    modal.value.src = '';
    aspectRatio.value.image = 0;
  }, 500);
};

const modalImage = async (direction: 'next' | 'prev') => {
  if (!modal.value.src) return;
  if (allImageIds.value.length !== total.value.images) {
    if (direction === 'next' && modal.value.image.id === _.last(allImageIds.value)) {
      modal.value.src = '';
      await getMoreGallery();
    }

    if (direction === 'prev' && modal.value.image.id === allImageIds.value[0]) {
      modal.value.src = '';
      await getMoreGallery(false);
    }
  }

  const currentImageIndex = allImages.value.findIndex((image) => image.id === modal.value.image.id);
  const restartImage = direction === 'next' ? allImages.value[0] : _.last(allImages.value);
  const nextImage = allImages.value[currentImageIndex + (direction === 'next' ? 1 : -1)] || restartImage;

  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  if (nextImage) loadModalImage(nextImage, direction);
};

const loadModalImage = (image: Image, direction = 'next') => {
  const preloadImage = () => {
    const index = allImages.value.findIndex(({ id }) => id === image.id);
    const { filename } =
      direction === 'next'
        ? allImages.value[index + 1] || allImages.value[0]
        : allImages.value[index - 1] || _.last(allImages.value);
    const preload = new Image();
    preload.src = `${constants().api}/storage/image/${filename}`;
  };

  modal.value.src = '';
  modal.value.image = image;
  if (!aspectRatio.value.image) aspectRatio.value.image = image.meta.aspectRatio;
  setTimeout(() => {
    const img = new Image();
    img.onload = () => {
      aspectRatio.value.image = image.meta.aspectRatio;
      modal.value.src = img.src;
      modal.value.summary = galleries.value.find((gallery) => gallery.id === image.summaryId)?.summary || '';
      preloadImage();
    };
    img.onerror = () => {
      if (total.value.images === 0) closeModal();
      else modalImage('next');
      emitter.emit('error', { message: 'Error loading image' });
    };
    img.src = `${constants().api}/storage/image/${image.filename}`;
  }, 100);
};

const deleteImage = (id: number) => {
  confirm.require({
    header: 'Confirmation',
    message: 'Do you want to delete this image?',
    acceptClass: 'p-button-danger',
    accept: async () => {
      emitter.emit('delete:image', { id });
    },
    reject: () => {},
  });
};

const favoriteImage = async (id: number, value: boolean) => {
  emitter.emit('toggle:favorite', { id, favorite: value });
};

const modalNavigation = (event: KeyboardEvent) => {
  if (!modal.value.show) return;
  const { key } = event;

  if (key === 'ArrowLeft') modalImage('prev');
  if (key === 'ArrowRight') modalImage('next');
  if (key === 'Escape') closeModal();
  if (key === 'f') favoriteImage(modal.value.image.id, !modal.value.image.favorite);
  if (['d', 'Delete', 'Backspace'].includes(key)) deleteImage(modal.value.image.id);
};

onBeforeUnmount(() => {
  ['to'].forEach((sock) => {
    socket.off(sock);
  });
  ['toggle:favorite', 'delete:image', 'toggle:selected', 'modal:open'].forEach((sock) => {
    emitter.off(sock);
  });
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('keydown', modalNavigation);
  window.removeEventListener('resize', setWindowAspectRatio);
});

onBeforeMount(() => {
  emitter.on('toggle:selected', (message: { id: number }) => {
    if (selected.value.images.includes(message.id)) {
      selected.value.images.splice(selected.value.images.indexOf(message.id), 1);
    } else {
      selected.value.images.push(message.id);
    }

    updateFavoritesDefault();
  });

  emitter.on('modal:open', (imageId: number) => {
    const image = galleries.value
      .map((gallery) => gallery.image)
      .reduce((prev, curr) => {
        return prev.concat(curr);
      }, [])
      .find(({ id }) => id === imageId) as Image;
    if (image && image.filename) {
      modal.value.show = true;
      modal.value.image = image;
      document.body.style.overflow = 'hidden';
    }

    loadModalImage(image);
  });

  emitter.on('toggle:favorite', async (message: { id: number; favorite: boolean }) => {
    galleries.value.forEach((gallery: Gallery) => {
      const image = gallery.image.find(({ id }) => id === message.id);
      if (image) image.favorite = message.favorite;
    });
    await ApiService.patch(`image/${message.id}`, { favorite: message.favorite }).catch((error) => {
      emitter.emit('error', error);
    });
    updateFavoritesDefault();
    await updateTotal();
  });
  emitter.on('delete:image', async (message: { id: number }) => {
    await ApiService.delete(`image/${message.id}`)
      .then(async () => {
        await updateTotal();

        if (modal.value.show) {
          emitter.emit('toast', { message: 'Image deleted' });
          if (total.value.images === 0) closeModal();
          else modalImage('next');
        }

        galleries.value.forEach((gallery: Gallery) => {
          const index = gallery.image.findIndex(({ id }) => id === message.id);
          if (index > -1) gallery.image.splice(index, 1);
          if (!gallery.image.length) galleries.value.splice(galleries.value.indexOf(gallery), 1);
        });
      })
      .catch((error) => {
        emitter.emit('error', error);
      });
  });
  socket.on('to', async ({ to, ...obj }: { [name: string]: any }) => {
    if (to !== 'gallery' && !to.includes('gallery')) return;
    const { action, summaryId } = obj;
    if (action === 'new-image') {
      await newImagePromise;
      newImagePromise = Promise.all([getFilters(), updateTotal(), getGalleryById(summaryId)]);
    }
  });
  window.addEventListener('scroll', handleScroll);
  window.addEventListener('keydown', modalNavigation);
});

onMounted(async () => {
  await getFilters();
  await getGallery(true);
  setWindowAspectRatio();
  window.addEventListener('resize', setWindowAspectRatio);
});

watch(
  () => selected.value.favorites,
  async (value, oldValue) => {
    if (_.isEqual(value, oldValue) || loading.value) return;
    await getGallery();
  },
);

watch(
  () => selected.value.ais,
  async (value, oldValue) => {
    if (_.isEqual(value, oldValue) || loading.value) return;
    await getGallery();
  },
);

watch(
  () => selected.value.styles,
  async (value, oldValue) => {
    if (_.isEqual(value, oldValue) || loading.value) return;
    await getGallery();
  },
);

watch(
  () => selected.value.summary,
  async (value, oldValue) => {
    if (_.isEqual(value, oldValue) || loading.value) return;
    if (value !== '' && value.length < 3) return;
    await getGallery();
  },
);
const swipe = ref<HTMLElement | null>(null);
if (window.matchMedia('(pointer: coarse)').matches) {
  useSwipe(swipe, {
    passive: false,
    onSwipeEnd(e: TouchEvent, direction: UseSwipeDirection) {
      modalImage(direction === 'left' ? 'next' : 'prev');
    },
  });
}
</script>

<template>
  <Transition name="fade">
    <div class="modal flex justify-content-center align-items-center" v-if="modal.show" @click.self="closeModal">
      <div
        class="inner"
        :style="{ aspectRatio: aspectRatio.image }"
        :class="
          aspectRatio.window === aspectRatio.image
            ? ''
            : aspectRatio.window < aspectRatio.image
            ? 'full-width'
            : 'full-height'
        "
      >
        <i v-if="!modal.src" class="pi pi-spin pi-spinner align-self-center" style="font-size: 2rem"></i>
        <Transition name="fade">
          <div v-if="modal.src">
            <div class="btn-holder border-round">
              <i
                class="favorite-btn"
                :class="modal.image.favorite ? 'fas fa-star' : 'far fa-star'"
                :style="modal.image.favorite ? 'color: var(--yellow-400)' : ''"
                @click="favoriteImage(modal.image.id, !modal.image.favorite)"
              ></i>
              <i class="fas fa-trash-can" @click="deleteImage(modal.image.id)"></i>
            </div>
            <img ref="swipe" :src="modal.src" class="border-round" />
            <p>{{ modal.summary }}</p>
            <div class="text-center chip-wrapper w-full">
              <Chip :label="modal.image.meta.ai" class="text-xs mr-2" />
              <Chip :label="modal.image.meta.style" class="text-xs mr-2" />
              <Chip :label="time.format(modal.image.createdAt, 'MM-dd-yy @ hh:mm a')" class="text-xs" />
            </div>
          </div>
        </Transition>
        <i class="fas fa-xmark close-btn" @click="closeModal" />
        <i
          v-if="total.images && total.images > 1"
          class="fas fa-angle-left prev-btn"
          text
          @click="modalImage('prev')"
        ></i>
        <i v-if="total.images && total.images > 1" class="fas fa-angle-right next-btn" @click="modalImage('next')"></i>
      </div>
    </div>
  </Transition>
  <main class="subpage" :style="{ paddingTop: getHeight + 'px' }">
    <div ref="fixed" class="fixed w-full pt-2 shadow-5" :style="`top: calc(${props.toolbarHeight}px);`">
      <div class="pl-3 pr-3 shadow-5">
        <div class="grid">
          <div class="col-4 md:col-3">
            <strong class="text-sm text-500">Favorites</strong>
            <MultiSelect
              v-model="selected.favorites"
              :options="filters.favorites"
              optionLabel="name"
              placeholder="Filter Favorites"
              class="w-full mt-1"
              @show="fixSelectPanel(true)"
              @hide="fixSelectPanel(false)"
            />
          </div>
          <div class="col-4 md:col-3">
            <strong class="text-sm text-500">AIs</strong>
            <MultiSelect
              v-model="selected.ais"
              :options="filters.ais"
              :loading="filters.loading"
              optionLabel="name"
              :placeholder="filters.loading ? 'Loading...' : 'Filter AIs'"
              class="w-full mt-1"
              @show="fixSelectPanel(true)"
              @hide="fixSelectPanel(false)"
            />
          </div>
          <div class="col-4 md:col-3">
            <strong class="text-sm text-500">Styles</strong>
            <MultiSelect
              v-model="selected.styles"
              :options="filters.styles"
              :loading="filters.loading"
              :placeholder="filters.loading ? 'Loading...' : 'Filter Styles'"
              optionLabel="name"
              class="w-full mt-1"
              @show="fixSelectPanel(true)"
              @hide="fixSelectPanel(false)"
            />
          </div>
          <div class="col-12 md:col-3">
            <strong class="text-sm text-500">Summary</strong>
            <InputText v-model="selected.summary" placeholder="Search" class="w-full block mt-1" />
          </div>
        </div>
      </div>
      <div class="grid mt-1 pl-3 pr-3">
        <div class="flex col-7" style="overflow: auto; white-space: nowrap">
          <Chip
            icon="pi fas fa-rectangle-list"
            :label="
              (total.summaries === null ? '-' : total.summaries.toString()) +
              ' ' +
              inflect('Summary', total.summaries || 0)
            "
            class="text-sm mr-2 align-self-center"
          />
          <Chip
            icon="pi fas fa-images"
            :label="(total.images === null ? '-' : total.images.toString()) + ' ' + inflect('Image', total.images || 0)"
            class="text-sm mr-2 align-self-center"
          />
          <Chip
            icon="pi fas fa-star"
            :label="
              (total.favorites === null ? '-' : total.favorites.toString()) +
              ' ' +
              inflect('Favorite', total.favorites || 0)
            "
            class="text-sm align-self-center"
          />
        </div>

        <div class="col-5 flex justify-content-end action-buttons">
          <div class="mr-2">
            <Button
              v-tooltip.left="allSelected() ? 'Unselect All' : 'Select All'"
              :icon="allSelected() ? 'fas fa-check-square' : 'far fa-check-square'"
              size="small"
              @click="toggleSelectAll"
              class="flex"
              :disabled="!galleries.length"
            />
          </div>
          <div class="mr-2">
            <Button
              v-tooltip.left="favoritesDefault ? 'Unfavorite Selected' : 'Favorite Selected'"
              :icon="favoritesDefault ? 'fas fa-star' : 'far fa-star'"
              size="small"
              @click="favoriteSelected"
              :class="{ yellow: favoritesDefault }"
              class="flex"
              :disabled="!selected.images.length"
            />
          </div>
          <div>
            <Button
              icon="fas fa-trash-can"
              v-tooltip.left="'Delete Selected'"
              size="small"
              @click="deleteSelected"
              class="flex"
              :disabled="!selected.images.length"
            />
          </div>
        </div>
      </div>
    </div>
    <div v-if="loading" class="flex justify-content-center h-full">
      <i class="pi pi-spin pi-spinner align-self-center" style="font-size: 2rem"></i>
    </div>
    <div v-else class="mt-3 h-full">
      <div v-if="galleries.length" class="grid align-items-center">
        <div class="col-12" v-for="gallery in galleries" :key="gallery.id">
          <GalleryRow :gallery="gallery" :selected="selected.images" />
        </div>
      </div>
      <div v-else class="flex justify-content-center h-full">
        <strong class="align-self-center">Gallery is empty</strong>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  z-index: 10;
  cursor: pointer;

  .close-btn {
    width: auto;
    height: auto;
    padding: 0.5rem 0.6rem;
    position: absolute;
    z-index: 1;
    top: -0.7rem;
    right: -2.5rem;
    cursor: pointer;
    font-size: 1.75rem;
  }

  .close-btn:hover,
  .next-btn:hover,
  .prev-btn:hover {
    color: var(--primary-color);
  }

  .next-btn,
  .prev-btn {
    position: absolute;
    top: 50%;
    margin-top: -1.75rem;
    right: -2.5rem;
    z-index: 1;
    font-size: 2rem;
    cursor: pointer;
    padding: 0.5rem 0.75rem;
  }

  .prev-btn {
    right: auto;
    left: -2.5rem;
  }

  .pi-spin {
    position: absolute;
    top: 50%;
    left: 50%;
    margin-top: -1rem;
    margin-left: -1rem;
  }

  .inner {
    cursor: default;
    width: 80%;

    &.full-height {
      width: auto;
      height: 80%;
    }
    &.full-width {
      width: 80%;
      height: auto;
    }
  }

  img {
    display: block;
    width: 100%;
  }

  .chip-wrapper {
    position: absolute;
    bottom: calc(100% + 0.5rem);
    overflow: auto;
    white-space: nowrap;
  }

  p {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    width: 100%;
    color: var(--text-color);
    text-align: center;
    font-size: 0.9rem;
  }

  .btn-holder {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 1;
    background-color: rgba(0, 0, 0, 0.5);
    border-top-left-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
    text-align: center;

    i {
      font-size: 1.25rem;
      display: block;
      cursor: pointer;
      padding: 0.5rem;

      &:hover {
        color: var(--primary-color);
      }
    }
  }
}

.fixed {
  max-width: 1440px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--surface-a);
  z-index: 2;
}
button.yellow :deep(.p-button-icon) {
  color: var(--yellow-400);
}
@media only screen and (max-width: 767px) {
  .action-buttons {
    strong {
      display: none;
    }
  }
}
@media only screen and (max-width: 576px) {
  .action-buttons {
    .p-button.p-button-sm {
      width: 2.5rem;
    }
  }
  .p-chip :deep(.p-chip-icon) {
    display: none;
  }
}

@media only screen and (max-height: 576px) {
  .modal {
    .chip-wrapper,
    p {
      display: none;
    }
  }
}
</style>
