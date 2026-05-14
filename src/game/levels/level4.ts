import { GROUND_Y, PIG_RADIUS, type Level } from './index';

// Level 4: Fortress — thick walls, 4 pigs inside
export const level4: Level = {
    roster: ['normal', 'bomb', 'split', 'egg', 'bomb'],
    music: 'bgm2',
    build: (scene) => {
        const box = 50;
        const baseY = GROUND_Y - box / 2;

        // Left wall (4 high)
        for (let row = 0; row < 4; row++) scene.spawnBox(680, baseY - row * box);
        // Right wall (4 high)
        for (let row = 0; row < 4; row++) scene.spawnBox(920, baseY - row * box);
        // Inner pillars
        for (let row = 0; row < 2; row++) scene.spawnBox(760, baseY - row * box);
        for (let row = 0; row < 2; row++) scene.spawnBox(840, baseY - row * box);

        // Roof beam
        const roofY = baseY - 4 * box + box / 2 - 10;
        scene.spawnBeam(800, roofY, 300);

        // Mid beam
        const midY = baseY - 2 * box + box / 2 - 10;
        scene.spawnBeam(800, midY, 140);

        // Pigs
        scene.spawnPig(720, GROUND_Y - PIG_RADIUS);
        scene.spawnPig(800, midY - 10 - PIG_RADIUS);
        scene.spawnPig(880, GROUND_Y - PIG_RADIUS);
        scene.spawnPig(800, roofY - 10 - PIG_RADIUS);
    },
};
