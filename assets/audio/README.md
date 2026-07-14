# Pocket Potion Works audio files

## Wired into the game

| Filename | Game use |
| --- | --- |
| `bagpop.mp3` | A brewed potion entering inventory |
| `brew-start.mp3` | Brewing begins |
| `brew-ready.mp3` | A potion finishes brewing and is ready to collect |
| `coin.mp3` | Coin rewards use capped tiers instead of one sound per coin. The current cue uses 0.55 base volume with random +/-10% volume and 0.95x-1.1x playback-rate variation; canonical thresholds live in `audio-feedback.js` and its tests. |
| `gather.mp3` | Ingredient gathering; plays the complete trimmed file |
| `confirm.mp3` | Successful order delivery |
| `levelup.ogg` | Level-up celebration |
| `tap.ogg` | Buttons and menus that do not play a more specific action sound, including successful workshop upgrade purchases; 1.0 cue volume at 4.0x playback speed with pitch preservation disabled so the pitch rises. The effects slider applies the final output level. |
| `music1.mp3`, `music2.mp3`, `music3.mp3` | Pixabay-licensed background playlist credited to Trycja via Pixabay; begins from a random track after the first player interaction, then follows numbered order with fades. Exact titles, source URLs, certificate hashes, and restrictions are maintained in `ASSET_PROVENANCE.md`. |

The game's synthesized cues remain as safe fallbacks if a sample cannot play.
Music and sound-effect volume default to 50% and persist independently under the master Sound setting.
Licensing and source evidence are maintained only in `ASSET_PROVENANCE.md`.

## Parked for a future use

- `radiant.mp3` - magical twinkle or shine
- `fanfare.ogg` - placement not assigned yet

## File guidelines

- Use lowercase filenames with no spaces.
- Keep interface sounds short and trim silence from the beginning and end.
- Avoid excessive volume and distortion.
- Only use audio that can legally ship in a commercial game.
