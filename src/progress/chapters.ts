/** A themed wing of the museum, reached through its own corridor from the rotunda (GDD 8, 9). */
export interface Chapter {
  id: string;
  numeral: string;
  title: string;
  artifact: string;
  /** Chapter whose artifact must be on its plinth before this corridor opens. */
  requires: string | null;
  /** Sign colours above the doorway. */
  color: string;
  ink: string;
  /** False for wings shown in the rotunda but not built yet. */
  playable: boolean;
}

export const CHAPTERS: Chapter[] = [
  { id: 'ice-age', numeral: 'I', title: 'The Ice Age', artifact: 'Venus of Dolní Věstonice', requires: null, color: '#7fb7d9', ink: '#15171c', playable: true },
  { id: 'egypt', numeral: 'II', title: 'Ancient Egypt', artifact: 'Heart scarab', requires: 'ice-age', color: '#d9a441', ink: '#15171c', playable: true },
  { id: 'solar-system', numeral: 'III', title: 'The Solar System', artifact: '', requires: null, color: '#2a3f8f', ink: '#ffffff', playable: false },
  { id: 'depths', numeral: 'IV', title: 'The Depths', artifact: '', requires: null, color: '#1d7a7a', ink: '#ffffff', playable: false },
];

export const PLAYABLE_CHAPTERS = CHAPTERS.filter((c) => c.playable);

export function chapterById(id: string): Chapter | undefined {
  return CHAPTERS.find((c) => c.id === id);
}
