import { GROUND_Y, PIG_RADIUS, type Level } from './index';

// Level 2: Two towers + beam, 3 pigs
export const level2: Level = {
    roster: ['normal', 'super', 'normal', 'bomb'],
    build: (scene) => {
        const box = 50;
        const baseY = GROUND_Y - box / 2;
        const stackXs = [720, 880];

        for (const sx of stackXs)
        {
            for (let row = 0; row < 3; row++)
            {
                scene.spawnBox(sx, baseY - row * box);
            }
        }

        const stackTop = baseY - 3 * box + box / 2;
        const beamH = 20;
        const beamY = stackTop - beamH / 2;
        scene.spawnBeam(800, beamY, 220);

        const beamTop = beamY - beamH / 2;
        scene.spawnPig(720, beamTop - PIG_RADIUS);
        scene.spawnPig(880, beamTop - PIG_RADIUS);
        scene.spawnPig(800, GROUND_Y - PIG_RADIUS);
    },
};
