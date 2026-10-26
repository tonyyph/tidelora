import type { BaitId } from '../ecology/types';
import type { JournalEntry, SaveGame } from '../persistence/schema';

/**
 * Field notes the player unlocks per species by catching and, more cheaply,
 * by releasing. These are gameplay tips, kept apart from verified biology.
 */
export const FIELD_NOTES: Record<string, { at: number; text: string }[]> = {
  'anabas-testudineus': [
    { at: 1, text: 'Phao giật lắc nhiều nhịp nhanh, rồi mới chìm hẳn.' },
    { at: 3, text: 'Hay ở mép sen và bãi nông. Trùn đất là mồi chắc ăn.' },
    { at: 5, text: 'Lắc đầu liên tục khi đấu: giữ dây căng đều, đừng buông.' },
  ],
  'barbonymus-gonionotus': [
    { at: 1, text: 'Ăn mồi rồi kéo phao trượt ngang khá xa.' },
    { at: 3, text: 'Thích lòng bàu sâu. Thả mồi sát đáy với cám nắm.' },
    { at: 5, text: 'Chạy dài và quay đầu gấp: nới drag lúc cá chạy.' },
  ],
  'trichopodus-pectoralis': [
    { at: 1, text: 'Phao nổi lên rồi nằm ngang: đó là lúc giật.' },
    { at: 3, text: 'Ở sát đám sen, ăn mồi tầng mặt và giữa.' },
    { at: 5, text: 'Miệng mềm: drag nhẹ, thu chậm.' },
  ],
  'channa-striata': [
    { at: 1, text: 'Ít rỉa, kéo phao chìm mạnh và lôi đi.' },
    { at: 3, text: 'Phục kích ở gốc tràm. Cần tép sống và lưỡi to.' },
    { at: 5, text: 'Lao vào gốc cây: kéo cần ngược hướng để lái ra.' },
  ],
};

/** Knowledge points: catching counts 1, releasing counts 2 (you observed it and let it go). */
export function notePoints(entry: JournalEntry | undefined): number {
  if (!entry) return 0;
  return entry.caught + entry.released;
}

export function unlockedNotes(speciesId: string, entry: JournalEntry | undefined) {
  const points = notePoints(entry);
  return (FIELD_NOTES[speciesId] ?? []).map((n) => ({ ...n, unlocked: points >= n.at }));
}

export function recordInJournal(
  save: SaveGame,
  c: { speciesId: string; lengthCm: number; weightKg: number; spotId: string },
  bait: BaitId,
): { save: SaveGame; isNew: boolean; isRecord: boolean } {
  const prev = save.journal[c.speciesId];
  const isNew = !prev;
  const isRecord = !!prev && c.lengthCm > prev.maxLengthCm;
  const entry: JournalEntry = prev
    ? {
        ...prev,
        caught: prev.caught + 1,
        maxLengthCm: Math.max(prev.maxLengthCm, c.lengthCm),
        maxWeightKg: Math.max(prev.maxWeightKg, c.weightKg),
        spots: prev.spots.includes(c.spotId) ? prev.spots : [...prev.spots, c.spotId],
        baits: prev.baits.includes(bait) ? prev.baits : [...prev.baits, bait],
      }
    : { speciesId: c.speciesId, firstDay: save.day, caught: 1, released: 0, maxLengthCm: c.lengthCm, maxWeightKg: c.weightKg, spots: [c.spotId], baits: [bait] };
  let recipesUnlocked = save.recipesUnlocked;
  if (c.speciesId === 'channa-striata' && !recipesUnlocked.includes('nuong-trui')) {
    recipesUnlocked = [...recipesUnlocked, 'nuong-trui'];
  }
  return {
    save: { ...save, journal: { ...save.journal, [c.speciesId]: entry }, knowledge: save.knowledge + (isNew ? 3 : 1), recipesUnlocked },
    isNew,
    isRecord,
  };
}
