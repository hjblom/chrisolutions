import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        this.add.image(512, 384, 'background').setDisplaySize(1024, 768);

        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

        this.load.on('progress', (progress: number) => {
            bar.width = 4 + (460 * progress);
        });
    }

    preload ()
    {
        this.load.image('chris', 'chris/super-chris-pixel.png');
        this.load.image('chris-french', 'chris/french-chris.png');
        this.load.image('chris-after-hours', 'chris/after-hours-chris.png');
        this.load.image('chris-mario', 'chris/super-mario-chris.png');
        this.load.image('chris-keg', 'chris/keg-chris.png');
        this.load.image('chocolatine', 'assets/chocolatine.png');
        this.load.image('baguette', 'assets/baguette-new.png');
        this.load.image('baguette-broken', 'assets/baguette-broken.png');
        this.load.image('wine-bottle', 'assets/wine-bottle.png');
        this.load.image('bg-boris', 'assets/boris.png');
        this.load.image('bg-glasgow', 'assets/glasgow.png');
        this.load.image('bg-boris2', 'assets/boris2.png');
        this.load.image('boris', 'boris.png');

        this.load.audio('bgm1', 'music/BACKGROUND_MUSIC_1.mp3');
        this.load.audio('bgm2', 'music/BACKGROUND_MUSIC_2.mp3');
        this.load.audio('bgm3', 'music/BACKGROUND_MUSIC_3.mp3');

        this.load.audio('spring1', 'sfx/SPRING_1.mp3');
        this.load.audio('spring2', 'sfx/SPRING_2.mp3');
        this.load.audio('spring3', 'sfx/SPRING_3.mp3');

        this.load.audio('crash1', 'sfx/CRASH_1.mp3');
        this.load.audio('crash2', 'sfx/CRASH_2.mp3');
        this.load.audio('crash3', 'sfx/CRASH_3.mp3');
        this.load.audio('crash4', 'sfx/CRASH_4.mp3');
        this.load.audio('crash5', 'sfx/CRASH_5.mp3');
        this.load.audio('crash6', 'sfx/CRASH_6.mp3');
    }

    create ()
    {
        // Generate a small white circle texture for particle emitters.
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture('sparkle', 8, 8);
        g.destroy();

        this.scene.start('MainMenu');
    }
}
