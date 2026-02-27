import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],

  manifest: {
    permissions: [
      'tabs',
      'storage',
      'activeTab',
    ],

    commands: {
      save_session: {
        suggested_key: {
          default: 'Ctrl+Shift+S',
          mac: 'Command+Shift+S',
        },
        description: 'Save current session in DeepFlow',
      },
    },

    action: {
      default_title: 'DeepFlow - Save & Restore Context',
    },
  },
});