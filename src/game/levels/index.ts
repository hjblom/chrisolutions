import type { Game } from '../scenes/Game';
import { level1 } from './level1';
import { level2 } from './level2';
import { level3 } from './level3';
import { level4 } from './level4';
import { level5 } from './level5';

export type Power = 'normal' | 'super' | 'split' | 'bomb';

export const GROUND_Y = 720;
export const PIG_RADIUS = 38;

export interface Level {
    roster: Power[];
    build: (scene: Game) => void;
    background?: string;
    music?: string;
}

export const LEVELS: Level[] = [level1, level2, level3, level4, level5];
