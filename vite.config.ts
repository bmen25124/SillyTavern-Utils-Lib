import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import * as packageJson from './package.json';

/**
 * A custom Vite plugin to correctly handle SillyTavern's runtime imports.
 * This library contains imports that go up several directories (e.g., `../../../../power-user.js`)
 * to access core ST scripts at runtime.
 *
 * This plugin uses the `resolveId` hook to intercept these specific imports.
 * It checks if an import path starts with `../`, assumes it's a runtime-only
 * import, and marks it as `external: true`. This forces Vite/Rollup to leave
 * the import statement as-is in the final bundle, allowing the browser in the
 * SillyTavern environment to resolve it correctly.
 */
function sillyTavernRuntimeExternalsPlugin() {
  return {
    name: 'sillytavern-runtime-externals',
    resolveId(id: string) {
      if (id.startsWith('../')) {
        return { id, external: true };
      }
      return null;
    },
  };
}

// A static map is more reliable than dynamic generation
const entries = {
  index: 'src/index.ts',
  config: 'src/config.ts',
  'types/index': 'src/types/index.ts',
  'types/popup': 'src/types/popup.ts',
  'types/profiles': 'src/types/profiles.ts',
  'types/translate': 'src/types/translate.ts',
  'types/world-info': 'src/types/world-info.ts',
  'types/chat-completion': 'src/types/chat-completion.ts',
  'types/text-completion': 'src/types/text-completion.ts',
  'types/instruct': 'src/types/instruct.ts',
  'types/context': 'src/types/context.ts',
  'types/sysprompt': 'src/types/sysprompt.ts',
  'types/regex': 'src/types/regex.ts',
  'components/react/index': 'src/components/react/index.ts',
  'components/vue/index': 'src/components/vue/index.ts',
};

export default defineConfig({
  plugins: [
    sillyTavernRuntimeExternalsPlugin(), // Handle ST runtime imports first
    react(),
    vue(),
    dts({
      insertTypesEntry: true,
      copyDtsFiles: true,
    }),
  ],
  build: {
    outDir: 'dist',
    lib: {
      entry: entries,
      name: 'SillyTavernUtilsLib',
    },
    rollupOptions: {
      // Externalize package dependencies so they are not bundled
      external: [
        ...Object.keys(packageJson.dependencies),
        ...Object.keys(packageJson.peerDependencies),
        'react/jsx-runtime',
      ],
      // Define separate output configurations for ESM and CJS
      output: [
        {
          format: 'es',
          preserveModules: true,
          preserveModulesRoot: 'src',
          entryFileNames: '[name].js',
        },
        {
          format: 'cjs',
          preserveModules: true,
          preserveModulesRoot: 'src',
          entryFileNames: '[name].cjs',
        },
      ],
    },
  },
});
