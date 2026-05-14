import { GROUND_Y, PIG_RADIUS, type Level } from './index';

// Level 3: Three towers, 4 pigs
export const level3: Level = {
    roster: ['normal', 'split', 'egg', 'bomb', 'super'],
    build: (scene) => {
        const box = 50;
        const baseY = GROUND_Y - box / 2;
        const stackXs = [650, 780, 910];

        for (const sx of stackXs)
        {
            for (let row = 0; row < 3; row++)
            {
                scene.spawnBox(sx, baseY - row * box);
            }
        }

        // Beam across left pair
        const stackTop = baseY - 3 * box + box / 2;
        const beamH = 20;
        const beamY = stackTop - beamH / 2;
        scene.spawnBeam(715, beamY, 190);
        scene.spawnBeam(845, beamY, 190);

        const beamTop = beamY - beamH / 2;
        scene.spawnPig(715, beamTop - PIG_RADIUS);
        scene.spawnPig(845, beamTop - PIG_RADIUS);
        scene.spawnPig(715, GROUND_Y - PIG_RADIUS);
        scene.spawnPig(845, GROUND_Y - PIG_RADIUS);
    },
};
