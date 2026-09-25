'use strict';
const $ = id => document.getElementById(id);
const audio = new MbiraAudio();
const settings = { volume: .65, buzz: 1, sustain: 1, voice: 'reference' };
let tuning = 'original', tuningRoot = 'bb', transpose = 0, recording = false, recordStart = 0, session = null, looping = false, playback = null, generation = 0;
const buttons = new Map(), pads = new Map(), animations = new Map(), held = new Set();
let instrumentType = 'dzavadzimu';
const instrumentVoices = { dzavadzimu: 'reference', nyunga: 'nyunga' };
const STORAGE = 'mbira-session-v2';
const LEGACY_STORAGE = 'mbira-session-v1';
let draft = null, exporting = false;
const TUNING_STORAGE = 'mbira-tuning-v1';
MbiraMusic.tuningRoots.forEach(root => {
  const option = document.createElement('option'); option.value = root.id; option.textContent = root.id === 'bb' ? 'B♭ · B flat' : root.name;
  $('tuning-root').append(option);
});
try {
  const saved = JSON.parse(localStorage.getItem(TUNING_STORAGE));
  if (saved && MbiraMusic.tuningRoots.some(root => root.id === saved.root) && ['original', 'major', 'minor'].includes(saved.scale) && Number.isInteger(saved.transpose) && saved.transpose >= -12 && saved.transpose <= 12) {
    tuningRoot = saved.root; tuning = saved.scale; transpose = saved.transpose;
  }
} catch { /* Tuning remains usable when storage is unavailable. */ }
$('tuning-root').value = tuningRoot; $('tuning').value = tuning; $('transpose').value = transpose;
let nyungaRoot = 'f', nyungaTranspose = 0;
try { const saved = JSON.parse(localStorage.getItem('mbira-nyunga-tuning-v1')); if (saved && MbiraMusic.tuningRoots.some(r => r.id === saved.root) && Number.isInteger(saved.transpose) && Math.abs(saved.transpose) <= 12) { nyungaRoot = saved.root; nyungaTranspose = saved.transpose; } } catch {}
const currentPitch = key => key.id.startsWith('nyunga-') ? MbiraMusic.keyPitch(key, 'original', nyungaTranspose, nyungaRoot) : MbiraMusic.keyPitch(key, tuning, transpose, tuningRoot);
const timestamp = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
MbiraMusic.keys.forEach(key => {
  const button = document.createElement('button');
  button.className = 'tine' + (key.bank === 1 ? ' lower' : ''); button.dataset.id = key.id;
  const index = Number(key.id.split('-')[1]);
  // From the center outward, the upper bank is Q, W, E, R, T, Y, U.
  // Geometry is independent of pitch so moving W beside Q never swaps sounds.
  const position = index;
  const left = key.bank === 0 ? 3 + (6 - position) * 6.8 : key.bank === 1 ? 6.4 + (6 - position) * 6.8 : 53 + position * 4.5;
  // Cantilever frequency is approximately proportional to inverse length squared.
  const base = [{ midi: 53, length: 58 }, { midi: 41, length: 87 }, { midi: 57, length: 65 }][key.bank];
  const layoutMidi = key.bank === 0 ? [53, 58, 60, 62, 63, 65, 67][index] : key.midi;
  const length = base.length * 1.1 * 2 ** (-(layoutMidi - base.midi) / 24);
  button.style.setProperty('--left', `${left}%`); button.style.setProperty('--width', key.bank === 2 ? '3.9%' : '4.2%'); button.style.setProperty('--length', `${length}%`);
  button.innerHTML = `<span class="tine-label"><span class="note-name"></span><kbd>${key.shortcut.toUpperCase()}</kbd></span>`;
  button.addEventListener('pointerdown', event => { event.preventDefault(); strike(key); });
  // Keyboard and assistive-technology activation produce a click without pointerdown.
  button.addEventListener('click', event => { if (event.detail === 0) strike(key); });
  $('key-banks').append(button); buttons.set(key.id, button);
});
MbiraMusic.banks.forEach((bank, index) => {
  const group = document.createElement('div'); group.className = 'pad-group';
  const title = document.createElement('p'); title.textContent = bank.name; group.append(title);
  MbiraMusic.keys.filter(key => key.bank === index).forEach(key => {
    const pad = document.createElement('button'); pad.className = 'touch-pad'; pad.addEventListener('pointerdown', event => { event.preventDefault(); strike(key); });
    pad.addEventListener('click', event => { if (event.detail === 0) strike(key); }); group.append(pad); pads.set(key.id, pad);
  });
  $('touch-pads').append(group);
});
function updateNotes() {
  MbiraMusic.nyungaKeys.forEach(key => {
    const button = buttons.get(key.id); if (!button) return;
    const name = MbiraMusic.noteName(currentPitch(key));
    button.querySelector('.note-name').textContent = name;
    button.setAttribute('aria-label', `Nyunga Nyunga key ${key.number}, ${name}, keyboard ${key.shortcut}`);
    pads.get(key.id).textContent = `${key.number} · ${name} · ${key.shortcut.toUpperCase()}`;
    pads.get(key.id).setAttribute('aria-label', button.getAttribute('aria-label'));
  });
  const root = MbiraMusic.tuningRoots.find(root => root.id === tuningRoot);
  $('tuning-note').textContent = `${root.name} ${tuning === 'original' ? 'mixolydian' : tuning === 'minor' ? 'natural minor' : 'major'} · equal temperament. Traditional instruments may use different intervals. Saved loops keep their recorded pitches.`;
  $('transpose-value').value = `${transpose > 0 ? '+' : ''}${transpose} semitones`;
  if (instrumentType === 'nyunga') { $('tuning-note').textContent = `${MbiraMusic.tuningRoots.find(r => r.id === nyungaRoot).name} tuning · your supplied F-major layout, transposed with its exact intervals. Saved loops keep their pitches.`; $('transpose-value').value = `${nyungaTranspose} semitones`; }
  // Tuning changes sound and note labels, never the established key geometry.
  MbiraMusic.keys.forEach(key => { const name = MbiraMusic.noteName(currentPitch(key)), button = buttons.get(key.id); button.querySelector('.note-name').textContent = name; button.setAttribute('aria-label', `${MbiraMusic.banks[key.bank].name}, ${name}, keyboard ${key.shortcut}`); pads.get(key.id).textContent = name; pads.get(key.id).setAttribute('aria-label', button.getAttribute('aria-label')); });
}
function flash(id, midi) {
  const button = buttons.get(id); clearTimeout(animations.get(id)); button.classList.remove('active'); void button.offsetWidth; button.classList.add('active');
  pads.get(id).classList.add('active');
  animations.set(id, setTimeout(() => { button.classList.remove('active'); pads.get(id).classList.remove('active'); animations.delete(id); }, 320));
  $('last-note').textContent = `${MbiraMusic.noteName(midi)} · ${Math.round(MbiraMusic.frequency(midi))} Hz`;
}
async function ready() {
  try { await audio.start(); audio.output.gain.value = settings.volume; $('audio-status').textContent = '● Sound is ready'; return true; }
  catch (error) { $('audio-status').textContent = 'Sound unavailable — try a current browser'; $('session-status').textContent = error.message; return false; }
}
async function strike(key) {
  const token = generation;
  if (!await ready() || token !== generation) return;
  const midi = currentPitch(key); audio.play(midi, settings); flash(key.id, midi);
  if (recording) {
    const elapsed = audio.context.currentTime - recordStart;
    const at = session ? elapsed % session.duration : elapsed;
    const noteCount = (session?.tracks.reduce((sum, t) => sum + t.events.length, 0) || 0) + draft.events.length;
    if (elapsed >= 0 && elapsed < 120 && noteCount < 10000) draft.events.push({ id: key.id, midi, at });
    else if (elapsed >= 120 || noteCount >= 10000) finishRecording();
  }
}
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { silence(); return; }
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName) || event.target.isContentEditable) return;
  const key = (instrumentType === 'nyunga' ? MbiraMusic.nyungaKeys : MbiraMusic.keys).find(key => key.shortcut === event.key.toLowerCase());
  if (!key || held.has(event.code)) return;
  event.preventDefault(); held.add(event.code); strike(key);
});
document.addEventListener('keyup', event => held.delete(event.code));
window.addEventListener('blur', () => held.clear());
function saveTuning() {
  updateNotes();
  if (instrumentType === 'nyunga') { try { localStorage.setItem('mbira-nyunga-tuning-v1', JSON.stringify({ root: nyungaRoot, transpose: nyungaTranspose })); } catch {} return; }
  try { localStorage.setItem(TUNING_STORAGE, JSON.stringify({ root: tuningRoot, scale: tuning, transpose })); } catch { /* Optional preference storage. */ }
}
$('tuning-root').addEventListener('change', e => { if (instrumentType === 'nyunga') nyungaRoot = e.target.value; else tuningRoot = e.target.value; saveTuning(); });
$('tuning').addEventListener('change', e => { tuning = e.target.value; saveTuning(); });
$('voice').addEventListener('change', e => { settings.voice = e.target.value; instrumentVoices[instrumentType] = settings.voice; });
$('transpose').addEventListener('input', e => { if (instrumentType === 'nyunga') nyungaTranspose = Number(e.target.value); else transpose = Number(e.target.value); saveTuning(); });
['volume', 'buzz', 'sustain'].forEach(name => $(name).addEventListener('input', event => {
  settings[name] = Number(event.target.value) / (name === 'sustain' ? 1 : 100);
  $(name + '-value').value = name === 'sustain' ? `${settings[name].toFixed(1)} s` : `${event.target.value}%`;
  if (name === 'volume' && audio.output) audio.output.gain.setTargetAtTime(settings.volume, audio.context.currentTime, .02);
}));
$('labels').addEventListener('click', () => { const on = $('labels').getAttribute('aria-pressed') !== 'true'; $('labels').setAttribute('aria-pressed', on); $('labels').textContent = `Key labels ${on ? 'on' : 'off'}`; $('soundboard').classList.toggle('hide-labels', !on); });
$('gourd').addEventListener('click', () => { const on = $('gourd').getAttribute('aria-pressed') !== 'true'; $('gourd').setAttribute('aria-pressed', on); $('gourd').textContent = `Gourd ${on ? 'on' : 'off'}`; $('instrument-stage').classList.toggle('with-gourd', on); });
function playbackData() {
  return { duration: session.duration, events: session.tracks.flatMap(track => track.events.map(e => ({ ...e, trackId: track.id }))).sort((a, b) => a.at - b.at) };
}
function renderTracks() {
  $('tracks').replaceChildren();
  (session?.tracks || []).forEach((track, index) => {
    const row = document.createElement('div'); row.className = 'track-row' + (track.muted ? ' muted' : '');
    const number = document.createElement('span'); number.className = 'track-number'; number.textContent = String(index + 1).padStart(2, '0');
    const name = document.createElement('input'); name.type = 'text'; name.value = track.name; name.maxLength = 40;
    name.className = 'track-name'; name.setAttribute('aria-label', `Name of loop ${index + 1}`); name.disabled = recording;
    name.addEventListener('change', () => { track.name = name.value.trim() || `Loop ${index + 1}`; name.value = track.name; save(); });
    const detail = document.createElement('span'); detail.className = 'track-detail'; detail.textContent = `${track.events.length} notes · ${track.sound.voice === 'nyunga' ? 'Nyunga video voice' : track.sound.voice === 'reference' ? 'Video voice' : 'Synth voice'}`;
    const mute = document.createElement('button'); mute.className = 'secondary'; mute.textContent = track.muted ? 'Unmute' : 'Mute';
    mute.setAttribute('aria-label', `${track.muted ? 'Unmute' : 'Mute'} loop ${index + 1}`); mute.setAttribute('aria-pressed', track.muted); mute.disabled = recording;
    mute.addEventListener('click', () => { track.muted = !track.muted; save(); refresh(); });
    const level = document.createElement('input'); level.type = 'range'; level.min = 0; level.max = 100; level.value = Math.round(track.level * 100);
    level.setAttribute('aria-label', `Volume of loop ${index + 1}`); level.disabled = recording;
    level.addEventListener('input', () => { track.level = Number(level.value) / 100; $('download').disabled = exporting || !session.tracks.some(t => !t.muted && t.level > 0); });
    level.addEventListener('change', save);
    const remove = document.createElement('button'); remove.className = 'text-button'; remove.textContent = 'Remove'; remove.setAttribute('aria-label', `Remove loop ${index + 1}`); remove.disabled = recording;
    remove.addEventListener('click', () => {
      stopPlayback(); session.tracks = session.tracks.filter(t => t.id !== track.id);
      if (!session.tracks.length) session = null;
      save(); refresh(); $('session-status').textContent = 'Loop removed';
      $('session-time').textContent = timestamp(session?.duration || 0);
    });
    row.append(number, name, detail, mute, level, remove); $('tracks').append(row);
  });
  if (recording && draft) {
    const row = document.createElement('div'); row.className = 'track-row recording-track';
    const marker = document.createElement('span'); marker.className = 'track-number'; marker.textContent = '●';
    const name = document.createElement('span'); name.className = 'track-name'; name.textContent = draft.name;
    const detail = document.createElement('span'); detail.className = 'track-detail'; detail.id = 'draft-note-count'; detail.textContent = `${draft.events.length} notes · recording`;
    row.append(marker, name, detail); $('tracks').append(row);
  }
}
function refresh() {
  const hasNotes = !!session?.tracks.length;
  const audible = hasNotes && session.tracks.some(t => !t.muted && t.level > 0);
  $('record').innerHTML = recording ? '<span>■</span> Finish' : hasNotes ? '<span>＋</span> Add loop' : '<span>●</span> Record';
  $('record').classList.toggle('recording', recording); $('record').setAttribute('aria-pressed', recording);
  $('record').disabled = !recording && (session?.tracks.length >= 8 || (session?.tracks.reduce((sum, t) => sum + t.events.length, 0) || 0) >= 10000);
  $('play').disabled = !hasNotes || recording; $('download').disabled = !audible || recording || exporting; $('clear').disabled = !hasNotes || recording;
  $('loop').disabled = recording; $('export-cycles').disabled = recording || exporting;
  $('play').textContent = playback?.kind === 'session' ? '■ Stop' : '▶ Play';
  $('demo').textContent = playback?.kind === 'demo' ? '■ Stop example' : '▷ Hear an example'; $('demo').disabled = recording;
  ['voice', 'buzz', 'sustain'].forEach(id => $(id).disabled = recording);
  $('loop-help').textContent = recording ? (session ? 'Recording now. Play over your existing loops, then press Finish to save this layer. Notes from additional passes join the same loop.' : 'Your first phrase sets the length for every layer. Press Finish when it is ready.') : hasNotes ? `${session.tracks.length} / 8 layers · ${session.duration.toFixed(1)} seconds per loop. Add loop records immediately; press Finish when you are done.` : 'Record your first phrase to set the loop length. Then add up to 8 layers.';
  for (const option of $('export-cycles').options) option.disabled = !!session && session.duration * Number(option.value) > 120;
  if ($('export-cycles').selectedOptions[0].disabled) $('export-cycles').value = '1';
  renderTracks();
}
function save() {
  try {
    if (session?.tracks.length) localStorage.setItem(STORAGE, JSON.stringify(session)); else localStorage.removeItem(STORAGE);
    localStorage.removeItem(LEGACY_STORAGE);
  } catch { $('session-status').textContent = 'Device storage unavailable · export to keep your mix'; }
}
function startTransport(data, kind, start = audio.context.currentTime + .08) {
  playback = { data, kind, start, cursor: 0, cycle: 0, visual: [] };
}
function finishRecording() {
  if (!recording) return;
  const wasLayer = !!session, take = draft;
  const duration = session?.duration || Math.min(120, Math.max(.1, audio.context.currentTime - recordStart));
  recording = false; draft = null;
  if (!wasLayer) stopPlayback();
  if (take.events.length) {
    if (!session) session = { version: 2, duration, tracks: [] };
    session.tracks.push({ ...take, events: take.events.filter(e => e.at < duration).sort((a, b) => a.at - b.at) });
    $('session-status').textContent = `${session.tracks.length} layers · saved on device`;
    if (wasLayer) {
      looping = true; updateLoopButton();
      // Keep the backing loop's clock and ringing notes uninterrupted. The new
      // layer joins at the next unscheduled boundary, never in the middle of a bar.
      if (playback?.kind === 'session') playback.pendingData = playbackData();
      else startTransport(playbackData(), 'session');
      $('session-status').textContent = 'Layer saved · joins the next loop';
    }
  } else $('session-status').textContent = 'No notes added · existing loops kept';
  $('session-time').textContent = timestamp(session?.duration || 0); save(); refresh();
}
function stopPlayback() {
  generation++; playback = null; audio.stop(); $('loop-progress').value = 0; refresh();
}
function silence() { finishRecording(); stopPlayback(); $('session-status').textContent = 'Stopped'; }
$('stop').addEventListener('click', silence);
$('record').addEventListener('click', async () => {
  if (recording) { finishRecording(); return; }
  if (session?.tracks.length >= 8) return;
  stopPlayback(); const token = generation;
  if (!await ready() || token !== generation || recording) return;
  draft = { id: `loop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: `Loop ${(session?.tracks.length || 0) + 1}`, muted: false, level: 1, sound: { voice: settings.voice, buzz: settings.buzz, sustain: settings.sustain }, events: [] };
  recording = true;
  recordStart = audio.context.currentTime;
  if (session) {
    looping = true; updateLoopButton(); startTransport(playbackData(), 'session', recordStart);
    $('session-status').textContent = 'Recording new layer · play now';
  } else {
    $('session-status').textContent = 'Recording first loop · up to 2 minutes';
  }
  refresh();
});
async function beginPlayback(data, kind) {
  stopPlayback(); const token = generation;
  if (!await ready() || token !== generation) return;
  startTransport(data, kind);
  $('session-status').textContent = kind === 'demo' ? 'An original exploration phrase' : 'Playing your mix'; refresh();
}
$('play').addEventListener('click', () => { if (playback?.kind === 'session') silence(); else if (session) beginPlayback(playbackData(), 'session'); });
function updateLoopButton() { $('loop').setAttribute('aria-pressed', looping); $('loop').textContent = `↻ Loop ${looping ? 'on' : 'off'}`; }
$('loop').addEventListener('click', () => { looping = !looping; updateLoopButton(); });
$('demo').addEventListener('click', () => {
  if (playback?.kind === 'demo') { silence(); return; }
  if (instrumentType === 'nyunga') { beginPlayback({ duration: 6.4, events: [8,10,4,5,6,0,2,7,8,14,12,9,10,3,4,1].map((index, i) => ({ id: MbiraMusic.nyungaKeys[index].id, midi: currentPitch(MbiraMusic.nyungaKeys[index]), at: i * .4 })) }, 'demo'); return; }
  const ids = ['1-0','0-1','2-1','1-3','0-3','2-3','1-4','0-5','1-0','2-4','0-1','1-3','2-5','0-3','1-4','0-5'];
  beginPlayback({ duration: 6.4, events: ids.map((id, i) => ({ id, midi: currentPitch(MbiraMusic.keys.find(k => k.id === id)), at: i * .4 })) }, 'demo');
});
$('clear').addEventListener('click', () => { stopPlayback(); session = null; save(); $('session-time').textContent = '00:00'; $('session-status').textContent = 'Ready when you are'; refresh(); });
$('download').addEventListener('click', async () => {
  if (!session || exporting) return;
  const mix = MbiraMusic.mixSession(session, Number($('export-cycles').value));
  if (!mix.events.length) return;
  exporting = true; refresh(); $('download').textContent = 'Rendering…';
  try {
    const blob = await audio.wav(mix, { ...settings }), url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'mbira-mix.wav'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch { $('session-status').textContent = 'Export failed. Try fewer loop repetitions.'; }
  finally { exporting = false; $('download').textContent = 'Export mix WAV ↓'; refresh(); }
});
// All recording timestamps and loop boundaries use the same audio clock.
setInterval(() => {
  if (recording) {
    const elapsed = audio.context.currentTime - recordStart;
    $('session-time').textContent = timestamp(elapsed);
    $('session-status').textContent = session ? 'Recording new layer · press Finish to save' : 'Recording first loop';
    if ($('draft-note-count')) $('draft-note-count').textContent = `${draft.events.length} notes · recording`;
    const length = session?.duration || 120;
    $('loop-progress').value = session ? (elapsed % length) / length : Math.min(1, elapsed / length);
    if (elapsed >= 120) finishRecording();
  }
  const p = playback; if (!p) return;
  const now = audio.context.currentTime;
  // Schedule across a loop boundary in the same tick, including very short loops.
  for (let pass = 0; pass < 3; pass++) {
    while (p.cursor < p.data.events.length && p.start + p.data.events[p.cursor].at < now + .08) {
      const event = p.data.events[p.cursor++], time = p.start + event.at;
      const track = event.trackId ? session?.tracks.find(t => t.id === event.trackId) : null;
      if (event.trackId && (!track || track.muted || track.level === 0)) continue;
      if (time >= now - .1) {
        audio.play(event.midi, track ? { ...settings, ...track.sound, level: track.level } : settings, Math.max(now, time));
        p.visual.push({ ...event, time });
      }
    }
    const end = p.start + p.data.duration;
    if (looping && p.kind === 'session' && end <= now + .08 && p.cursor === p.data.events.length) {
      p.start = end; p.cursor = 0; p.cycle++;
      if (p.pendingData) { p.data = p.pendingData; p.pendingData = null; if (!recording) $('session-status').textContent = 'Playing all layers'; }
    }
    else break;
  }
  while (p.visual.length && p.visual[0].time <= now) { const e = p.visual.shift(); flash(e.id, e.midi); }
  if (!recording) {
    const elapsed = Math.max(0, Math.min(p.data.duration, now - p.start));
    $('session-time').textContent = timestamp(elapsed); $('loop-progress').value = elapsed / p.data.duration;
  }
  if (!(looping && p.kind === 'session') && now >= p.start + p.data.duration) {
    playback = null; $('session-status').textContent = 'Playback finished'; $('loop-progress').value = 1; refresh();
  }
}, 25);

document.addEventListener('visibilitychange', () => { if (document.hidden) { held.clear(); if (recording || playback) silence(); } });
window.addEventListener('pagehide', () => { if (recording) silence(); });
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE) || localStorage.getItem(LEGACY_STORAGE));
  session = MbiraMusic.restoreSession(saved);
  if (session) { $('session-time').textContent = timestamp(session.duration); $('session-status').textContent = `${session.tracks.length} layers · restored session`; }
} catch { /* Storage can be disabled without preventing play. */ }
updateNotes(); refresh();

const nyungaPads = document.createElement('div'); nyungaPads.className = 'pad-group'; nyungaPads.hidden = true;
$('touch-pads').append(nyungaPads);
MbiraMusic.nyungaKeys.forEach((definition, index) => {
  const key = document.createElement('button');
  key.className = 'tine nyunga-key'; key.dataset.number = index + 1; key.dataset.id = definition.id;
  key.style.setProperty('--left', `${2 + index * 6.35}%`); key.style.setProperty('--width', '5.5%');
  key.style.setProperty('--length', `${(index % 2 === 0 ? 91 : 66) - Math.abs(index - 7) * 2.4}%`);
  key.innerHTML = `<span class="key-number">${index + 1}</span><span class="tine-label"><span class="note-name"></span><kbd>${definition.shortcut.toUpperCase()}</kbd></span>`;
  const pad = document.createElement('button'); pad.className = 'touch-pad';
  for (const control of [key, pad]) {
    control.addEventListener('pointerdown', event => { event.preventDefault(); strike(definition); });
    control.addEventListener('click', event => { if (event.detail === 0) strike(definition); });
  }
  $('key-banks').append(key); nyungaPads.append(pad); buttons.set(definition.id, key); pads.set(definition.id, pad);
});
updateNotes();
$('instrument-type').addEventListener('change', event => {
  silence();
  instrumentType = event.target.value;
  settings.voice = instrumentVoices[instrumentType];
  $('voice').value = settings.voice;
  const nyunga = instrumentType === 'nyunga';
  $('instrument-stage').classList.toggle('nyunga', nyunga);
  $('mapping-help').hidden = !nyunga;
  $('labels').hidden = false;
  document.querySelector('.instrument-footer > span:first-child').textContent = nyunga ? 'Keys 1–15: Q W E R T Y U I O P A S D F G' : 'Use your keyboard or tap the keys';
  document.querySelectorAll('.pad-group').forEach(group => { group.hidden = nyunga ? group !== nyungaPads : group === nyungaPads; });
  document.querySelector('.wood-engraving').innerHTML = nyunga ? 'NYUNGA NYUNGA <span>15 KEYS</span>' : 'MBIRA <span>24 KEYS · ENDLESS POSSIBILITIES</span>';
  $('tuning').disabled = nyunga;
  $('tuning').value = nyunga ? 'major' : tuning;
  $('tuning-root').value = nyunga ? nyungaRoot : tuningRoot;
  $('transpose').value = nyunga ? nyungaTranspose : transpose;
  updateNotes();
  $('last-note').textContent = nyunga ? 'Your Nyunga Nyunga is ready' : 'Your next note is waiting';
  refresh();
});
