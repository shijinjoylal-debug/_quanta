import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                community: resolve(__dirname, 'community.html'),
                calculations: resolve(__dirname, 'calculations.html'),
                formulas: resolve(__dirname, 'formulas.html'),
            },
        },
    },
    server: {
        proxy: {
            '/api': 'http://localhost:5000'
        }
    }
});
