import Phaser from 'phaser';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { WORLD_HEIGHT, WORLD_WIDTH, WORLDS, type WorldDef } from './content';
import { loadSave, storeSave } from './save';

type Control = 'left' | 'right' | 'jump';
type UiEvent =
  | { type: 'hud'; world: WorldDef; hearts: number; coins: number; totalCoins: number; bossHp?: number }
  | { type: 'toast'; text: string }
  | { type: 'dialog'; kicker: string; title: string; text: string; action: 'resume' | 'restart' | 'next' | 'menu'; actionLabel: string };

export class PixelQuestScene extends Phaser.Scene {
  private worldIndex = 0;
  private world!: WorldDef;
  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private coins!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private portal!: Phaser.Physics.Arcade.Sprite;
  private crystal?: Phaser.Physics.Arcade.Sprite;
  private boss?: Phaser.Physics.Arcade.Sprite;
  private controls: Record<Control, boolean> = { left: false, right: false, jump: false };
  private jumpQueued = false;
  private hearts = 3;
  private coinsFound = 0;
  private crystalFound = false;
  private bossHp = 4;
  private bossAttackAt = 0;
  private invulnerableUntil = 0;
  private paused = false;
  private readonly onControl = (event: Event): void => {
    const detail = (event as CustomEvent<{ action: Control; pressed: boolean }>).detail;
    if (!detail || !this.controls.hasOwnProperty(detail.action)) return;
    this.controls[detail.action] = detail.pressed;
    if (detail.action === 'jump' && detail.pressed) this.jumpQueued = true;
  };

  constructor() { super('PixelQuestScene'); }

  init(data: { worldIndex?: number } = {}): void {
    this.worldIndex = Phaser.Math.Clamp(data.worldIndex ?? 0, 0, WORLDS.length - 1);
  }

  create(): void {
    this.world = WORLDS[this.worldIndex];
    this.createTextures();
    this.drawBackground();
    this.platforms = this.physics.add.staticGroup();
    this.coins = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group({ allowGravity: false });
    this.buildPlatforms();
    this.createPlayer();
    this.createCollectibles();
    this.createEnemies();
    this.createPortal();
    this.bindPhysics();
    this.bindInput();
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09, -120, 90);
    this.cameras.main.setDeadzone(180, 90);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT + 200);
    this.emitHud();
    this.toast(this.world.story);
  }

  startWorld(index: number): void { this.scene.restart({ worldIndex: index }); }

  pauseGame(): void {
    if (this.paused) return;
    this.paused = true;
    this.physics.world.pause();
    this.dialog('ПАУЗА', 'Свет ждёт тебя', 'Продолжим путь Искорки?', 'resume', 'ПРОДОЛЖИТЬ');
  }

  resolveDialog(action: 'resume' | 'restart' | 'next' | 'menu'): void {
    if (action === 'resume') { this.paused = false; this.physics.world.resume(); return; }
    if (action === 'restart') { this.startWorld(this.worldIndex); return; }
    if (action === 'next') { this.startWorld(Math.min(this.worldIndex + 1, WORLDS.length - 1)); return; }
  }

  private createTextures(): void {
    const make = (key: string, width: number, height: number, paint: (g: Phaser.GameObjects.Graphics) => void): void => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0 });
      paint(g); g.generateTexture(key, width, height); g.destroy();
    };
    make('pq-player', 24, 32, (g) => { g.fillStyle(0xff5f9d).fillRect(4, 2, 16, 8).fillRect(2, 10, 20, 13); g.fillStyle(0xffefc4).fillRect(5, 22, 14, 6); g.fillStyle(0x231142).fillRect(3, 28, 7, 4).fillRect(14, 28, 7, 4); g.fillStyle(0x241046).fillRect(15, 13, 3, 3); });
    make('pq-enemy', 26, 26, (g) => { g.fillStyle(0xa14478).fillRect(3, 8, 20, 15).fillRect(6, 3, 14, 8); g.fillStyle(0xfff4ca).fillRect(7, 11, 3, 3).fillRect(16, 11, 3, 3); g.fillStyle(0x1f103a).fillRect(0, 23, 8, 3).fillRect(18, 23, 8, 3); });
    make('pq-coin', 18, 20, (g) => { g.fillStyle(0xe79b30).fillRect(5, 0, 8, 20); g.fillStyle(0xffdb62).fillRect(2, 3, 14, 14); g.fillStyle(0xfff7a1).fillRect(6, 4, 6, 12); });
    make('pq-crystal', 26, 32, (g) => { g.fillStyle(0x69e7ff).fillRect(8, 0, 10, 5).fillRect(4, 6, 18, 20).fillRect(8, 27, 10, 5); g.fillStyle(0xffffff).fillRect(9, 7, 7, 14); });
    make('pq-portal', 42, 72, (g) => { g.fillStyle(0xffd255).fillRect(3, 0, 36, 72); g.fillStyle(0x2d1766).fillRect(9, 8, 24, 56); g.fillStyle(0x69e7ff).fillRect(14, 15, 14, 40); });
    make('pq-boss', 52, 56, (g) => { g.fillStyle(0x35145f).fillRect(5, 16, 42, 35); g.fillStyle(0x54207a).fillRect(10, 5, 32, 20); g.fillStyle(0xff91cb).fillRect(14, 0, 8, 10).fillRect(31, 0, 8, 10); g.fillStyle(0xfff4ca).fillRect(15, 19, 6, 5).fillRect(32, 19, 6, 5); g.fillStyle(0x18092e).fillRect(10, 51, 12, 5).fillRect(31, 51, 12, 5); });
    make('pq-orb', 16, 16, (g) => { g.fillStyle(0xff7db5).fillRect(3, 3, 10, 10); g.fillStyle(0xffeef7).fillRect(6, 2, 4, 12).fillRect(2, 6, 12, 4); });
  }

  private drawBackground(): void {
    const p = this.world.palette;
    const bg = this.add.graphics().setScrollFactor(0);
    bg.fillStyle(p.sky).fillRect(0, 0, 960, WORLD_HEIGHT);
    bg.fillStyle(p.horizon).fillRect(0, 280, 960, 260);
    for (let x = -80; x < 1060; x += 180) { bg.fillStyle(p.hill).fillRect(x, 248, 210, 100).fillRect(x + 28, 208, 150, 50).fillRect(x + 56, 181, 84, 35); }
    for (let x = 45; x < 970; x += 155) { bg.fillStyle(0xffffff, 0.28).fillRect(x, 65 + (x % 90), 54, 10).fillRect(x + 9, 55 + (x % 90), 32, 18); }
  }

  private buildPlatforms(): void {
    for (const platform of this.world.platforms) {
      const tile = this.platforms.create(platform.x + platform.width / 2, platform.y, 'pq-coin') as Phaser.Physics.Arcade.Sprite;
      tile.setDisplaySize(platform.width, 32).setTint(this.world.palette.brick).setOrigin(0.5);
      tile.refreshBody();
      const stripe = this.add.rectangle(platform.x + platform.width / 2, platform.y - 14, platform.width, 5, this.world.palette.grass).setDepth(2);
      stripe.setData('decorative', true);
    }
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(this.world.start.x, this.world.start.y, 'pq-player');
    this.player.setTint(this.world.palette.hero).setCollideWorldBounds(false).setDepth(5);
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(20, 29).setOffset(2, 3);
    this.player.setGravityY(1220);
  }

  private createCollectibles(): void {
    for (const [x, y] of this.world.coins) {
      const coin = this.coins.create(x, y, 'pq-coin') as Phaser.Physics.Arcade.Sprite;
      coin.setData('kind', 'coin'); coin.setDepth(4); coin.refreshBody();
      this.tweens.add({ targets: coin, y: y - 6, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.crystal = this.coins.create(this.world.crystal.x, this.world.crystal.y, 'pq-crystal') as Phaser.Physics.Arcade.Sprite;
    this.crystal.setData('kind', 'crystal').setTint(this.world.palette.accent).setDepth(4); this.crystal.refreshBody();
    this.tweens.add({ targets: this.crystal, angle: 7, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private createEnemies(): void {
    for (const def of this.world.enemies) {
      const enemy = this.enemies.create(def.x, 435, 'pq-enemy') as Phaser.Physics.Arcade.Sprite;
      enemy.setTint(this.world.palette.enemy).setData({ min: def.min, max: def.max, direction: 1 }).setVelocityX(56).setGravityY(1220).setDepth(5);
      (enemy.body as Phaser.Physics.Arcade.Body).setSize(22, 24).setOffset(2, 2);
    }
  }

  private createPortal(): void {
    this.portal = this.physics.add.staticSprite(this.world.portalX, 420, 'pq-portal').setDepth(4);
    this.portal.setTint(0x7553a5); this.portal.refreshBody();
  }

  private bindPhysics(): void {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.overlap(this.player, this.coins, (_player, item) => this.collect(item as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.player, this.portal, () => this.tryPortal());
    this.physics.add.collider(this.player, this.enemies, (_player, enemy) => this.hitEnemy(enemy as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.player, this.projectiles, (_player, projectile) => { projectile.destroy(); this.hurt(); });
  }

  private bindInput(): void {
    window.addEventListener('pixelquest-control', this.onControl);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener('pixelquest-control', this.onControl));
    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-LEFT', () => this.controls.left = true); keyboard?.on('keyup-LEFT', () => this.controls.left = false);
    keyboard?.on('keydown-RIGHT', () => this.controls.right = true); keyboard?.on('keyup-RIGHT', () => this.controls.right = false);
    keyboard?.on('keydown-A', () => this.controls.left = true); keyboard?.on('keyup-A', () => this.controls.left = false);
    keyboard?.on('keydown-D', () => this.controls.right = true); keyboard?.on('keyup-D', () => this.controls.right = false);
    keyboard?.on('keydown-SPACE', () => this.jumpQueued = true); keyboard?.on('keydown-UP', () => this.jumpQueued = true);
  }

  update(time: number): void {
    if (this.paused) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (this.controls.left === this.controls.right) this.player.setVelocityX(0);
    else this.player.setVelocityX(this.controls.left ? -240 : 240);
    if (this.jumpQueued && (body.blocked.down || body.touching.down)) { this.player.setVelocityY(-515); this.vibrate(ImpactStyle.Light); }
    this.jumpQueued = false;
    if (this.player.y > WORLD_HEIGHT + 150) this.hurt();
    this.updateEnemies();
    this.updateBoss(time);
  }

  private updateEnemies(): void {
    this.enemies.children.each((child) => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active || !enemy.body) return true;
      const min = enemy.getData('min') as number, max = enemy.getData('max') as number;
      if (enemy.x <= min) enemy.setVelocityX(56);
      if (enemy.x >= max) enemy.setVelocityX(-56);
      const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
      enemy.setFlipX(enemyBody.velocity.x < 0); return true;
    });
  }

  private spawnBoss(): void {
    if (!this.world.boss || this.boss?.active) return;
    this.boss = this.physics.add.sprite(this.world.boss.x, 425, 'pq-boss').setDepth(6);
    this.boss.setGravityY(1220).setData({ min: this.world.boss.min, max: this.world.boss.max }).setTint(this.world.palette.enemy);
    (this.boss.body as Phaser.Physics.Arcade.Body).setSize(42, 50).setOffset(5, 4);
    this.physics.add.collider(this.boss, this.platforms);
    this.physics.add.collider(this.player, this.boss, () => this.hitBoss());
    this.toast('Король Тени пробудился! Прыгай ему на голову и избегай теневых сфер.');
  }

  private updateBoss(time: number): void {
    if (!this.boss?.active) return;
    const min = this.boss.getData('min') as number, max = this.boss.getData('max') as number;
    const direction = this.player.x < this.boss.x ? -1 : 1;
    this.boss.setVelocityX(direction * 42).setFlipX(direction < 0);
    if (this.boss.x < min) this.boss.x = min; if (this.boss.x > max) this.boss.x = max;
    if (time > this.bossAttackAt) {
      this.bossAttackAt = time + 1350;
      const orb = this.projectiles.create(this.boss.x + direction * 34, this.boss.y - 4, 'pq-orb') as Phaser.Physics.Arcade.Sprite;
      orb.setVelocity(direction * 210, -35).setDepth(7); (orb.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      this.time.delayedCall(3600, () => orb.active && orb.destroy());
    }
  }

  private collect(item: Phaser.Physics.Arcade.Sprite): void {
    const kind = item.getData('kind') as string;
    item.destroy();
    if (kind === 'coin') { this.coinsFound++; this.vibrate(ImpactStyle.Light); }
    else {
      this.crystalFound = true; this.portal.setTint(this.world.palette.accent); this.vibrate(ImpactStyle.Medium);
      this.toast(this.world.boss ? 'Осколок найден! Теперь победи Короля Тени.' : 'Осколок Света найден! Портал открыт.');
      this.spawnBoss();
    }
    this.emitHud();
  }

  private hitEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    if ((this.player.body as Phaser.Physics.Arcade.Body).velocity.y > 100 && this.player.y < enemy.y) { enemy.destroy(); this.player.setVelocityY(-355); this.vibrate(ImpactStyle.Medium); }
    else this.hurt();
  }

  private hitBoss(): void {
    if (!this.boss?.active) return;
    if ((this.player.body as Phaser.Physics.Arcade.Body).velocity.y > 110 && this.player.y < this.boss.y - 6) {
      this.bossHp--; this.player.setVelocityY(-405); this.boss.setTintFill(0xffffff); this.time.delayedCall(120, () => this.boss?.clearTint()); this.vibrate(ImpactStyle.Heavy); this.emitHud();
      if (this.bossHp <= 0) { this.boss.destroy(); this.boss = undefined; this.projectiles.clear(true, true); this.toast('Король Тени побеждён! Портал открыт.'); }
    } else this.hurt();
  }

  private tryPortal(): void {
    if (!this.crystalFound) { this.toast('Сначала найди осколок Света.'); return; }
    if (this.world.boss && this.boss) { this.toast('Портал запечатан. Победи Короля Тени!'); return; }
    const save = loadSave(); save.unlockedWorld = Math.max(save.unlockedWorld, Math.min(2, this.worldIndex + 1)); save.bestCoins[this.worldIndex] = Math.max(save.bestCoins[this.worldIndex] ?? 0, this.coinsFound); storeSave(save);
    if (this.worldIndex < WORLDS.length - 1) this.dialog('ОСКОЛОК ВОЗВРАЩЁН', `Мир «${this.world.name}» спасён!`, `Следующая глава: ${WORLDS[this.worldIndex + 1].name}.`, 'next', 'В СЛЕДУЮЩИЙ МИР');
    else this.dialog('СВЕТ ВОЗВРАЩАЕТСЯ', 'Сердце Света снова цело!', 'Ты победил(а) Тень и вернул(а) краски всем трём мирам.', 'menu', 'В МЕНЮ');
    this.paused = true; this.physics.world.pause();
  }

  private hurt(): void {
    if (this.time.now < this.invulnerableUntil || this.paused) return;
    this.invulnerableUntil = this.time.now + 1250; this.hearts--; this.vibrate(ImpactStyle.Heavy); this.cameras.main.shake(170, 0.014); this.emitHud();
    if (this.hearts <= 0) { this.paused = true; this.physics.world.pause(); this.dialog('СВЕТ ПОГАС', 'Но надежда осталась', 'Начни мир заново и верни Свету силу.', 'restart', 'НАЧАТЬ ЗАНОВО'); return; }
    this.player.setPosition(this.world.start.x, this.world.start.y).setVelocity(0, 0).setAlpha(0.35); this.time.delayedCall(1250, () => this.player?.setAlpha(1));
  }

  private emitHud(): void { this.game.events.emit('pixelquest-ui', { type: 'hud', world: this.world, hearts: this.hearts, coins: this.coinsFound, totalCoins: this.world.coins.length + 5, bossHp: this.boss ? this.bossHp : undefined } satisfies UiEvent); }
  private toast(text: string): void { this.game.events.emit('pixelquest-ui', { type: 'toast', text } satisfies UiEvent); }
  private dialog(kicker: string, title: string, text: string, action: 'resume' | 'restart' | 'next' | 'menu', actionLabel: string): void { this.game.events.emit('pixelquest-ui', { type: 'dialog', kicker, title, text, action, actionLabel } satisfies UiEvent); }
  private vibrate(style: ImpactStyle): void { void Haptics.impact({ style }).catch(() => undefined); }
}
