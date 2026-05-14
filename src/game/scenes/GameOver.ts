import { Scene, GameObjects } from 'phaser';

interface GameOverData {
    score?: number;
}

export class GameOver extends Scene
{
    background: GameObjects.Image;
    score = 0;

    constructor ()
    {
        super('GameOver');
    }

    init (data: GameOverData)
    {
        this.score = data?.score ?? 0;
    }

    create ()
    {
        this.background = this.add.image(512, 384, 'background').setAlpha(0.6);

        this.add.image(512, 300, 'chris-after-hours').setScale(0.5);

        this.add.text(512, 480, 'Merdre!', {
            fontFamily: 'Arial Black', fontSize: 96, color: '#ffffff',
            stroke: '#000000', strokeThickness: 10
        }).setOrigin(0.5);

        const chocs = Math.floor(this.score / 100);
        const iconSpacing = 44;
        const totalWidth = chocs * iconSpacing;
        const startX = 512 - totalWidth / 2 + iconSpacing / 2;
        for (let i = 0; i < chocs; i++)
        {
            this.add.image(startX + i * iconSpacing, 560, 'chocolatine').setScale(0.1);
        }
        this.add.text(512, 600, `${chocs} chocolatine${chocs !== 1 ? 's' : ''} earned!`, {
            fontFamily: 'Arial', fontSize: 30, color: '#ffffff',
            stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5);

        const prompt = this.add.text(512, 680, 'click to play again', {
            fontFamily: 'Arial', fontSize: 24, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);
        this.tweens.add({
            targets: prompt,
            alpha: 0.3,
            ease: 'Sine.InOut',
            duration: 700,
            yoyo: true,
            repeat: -1
        });

        this.input.once('pointerdown', () => {
            this.scene.start('MainMenu');
        });
    }
}
