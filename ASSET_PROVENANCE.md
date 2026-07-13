# Asset and audio provenance

## Current user-provided audio samples

- `assets/audio/bagpop.mp3`, `brew-ready.mp3`, `brew-start.mp3`, `coin.mp3`, `confirm.mp3`, `gather.mp3`, `levelup.ogg`, and `tap.ogg` are local runtime sound-effect assets.
- `assets/audio/music1.mp3`, `music2.mp3`, and `music3.mp3` are local background-music assets credited in-game to **Trycja via Pixabay**. Exact source and certificate evidence is recorded below.
- `assets/audio/radiant.mp3` and `fanfare.ogg` are stored but not used by the game.
- These files were supplied by the project owner. On July 12, 2026, the owner confirmed that the sound effects and parked samples were offered as free for use under the Pixabay Content License. Exact effect-page URLs and download records were not retained, so this is owner-attested evidence rather than track-specific certificate evidence. The three music tracks have the stronger certificate evidence recorded below.
- No audio is loaded from a remote service.

## Sound-effect license evidence

The owner confirms that `bagpop.mp3`, `brew-ready.mp3`, `brew-start.mp3`, `coin.mp3`, `confirm.mp3`, `gather.mp3`, `levelup.ogg`, `tap.ogg`, `radiant.mp3`, and `fanfare.ogg` were obtained from Pixabay pages marked free for use under the [Pixabay Content License](https://pixabay.com/service/license-summary/). They are used only within Pocket Potion Works and must not be offered or represented as standalone audio. This confirmation clears the known sound-effect licensing blocker for the tester release; retaining exact source URLs for future downloads remains preferred provenance practice.

## Background-music license evidence

The owner downloaded all three tracks under the Pixabay Content License on July 12, 2026. The certificate files remain owner-retained outside the public repository because they contain the owner's Pixabay licensee identifier. SHA-256 hashes allow the retained certificates to be verified without publishing that identifier.

| Runtime file | Track and source | Pixabay ID | Duration | Certificate download (UTC) | Certificate SHA-256 |
| --- | --- | --- | --- | --- | --- |
| `music1.mp3` | [Dreamscape by Trycja](https://pixabay.com/music/beats-dreamscape-523286/) | `523286` | 4:11 | 2026-07-12 21:08:45 | `34372BA776C1AA10D045860197A3518833EFBFABD6F0C481423740AB55EF2791` |
| `music2.mp3` | [Violin Alchemy by Trycja](https://pixabay.com/music/meditationspiritual-violin-alchemy-558907/) | `558907` | 3:51 | 2026-07-12 21:09:18 | `A07AE44146618D3E9C4315D56845E836C21AF0FA7ABB518998B4E6ED790891FA` |
| `music3.mp3` | [Emerald Echoes Cries by Trycja](https://pixabay.com/music/world-emerald-echoes-cries-458636/) | `458636` | 3:41 | 2026-07-12 21:08:17 | `54E3DDE2BD8F731D5D57C19E3B84702BB7A31FE4A30E43B496BD1601C18F2736` |

The tracks are used only as part of Pocket Potion Works and must not be offered, claimed, sold, or redistributed as standalone music. The source pages identify the music as AI-generated; at least Violin Alchemy and Emerald Echoes Cries are Content ID registered, so the retained certificates must be kept for possible claim disputes. This evidence does not remove Pixabay's disclaimer concerning third-party rights.

## Task 4 synthesized audio

- The fallback sound set in `audio-feedback.js` is original for Pocket Potion Works. It uses nine short, hand-authored Web Audio frequency/duration/volume sequences (`tap`, `gather`, `brewStart`, `brewReady`, `collect`, `delivery`, `upgrade`, `levelUp`, and `reward`). No audio libraries or remote resources are included.
- The added workshop stars, cauldron engraving, ready state, feedback rings, and color-coded toast accents in `style.css` are original CSS/code-native artwork. They use no external image or font.

## Current visual theme

- The charcoal-black and purple interface theme is implemented entirely in local CSS. It adds no image, font, library, or remote runtime dependency.

## Owner-generated Sprixen sprites

- `assets/images/ingredients/frostmint.png` and the four files under `assets/images/potions/` are owner-generated 256x256 transparent PNG sprites created with Sprixen for Pocket Potion Works.
- Lantern Sip was the visual reference for Quietbell Tea, Wayfinder Cordial, and Aurora Nectar. The approved static outputs are used; the rejected Aurora animation sheet is not stored or shipped.
- The five sprites add 188,009 bytes to the offline installation shell and require no remote runtime service. The owner should retain Sprixen generation records and confirm applicable commercial-use terms before a store release.

## Unchanged pre-existing assets

- `icon.svg` is the existing local Pocket Potion Works application icon and was not modified in Task 4.
- The pre-existing workshop scene, shelves, herbs, cauldron, cat, potion bottles, ingredient and customer glyphs, and all other interface artwork remain HTML/CSS/SVG or system glyphs already present in the repository.
- The existing font stack uses only local system fonts. No remote fonts or runtime asset requests were added.

## Footprint

The eight wired effects add 199,969 bytes to the offline installation shell. The three music tracks add 22,516,295 bytes and stream from the same origin on demand instead of blocking service-worker installation; completed full-file requests may be cached for later use. `gather.mp3` is a trimmed 9,936-byte file and plays in full. The two parked samples are not requested at runtime. The audio implementation remains dependency-free and makes no remote request.
