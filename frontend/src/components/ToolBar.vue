<script lang="ts" setup>
import { ref, watch, onMounted } from 'vue';
import type { Ref } from 'vue';

import TabMenu from 'primevue/tabmenu';
import Menu from 'primevue/menu';

import { ApiService } from '@/services/api.service';
import socket from '@/utils/socket';
import { version } from '../../package.json';

const menu = ref();
const toolbar: Ref<HTMLElement | null> = ref(null);
const isUpdateAvailable = ref<boolean | string>(false);
const socketClass = ref('gray');
const navigation = ref([
  { label: 'Phrame', icon: 'pi fas fa-image', to: '/phrame' },
  { label: 'Controller', icon: 'pi fas fa-gamepad', to: '/' },
  { label: 'Gallery', icon: 'pi  fas fa-images', to: '/gallery' },
]);
const menuItems = ref([
  {
    label: `v${version}`,
    icon: 'pi fab fa-github',
    command: () => {
      window.open('https://github.com/jakowenko/phrame');
    },
  },
  { label: 'Config', icon: 'pi fas fa-gear', to: '/config' },
  { label: 'Logs', icon: 'pi fas fa-rectangle-list', to: '/logs' },
  {
    label: 'Sponsor',
    icon: 'pi fas fa-heart animate',
    command: () => {
      window.open('https://github.com/sponsors/jakowenko');
    },
  },
]);

const getHeight = () => toolbar.value?.clientHeight || 0;

const checkVersion = async () => {
  if (!version.includes('-')) return;
  try {
    const sha7 = version.split('-').pop();
    const {
      data: { workflow_runs: builds },
    } = await ApiService.get(
      'https://api.github.com/repos/jakowenko/phrame/actions/workflows/58392532/runs?status=completed',
    );

    const currentBuild = builds.find((build: { [name: string]: any }) => build.head_sha.includes(sha7));
    if (!currentBuild) return;

    const tag = !currentBuild.head_branch.includes('beta') ? 'latest' : 'beta';
    const lastBuild = builds.find(({ head_branch: head }: { [name: string]: any }) =>
      tag === 'latest'
        ? head === 'master' || (!head.includes('beta') && head.includes('v'))
        : head === 'beta' || (head.includes('beta') && head.includes('v')),
    );
    if (currentBuild.id < lastBuild.id) isUpdateAvailable.value = lastBuild.head_branch;
    // eslint-disable-next-line no-empty
  } catch (error) {}
  if (!isUpdateAvailable.value) setTimeout(checkVersion, 60000);
};

const toggleMenu = (event: any) => {
  menu.value.toggle(event);
};

const updateLink = () => {
  window.open(`https://github.com/jakowenko/phrame/releases`);
};

onMounted(() => {
  checkVersion();
});

watch(
  () => socket.state.connected,
  (value) => {
    socketClass.value = value ? 'p-badge-success' : 'p-badge-danger';
  },
);

defineExpose({
  getHeight,
});
</script>

<template>
  <div ref="toolbar" class="tool-bar pr-3 flex justify-content-between align-items-center fixed shadow-5">
    <TabMenu :model="navigation" />

    <div class="flex">
      <div
        v-if="isUpdateAvailable"
        v-tooltip.left="'Update Available (' + isUpdateAvailable + ')'"
        class="p-badge cursor-pointer p-badge-warning mr-1 align-self-center"
        @click="updateLink"
      ></div>
      <div class="menu-wrapper flex" @click="toggleMenu">
        <i class="pi mr-1 pi-angle-down align-self-center" style="height: 14px"></i>
        Phrame
      </div>
      <Menu ref="menu" class="phrame-menu" :model="menuItems" :popup="true" />
      <div
        class="p-badge ml-1 align-self-center"
        v-tooltip.left="socketClass === 'p-badge-success' ? 'Socket Connected' : 'Socket Disconnected'"
        :class="socketClass"
      ></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '@/assets/scss/_variables.scss';

.p-badge {
  width: 10px;
  height: 10px;
  border-radius: 100%;
  padding: 0;
  min-width: auto;

  &.gray {
    background: gray;
  }
}

.menu-wrapper {
  font-size: 0.9rem;
  color: var(--text-color-secondary);
  font-weight: bold;
  cursor: pointer;
}

.tool-bar {
  z-index: 4;
  width: 100%;
  max-width: 1440px;
  background: var(--surface-b);
  border-bottom: 1px solid var(--surface-d);
}
.tool-bar.fixed {
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 1440px;
}

::v-deep(.p-tabmenu) .p-tabmenu-nav {
  border: none;
}

::v-deep(.p-tabmenu) .p-tabmenuitem .p-menuitem-link {
  padding: 0.55rem 1rem;
  background: none;
  border: none;
  @media only screen and (max-width: 576px) {
    padding: 0.55rem 0.55rem;
  }
}

::v-deep(.p-tabmenu) {
  font-size: 0.9rem;
  @media only screen and (max-width: 576px) {
    font-size: 0.85rem;
  }
}

::v-deep(.p-tabmenu) .p-tabmenuitem:not(.p-highlight):not(.p-disabled):hover .p-menuitem-link {
  background: none;
}

::v-deep(.p-tabmenu) .p-tabmenuitem .p-menuitem-link {
  box-shadow: 0 0 0 0 rgba(0, 0, 0, 0) !important;
  -webkit-tap-highlight-color: rgba(255, 255, 255, 0);
}
</style>
