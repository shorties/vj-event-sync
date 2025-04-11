import { defineStore } from 'pinia';

export const useModuleStore = defineStore('modules', {
  state: () => ({
    modules: {},
    activeModule: null,
  }),

  actions: {
    registerModule(name, module) {
      this.modules[name] = module;
    },

    getModule(name) {
      return this.modules[name];
    },

    setActiveModule(name) {
      this.activeModule = name;
    },
  },

  getters: {
    getCurrentModule: (state) => {
      return state.activeModule ? state.modules[state.activeModule] : null;
    },
  },
});
