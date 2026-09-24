# Mbira — a little space to play

A complete browser instrument inspired by the mbira dzavadzimu. Play 24 metal keys, explore tunings, record phrases, loop them, and export audio. Rebuilt from the original p5.js sketch with native Web Audio and accessible HTML controls.

## Run

Open **index.html** in a modern browser. No installation, API key, or build step is required. The instrument works offline; optional Google Fonts fall back to system fonts.

For a stable local address and reliable browser storage, install Node.js 18 or later and run:

```sh
node server.js
```

Open **http://localhost:4173**. Alternatively, use `npm start`. Set `PORT` to choose another port. The development server listens only on your computer. For hosting, serve `index.html`, `styles.css`, `gourd.css`, `nyunga.css`, the `assets/` directory, `music.js`, `reference-bank.js`, `audio.js`, and `app.js` with any static website host.

## Nyunga Nyunga interface

Choose **Nyunga Nyunga · 15 keys** in the Instrument menu. Its narrow wooden board, alternating tine lengths, brown gourd surround and metal rattle plate follow the supplied photos. Keys are numbered **1–15 from left to right**, always visible for mapping. Select a key to identify it. This interface intentionally has no pitches or keyboard shortcuts yet; these await the owner’s mappings. New recording, tuning and the example are unavailable in this mode; saved Dzavadzimu loops remain available. Switch back to Dzavadzimu to play the existing instrument.

## Play

- Click or tap the tines. Multiple simultaneous touches and keyboard chords are supported.
- Left upper keys: **Q W E R T Y U**.
- Left lower keys: **A S D F G H J**.
- Right keys: **Z X C V B N M , . /**.
- Open **Larger touch pads** for easier playing on a small screen.
- **Escape** stops the current recording or playback and silences all voices.
- Use **Voice** to compare the video-derived sound with the original synthesizer. **Tuning**, **Pitch**, **Rattle**, **Resonance**, and **Volume** shape the sound.
- **Tuning key** defaults to **B♭ (B flat)**. Choose from all 12 roots: B♭, C, D♭, D, E♭, E, F, G♭, G, A♭, A, and B. **Scale** offers the original mixolydian intervals, major, or natural minor. Root, scale, and extra pitch shift are remembered on this browser; key and touch-pad labels update immediately. Existing loops retain their recorded pitches.
- In B♭ tuning, **W plays F4** and **E plays E♭4** at zero extra pitch shift. W sits directly beside Q (B♭3), with E on the other side of W. Their note labels match their sounds. Other tuning roots retain their previous pitch mappings; saved loops keep the notes recorded at the time.
- Every time the site opens, the gourd is on, key labels are off, and the video reference voice starts with Rattle at 100% and Resonance at 1 second. Saved layers keep their recorded sound settings.
- Toggle labels or the optional gourd surround. The surround is visual and does not change the sound.

The first interaction enables audio. Headphones help with low notes. Both voices use an output compressor and a 32-voice limit. Keys are extended by 10%. From the center outward, the upper bank follows Q, W, E, R, T, Y, U, with visual lengths maintaining the V-shaped outline independently of their pitches. Keyboard shortcuts and recording IDs are unchanged.

## Video reference voice

The default voice uses eight selected strikes from the supplied mbira performance. Frequency isolation retains the early attack and metallic resonances; fitted, decaying resonances replace overlapping ringing tails. A short high-frequency contact sample supplies the adjustable rattle. The closest sampled root is transposed for each playable pitch. Live playback and WAV export use the same bank, which is bundled locally in `reference-bank.js` (about 1.7 MB); no video upload or runtime network request is required.

This is a reference-derived approximation, **not an exact isolated recording of every key**. The performance contains overlapping notes, and pitches outside the sampled range are transposed. The existing tunings remain unchanged; they do not claim to reproduce the video's complete tuning. The original synthesized voice remains available for comparison.

## Record and export

Press **Record**, play your first phrase, and press **Finish**. This sets the shared loop length, including opening and closing silence (up to two minutes). Press **Add loop** to start recording another layer immediately while the existing mix plays. The recording row shows the captured note count. Press **Finish** to save it; recording also stops after two minutes. You can play over several passes: every note is placed at its position within the shared loop, so additional passes build up the same layer. A saved layer joins on the next available loop boundary without interrupting the backing tracks. Finishing a shorter part leaves the remainder of its loop silent.

Build up to **8 layers**, with a shared limit of 10,000 note events. Each layer keeps its recorded pitches, voice, rattle, and resonance, so you can change the instrument settings before recording a contrasting part. Rename layers, adjust their volumes, mute them, or remove them. Mute and level changes apply to upcoming notes; existing notes finish ringing. Removing a layer stops playback. Empty takes leave the existing mix intact. **Play** plays the mix once; **Loop** repeats it. Adding a layer enables looping automatically.

The complete mix, names, mute states, and levels save in browser storage when available and restore on reload. Older single-loop recordings automatically load as Loop 1. **Clear all** starts a new piece. This is local to your browser and address, not a cloud backup. Private browsing or clearing site data can remove it.

Choose **1, 2, 4, or 8 loops** in Export length, then press **Export mix WAV** to create one combined mono 44.1 kHz, 16-bit recording. Exports include every unmuted layer at its own volume and recorded sound, the current master volume, and the final notes' decay. Repetition choices that exceed two minutes are unavailable. Muted layers are omitted; exports are disabled when every layer is muted or at zero volume. The reference voice is deterministic; the original synthesized voice generates fresh noise during rendering.

Switching away from the page stops playback and finishes an active recording to avoid background timer interruptions. Returning to the page lets you restart playback.

## Design and cultural context

The wooden board, staggered left banks, right bank, pressure rod, wire ties, flattened tips, finger hole, and optional gourd surround were informed by the owner's reference photographs. Gourd mode follows the later IMG_5221 reference: a deep golden-yellow shell, a low-mounted weathered board, a foil-colored support, perimeter wire, crown-cap rattles, and a lower metal rattle bar. This view is drawn with local SVG and CSS; the photos are not bundled or uploaded by the application. Gourd off retains the standalone board view.

The prototype's original F mixolydian pitch collection is available by choosing F and Original intervals. New sessions default to B♭ with those same intervals, putting the lowest key at B♭2; use Major if you want B♭ major, or Pitch −12 for an octave lower. All root and scale options are Western equal-tempered explorations, **not authentic Nyamaropa tuning presets**. A B♭ root alone does not specify an individual mbira's intervals or exact tuning. Traditional mbiras vary between makers, players, and communities; this is an educational digital interpretation rather than an acoustic replica. The demonstration is an original exploration phrase, not a traditional composition.

Learn more through [UNESCO's account of crafting and playing Mbira/Sansi in Malawi and Zimbabwe](https://ich.unesco.org/en/RL/art-of-crafting-and-playing-mbira-sansi-the-finger-plucking-traditional-musical-instrument-in-malawi-and-zimbabwe-01541).

## Development

```sh
node --test tests/music.test.js
```

An optional browser integration suite is included in `tests/browser.cjs`. With Playwright and its Chromium browser installed, start the development server and run `node tests/browser.cjs`. You can set `PLAYWRIGHT_MODULE` and `BROWSER_PATH` to use existing installations. The suite checks playback, recording, storage recovery, exported audio, and desktop/mobile layouts, and writes screenshots under `test-results/`.

- `index.html` — application structure and accessible controls
- `styles.css` — responsive studio and instrument construction
- `music.js` — key layout, tuning, session validation, WAV encoding
- `audio.js` — polyphonic synthesis and offline rendering
- `reference-bank.js` — generated PCM sound bank derived from the reference performance
- `scripts/build-reference-bank.py` — reproducible sound-bank extraction using NumPy and mono 22050 Hz float32 audio
- `app.js` — pointer/keyboard input, transport, audio-clock scheduling, local saving
- `server.js` — dependency-free local development server
- `tests/music.test.js` — note mapping, tuning, session validation, and WAV tests
- `virtual_mbira/v_mbira.js` — preserved original p5.js experiment; not loaded by the app

Manual checks: play multiple keys, record a short phrase, loop it, export a WAV, reload to restore the take, try a narrow screen and the touch pads, and press Escape during playback. Test with the device's audio output enabled.

To rebuild the reference bank, decode the source video with `node scripts/decode-reference.cjs <video-path>` (requires Playwright), then run `python scripts/build-reference-bank.py test-results/reference.f32` (requires NumPy). These are development tools only; users do not need either dependency to play. The source video and intermediate analysis files are not bundled.

MIDI input, a complete studio-recorded per-key sample set, and traditional tuning datasets are possible future additions; they are not implemented yet.
