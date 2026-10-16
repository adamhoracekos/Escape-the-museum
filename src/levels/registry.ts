import { chapterById } from '../progress/chapters';
import { createChapterStub } from './ChapterStub';
import type { LevelFactory } from './Level';
import { createRotunda } from './Rotunda';
import { createTestRoom } from './TestRoom';

/** Every level the game can load, by id. Chapters use placeholders until their real levels exist. */
export const LEVELS: Record<string, LevelFactory> = {
  rotunda: createRotunda,
  'ice-age': (svc) => createChapterStub(chapterById('ice-age')!, svc),
  egypt: (svc) => createChapterStub(chapterById('egypt')!, svc),
  'test-room': createTestRoom,
};

export const FIRST_LEVEL = 'rotunda';
