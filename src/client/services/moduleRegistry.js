import { markRaw } from 'vue';
import Settings from '../components/Settings.vue';
import NowPlaying from '../components/NowPlaying.vue';
import OSC from '../components/OSC.vue';
import NDI from '../components/NDI.vue';
import Events from '../components/Events.vue';
import Messaging from '../components/Messaging.vue';
import CycleManager from '../components/CycleManager.vue';
import LogoGallery from '../components/LogoGallery.vue';

export const moduleRegistry = [
  {
    id: 'settings',
    name: 'Settings',
    description: 'Application settings',
    enabled: true,
    required: true,
    component: () => import('../components/Settings.vue').then(m => markRaw(m.default)),
    icon: 'fas fa-cog',
    group: 'System & Config'
  },
  {
    id: 'nowPlaying',
    name: 'Now Playing',
    description: 'View and manage the current logo playlist',
    enabled: true,
    required: true,
    component: () => import('../components/NowPlaying.vue').then(m => markRaw(m.default)),
    icon: 'fas fa-play-circle',
    group: 'Playback & Cycle'
  },
  {
    id: 'cycleManager',
    name: 'Logo Cycle',
    description: 'Sequence and manage logos for playback.',
    enabled: true,
    required: false,
    component: () => import('../components/CycleManager.vue').then(m => markRaw(m.default)),
    icon: 'fas fa-sync-alt',
    group: 'Playback & Cycle'
  },
  {
    id: 'logoGallery',
    name: 'Logo Gallery',
    description: 'Browse and manage logo assets.',
    enabled: true,
    required: false,
    component: () => import('../components/LogoGallery.vue').then(m => markRaw(m.default)),
    icon: 'fas fa-th-large',
    group: 'Assets'
  },
  {
    id: 'events',
    name: 'Events',
    description: 'Manage and sync events',
    enabled: true,
    required: true,
    component: () => import('../components/Events.vue').then(m => markRaw(m.default)),
    icon: 'fas fa-calendar-alt',
    group: 'Events & Comms'
  },
  {
    id: 'messaging',
    name: 'Messaging',
    description: 'Communication tools',
    enabled: true,
    required: true,
    component: () => import('../components/Messaging.vue').then(m => markRaw(m.default)),
    icon: 'fas fa-comments',
    group: 'Events & Comms'
  },
  {
    id: 'osc',
    name: 'OSC',
    description: 'Open Sound Control settings',
    enabled: true,
    required: false,
    component: () => import('../components/OSC.vue').then(m => markRaw(m.default)),
    icon: 'fas fa-network-wired',
    group: 'System & Config'
  },
  {
    id: 'ndi',
    name: 'NDI',
    description: 'NDI Output settings',
    enabled: true,
    required: false,
    component: () => import('../components/NDI.vue').then(m => markRaw(m.default)),
    icon: 'fas fa-video',
    group: 'System & Config'
  }
];
