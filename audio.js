'use strict';
class MbiraAudio {
  static referenceBuffers = new WeakMap();
  constructor() { this.context = null; this.voices = new Set(); }
  async start() {
    if (!this.context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Web Audio is unavailable in this browser.');
      this.context = new Audio();
      this.output = MbiraAudio.output(this.context, this.context.destination);
    }
    await this.context.resume();
  }
  static output(context, destination) {
    const gain = context.createGain(), compressor = context.createDynamicsCompressor(), limiter = context.createWaveShaper();
    gain.gain.value = 0.65; compressor.threshold.value = -14; compressor.ratio.value = 6;
    // A compressor alone can let overlapping attack transients exceed full scale.
    // Leave normal signals untouched and gently bound peaks in live and offline mixes.
    limiter.curve = Float32Array.from({ length: 4097 }, (_, i) => {
      const value = i / 2048 - 1, magnitude = Math.abs(value);
      return magnitude <= .85 ? value : Math.sign(value) * (.85 + .12 * Math.tanh((magnitude - .85) / .12));
    });
    gain.connect(compressor); compressor.connect(limiter); limiter.connect(destination); return gain;
  }
  static voice(context, destination, midi, time, settings) {
    if (settings.level !== undefined) {
      const gain = context.createGain();
      gain.gain.value = settings.level;
      gain.connect(destination);
      const nodes = MbiraAudio.voice(context, gain, midi, time, { ...settings, level: undefined });
      nodes[0].addEventListener('ended', () => gain.disconnect());
      return nodes;
    }
    if (settings.voice === 'reference' && globalThis.MbiraReference) {
      return MbiraAudio.referenceVoice(context, destination, midi, time, settings);
    }
    return MbiraAudio.synthVoice(context, destination, midi, time, settings);
  }
  static referenceBank(context) {
    if (!MbiraAudio.referenceBuffers.has(context)) {
      const decode = encoded => {
        const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
        const view = new DataView(bytes.buffer);
        const buffer = context.createBuffer(1, bytes.length / 2, MbiraReference.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = view.getInt16(i * 2, true) / 32768;
        return buffer;
      };
      MbiraAudio.referenceBuffers.set(context, MbiraReference.samples.map(sample => ({
        rootHz: sample.rootHz,
        tone: decode(sample.pcm),
        attack: decode(sample.attack)
      })));
    }
    return MbiraAudio.referenceBuffers.get(context);
  }
  static referenceVoice(context, destination, midi, time, settings) {
    const frequency = MbiraMusic.frequency(midi);
    const bank = MbiraAudio.referenceBank(context);
    const sample = bank.reduce((closest, candidate) =>
      Math.abs(Math.log2(frequency / candidate.rootHz)) < Math.abs(Math.log2(frequency / closest.rootHz)) ? candidate : closest
    );
    const rate = frequency / sample.rootHz;
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = sample.tone;
    source.playbackRate.value = rate;
    gain.gain.setValueAtTime(1, time);
    gain.gain.setValueAtTime(1, time + settings.sustain * .65);
    gain.gain.exponentialRampToValueAtTime(.0001, time + settings.sustain);
    source.connect(gain); gain.connect(destination);
    source.start(time); source.stop(time + settings.sustain + .03);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    const nodes = [source];
    if (settings.buzz > 0) {
      const contact = context.createBufferSource(), amount = context.createGain();
      contact.buffer = sample.attack;
      contact.playbackRate.value = Math.sqrt(rate);
      amount.gain.value = settings.buzz * .6;
      contact.connect(amount); amount.connect(destination); contact.start(time);
      contact.onended = () => { contact.disconnect(); amount.disconnect(); };
      nodes.push(contact);
    }
    return nodes;
  }
  static synthVoice(context, destination, midi, time, settings) {
    const nodes = [], fundamental = MbiraMusic.frequency(midi);
    [[1, .48, 1], [2, .2, .55], [2.76, .075, .24], [5.4, .025, .1]].forEach(([ratio, level, decay]) => {
      const osc = context.createOscillator(), gain = context.createGain();
      osc.frequency.value = fundamental * ratio;
      gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(level, time + .006); gain.gain.exponentialRampToValueAtTime(.0001, time + settings.sustain * decay);
      osc.connect(gain); gain.connect(destination); osc.start(time); osc.stop(time + settings.sustain * decay + .03); nodes.push(osc);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
    if (settings.buzz > 0) {
      const length = Math.ceil(context.sampleRate * .24), buffer = context.createBuffer(1, length, context.sampleRate), data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (context.sampleRate * .045));
      const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
      source.buffer = buffer; filter.type = 'highpass'; filter.frequency.value = 1800; gain.gain.value = settings.buzz * .18;
      source.connect(filter); filter.connect(gain); gain.connect(destination); source.start(time); nodes.push(source);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    }
    return nodes;
  }
  play(midi, settings, time = this.context.currentTime) {
    if (this.voices.size >= 32) { const oldest = this.voices.values().next().value; oldest.forEach(n => { try { n.stop(); } catch {} }); this.voices.delete(oldest); }
    const nodes = MbiraAudio.voice(this.context, this.output, midi, time, settings); this.voices.add(nodes);
    nodes[0].addEventListener('ended', () => this.voices.delete(nodes));
  }
  stop() { this.voices.forEach(nodes => nodes.forEach(node => { try { node.stop(); } catch {} })); this.voices.clear(); }
  async wav(session, settings) {
    const tail = session.events.reduce((max, event) => Math.max(max, event.sound?.sustain || settings.sustain), .4);
    const sampleRate = 44100, context = new OfflineAudioContext(1, Math.ceil((session.duration + tail + .1) * sampleRate), sampleRate);
    const output = MbiraAudio.output(context, context.destination); output.gain.value = settings.volume;
    session.events.forEach(e => MbiraAudio.voice(context, output, e.midi, e.at, { ...settings, ...e.sound }));
    return new Blob([MbiraMusic.encodeWav(await context.startRendering())], { type: 'audio/wav' });
  }
}
