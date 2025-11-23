import { reactRouter } from '@react-router/dev/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ command, mode }) => ({
  plugins: [
    cloudflare({
      viteEnvironment: { name: 'ssr' },
      // Use remote bindings when --remote flag is passed
      configPath: mode === 'development' ? 'wrangler.jsonc' : undefined,
    }),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
}));
