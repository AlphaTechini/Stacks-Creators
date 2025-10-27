import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

/** @type {import('vite').UserConfig} */
const config = defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		include: ['jsontokens', '@stacks/connect', '@stacks/transactions']
	}
});

export default config;