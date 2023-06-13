<script lang="ts" setup>
import { onMounted, onBeforeUnmount, ref, computed } from 'vue';
import GalleryImage from '@/components/GalleryImage.vue';
import time from '@/utils/time';

const props = defineProps<{
  gallery: { [name: string]: any };
  selected: number[];
}>();
const timestamp = ref<number | null>(null);
let interval: ReturnType<typeof setInterval>;
const createdAt = computed(() => {
  return { ago: time.ago(props.gallery.createdAt), createdAt: timestamp.value };
});

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
  <main>
    <div v-if="gallery.image">
      <div class="grid grid-nogutter card-holder border-round">
        <div class="col-12">
          <div class="grid grid-nogutter">
            <div class="col-12">
              <span class="block">{{ gallery.summary }}</span>
            </div>
            <div class="col-12 mt-3">
              <div class="grid grid-nogutter">
                <div
                  v-for="image in gallery.image"
                  :key="image"
                  class="image col-6 md:col-3 mr-3 mb-3 align-self-center"
                >
                  <GalleryImage :image="{ ...image }" :selected="selected.includes(image.id)" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <small class="block">{{ createdAt.ago }}</small>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
.card-holder {
  padding: 1rem;
  background: var(--surface-c);
}
@media only screen and (min-width: 768px) {
  .image {
    width: calc(25% - 0.75rem);
  }
  .image:nth-child(4n) {
    margin-right: 0 !important;
  }
}

@media only screen and (max-width: 767px) {
  .image {
    width: calc(50% - 0.5rem);
  }
  .image:nth-child(2n) {
    margin-right: 0 !important;
  }
}
</style>
