// Approximate French reading effort, normalized to the chosen slide duration.
export const tokenizeSpeech = (text = '') => text.trim().split(/\s+/u).filter(Boolean);

export function wordEffort(word) {
  const clean = word.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]/gi, '');
  const vowels = clean.match(/[aeiouy]+/gi)?.length || 1;
  const spelling = /^[A-Z]{2,}$/.test(clean);
  const numeric = /\d/.test(clean);
  return Math.max(.65, Math.min(4.5, spelling ? clean.length * .65
    : numeric ? 1 + clean.length * .4 : .5 + vowels * .48));
}

export function createSpeechTimeline(narration, transition, duration) {
  const tokens = [...narration, ...transition];
  if (!tokens.length || !Number.isFinite(duration) || duration <= 0) return [];
  const weights = tokens.map((word, index) => {
    const ending = word.replace(/[»”"')\]]+$/u, '');
    const pause = /[.!?…]$/u.test(ending) ? 1.5 : /[;:]$/u.test(ending) ? 1 : /,$/u.test(ending) ? .65 : 0;
    // Give the speaker room to breathe before the transition and after the last word.
    const boundary = transition.length && index === narration.length - 1 ? 1.6 : 0;
    return wordEffort(word) + pause + boundary + (index === tokens.length - 1 ? 1.2 : 0);
  });
  const leadIn = Math.min(.65, duration * .04);
  const scale = (duration - leadIn) / weights.reduce((total, weight) => total + weight, 0);
  let time = leadIn;
  return tokens.map((word, index) => {
    const start = time;
    time += weights[index] * scale;
    return { word, start, end: index === tokens.length - 1 ? duration : time };
  });
}

export function cueAtTime(cues, seconds) {
  if (!cues.length) return -1;
  let low = 0;
  let high = cues.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (seconds >= cues[middle].end) low = middle + 1;
    else high = middle;
  }
  return low;
}
