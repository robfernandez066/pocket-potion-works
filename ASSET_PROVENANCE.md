# Asset and audio provenance

## Current user-provided audio samples

- `assets/audio/bagpop.mp3`, `brew-ready.mp3`, `brew-start.mp3`, `coin.mp3`, `confirm.mp3`, `gather.mp3`, `levelup.ogg`, and `tap.ogg` are now local runtime audio assets.
- `assets/audio/radiant.mp3` and `fanfare.ogg` are stored but not used by the game.
- These files were supplied by the project owner. Their original source and commercial-use rights still need to be confirmed before any public release or store submission.
- No audio is loaded from a remote service.

## Task 4 synthesized audio

- The fallback sound set in `audio-feedback.js` is original for Pocket Potion Works. It uses nine short, hand-authored Web Audio frequency/duration/volume sequences (`tap`, `gather`, `brewStart`, `brewReady`, `collect`, `delivery`, `upgrade`, `levelUp`, and `reward`). No audio libraries or remote resources are included.
- The added workshop stars, cauldron engraving, ready state, feedback rings, and color-coded toast accents in `style.css` are original CSS/code-native artwork. They use no external image or font.

## Current visual theme

- The charcoal-black and purple interface theme is implemented entirely in local CSS. It adds no image, font, library, or remote runtime dependency.

## Unchanged pre-existing assets

- `icon.svg` is the existing local Pocket Potion Works application icon and was not modified in Task 4.
- The pre-existing workshop scene, shelves, herbs, cauldron, cat, potion bottles, ingredient and customer glyphs, and all other interface artwork remain HTML/CSS/SVG or system glyphs already present in the repository.
- The existing font stack uses only local system fonts. No remote fonts or runtime asset requests were added.

## Footprint

The eight wired samples add 199,969 bytes to the offline runtime shell. `gather.mp3` is a trimmed 9,936-byte file and plays in full. The two parked samples are not cached or requested at runtime. The audio implementation remains dependency-free and makes no remote request.
