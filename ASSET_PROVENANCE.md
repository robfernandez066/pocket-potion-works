# Asset and audio provenance

## Task 4 additions

- The sound set in `audio-feedback.js` is original for Pocket Potion Works. It uses nine short, hand-authored Web Audio frequency/duration/volume sequences (`tap`, `gather`, `brewStart`, `brewReady`, `collect`, `delivery`, `upgrade`, `levelUp`, and `reward`). No samples, recordings, third-party music, generated audio files, audio libraries, or remote resources are included.
- The added workshop stars, cauldron engraving, ready state, feedback rings, and color-coded toast accents in `style.css` are original CSS/code-native artwork. They use no external image or font.

## Unchanged pre-existing assets

- `icon.svg` is the existing local Pocket Potion Works application icon and was not modified in Task 4.
- The pre-existing workshop scene, shelves, herbs, cauldron, cat, potion bottles, ingredient and customer glyphs, and all other interface artwork remain HTML/CSS/SVG or system glyphs already present in the repository.
- The existing font stack uses only local system fonts. No remote fonts or runtime asset requests were added.

## Footprint

Task 4 adds 9,878 bytes to the uncompressed runtime shell: 5,569 bytes for the dependency-free audio module and 4,309 bytes across the HTML, CSS, browser adapter, and service-worker manifest changes. It adds no binary media, dependency, or network request. The separate automated test and this provenance document are not shipped in the service-worker runtime shell.
