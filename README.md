# Virtual Mbira - a little space to play

A complete browser instrument inspired by the mbira dzavadzimu. Play 24 metal keys, explore tunings, record phrases, loop them, and export audio. Rebuilt from the original p5.js sketch with native Web Audio and accessible HTML controls.
<img width="1548" height="1096" alt="Virtual Mbira site" src="https://github.com/user-attachments/assets/8c927ee0-6d33-45aa-9328-84b56979f07d" />

Originally a p5.js experiment, the site now uses **HTML, CSS, JavaScript, and the native Web Audio API**, with no runtime framework or build step.

## Features

- **Two instruments:** a 24-key Dzavadzimu-inspired layout and a 15-key Nyunga Nyunga.
- **Mouse, keyboard, and touch input**, including larger touch pads for smaller screens.
- **Separate video-derived voices** for each instrument, plus an original synthesized voice.
- **All 12 tuning keys**, with pitch adjustment and separate tuning preferences for each instrument.
- Adjustable volume, rattle, and resonance.
- Wooden soundboards, tapered metal keys, animated key strikes, and optional gourd surrounds inspired by reference photographs.
- **Up to eight recording layers**, with naming, mute, volume, and removal controls.
- Local session saving and **WAV export** of the combined recording.
- Responsive photo gallery, performance video, and information about mbira and its cultural context.

## Run locally

Install Node.js 18 or later, then run from the project folder:

```sh
npm start
```

Or run the server directly:

```sh
node server.js
```

Open **http://localhost:4173** in your browser. No package installation or API key is needed to run the site. The development server listens only on your computer; set the `PORT` environment variable to use another port.

You can also open `index.html` directly, but the local server provides a consistent address for saved sessions and supports video seeking.

## How to play

1. Choose an instrument from the **Instrument** menu.
2. Click or tap a metal key, or press its keyboard shortcut. The first interaction enables audio.
3. Choose a **Tuning key** and adjust the sound controls to taste.
4. Use **Key labels** to show note names and keyboard shortcuts. On mobile, open **Larger touch pads**.
5. Press **Escape** to stop recording or playback and silence the instrument.

Headphones help bring out the lower notes.

### Mbira Dzavadzimu

The 24-key layout has three groups:

- Left upper: **Q W E R T Y U**.
- Left lower: **A S D F G H J**.
- Right: **Z X C V B N M , . /**.

The initial tuning is **B♭**, with Mixolydian, Major, and Natural minor scale options. In the default B♭ layout with no pitch shift, **Q plays B♭3**, **W plays F4**, and **E plays E♭4**. W sits directly beside Q.

### Nyunga Nyunga

The 15 keys are numbered **left to right**. Their keyboard shortcuts, in the same order, are:

```text
Key:        1   2   3   4   5   6   7   8    9   10  11  12  13  14  15
Keyboard:   Q   W   E   R   T   Y   U   I    O    P   A   S   D   F   G
F tuning:  D5  A5  C5  G5 Bb4  F5  D4 Bb5  Bb3   F5  F4  G5  G4  A5  A4
```

This is the owner's supplied **F-major tuning layout**, including its repeated notes and octave placements. Selecting another tuning key transposes the entire layout while preserving those intervals. The scale selector stays fixed to this layout. Nyunga Nyunga tuning preferences are saved separately from Dzavadzimu preferences.

### Startup sound and appearance

Each time the site opens:

- Gourd surround is **on** and note labels are **off**.
- The Dzavadzimu video-reference voice is selected.
- Rattle is **100%**, resonance is **1 second**, and volume is **65%**.

Selecting Nyunga Nyunga chooses its own video-reference voice. Nyunga key numbers remain visible to identify positions. Tuning preferences are restored when available. The gourd toggle changes the appearance only.

## Record, layer, and export

1. Press **Record**, play a phrase, then press **Finish** to set the loop length.
2. Press **Add loop** to record another part while the existing layers play.
3. Press **Finish** to save the new layer. You can play across multiple passes; notes are placed within the shared loop.
4. Rename layers, adjust their volume, or mute and remove individual parts.
5. Choose **1, 2, 4, or 8 loops** as the export length, then select **Export mix WAV**.

The studio supports **eight layers**, up to **10,000 note events**, and recordings of up to **two minutes**. Export lengths exceeding two minutes are unavailable. Each layer retains its recorded pitches, voice, rattle, and resonance, even when you switch instruments or change tuning.

Exports combine all unmuted layers into a **mono, 44.1 kHz, 16-bit WAV**, including the final notes' decay. Empty takes leave the existing mix intact. Switching away from the page stops playback and finishes an active recording.


https://github.com/user-attachments/assets/658c3942-96a7-4153-807e-813ff90cdba7



The default voice uses eight selected strikes from the supplied mbira performance. Frequency isolation retains the early attack and metallic resonances; fitted, decaying resonances replace overlapping ringing tails. A short high-frequency contact sample supplies the adjustable rattle. The closest sampled root is transposed for each playable pitch. Live playback and WAV export use the same bank, which is bundled locally in `reference-bank.js` (about 1.7 MB); no video upload or runtime network request is required.

## Sound design

The Dzavadzimu voice uses eight selected strikes from a supplied performance. The Nyunga Nyunga voice uses six strikes from its own reference video. Both combine filtered attacks and measured metallic resonances with reconstructed decay tails to reduce overlapping notes. The nearest sampled pitch is transposed to each requested note.

These voices approximate the reference instruments; they are **not isolated studio recordings of every key**. Live playback and WAV export use the same sound banks. The original synthesized voice remains available for comparison. Sound banks are bundled locally, so playing the instrument requires no video upload or external audio service.

## Cultural context and media

The project explores music technology, instrument design, and learning through play. Its information section discusses mbira's connections to culture, history, spirituality, identity, and community-led cultural tourism, adapted from the supplied background document.

The gallery includes three reference photographs and an optimized performance video. Images adapt to small screens, and the video has playback controls without autoplay.

Real mbiras vary between makers and players. The simulator's equal-tempered tuning options and reference-derived voices do not claim to reproduce every traditional tuning or acoustic characteristic. The built-in examples are original exploration phrases, not traditional compositions.

## Project structure

```text
virtual_mbira/
├── index.html                 # Page, instrument controls, gallery, and video
├── styles.css                 # Main styling and responsive layouts
├── gourd.css                  # Dzavadzimu gourd appearance
├── nyunga.css                 # Nyunga Nyunga appearance
├── app.js                     # Input, instrument switching, and loop studio
├── music.js                   # Key mappings, tuning, sessions, and WAV encoding
├── audio.js                   # Web Audio playback and offline rendering
├── reference-bank.js          # Dzavadzimu reference sound bank
├── nyunga-bank.js             # Nyunga Nyunga reference sound bank
├── assets/                    # Gourd artwork, photos, video, and poster
├── server.js                  # Local server with video range support
├── scripts/                   # Development tools for building sound banks
├── tests/                     # Music and browser integration checks
├── virtual_mbira/v_mbira.js    # Preserved original p5.js experiment
└── README.md
```

## Development and checks

Run the music tests:

```sh
npm test
```

For browser integration checks, install Playwright and Chromium in your development environment, start the local server, then run:

```sh
node tests/browser.cjs
```

Optional environment variables `PLAYWRIGHT_MODULE`, `BROWSER_PATH`, and `MBIRA_URL` allow an existing browser installation or another server address. Browser checks cover instrument playback, note mappings, layering, session restoration, WAV output, and responsive layouts. Generated screenshots and audio go into the ignored `test-results/` folder.

### Rebuild a sound bank

These development helpers require Playwright for video decoding and Python with NumPy for sound-bank generation:

```sh
node scripts/decode-reference.cjs "path/to/source-video.mp4"
python scripts/build-reference-bank.py test-results/reference.f32
```

For the Nyunga Nyunga reference video, decode that video first, then run:

```sh
python scripts/build-nyunga-bank.py test-results/reference.f32
```

The builders use strike times specific to their original source recordings. A different video needs its own measurements. Decoding replaces the intermediate `reference.f32` file; rebuilding replaces the corresponding generated bank.

## Hosting

- `index.html` - application structure and accessible controls
- `styles.css` - responsive studio and instrument construction
- `music.js` - key layout, tuning, session validation, WAV encoding
- `audio.js` - polyphonic synthesis and offline rendering
- `reference-bank.js` - generated PCM sound bank derived from the reference performance
- `scripts/build-reference-bank.py` - reproducible sound-bank extraction using NumPy and mono 22050 Hz float32 audio
- `app.js` - pointer/keyboard input, transport, audio-clock scheduling, local saving
- `server.js` - dependency-free local development server
- `tests/music.test.js` - note mapping, tuning, session validation, and WAV tests
- `virtual_mbira/v_mbira.js` - preserved original p5.js experiment; not loaded by the app

- `index.html`, `styles.css`, `gourd.css`, and `nyunga.css`.
- `app.js`, `music.js`, and `audio.js`.
- `reference-bank.js` and `nyunga-bank.js`.
- The complete `assets/` folder.

No server-side application, database, or build step is required for the hosted site. Browser storage is specific to the site's address, so recordings saved locally do not automatically move to a hosted domain.

## Possible future improvements

- MIDI controller input.
- Studio-recorded samples for individual keys.
- Additional documented traditional tunings.
- Guided lessons and practice patterns.

These are future ideas, not currently implemented features.
