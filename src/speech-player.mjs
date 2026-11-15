import { createSpeechTimeline, cueAtTime } from './speech-timing.mjs';

export function frenchVoices(voices) {
  return voices.filter((voice) => /^fr(?:[-_]|$)/i.test(voice.lang))
    .filter((voice, index, all) => all.findIndex((other) => other.voiceURI === voice.voiceURI) === index);
}
export function preferredVoice(voices, uri) {
  return voices.find((voice) => voice.voiceURI === uri)
    || voices.find((voice) => /thomas/i.test(voice.name) && /^fr[-_]FR$/i.test(voice.lang))
    || voices.find((voice) => voice.localService && /^fr[-_]FR$/i.test(voice.lang))
    || voices.find((voice) => /^fr[-_]FR$/i.test(voice.lang)) || voices[0];
}

// Every offset refers to the exact UTF-16 string passed to the speech API.
export function speechSegments(narration, transition) {
  let wordIndex = 0;
  const segments = [];
  for (const text of [narration, transition]) {
    if (!text.trim()) continue;
    const sentences = typeof Intl.Segmenter === 'function'
      ? [...new Intl.Segmenter('fr', { granularity: 'sentence' }).segment(text)].map((part) => part.segment)
      : text.match(/[^.!?…]+(?:[.!?…]+|$)/gu) || [text];
    for (const sentence of sentences) {
      const tokens = sentence.trim().split(/\s+/u).filter(Boolean);
      // Short utterances avoid browser limits on long synthesis requests.
      for (let i = 0; i < tokens.length; i += 35) {
        const chunk = tokens.slice(i, i + 35);
        let offset = 0;
        const offsets = chunk.map((word) => { const start = offset; offset += word.length + 1; return start; });
        segments.push({ text: chunk.join(' '), words: chunk, offsets, startWord: wordIndex });
        wordIndex += chunk.length;
      }
    }
  }
  return segments;
}

export class SpeechPlayer {
  constructor(synth, Utterance, callbacks = {}) {
    this.synth = synth;
    this.Utterance = Utterance;
    this.callbacks = callbacks;
    this.generation = 0;
    this.index = 0;
    this.paused = true;
  }
  load(segments, options, index = 0) {
    this.stop();
    this.segments = segments;
    this.options = options;
    this.index = index;
  }
  stop() {
    this.generation += 1;
    clearInterval(this.fallbackTimer);
    clearTimeout(this.startTimer);
    this.utterance = null;
    this.paused = true;
    this.synth?.cancel();
  }
  pause() {
    this.paused = true;
    clearTimeout(this.startTimer);
    if (this.utterance) this.synth.pause();
  }
  play() {
    if (!this.paused) return;
    this.paused = false;
    if (this.utterance) {
      if (this.synth.speaking === false && this.synth.pending === false) {
        const index = this.index;
        this.stop();
        this.index = index;
        this.paused = false;
        this.speakNext();
      } else this.synth.resume();
      return;
    }
    this.speakNext();
  }
  seek(index) {
    const running = !this.paused;
    this.stop();
    this.index = index;
    this.callbacks.onWord?.(index);
    if (running) this.play();
  }
  speakNext() {
    if (this.paused) return;
    const segment = this.segments.find((item) => this.index < item.startWord + item.words.length);
    if (!segment) { this.paused = true; this.callbacks.onEnd?.(); return; }
    const localStart = Math.max(0, this.index - segment.startWord);
    const tokens = segment.words.slice(localStart);
    const base = segment.startWord + localStart;
    const utterance = new this.Utterance(tokens.join(' '));
    utterance.lang = this.options.voice.lang;
    utterance.voice = this.options.voice;
    utterance.rate = this.options.rate;
    this.utterance = utterance;
    const generation = this.generation;
    const valid = () => this.generation === generation && this.utterance === utterance;
    const offsets = []; let offset = 0;
    for (const word of tokens) { offsets.push(offset); offset += word.length + 1; }
    let boundarySeen = false;
    let estimateTime = 0;
    let previous = performance.now();
    const estimated = createSpeechTimeline(tokens, [], Math.max(.2, tokens.length * 60 / (125 * utterance.rate)));
    const fail = (message) => { if (!valid()) return; this.stop(); this.callbacks.onError?.(message); };
    utterance.onstart = () => {
      if (!valid()) return;
      clearTimeout(this.startTimer);
      previous = performance.now();
      this.index = base;
      this.callbacks.onWord?.(this.index);
      this.fallbackTimer = setInterval(() => {
        if (!valid()) return;
        const now = performance.now();
        if (!this.paused) estimateTime += (now - previous) / 1000;
        previous = now;
        if (!this.paused && !boundarySeen) {
          this.index = base + cueAtTime(estimated, estimateTime);
          this.callbacks.onWord?.(this.index);
        }
      }, 80);
    };
    utterance.onboundary = (event) => {
      if (!valid() || this.paused || event.name !== 'word' || !Number.isFinite(event.charIndex)) return;
      clearTimeout(this.startTimer);
      boundarySeen = true;
      let index = 0;
      while (index + 1 < offsets.length && offsets[index + 1] <= event.charIndex) index += 1;
      this.index = base + index;
      this.callbacks.onWord?.(this.index);
    };
    utterance.onend = () => {
      if (!valid()) return;
      clearInterval(this.fallbackTimer);
      clearTimeout(this.startTimer);
      this.index = segment.startWord + segment.words.length;
      this.utterance = null;
      this.speakNext();
    };
    utterance.onerror = (event) => fail(`La lecture vocale s’est interrompue (${event.error || 'erreur inconnue'}). Réessayez ou désactivez la voix.`);
    this.startTimer = setTimeout(() => fail('La voix ne démarre pas. Choisissez une autre voix ou désactivez la lecture vocale.'), 10000);
    try { this.synth.speak(utterance); } catch { fail('Cette voix ne peut pas être utilisée dans ce navigateur.'); }
  }
}
