
import {defineConfig} from 'vite';
import {resolve} from 'node:path';

export default defineConfig(({mode}) => {
    const isProd = mode === 'production';
    const port = 5174;

    return {
        server: {
            port: port
        },
        base: isProd ? '/static-site-about-me/' : '/',
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, 'index.html'),
                    about: resolve(__dirname, 'about.html'),
                    projects: resolve(__dirname, 'projects.html'),
                    contacts: resolve(__dirname, 'contacts.html'),
                    games: resolve(__dirname, 'games.html'),
                    snake: resolve(__dirname, 'games/snake.html'),
                    dino: resolve(__dirname, 'games/dino.html'),
                    life: resolve(__dirname, 'games/life_game.html'),
                    minesweeper: resolve(__dirname, 'games/minesweeper.html')
                }
            }
        }
    };
});
