# ChessSweeper — Chess × Minesweeper

Regular chess, but the board is riddled with hidden mines. Open `index.html`
in any browser — no build, no dependencies.

## Rules
- **Full chess:** legal move generation, castling, en passant, promotion, check, checkmate and stalemate.
- **Hidden mines** are buried across the middle of the board. Move a piece onto a mine and that piece is **destroyed** (yours or the enemy's). Lose your **king** to a mine and you lose the game.
- **Minesweeper clues:** when a piece lands safely, the square reveals a number = how many of the 8 surrounding squares hold mines. Read the field to move safely.
- **Right-click / long-press** a square to plant a 🚩 flag on a suspected mine.

## Modes
- **1 Player** vs a bot with **Easy / Medium / Hard** difficulty (Hard uses alpha-beta search with mine-risk awareness). Choose to play White or Black.
- **2 Players** hot-seat on one device.
- Configurable mine count: 4 (Cautious) → 14 (Chaos).
