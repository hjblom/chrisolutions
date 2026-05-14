import { Scene, GameObjects } from 'phaser';
import { playBgm } from './bgm';

const CHRIS_OPTIONS = ['chris-mario', 'chris-keg'];
const CHRIS_SCALE = 0.45;

export class MainMenu extends Scene
{
    background!: GameObjects.Image;
    chris!: GameObjects.Image;
    title!: GameObjects.Text;
    subtitle!: GameObjects.Text;
    prompt!: GameObjects.Text;
    leftArrow!: GameObjects.Text;
    rightArrow!: GameObjects.Text;
    selectedIndex = 0;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        // Queue bgm1 — if audio is already unlocked it plays now; if locked,
        // Phaser plays it on the user's first interaction (arrow, click, key).
        playBgm(this, 'bgm1');

        this.background = this.add.image(512, 384, 'background').setDisplaySize(1024, 768);

        this.add.particles(512, 420, 'sparkle', {
            speedY: { min: -40, max: -10 },
            speedX: { min: -20, max: 20 },
            lifespan: 2000,
            quantity: 1,
            frequency: 80,
            scale: { start: 1, end: 0 },
            alpha: { start: 0.8, end: 0 },
            blendMode: 'ADD'
        });

        this.chris = this.add.image(512, 430, CHRIS_OPTIONS[this.selectedIndex])
            .setScale(CHRIS_SCALE)
            .setInteractive({ useHandCursor: true });
        this.tweens.add({
            targets: this.chris,
            y: this.chris.y - 10,
            ease: 'Sine.InOut',
            duration: 1200,
            yoyo: true,
            repeat: -1
        });
        this.tweens.add({
            targets: this.chris,
            angle: 3,
            ease: 'Sine.InOut',
            duration: 1600,
            yoyo: true,
            repeat: -1
        });

        this.title = this.add.text(512, -100, 'Angry Francais', {
            fontFamily: 'Arial Black', fontSize: 72, color: '#ffffff',
            stroke: '#000000', strokeThickness: 10,
            align: 'center'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: this.title,
            y: 140,
            ease: 'Bounce.Out',
            duration: 1000,
            onComplete: () => {
                this.tweens.add({
                    targets: this.title,
                    scale: 1.04,
                    ease: 'Sine.InOut',
                    duration: 900,
                    yoyo: true,
                    repeat: -1
                });
            }
        });

        this.subtitle = this.add.text(512, 230, 'Select your Chris', {
            fontFamily: 'Arial Black', fontSize: 36, color: '#ffdd44',
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);

        const arrowStyle = {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ffffff',
            stroke: '#000000', strokeThickness: 6
        };
        this.leftArrow = this.add.text(280, 430, '◀', arrowStyle)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        this.rightArrow = this.add.text(744, 430, '▶', arrowStyle)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        this.tweens.add({
            targets: [this.leftArrow, this.rightArrow],
            scale: 1.15,
            ease: 'Sine.InOut',
            duration: 700,
            yoyo: true,
            repeat: -1
        });

        this.prompt = this.add.text(512, 680, '← / → to switch  •  click Chris or press SPACE to start', {
            fontFamily: 'Arial', fontSize: 22, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);
        this.tweens.add({
            targets: this.prompt,
            alpha: 0.4,
            ease: 'Sine.InOut',
            duration: 700,
            yoyo: true,
            repeat: -1
        });

        this.leftArrow.on('pointerdown', () => this.cycle(-1));
        this.rightArrow.on('pointerdown', () => this.cycle(1));
        this.chris.on('pointerdown', () => this.startGame());

        this.input.keyboard!.on('keydown-LEFT', () => this.cycle(-1));
        this.input.keyboard!.on('keydown-RIGHT', () => this.cycle(1));
        this.input.keyboard!.on('keydown-SPACE', () => this.startGame());
        this.input.keyboard!.on('keydown-ENTER', () => this.startGame());
    }

    cycle (dir: number)
    {
        const len = CHRIS_OPTIONS.length;
        this.selectedIndex = (this.selectedIndex + dir + len) % len;
        const key = CHRIS_OPTIONS[this.selectedIndex];
        this.tweens.add({
            targets: this.chris,
            alpha: 0,
            duration: 110,
            yoyo: true,
            onYoyo: () => this.chris.setTexture(key)
        });
    }

    startGame ()
    {
        this.scene.start('Game', { chris: CHRIS_OPTIONS[this.selectedIndex] });
    }
}
