import { GROUND_Y, PIG_RADIUS, type Level } from './index';

// Level 5: The Bakery — double-decker, 5 pigs
export const level5: Level = {
    roster: ['normal', 'egg', 'super', 'bomb', 'split', 'bomb'],
    music: 'bgm3',
    background: 'bg-glasgow',
    build: (scene) => {
        const box = 50;
        const baseY = GROUND_Y - box / 2;

        // Ground-level columns (5 high on outside, 3 high inside)
        const columns = [620, 720, 820, 920];
        for (const cx of columns)
        {
            const h = (cx === 620 || cx === 920) ? 5 : 3;
            for (let row = 0; row < h; row++) scene.spawnBox(cx, baseY - row * box);
        }

        // Lower beam
        const lowerBeamY = baseY - 3 * box + box / 2 - 10;
        scene.spawnBeam(770, lowerBeamY, 260);

        // Upper towers on the lower beam
        for (let row = 0; row < 2; row++) scene.spawnBox(700, lowerBeamY - 10 - box / 2 - row * box);
        for (let row = 0; row < 2; row++) scene.spawnBox(840, lowerBeamY - 10 - box / 2 - row * box);

        // Top beam
        const upperBeamY = lowerBeamY - 10 - 2 * box - 10;
        scene.spawnBeam(770, upperBeamY, 200);

        // Pigs
        scene.spawnPig(670, GROUND_Y - PIG_RADIUS);
        scene.spawnPig(870, GROUND_Y - PIG_RADIUS);
        scene.spawnPig(770, lowerBeamY - 10 - PIG_RADIUS);
        scene.spawnPig(700, upperBeamY - 10 - PIG_RADIUS);
        scene.spawnPig(840, upperBeamY - 10 - PIG_RADIUS);
    },
};
