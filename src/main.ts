import Phaser from 'phaser';
import { StatusBar } from '@capacitor/status-bar';
import { pixelAudio } from './game/audio';
import { PixelQuestScene } from './game/PixelQuestScene';
import { WORLDS } from './game/content';
import { loadSave, resetSave } from './game/save';
import './style.css';

type DialogAction = 'resume' | 'restart' | 'next' | 'menu';
type UiEvent =
  | { type: 'hud'; world: (typeof WORLDS)[number]; hearts: number; coins: number; totalCoins: number; bossHp?: number }
  | { type: 'toast'; text: string }
  | { type: 'dialog'; kicker: string; title: string; text: string; action: DialogAction; actionLabel: string };

const byId = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const menu = byId<HTMLElement>('menu'), dialog = byId<HTMLElement>('dialog'), hud = byId<HTMLElement>('hud'), controls = byId<HTMLElement>('touch-controls');
const worldName = byId<HTMLElement>('world-name'), hearts = byId<HTMLElement>('hearts'), sparks = byId<HTMLElement>('spark-count'), worldSelect = byId<HTMLElement>('world-select');
const dialogKicker = byId<HTMLElement>('dialog-kicker'), dialogTitle = byId<HTMLElement>('dialog-title'), dialogText = byId<HTMLElement>('dialog-text'), dialogAction = byId<HTMLButtonElement>('dialog-action');
const audioButtons = document.querySelectorAll<HTMLButtonElement>('[data-audio-toggle]');
let selectedWorld = loadSave().unlockedWorld;
let activeDialog: DialogAction = 'menu';

const game = new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: 960, height: 540, backgroundColor: '#12092b', pixelArt: true, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } }, scene: [PixelQuestScene] });

void StatusBar.hide().catch(() => undefined);

const setPlayUi = (isPlaying: boolean): void => { hud.classList.toggle('is-hidden', !isPlaying); controls.classList.toggle('is-hidden', !isPlaying); };
const currentScene = (): PixelQuestScene => game.scene.getScene('PixelQuestScene') as PixelQuestScene;
function updateAudioButtons(): void { audioButtons.forEach((button) => { const iconOnly = button.classList.contains('icon-button'); button.textContent = pixelAudio.isMuted ? (iconOnly ? '🔇' : '🔇 ЗВУК: ВЫКЛ') : (iconOnly ? '🔊' : '🔊 ЗВУК: ВКЛ'); button.setAttribute('aria-label', pixelAudio.isMuted ? 'Включить звук' : 'Выключить звук'); }); }
function openMenu(): void { menu.classList.remove('is-hidden'); dialog.classList.add('is-hidden'); setPlayUi(false); pixelAudio.setDucked(false); pixelAudio.playMusic('menu'); renderWorlds(); }
function startGame(world: number): void { menu.classList.add('is-hidden'); dialog.classList.add('is-hidden'); setPlayUi(true); pixelAudio.play('ui'); currentScene().startWorld(world); }

function renderWorlds(): void {
  const save = loadSave(); selectedWorld = Math.min(selectedWorld, save.unlockedWorld);
  worldSelect.innerHTML = '';
  WORLDS.forEach((world, index) => {
    const button = document.createElement('button'); button.type = 'button';
    const unlocked = index <= save.unlockedWorld; button.disabled = !unlocked;
    button.className = `world-card${selectedWorld === index ? ' selected' : ''}${unlocked ? '' : ' locked'}`;
    button.innerHTML = `<span class="world-number">${unlocked ? '✦' : '🔒'}</span><span>${world.subtitle}</span><strong>${world.name}</strong>`;
    button.addEventListener('click', () => { if (unlocked) { pixelAudio.play('ui'); selectedWorld = index; renderWorlds(); } }); worldSelect.appendChild(button);
  });
}

game.events.on('pixelquest-ui', (event: UiEvent) => {
  if (event.type === 'hud') { worldName.textContent = event.world.name; hearts.textContent = `♥ ${'♥'.repeat(Math.max(0, event.hearts - 1))}${'♡'.repeat(Math.max(0, 3 - event.hearts))}`; sparks.textContent = event.bossHp ? `ТЕНЬ ${'◆'.repeat(event.bossHp)}${'◇'.repeat(4 - event.bossHp)}` : `✦ ${event.coins} / ${event.totalCoins}`; return; }
  if (event.type === 'toast') { const old = document.querySelector('.toast'); old?.remove(); const toast = document.createElement('div'); toast.className = 'toast'; toast.textContent = event.text; document.body.appendChild(toast); window.setTimeout(() => toast.remove(), 3100); return; }
  activeDialog = event.action; dialogKicker.textContent = event.kicker; dialogTitle.textContent = event.title; dialogText.textContent = event.text; dialogAction.textContent = event.actionLabel; dialog.classList.remove('is-hidden');
});

byId<HTMLButtonElement>('play-button').addEventListener('click', () => startGame(selectedWorld));
byId<HTMLButtonElement>('reset-button').addEventListener('click', () => { pixelAudio.play('reset'); resetSave(); selectedWorld = 0; renderWorlds(); });
byId<HTMLButtonElement>('pause-button').addEventListener('click', () => currentScene().pauseGame());
byId<HTMLButtonElement>('dialog-menu').addEventListener('click', () => { pixelAudio.play('ui'); openMenu(); });
dialogAction.addEventListener('click', () => { dialog.classList.add('is-hidden'); if (activeDialog === 'menu') { pixelAudio.play('ui'); openMenu(); } else currentScene().resolveDialog(activeDialog); });

audioButtons.forEach((button) => button.addEventListener('click', () => { pixelAudio.toggleMuted(); updateAudioButtons(); if (!pixelAudio.isMuted) pixelAudio.play('ui'); }));

document.querySelectorAll<HTMLButtonElement>('[data-control]').forEach((button) => {
  const action = button.dataset.control as 'left' | 'right' | 'jump';
  const send = (pressed: boolean): void => { button.classList.toggle('is-pressed', pressed); window.dispatchEvent(new CustomEvent('pixelquest-control', { detail: { action, pressed } })); };
  button.addEventListener('pointerdown', (event) => { event.preventDefault(); button.setPointerCapture(event.pointerId); send(true); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => button.addEventListener(type, () => send(false)));
});

pixelAudio.playMusic('menu');
window.addEventListener('pointerdown', () => { void pixelAudio.unlock(); }, { once: true, capture: true });
updateAudioButtons();
renderWorlds();
