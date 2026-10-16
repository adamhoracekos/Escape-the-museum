import { PLAYABLE_CHAPTERS, chapterById } from './chapters';

/**
 * Everything the player has done, as a set of namespaced ids. This is what gets saved.
 *   "<level>/fragment-N"   a fragment picked up
 *   "<level>/battery-N"    a battery picked up
 *   "<chapter>/assembled"  the artifact was assembled on the conservation table
 *   "<chapter>/placed"     the artifact stands on its plinth in the rotunda
 */
export class Progress {
  readonly ids = new Set<string>();

  has(id: string): boolean {
    return this.ids.has(id);
  }

  add(id: string): void {
    this.ids.add(id);
  }

  load(ids: Iterable<string>): void {
    this.ids.clear();
    for (const id of ids) this.ids.add(id);
  }

  fragments(levelId: string): number {
    const prefix = `${levelId}/fragment-`;
    let n = 0;
    for (const id of this.ids) if (id.startsWith(prefix)) n++;
    return n;
  }

  isAssembled(chapterId: string): boolean {
    return this.ids.has(`${chapterId}/assembled`);
  }

  isPlaced(chapterId: string): boolean {
    return this.ids.has(`${chapterId}/placed`);
  }

  /** The artifact the player carries: assembled in its level, not yet on its plinth. */
  isCarrying(chapterId: string): boolean {
    return this.isAssembled(chapterId) && !this.isPlaced(chapterId);
  }

  /** Can the corridor to this chapter be walked into a level? */
  isOpen(chapterId: string): boolean {
    const ch = chapterById(chapterId);
    if (!ch || !ch.playable || this.isAssembled(chapterId)) return false;
    return ch.requires === null || this.isPlaced(ch.requires);
  }

  placedCount(): number {
    return PLAYABLE_CHAPTERS.filter((c) => this.isPlaced(c.id)).length;
  }

  isComplete(): boolean {
    return this.placedCount() === PLAYABLE_CHAPTERS.length;
  }
}
