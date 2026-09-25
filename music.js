(function (root) {
  'use strict';
  const banks = [
    { name: 'Left upper', shortcuts: 'qwertyu', midi: [53, 60, 58, 62, 63, 65, 67] },
    { name: 'Left lower', shortcuts: 'asdfghj', midi: [41, 45, 46, 48, 50, 51, 55] },
    { name: 'Right', shortcuts: 'zxcvbnm,./', midi: [57, 65, 67, 69, 70, 72, 74, 75, 77, 79] }
  ];
  const keys = banks.flatMap((bank, bankIndex) => bank.midi.map((midi, i) => ({ id: `${bankIndex}-${i}`, midi, bank: bankIndex, shortcut: bank.shortcuts[i] })));
  const nyungaKeys = [74,81,72,79,70,77,62,82,58,77,65,79,67,81,69].map((midi, i) => ({ id: `nyunga-${i + 1}`, midi, shortcut: 'qwertyuiopasdfg'[i], number: i + 1 }));
  // Keep the live key mapping separate from stored events, which retain their pitches.
  function keyPitch(key, tuning = 'original', transpose = 0, root = 'f') {
    if (key.id.startsWith('nyunga-')) return key.midi + (tuningRoots.find(item => item.id === root)?.offset || 0) + transpose;
    return pitch(key.midi, tuning, transpose, root);
  }
  // Root offsets are relative to the prototype's F layout, within one octave.
  const tuningRoots = [
    { id: 'bb', name: 'B♭', offset: 5 },
    { id: 'c', name: 'C', offset: -5 }, { id: 'db', name: 'D♭', offset: -4 },
    { id: 'd', name: 'D', offset: -3 }, { id: 'eb', name: 'E♭', offset: -2 },
    { id: 'e', name: 'E', offset: -1 }, { id: 'f', name: 'F', offset: 0 },
    { id: 'gb', name: 'G♭', offset: 1 }, { id: 'g', name: 'G', offset: 2 },
    { id: 'ab', name: 'A♭', offset: 3 }, { id: 'a', name: 'A', offset: 4 },
    { id: 'b', name: 'B', offset: 6 }
  ];
  function pitch(midi, tuning = 'original', transpose = 0, root = 'f') {
    const degree = (midi - 53 + 120) % 12;
    const offset = tuningRoots.find(item => item.id === root)?.offset || 0;
    return midi + (tuning === 'major' && degree === 10 ? 1 : tuning === 'minor' && (degree === 4 || degree === 9) ? -1 : 0) + transpose + offset;
  }
  const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
  const noteName = midi => ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'][((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
  function validSession(value) {
    if (!value || !Number.isFinite(value.duration) || value.duration < .1 || value.duration > 120) return false;
    const validEvents = events => Array.isArray(events) && events.length > 0 && events.length <= 10000 && events.every((e, i) => e && [...keys, ...nyungaKeys].some(k => k.id === e.id) && Number.isFinite(e.at) && e.at >= 0 && e.at < value.duration && (i === 0 || e.at >= events[i - 1].at) && Number.isInteger(e.midi) && e.midi >= 20 && e.midi <= 100);
    if (value.version === 1) return validEvents(value.events);
    if (value.version !== 2 || !Array.isArray(value.tracks) || !value.tracks.length || value.tracks.length > 8) return false;
    return new Set(value.tracks.map(t => t?.id)).size === value.tracks.length && value.tracks.every(t =>
      t && typeof t.id === 'string' && t.id.length > 0 && t.id.length <= 80 && typeof t.name === 'string' && t.name.length <= 40 && typeof t.muted === 'boolean' && Number.isFinite(t.level) && t.level >= 0 && t.level <= 1 && validEvents(t.events) &&
      t.sound && ['reference', 'nyunga', 'synth'].includes(t.sound.voice) && Number.isFinite(t.sound.buzz) && t.sound.buzz >= 0 && t.sound.buzz <= 1 && Number.isFinite(t.sound.sustain) && t.sound.sustain >= .4 && t.sound.sustain <= 3.5
    ) && value.tracks.reduce((sum, t) => sum + t.events.length, 0) <= 10000;
  }
  function restoreSession(value) {
    if (!validSession(value)) return null;
    if (value.version === 2) return value;
    return { version: 2, duration: value.duration, tracks: [{ id: 'imported-loop', name: 'Loop 1', muted: false, level: 1, sound: { voice: 'reference', buzz: .25, sustain: 1.8 }, events: value.events }] };
  }
  function mixSession(session, repetitions = 1) {
    if (!validSession(session) || !Number.isInteger(repetitions) || repetitions < 1 || repetitions > 8 || session.duration * repetitions > 120) throw new Error('Invalid loop mix');
    const normalized = restoreSession(session), events = [];
    for (let cycle = 0; cycle < repetitions; cycle++) {
      normalized.tracks.filter(t => !t.muted && t.level > 0).forEach(track => {
        track.events.forEach(event => events.push({ ...event, at: event.at + cycle * session.duration, trackId: track.id, sound: { ...track.sound, level: track.level } }));
      });
    }
    return { duration: session.duration * repetitions, events: events.sort((a, b) => a.at - b.at) };
  }
  function encodeWav(buffer) {
    const samples = buffer.getChannelData(0), data = new ArrayBuffer(44 + samples.length * 2), view = new DataView(data);
    const text = (offset, value) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
    text(0, 'RIFF'); view.setUint32(4, data.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, samples.length * 2, true);
    samples.forEach((sample, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * (sample < 0 ? 32768 : 32767), true));
    return data;
  }
  const api = { banks, keys, nyungaKeys, tuningRoots, pitch, keyPitch, frequency, noteName, validSession, restoreSession, mixSession, encodeWav };
  if (typeof module !== 'undefined') module.exports = api;
  root.MbiraMusic = api;
})(globalThis);
