import { Scene } from 'phaser';

const BGM_KEYS = ['bgm1', 'bgm2', 'bgm3'] as const;

// Switch to `key`, stopping any other bgm currently playing. If the target is
// already playing it's left untouched (so going level 1 -> 2 with the same
// track doesn't restart it). Sounds are reused across scene transitions, so
// don't destroy them on shutdown.
export function playBgm (scene: Scene, key: string)
{
    for (const k of BGM_KEYS)
    {
        if (k === key) continue;
        const s = scene.sound.get(k);
        if (s?.isPlaying) s.stop();
    }
    let target = scene.sound.get(key);
    if (!target) target = scene.sound.add(key, { loop: true, volume: 0.5 });
    if (!target.isPlaying) target.play();
}
