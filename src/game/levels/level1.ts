import { GROUND_Y, PIG_RADIUS, type Level } from './index';

// Level 1: Tutorial — single tower, 1 pig on top
export const level1: Level = {
    roster: ['normal', 'normal', 'normal'],
    music: 'bgm1',
    build: (scene) => {
        const box = 50;
        const baseY = GROUND_Y - box / 2;

        for (let row = 0; row < 3; row++)
        {
            scene.spawnBox(800, baseY - row * box);
        }

        scene.spawnPig(800, GROUND_Y - 3 * box - PIG_RADIUS);
    },
};
