import { Scene, GameObjects } from 'phaser';
import { LEVELS, GROUND_Y, PIG_RADIUS, type Power } from '../levels';

const ANCHOR_X = 200;
const ANCHOR_Y = 560;
const MAX_PULL = 190;
const LAUNCH_POWER = 0.32;
const TOTAL_LEVELS = LEVELS.length;
const KILL_SPEED = 3.0;
const BOX_BREAK_SPEED = 5.0;
const SPAWN_IMMUNITY_MS = 1200;
const PIG_SCALE = 0.25;
const REST_SPEED = 0.4;
const REST_FRAMES_NEEDED = 24;
const MAX_WAIT_MS = 8000;

const POWER_TINT: Record<Power, number> = {
    normal: 0xffffff,
    super: 0xffffff,    // texture changes instead
    split: 0x66ddff,
    bomb: 0xff7755,
};

const BOMB_RADIUS = 160;
const BOMB_IMPULSE = 0.06;
const SPLIT_FAN = 0.28;          // radians, ±
const SPLIT_SPEED_MULT = 1.05;
const SUPER_SPEED_MULT = 1.8;

export class Game extends Scene
{
    bird?: Phaser.Physics.Matter.Image;
    aimGraphics!: GameObjects.Graphics;
    scoreIcons: GameObjects.Image[] = [];
    queueIcons: GameObjects.Image[] = [];
    pigIcons: GameObjects.Image[] = [];
    levelText!: GameObjects.Text;
    helpText!: GameObjects.Text;

    isDragging = false;
    isLaunched = false;
    canShoot = true;
    awaitingRest = false;
    restFrames = 0;
    launchedAt = 0;
    score = 0;
    pigsAlive = 0;
    level = 1;
    pigs: Phaser.Physics.Matter.Image[] = [];

    birdQueue: Power[] = [];
    currentPower: Power = 'normal';
    powerUsed = false;
    activeBirds: Phaser.Physics.Matter.Image[] = [];

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
        this.birdQueue = [...this.getRosterForLevel()];
        this.pigsAlive = 0;
        this.pigs = [];
        this.activeBirds = [];
        this.isDragging = false;
        this.isLaunched = false;
        this.canShoot = true;
        this.awaitingRest = false;
        this.restFrames = 0;
        this.launchedAt = 0;
        this.powerUsed = false;

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
        this.queueIcons = [];
        this.pigIcons = [];
        this.levelText = this.add.text(1004, 14, '', {
            fontFamily: 'Arial Black', fontSize: 28, color: '#ffdd44',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(1, 0);
        this.helpText = this.add.text(512, 30, 'Drag Chris back & release. Click mid-flight to use his power!', {
            fontFamily: 'Arial', fontSize: 18, color: '#ffffff',
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

    getRosterForLevel (): Power[]
    {
        return (LEVELS[this.level - 1] ?? LEVELS[0]).roster;
    }

    buildStructure ()
    {
        const level = LEVELS[this.level - 1] ?? LEVELS[0];
        level.build(this);
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
        this.powerUsed = false;
        this.currentPower = this.birdQueue[0] ?? 'normal';

        const texture = 'chris-mario';
        this.bird = this.matter.add.image(ANCHOR_X, ANCHOR_Y, texture, undefined, {
            shape: { type: 'circle', radius: 32 },
            restitution: 0.5,
            friction: 0.3,
            density: 0.008
        });
        (this.bird.body as any).inertia = 800;
        (this.bird.body as any).inverseInertia = 1 / 800;
        this.bird.setScale(0.11);
        this.bird.setStatic(true);
        this.bird.setTint(POWER_TINT[this.currentPower]);
        this.activeBirds = [this.bird];
        this.drawAim();
    }

    onPointerDown (p: Phaser.Input.Pointer)
    {
        // If already launched, treat this click as power activation
        if (this.isLaunched && !this.powerUsed && this.currentPower !== 'normal')
        {
            this.activatePower();
            return;
        }
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
        if (!this.bird) return;
        this.canShoot = false;
        this.isLaunched = true;
        this.bird.setStatic(false);
        this.bird.setVelocity(dx * LAUNCH_POWER, dy * LAUNCH_POWER);
        this.aimGraphics.clear();
        this.birdQueue.shift();
        this.updateHud();

        this.awaitingRest = true;
        this.restFrames = 0;
        this.launchedAt = this.time.now;
    }

    // --- POWER ACTIVATION ---

    activatePower ()
    {
        if (!this.bird || !this.bird.active) return;
        this.powerUsed = true;
        switch (this.currentPower)
        {
            case 'super': this.doSuperDive(); break;
            case 'split': this.doSplit(); break;
            case 'bomb':  this.doBomb();  break;
        }
    }

    doSuperDive ()
    {
        const b = this.bird!;
        const body = b.body as MatterJS.BodyType;
        b.setTexture('chris-mario');
        b.setTint(0xffee66);
        b.setScale(0.45);
        b.setVelocity(body.velocity.x * SUPER_SPEED_MULT, body.velocity.y * SUPER_SPEED_MULT);

        // Yellow trail particles
        const emitter = this.add.particles(0, 0, 'sparkle', {
            follow: b,
            speed: 30,
            scale: { start: 1.5, end: 0 },
            tint: [0xffee66, 0xffaa00],
            alpha: { start: 1, end: 0 },
            lifespan: 380,
            frequency: 18,
            quantity: 2,
        });
        // Stop emitting once bird is gone
        this.time.delayedCall(1500, () => emitter.stop());
        this.time.delayedCall(2200, () => emitter.destroy());
    }

    doSplit ()
    {
        const b = this.bird!;
        const body = b.body as MatterJS.BodyType;
        const vx = body.velocity.x;
        const vy = body.velocity.y;
        const x = b.x;
        const y = b.y;
        const speed = Math.hypot(vx, vy) * SPLIT_SPEED_MULT;
        const angle = Math.atan2(vy, vx);

        // Puff at split point
        this.add.particles(x, y, 'sparkle', {
            speed: { min: 60, max: 160 },
            scale: { start: 2, end: 0 },
            tint: [0x66ddff, 0xffffff],
            lifespan: 350,
            quantity: 16,
            emitting: false,
        }).explode(16);

        // Destroy original, spawn three fanned clones
        this.activeBirds = this.activeBirds.filter(x => x !== b);
        b.destroy();
        this.bird = undefined;

        const offsets = [-SPLIT_FAN, 0, SPLIT_FAN];
        for (const off of offsets)
        {
            const a = angle + off;
            const sub = this.matter.add.image(x, y, 'chris-mario', undefined, {
                shape: { type: 'circle', radius: 22 },
                restitution: 0.5, friction: 0.3, density: 0.006,
            });
            sub.setScale(0.11);
            sub.setTint(0x66ddff);
            sub.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
            this.activeBirds.push(sub);
        }
    }

    doBomb ()
    {
        const b = this.bird!;
        const x = b.x;
        const y = b.y;

        // Flash ring
        const flash = this.add.circle(x, y, 20, 0xffeecc, 0.9).setDepth(200);
        this.tweens.add({
            targets: flash,
            scale: BOMB_RADIUS / 20,
            alpha: 0,
            duration: 380,
            ease: 'Cubic.Out',
            onComplete: () => flash.destroy(),
        });

        // Particles
        this.add.particles(x, y, 'sparkle', {
            speed: { min: 100, max: 320 },
            scale: { start: 2.5, end: 0 },
            tint: [0xff7733, 0xffcc44, 0xffffff],
            lifespan: 500,
            quantity: 30,
            emitting: false,
        }).explode(30);

        this.cameras.main.shake(200, 0.012);

        // Apply radial impulse + kill anything in radius
        const bodies = (this.matter.world as any).localWorld.bodies as MatterJS.BodyType[];
        for (const body of bodies)
        {
            if (body.isStatic) continue;
            const obj = (body as any).gameObject;
            if (!obj || obj === b) continue;
            const ddx = body.position.x - x;
            const ddy = body.position.y - y;
            const dist = Math.hypot(ddx, ddy);
            if (dist > BOMB_RADIUS) continue;
            const falloff = 1 - dist / BOMB_RADIUS;
            const nx = ddx / (dist || 1);
            const ny = ddy / (dist || 1);
            const mag = BOMB_IMPULSE * falloff;
            this.matter.body.applyForce(body, body.position, { x: nx * mag, y: ny * mag - 0.02 * falloff });
            this.forceKill(obj);
        }

        // Destroy bird
        this.activeBirds = this.activeBirds.filter(x => x !== b);
        b.destroy();
        this.bird = undefined;
    }

    // Bomb-equivalent: ignore vulnerability + speed thresholds for in-radius hits
    forceKill (obj: any)
    {
        if (!obj || typeof obj.getData !== 'function') return;
        if (!obj.getData('alive')) return;
        if (obj.getData('isPig'))
        {
            obj.setData('alive', false);
            this.pigsAlive -= 1;
            this.score += 100;
            const idx = this.pigs.indexOf(obj);
            if (idx >= 0) this.pigs.splice(idx, 1);
            this.tweens.add({ targets: obj, scale: 0, alpha: 0, duration: 250, onComplete: () => obj.destroy() });
            this.updateHud();
        }
        else if (obj.getData('isBox'))
        {
            obj.setData('alive', false);
            this.score += 25;
            if (obj.setTexture) obj.setTexture('baguette-broken');
            this.tweens.add({ targets: obj, scale: 0, alpha: 0, duration: 300, onComplete: () => obj.destroy() });
            this.updateHud();
        }
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
        // Clean up any surviving active birds (split clones, super dive, the og)
        for (const ab of this.activeBirds)
        {
            if (ab && ab.active) ab.destroy();
        }
        this.activeBirds = [];
        this.bird = undefined;

        if (this.pigsAlive === 0)
        {
            this.endRound(true);
            return;
        }
        if (this.birdQueue.length === 0)
        {
            this.endRound(false);
            return;
        }
        this.spawnBird();
        this.updateHud();
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
        // Score as chocolatine icons (1 per 100 points), top-right
        const chocScale = 0.08;
        const count = Math.floor(this.score / 100);
        while (this.scoreIcons.length < count)
        {
            const i = this.scoreIcons.length;
            const icon = this.add.image(1000 - i * 50, 52, 'chocolatine')
                .setScale(chocScale).setOrigin(1, 0).setDepth(100);
            this.scoreIcons.push(icon);
            icon.setScale(0);
            this.tweens.add({ targets: icon, scale: chocScale, duration: 300, ease: 'Back.Out' });
        }

        // Bird queue: bottom-left icons (chris-mario is 1024x1024)
        for (const ic of this.queueIcons) ic.destroy();
        this.queueIcons = [];
        const upcoming = this.birdQueue.slice(1);
        upcoming.forEach((power, i) => {
            const ic = this.add.image(24 + i * 48, 755, 'chris-mario')
                .setScale(0.03).setOrigin(0.5, 1).setDepth(100)
                .setTint(POWER_TINT[power]);
            this.queueIcons.push(ic);
        });

        // Pig icons: bottom-right (128x128 → 30/128 ≈ 0.23)
        for (const ic of this.pigIcons) ic.destroy();
        this.pigIcons = [];
        for (let i = 0; i < this.pigsAlive; i++)
        {
            const ic = this.add.image(1000 - i * 40, 755, 'chris-french')
                .setScale(0.23).setOrigin(0.5, 1).setDepth(100);
            this.pigIcons.push(ic);
        }

        this.levelText.setText(`Level ${this.level}/${TOTAL_LEVELS}`);
    }
}
