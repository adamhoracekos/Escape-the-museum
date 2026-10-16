import './style.css';
import { Game } from './core/Game';

const container = document.getElementById('game');
if (!container) throw new Error('Missing #game container');

try {
  const game = new Game(container);
  if (import.meta.env.DEV) (window as unknown as { game: Game }).game = game;
} catch (err) {
  console.error(err);
  container.innerHTML = '<p class="fatal">This game needs WebGL. Try a recent version of Chrome, Firefox, Edge or Safari on a computer.</p>';
}
