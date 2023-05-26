import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
      };
    }
    return { top: 0 };
  },
  routes: [
    {
      path: '/',
      name: 'controller',
      component: () => import('../views/ControllerView.vue'),
      meta: {
        title: 'Controller',
      },
    },
    {
      path: '/phrame',
      name: 'phrame',
      component: () => import('../views/FrameView.vue'),
    },
    {
      path: '/gallery',
      name: 'gallery',
      component: () => import('../views/GalleryView.vue'),
      meta: {
        title: 'Gallery',
      },
    },
    {
      path: '/config',
      name: 'config',
      component: () => import('../views/ConfigView.vue'),
      meta: {
        title: 'Config',
      },
    },
    {
      path: '/logs',
      name: 'logs',
      component: () => import('../views/LogsView.vue'),
      meta: {
        title: 'Logs',
      },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      redirect: '/',
    },
  ],
});

router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} | Phrame` : 'Phrame';
  next();
});

export default router;
