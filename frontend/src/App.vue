<script lang="ts" setup>
import { onBeforeMount, ref, watch } from 'vue';
import type { Ref } from 'vue';
import { useRoute } from 'vue-router';

import 'primevue/resources/themes/soho-dark/theme.css';

import 'primevue/resources/primevue.min.css';
import 'primeflex/primeflex.css';
import 'primeicons/primeicons.css';
import '@/assets/font-awesome/css/all.min.css';

import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import ConfirmDialog from 'primevue/confirmdialog';

import ToolBar from '@/components/ToolBar.vue';
import { ApiService } from '@/services/api.service';
import emitter from '@/services/emitter.service';
import socket from '@/utils/socket';

const toast = useToast();
const hasMic = new URL(window.location.href).searchParams.has('mic');
const showToolBar = ref(false);
const toolbarHeight = ref<number | null>(null);
const route = useRoute();
const toolbar: Ref<{ getHeight: () => number } | null> = ref(null);

watch(
  () => route,
  (to) => {
    showToolBar.value = to.name !== 'phrame';
    socket.emit('register.url', window.location.href);
  },
  { deep: true },
);

watch(
  () => showToolBar.value,
  (value) => {
    if (value && toolbar.value) {
      toolbarHeight.value = toolbar.value.getHeight();
      document.getElementsByTagName('body')[0].style.paddingTop = `${toolbarHeight.value}px`;
    } else {
      document.getElementsByTagName('body')[0].style.paddingTop = '0';
    }
  },
);

emitter.on('error', (error: any) => {
  toast.add({
    severity: 'error',
    detail: error?.response?.data?.error ? error.response.data.error : error.message,
    life: 3000,
  });
  console.error(error);
});

emitter.on('toast', ({ severity, message: detail, life }: any) => {
  toast.add({
    severity: severity || 'info',
    detail,
    life: life || 3000,
  });
});

const addAnalytics = async () => {
  if (process.env.NODE_ENV !== 'production') return;
  ApiService.get('config')
    .then(({ data }) => {
      if (data.config.telemetry) {
        const analytics = document.createElement('script');
        analytics.type = 'text/javascript';
        analytics.src = './js/plausible.min.js';
        analytics.defer = true;
        analytics.setAttribute('data-domain', 'phrame-frontend');
        analytics.setAttribute('data-api', 'https://api.phrame.ai/v1/plausible');
        document.head.appendChild(analytics);
      }
    })
    .catch(() => {});
};

onBeforeMount(() => {
  addAnalytics();
});
</script>

<template>
  <RouterView v-slot="{ Component }">
    <ToolBar
      ref="toolbar"
      class="toolbar"
      v-show="!hasMic"
      :class="{ visible: showToolBar, microphone: !showToolBar && hasMic }"
    />
    <component :is="Component" :toolbarHeight="toolbarHeight" :hasMic="hasMic" />
  </RouterView>
  <ConfirmDialog :draggable="false"></ConfirmDialog>
  <Toast position="bottom-left" />
</template>

<style lang="scss">
// Allow element/type selectors, because this is global CSS.
// stylelint-disable selector-max-type

@import '@/assets/base';

.p-dialog.p-confirm-dialog {
  max-width: 500px;
  .p-dialog-header {
    border-bottom: 1px solid #282936;
  }
  .p-dialog-footer {
    border-top: 1px solid #282936;
  }
  .p-dialog-content {
    text-align: center;
  }
  .p-confirm-dialog-message {
    margin-left: 0;
  }
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--text-color-secondary);
  border-radius: 4px;
}

::-webkit-scrollbar-corner {
  background: rgba(0, 0, 0, 0);
}

html,
body {
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
}

html {
  font-size: 15px;
  height: 100%;
}

body {
  background: var(--surface-b);
  color: var(--text-color);
  height: 100%;
}

#app {
  margin: 0 auto;
  font-weight: normal;
  width: 100%;
  min-height: 100%;
  height: 100%;
  display: flex;
}

.loading {
  position: fixed;
  z-index: 999;
  background: rgba(0, 0, 0, 0.75);
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: opacity 0.5s;

  &.loaded {
    opacity: 0;
  }
  &.hidden {
    display: none !important;
  }
}

.toolbar {
  opacity: 0;
  transition: opacity 0.25s;
  &:hover {
    opacity: 1;
  }
}
.toolbar.visible {
  opacity: 1 !important;
}
.toolbar.microphone {
  opacity: 0;
  pointer-events: none;
}

.subpage {
  max-width: 1440px;
  padding: 1rem 1rem 1rem 1rem;
  width: 100%;
  min-height: 100%;
  margin: 0 auto;
}

.p-button:focus,
.p-togglebutton.p-button:not(.p-disabled).p-focus {
  box-shadow: none;
}

.p-dialog {
  .p-dialog-footer .p-button-icon {
    display: none;
  }
}

.p-toast .p-toast-message-content {
  align-items: center;
}

.p-toast .p-toast-detail {
  margin-top: 0 !important;
}

@media only screen and (max-width: 576px) {
  .p-toast {
    width: auto !important;
    left: 1rem !important;
    right: 1rem !important;
  }
}

.p-tooltip {
  max-width: 250px;
}
.p-tooltip.p-tooltip-right {
  margin-left: 3px;
}
.p-tooltip.p-tooltip-left {
  margin-left: -3px;
}
.p-tooltip.p-tooltip-top {
  margin-top: -3px;
}

.p-tooltip .p-tooltip-text {
  font-size: 0.75rem;
  padding: 0.35rem;
}

.phrame-menu {
  font-size: 0.9rem;
  width: 175px;
  margin-top: 2px;

  a.p-menuitem-link {
    padding: 0.5rem 1rem;
  }

  .p-menuitem:nth-child(1) a {
    font-weight: bold;
    font-size: 0.75rem;
  }

  .fa-heart.animate {
    animation: 3s ease infinite beat;
  }

  @keyframes beat {
    0%,
    50%,
    100% {
      transform: scale(1.05, 1.08);
    }
    30%,
    80% {
      transform: scale(0.92, 0.95);
    }
  }
}

.p-multiselect .p-multiselect-trigger {
  width: 2rem;
}

.p-multiselect-panel .p-multiselect-items {
  font-size: 0.9rem;
  @media only screen and (max-width: 576px) {
    font-size: 0.9rem;
  }
}

.p-multiselect .p-multiselect-label {
  font-size: 0.9rem;
  @media only screen and (max-width: 576px) {
    padding-top: 0.7rem;
    padding-bottom: 0.7rem;
  }
}

.p-inputtext {
  font-size: 0.9rem;
  @media only screen and (max-width: 576px) {
    font-size: 16px;
  }
}

.p-button.p-button-sm .p-button-icon {
  font-size: 1rem;
}
</style>
