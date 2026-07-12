# Pocket Potion Works audio files

## Wired into the game

| Filename | Game use |
| --- | --- |
| `bagpop.mp3` | A brewed potion entering inventory |
| `brew-start.mp3` | Brewing begins |
| `brew-ready.mp3` | A potion finishes brewing and is ready to collect |
| `coin.mp3` | Coin rewards use capped tiers: 1 chime below 10 coins, 2 at 10+, 3 at 20+, 5 at 40+, 7 at 80+, and no more than 9 at 150+. Each chime uses 0.3 base volume with random +/-10% volume and 0.95x-1.1x playback-rate variation. |
| `gather.mp3` | Ingredient gathering; plays the complete trimmed file |
| `confirm.mp3` | Successful order delivery |
| `levelup.ogg` | Level-up celebration |
| `tap.ogg` | Buttons and menus that do not play a more specific action sound, including successful workshop upgrade purchases; volume 0.4 at 4.0x playback speed with pitch preservation disabled so the pitch rises |

The game's synthesized cues remain as safe fallbacks if a sample cannot play.

## Parked for a future use

- `radiant.mp3` - magical twinkle or shine
- `fanfare.ogg` - placement not assigned yet

## File guidelines

- Use lowercase filenames with no spaces.
- Keep interface sounds short and trim silence from the beginning and end.
- Avoid excessive volume and distortion.
- Only use audio that can legally ship in a commercial game.
