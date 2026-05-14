import { Scene, GameObjects } from 'phaser';

const ANCHOR_X = 200;
const ANCHOR_Y = 560;
const MAX_PULL = 190;
const LAUNCH_POWER = 0.32;
const GROUND_Y = 720;
const TOTAL_LEVELS = 5;
const KILL_SPEED = 3.0;
const BOX_BREAK_SPEED = 5.0;
const SPAWN_IMMUNITY_MS = 1200;
const PIG_SCALE = 0.18;
const PIG_RADIUS = 38;
const REST_SPEED = 0.4;
const REST_FRAMES_NEEDED = 24;
const MAX_WAIT_MS = 8000;

export class Game extends Scene
{
    bird!: Phaser.Physics.Matter.Image;
    aimGraphics!: GameObjects.Graphics;
    scoreIcons: GameObjects.Image[] = [];
    birdsText!: GameObjects.Text;
    pigsText!: GameObjects.Text;
    levelText!: GameObjects.Text;
    helpText!: GameObjects.Text;

    isDragging = false;
    isLaunched = false;
    canShoot = true;
    awaitingRest = false;
    restFrames = 0;
    launchedAt = 0;
    score = 0;
    birdsLeft = 5;
    pigsAlive = 0;
    level = 1;
    pigs: Phaser.Physics.Matter.Image[] = [];

    constructor ()
    {
        super('Game');
    }

    init (data: any)
    {
        this.level = data?.level ?? 1;
        this.score = data?.score ?? 0;
    }

    create ()
    {
        this.birdsLeft = this.getBirdsForLevel();
        this.pigsAlive = 0;
        this.pigs = [];
        this.isDragging = false;
        this.isLaunched = false;
        this.canShoot = true;
        this.awaitingRest = false;
        this.restFrames = 0;
        this.launchedAt = 0;

        // Backdrop
        this.add.image(512, 384, 'background').setDisplaySize(1024, 768).setAlpha(0.6);

        // World bounds keep stray bodies on stage
        this.matter.world.setBounds(0, 0, 1024, 768);

        // Ground
        const groundY = GROUND_Y + 24;
        const ground = this.add.rectangle(512, groundY, 1024, 48, 0x3a2a1a);
        this.matter.add.gameObject(ground, { isStatic: true, friction: 0.8 });

        // Slingshot post
        const postH = GROUND_Y - ANCHOR_Y;
        this.add.rectangle(ANCHOR_X, ANCHOR_Y + postH / 2, 16, postH, 0x6b4423)
            .setStrokeStyle(2, 0x3a2410);
        this.add.circle(ANCHOR_X, ANCHOR_Y, 12, 0x6b4423);

        this.buildStructure();

        // HUD
        this.scoreIcons = [];
        this.birdsText = this.add.text(20, 28, '', {
            fontFamily: 'Arial', fontSize: 22, color: '#ffffff',
            stroke: '#000000', strokeThickness: 3
        });
        this.pigsText = this.add.text(20, 56, '', {
            fontFamily: 'Arial', fontSize: 22, color: '#ffffff',
            stroke: '#000000', strokeThickness: 3
        });
        this.levelText = this.add.text(1004, 14, '', {
            fontFamily: 'Arial Black', fontSize: 28, color: '#ffdd44',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(1, 0);
        this.helpText = this.add.text(512, 30, 'Drag Chris back and release. R to restart.', {
            fontFamily: 'Arial', fontSize: 20, color: '#ffffff',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5, 0);

        this.aimGraphics = this.add.graphics();
        this.spawnBird();
        this.updateHud();

        this.input.on('pointerdown', this.onPointerDown, this);
        this.input.on('pointermove', this.onPointerMove, this);
        this.input.on('pointerup', this.onPointerUp, this);

        this.matter.world.on('collisionstart', this.onCollision, this);

        this.input.keyboard!.on('keydown-R', () => this.scene.start('Game', { level: this.level, score: 0 }));
    }

    getBirdsForLevel (): number
    {
        return [3, 4, 5, 5, 6][this.level - 1] ?? 5;
    }

    buildStructure ()
    {
        switch (this.level)
        {
            case 1: this.buildLevel1(); break;
            case 2: this.buildLevel2(); break;
            case 3: this.buildLevel3(); break;
            case 4: this.buildLevel4(); break;
            case 5: this.buildLevel5(); break;
        }
    }

    spawnBeam (x: number, y: number, width: number, height = 20)
    {
        const beam = this.matter.add.image(x, y, 'baguette', undefined, {
            friction: 0.3, density: 0.0012
        });
        beam.setDisplaySize(width, height);
        beam.setData('isBox', true);
        beam.setData('alive', true);
        beam.setData('vulnerable', false);
        this.time.delayedCall(SPAWN_IMMUNITY_MS, () => {
            if (beam.active) beam.setData('vulnerable', true);
        });
    }

    // --- Level 1: Tutorial — single tower, 1 pig on top ---
    buildLevel1 ()
    {
        const box = 50;
        const baseY = GROUND_Y - box / 2;

        for (let row = 0; row < 3; row++)
        {
            this.spawnBox(800, baseY - row * box);
        }

        this.spawnPig(800, GROUND_Y - 3 * box - PIG_RADIUS);
    }

    // --- Level 2: Two towers + beam, 3 pigs ---
    buildLevel2 ()
    {
        const box = 50;
        const baseY = GROUND_Y - box / 2;
        const stackXs = [720, 880];

        for (const sx of stackXs)
        {
            for (let row = 0; row < 3; row++)
            {
                this.spawnBox(sx, baseY - row * box);
            }
        }

        const stackTop = baseY - 3 * box + box / 2;
        const beamH = 20;
        const beamY = stackTop - beamH / 2;
        this.spawnBeam(800, beamY, 220);

        const beamTop = beamY - beamH / 2;
        this.spawnPig(720, beamTop - PIG_RADIUS);
        this.spawnPig(880, beamTop - PIG_RADIUS);
        this.spawnPig(800, GROUND_Y - PIG_RADIUS);
    }

    // --- Level 3: Three towers, 4 pigs ---
    buildLevel3 ()
    {
        const box = 50;
        const baseY = GROUND_Y - box / 2;
        const stackXs = [650, 780, 910];

        for (const sx of stackXs)
        {
            for (let row = 0; row < 3; row++)
            {
                this.spawnBox(sx, baseY - row * box);
            }
        }

        // Beam across left pair
        const stackTop = baseY - 3 * box + box / 2;
        const beamH = 20;
        const beamY = stackTop - beamH / 2;
        this.spawnBeam(715, beamY, 190);
        this.spawnBeam(845, beamY, 190);

        const beamTop = beamY - beamH / 2;
        this.spawnPig(715, beamTop - PIG_RADIUS);
        this.spawnPig(845, beamTop - PIG_RADIUS);
        this.spawnPig(715, GROUND_Y - PIG_RADIUS);
        this.spawnPig(845, GROUND_Y - PIG_RADIUS);
    }

    // --- Level 4: Fortress — thick walls, 4 pigs inside ---
    buildLevel4 ()
    {
        const box = 50;
        const baseY = GROUND_Y - box / 2;

        // Left wall (4 high)
        for (let row = 0; row < 4; row++) this.spawnBox(680, baseY - row * box);
        // Right wall (4 high)
        for (let row = 0; row < 4; row++) this.spawnBox(920, baseY - row * box);
        // Inner pillars
        for (let row = 0; row < 2; row++) this.spawnBox(760, baseY - row * box);
        for (let row = 0; row < 2; row++) this.spawnBox(840, baseY - row * box);

        // Roof beam
        const roofY = baseY - 4 * box + box / 2 - 10;
        this.spawnBeam(800, roofY, 300);

        // Mid beam
        const midY = baseY - 2 * box + box / 2 - 10;
        this.spawnBeam(800, midY, 140);

        // Pigs
        this.spawnPig(720, GROUND_Y - PIG_RADIUS);
        this.spawnPig(800, midY - 10 - PIG_RADIUS);
        this.spawnPig(880, GROUND_Y - PIG_RADIUS);
        this.spawnPig(800, roofY - 10 - PIG_RADIUS);
    }

    // --- Level 5: The Bakery — double-decker, 5 pigs ---
    buildLevel5 ()
    {
        const box = 50;
        const baseY = GROUND_Y - box / 2;

        // Ground-level columns (5 high on outside, 3 high inside)
        const columns = [620, 720, 820, 920];
        for (const cx of columns)
        {
            const h = (cx === 620 || cx === 920) ? 5 : 3;
            for (let row = 0; row < h; row++) this.spawnBox(cx, baseY - row * box);
        }

        // Lower beam
        const lowerBeamY = baseY - 3 * box + box / 2 - 10;
        this.spawnBeam(770, lowerBeamY, 260);

        // Upper towers on the lower beam
        for (let row = 0; row < 2; row++) this.spawnBox(700, lowerBeamY - 10 - box / 2 - row * box);
        for (let row = 0; row < 2; row++) this.spawnBox(840, lowerBeamY - 10 - box / 2 - row * box);

        // Top beam
        const upperBeamY = lowerBeamY - 10 - 2 * box - 10;
        this.spawnBeam(770, upperBeamY, 200);

        // Pigs
        this.spawnPig(670, GROUND_Y - PIG_RADIUS);
        this.spawnPig(870, GROUND_Y - PIG_RADIUS);
        this.spawnPig(770, lowerBeamY - 10 - PIG_RADIUS);
        this.spawnPig(700, upperBeamY - 10 - PIG_RADIUS);
        this.spawnPig(840, upperBeamY - 10 - PIG_RADIUS);
    }

    spawnBox (x: number, y: number)
    {
        const r = this.matter.add.image(x, y, 'baguette', undefined, {
            friction: 0.3, density: 0.001
        });
        r.setDisplaySize(50, 50);
        r.setRotation(Math.PI / 2);
        r.setData('isBox', true);
        r.setData('alive', true);
        r.setData('vulnerable', false);
        this.time.delayedCall(SPAWN_IMMUNITY_MS, () => {
            if (r.active) r.setData('vulnerable', true);
        });
    }

    spawnPig (x: number, y: number)
    {
        const pig = this.matter.add.image(x, y, 'chris-french', undefined, {
            shape: { type: 'circle', radius: PIG_RADIUS },
            restitution: 0.25,
            friction: 0.5,
            density: 0.0012
        });
        pig.setScale(PIG_SCALE);
        pig.setData('isPig', true);
        pig.setData('alive', true);
        pig.setData('vulnerable', false);
        this.pigs.push(pig);
        this.pigsAlive++;
        this.time.delayedCall(SPAWN_IMMUNITY_MS, () => {
            if (pig.active) pig.setData('vulnerable', true);
        });
    }

    spawnBird ()
    {
        this.isLaunched = false;
        this.isDragging = false;
        this.canShoot = true;
        this.bird = this.matter.add.image(ANCHOR_X, ANCHOR_Y, 'chris', undefined, {
            shape: { type: 'circle', radius: 32 },
            restitution: 0.5,
            friction: 0.3,
            density: 0.008
        });
        this.bird.setScale(0.15);
        this.bird.setStatic(true);
        this.drawAim();
    }

    onPointerDown (p: Phaser.Input.Pointer)
    {
        if (!this.canShoot || this.isLaunched || !this.bird) return;
        const dx = p.x - this.bird.x;
        const dy = p.y - this.bird.y;
        if (Math.hypot(dx, dy) < 80)
        {
            this.isDragging = true;
        }
    }

    onPointerMove (p: Phaser.Input.Pointer)
    {
        if (!this.isDragging || !this.bird) return;
        let dx = p.x - ANCHOR_X;
        let dy = p.y - ANCHOR_Y;
        const dist = Math.hypot(dx, dy);
        if (dist > MAX_PULL)
        {
            dx = (dx / dist) * MAX_PULL;
            dy = (dy / dist) * MAX_PULL;
        }
        this.bird.setPosition(ANCHOR_X + dx, ANCHOR_Y + dy);
        this.drawAim();
    }

    onPointerUp ()
    {
        if (!this.isDragging || !this.bird) return;
        this.isDragging = false;

        const dx = ANCHOR_X - this.bird.x;
        const dy = ANCHOR_Y - this.bird.y;
        if (Math.hypot(dx, dy) < 20)
        {
            this.bird.setPosition(ANCHOR_X, ANCHOR_Y);
            this.drawAim();
            return;
        }
        this.launch(dx, dy);
    }

    launch (dx: number, dy: number)
    {
        this.canShoot = false;
        this.isLaunched = true;
        this.bird.setStatic(false);
        this.bird.setVelocity(dx * LAUNCH_POWER, dy * LAUNCH_POWER);
        this.aimGraphics.clear();
        this.birdsLeft -= 1;
        this.updateHud();

        this.awaitingRest = true;
        this.restFrames = 0;
        this.launchedAt = this.time.now;
    }

    update ()
    {
        if (!this.awaitingRest) return;

        if (this.getMaxBodySpeed() < REST_SPEED)
        {
            this.restFrames += 1;
        }
        else
        {
            this.restFrames = 0;
        }

        const settled = this.restFrames >= REST_FRAMES_NEEDED;
        const timedOut = this.time.now - this.launchedAt > MAX_WAIT_MS;
        if (settled || timedOut)
        {
            this.awaitingRest = false;
            this.afterLaunch();
        }
    }

    getMaxBodySpeed (): number
    {
        const bodies = (this.matter.world as any).localWorld.bodies as any[];
        let max = 0;
        for (const b of bodies)
        {
            if (b.isStatic) continue;
            const s = Math.hypot(b.velocity.x, b.velocity.y);
            if (s > max) max = s;
        }
        return max;
    }

    afterLaunch ()
    {
        if (this.bird) this.bird.destroy();
        if (this.pigsAlive === 0)
        {
            this.endRound(true);
            return;
        }
        if (this.birdsLeft <= 0)
        {
            this.endRound(false);
            return;
        }
        this.spawnBird();
    }

    endRound (win: boolean)
    {
        const isLastLevel = this.level >= TOTAL_LEVELS;
        const chocs = Math.floor(this.score / 100);
        const msg = win
            ? (isLastLevel
                ? `All levels cleared!\n${chocs} chocolatines earned!\nClick to continue`
                : `Level ${this.level} cleared!\n${chocs} chocolatines!\nClick for next level`)
            : `Out of birds!\nClick to retry level ${this.level}`;

        const banner = this.add.text(512, 230, msg, {
            fontFamily: 'Arial Black', fontSize: 40, color: '#ffffff',
            stroke: '#000000', strokeThickness: 6, align: 'center'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: banner,
            scale: 1.05,
            ease: 'Sine.InOut',
            duration: 600,
            yoyo: true,
            repeat: -1
        });

        this.input.once('pointerdown', () => {
            if (!win)
            {
                this.scene.start('Game', { level: this.level, score: this.score });
            }
            else if (isLastLevel)
            {
                this.scene.start('GameOver', { score: this.score });
            }
            else
            {
                this.scene.start('Game', { level: this.level + 1, score: this.score });
            }
        });
    }

    drawAim ()
    {
        this.aimGraphics.clear();
        if (!this.bird || this.isLaunched) return;
        this.aimGraphics.lineStyle(5, 0x222222, 1);
        this.aimGraphics.beginPath();
        this.aimGraphics.moveTo(ANCHOR_X - 18, ANCHOR_Y);
        this.aimGraphics.lineTo(this.bird.x, this.bird.y);
        this.aimGraphics.moveTo(ANCHOR_X + 18, ANCHOR_Y);
        this.aimGraphics.lineTo(this.bird.x, this.bird.y);
        this.aimGraphics.strokePath();
    }

    onCollision (event: Phaser.Physics.Matter.Events.CollisionStartEvent)
    {
        for (const pair of event.pairs)
        {
            const vA = pair.bodyA.velocity;
            const vB = pair.bodyB.velocity;
            const relSpeed = Math.hypot(vA.x - vB.x, vA.y - vB.y);
            const a = (pair.bodyA as any).gameObject;
            const b = (pair.bodyB as any).gameObject;
            this.maybeKillPig(a, relSpeed);
            this.maybeKillPig(b, relSpeed);
            this.maybeBreakBox(a, relSpeed);
            this.maybeBreakBox(b, relSpeed);
        }
    }

    maybeKillPig (obj: any, relSpeed: number)
    {
        if (!obj || typeof obj.getData !== 'function') return;
        if (!obj.getData('isPig') || !obj.getData('alive')) return;
        if (!obj.getData('vulnerable')) return;
        if (relSpeed < KILL_SPEED) return;

        obj.setData('alive', false);
        this.pigsAlive -= 1;
        this.score += 100;
        const idx = this.pigs.indexOf(obj);
        if (idx >= 0) this.pigs.splice(idx, 1);

        this.tweens.add({
            targets: obj,
            scale: 0,
            alpha: 0,
            duration: 250,
            onComplete: () => obj.destroy()
        });

        this.updateHud();
    }

    maybeBreakBox (obj: any, relSpeed: number)
    {
        if (!obj || typeof obj.getData !== 'function') return;
        if (!obj.getData('isBox') || !obj.getData('alive')) return;
        if (!obj.getData('vulnerable')) return;
        if (relSpeed < BOX_BREAK_SPEED) return;

        obj.setData('alive', false);
        this.score += 25;

        if (obj.setTexture) obj.setTexture('baguette-broken');

        this.tweens.add({
            targets: obj,
            scale: 0,
            alpha: 0,
            duration: 300,
            onComplete: () => obj.destroy()
        });

        this.updateHud();
    }

    updateHud ()
    {
        // Show score as chocolatine icons (1 per 100 points), right-aligned above level text
        const count = Math.floor(this.score / 100);
        while (this.scoreIcons.length < count)
        {
            const i = this.scoreIcons.length;
            const icon = this.add.image(1000 - i * 36, 52, 'chocolatine')
                .setScale(0.08).setOrigin(1, 0).setDepth(100);
            this.scoreIcons.push(icon);
            icon.setScale(0);
            this.tweens.add({ targets: icon, scale: 0.08, duration: 300, ease: 'Back.Out' });
        }
        this.birdsText.setText(`Birds: ${this.birdsLeft}`);
        this.pigsText.setText(`Pigs: ${this.pigsAlive}`);
        this.levelText.setText(`Level ${this.level}/${TOTAL_LEVELS}`);
    }
}
