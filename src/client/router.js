import { createRouter, createWebHistory } from 'vue-router';
import NowPlaying from './components/NowPlaying.vue';
import LogoLibrary from './components/LogoLibrary.vue'; // Will create this file next

const routes = [
  {
    path: '/',
    name: 'Live',
    component: NowPlaying
  },
  {
    path: '/library',
    name: 'Library',
    component: LogoLibrary
  }
  // Add other routes here if needed
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  linkActiveClass: 'active-link', // Optional: class for active links
  linkExactActiveClass: 'exact-active-link' // Optional: class for exact active links
});

export default router;
