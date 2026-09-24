const test = require('node:test');
const assert = require('node:assert/strict');
const { keys, tuningRoots, pitch, frequency, noteName, validSession, restoreSession, mixSession, encodeWav } = require('../music');

test('the original instrument preserves all 24 unique playable keys', () => {
  assert.equal(keys.length, 24);
  assert.equal(new Set(keys.map(k => k.id)).size, 24);
  assert.equal(new Set(keys.map(k => k.shortcut)).size, 24);
  assert.deepEqual([0, 1, 2].map(bank => keys.filter(k => k.bank === bank).length), [7, 7, 10]);
  assert.ok(Math.abs(frequency(keys[7].midi) - 87.31) < .01);
});
test('tuning converts the relevant scale degrees and preserves octaves', () => {
  assert.equal(frequency(69), 440);
  assert.equal(noteName(41), 'F2');
  assert.equal(pitch(63, 'major'), 64);
  assert.equal(pitch(57, 'minor'), 56);
  assert.equal(pitch(62, 'minor'), 61);
  assert.equal(pitch(58, 'major'), 58);
  assert.equal(pitch(41, 'original', 12), 53);
  assert.equal(frequency(53) / frequency(41), 2);
});

test('Bb roots, scale intervals and all twelve tunings transpose consistently', () => {
  assert.equal(tuningRoots.length, 12);
  assert.equal(new Set(tuningRoots.map(root => ((5 + root.offset) % 12 + 12) % 12)).size, 12);
  assert.equal(noteName(pitch(41, 'original', 0, 'bb')), 'B♭2');
  assert.equal(noteName(pitch(53, 'major', 0, 'bb')), 'B♭3');
  assert.equal(noteName(pitch(63, 'major', 0, 'bb')), 'A4');
  assert.equal(noteName(pitch(63, 'original', 0, 'bb')), 'A♭4');
  assert.equal(noteName(pitch(57, 'minor', 0, 'bb')), 'D♭4');
  for (const root of tuningRoots) for (const scale of ['original', 'major', 'minor']) for (const key of keys) {
    const base = pitch(key.midi, scale, 0, root.id);
    assert.equal(base, pitch(key.midi, scale) + root.offset);
    assert.ok(base - 12 >= 20 && base + 12 <= 100);
    assert.equal(pitch(key.midi, scale, 12, root.id), base + 12);
  }
});
test('stored sessions reject invalid timing, notes, and excessive duration', () => {
  const valid = { version: 1, duration: 1, events: [{ id: '1-0', midi: 41, at: .1 }] };
  assert.ok(validSession(valid));
  for (const patch of [{ duration: Infinity }, { duration: 121 }, { version: 2 }, { events: [{ id: 'missing', midi: 41, at: .1 }] }, { events: [{ id: '1-0', midi: 41, at: 1 }] }, { events: [{ id: '1-0', midi: NaN, at: .1 }] }]) assert.ok(!validSession({ ...valid, ...patch }));
  assert.ok(!validSession(null));
  assert.ok(!validSession({ ...valid, events: [null] }));
  assert.ok(!validSession({ ...valid, events: [] }));
  assert.ok(!validSession({ ...valid, events: [{ id: '1-0', midi: 41, at: .5 }, { id: '1-0', midi: 41, at: .1 }] }));
});
test('WAV export writes valid mono PCM headers and clamps samples', () => {
  const buffer = { sampleRate: 44100, getChannelData: () => new Float32Array([-2, -1, 0, 1, 2]) };
  const wav = encodeWav(buffer), view = new DataView(wav);
  assert.equal(wav.byteLength, 54);
  assert.equal(Buffer.from(wav).toString('ascii', 0, 4), 'RIFF');
  assert.equal(Buffer.from(wav).toString('ascii', 8, 12), 'WAVE');
  assert.equal(view.getUint32(24, true), 44100);
  assert.equal(view.getUint32(40, true), 10);
  assert.deepEqual([0, 1, 2, 3, 4].map(i => view.getInt16(44 + i * 2, true)), [-32768, -32768, 0, 32767, 32767]);
});

test('reference samples cover distinct roots and have valid bounded PCM with faded tails', () => {
  require('../reference-bank');
  const bank = globalThis.MbiraReference;
  assert.equal(bank.sampleRate, 22050);
  assert.equal(bank.samples.length, 8);
  assert.equal(new Set(bank.samples.map(s => s.rootHz)).size, 8);
  for (const sample of bank.samples) {
    assert.ok(sample.rootHz > 190 && sample.rootHz < 710);
    const pcm = Buffer.from(sample.pcm, 'base64');
    assert.equal(pcm.length, 22050 * 3.6 * 2);
    let peak = 0;
    for (let i = 0; i < pcm.length; i += 2) peak = Math.max(peak, Math.abs(pcm.readInt16LE(i)));
    assert.ok(peak > 1000 && peak < 24000);
    assert.equal(pcm.readInt16LE(0), 0);
    assert.ok(Math.abs(pcm.readInt16LE(pcm.length - 2)) < 10);
  }
});

const makeTrack = (id, at, sound = 'reference') => ({ id, name: id, muted: false, level: 1, sound: { voice: sound, buzz: .25, sustain: 1.8 }, events: [{ id: '1-0', midi: 41, at }] });
test('old recordings migrate without losing notes or duration', () => {
  const old = { version: 1, duration: 2, events: [{ id: '1-0', midi: 41, at: .5 }] };
  const migrated = restoreSession(old);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.duration, 2);
  assert.deepEqual(migrated.tracks[0].events, old.events);
  assert.ok(validSession(migrated));
});
test('loop mix sorts simultaneous layers, repeats on the shared boundary and preserves each voice', () => {
  const song = { version: 2, duration: 2, tracks: [makeTrack('bass', .8), makeTrack('melody', .2, 'synth')] };
  song.tracks[1].level = .4;
  const mixed = mixSession(song, 2);
  assert.equal(mixed.duration, 4);
  assert.deepEqual(mixed.events.map(e => e.at), [.2, .8, 2.2, 2.8]);
  assert.equal(mixed.events[0].sound.voice, 'synth');
  assert.equal(mixed.events[0].sound.level, .4);
  song.tracks[0].muted = true;
  assert.equal(mixSession(song).events.length, 1);
  song.tracks[1].level = 0;
  assert.equal(mixSession(song).events.length, 0);
});
test('invalid track data and oversized exports are rejected', () => {
  const song = { version: 2, duration: 20, tracks: [makeTrack('one', 1)] };
  assert.ok(validSession(song));
  assert.throws(() => mixSession(song, 8));
  assert.throws(() => mixSession(song, 0));
  assert.equal(restoreSession({ ...song, tracks: [null] }), null);
  assert.ok(!validSession({ ...song, tracks: [makeTrack('one', 1), makeTrack('one', 2)] }));
  assert.ok(!validSession({ ...song, tracks: [{ ...makeTrack('one', 1), level: NaN }] }));
  assert.ok(!validSession({ ...song, tracks: Array.from({ length: 9 }, (_, i) => makeTrack(String(i), 1)) }));
});
