/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				kadmiel: {
					bg: '#090d16',
					card: '#111827',
					accent: '#8b5cf6',
					cyan: '#06b6d4',
					gold: '#f59e0b'
				}
			}
		},
	},
	plugins: [],
}
