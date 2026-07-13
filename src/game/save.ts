const SAVE_KEY = 'pixelquest.v1.progress';

export interface SaveData { unlockedWorld: number; bestCoins: number[]; }

const defaultSave = (): SaveData => ({ unlockedWorld: 0, bestCoins: [0, 0, 0] });

export function loadSave(): SaveData {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '');
    if (typeof parsed.unlockedWorld === 'number' && Array.isArray(parsed.bestCoins)) {
      return {
        unlockedWorld: Math.max(0, Math.min(2, Math.floor(parsed.unlockedWorld))),
        bestCoins: [0, 1, 2].map((index) => Math.max(0, Math.floor(Number(parsed.bestCoins[index]) || 0)))
      };
    }
  } catch { /* First launch or corrupt data: start fresh. */ }
  return defaultSave();
}

export function storeSave(save: SaveData): void { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
export function resetSave(): SaveData { const save = defaultSave(); storeSave(save); return save; }
