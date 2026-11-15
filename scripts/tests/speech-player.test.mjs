import test from 'node:test';
import assert from 'node:assert/strict';
import { frenchVoices, preferredVoice, speechSegments, SpeechPlayer } from '../../src/speech-player.mjs';

class Utterance { constructor(text) { this.text = text; } }
const voice = { name: 'Thomas', lang: 'fr-FR', voiceURI: 'thomas', localService: true };
function setup(text = 'Bonjour. Voici le dossier.', transition = 'Passons à la suite.') {
  const spoken = []; const events = { words: [], ends: 0, errors: [] };
  const synth = { speak: (utterance) => spoken.push(utterance), cancel() {}, pause() {}, resume() {} };
  const player = new SpeechPlayer(synth, Utterance, {
    onWord: (index) => events.words.push(index), onEnd: () => events.ends++, onError: (error) => events.errors.push(error),
  });
  player.load(speechSegments(text, transition), { voice, rate: 1 });
  return { player, synth, spoken, events };
}
test('French voice selection uses saved preference then Thomas', () => {
  const denise = { ...voice, voiceURI: 'denise', name: 'Denise' };
  const list = frenchVoices([{ lang: 'en-US', voiceURI: 'en' }, denise, voice, voice]);
  assert.equal(list.length, 2);
  assert.equal(preferredVoice(list, '').name, 'Thomas');
  assert.equal(preferredVoice(list, 'denise').name, 'Denise');
  assert.equal(preferredVoice([], ''), undefined);
});
test('sentence chunks retain global word indices and UTF-16 offsets', () => {
  const segments = speechSegments('Évaluer 👋 ce dossier. Puis vérifier.', 'Passons à la suite.');
  assert.equal(segments[0].text, 'Évaluer 👋 ce dossier.');
  assert.deepEqual(segments[0].offsets, [0, 8, 11, 14]);
  assert.equal(segments[1].startWord, 4);
  assert.equal(segments.at(-1).startWord, 6);
  assert.ok(speechSegments(Array(90).fill('mot').join(' '), '').every((segment) => segment.words.length <= 35));
});
test('speech completion, rather than target duration, advances through the transition', () => {
  const { player, spoken, events } = setup();
  try {
    player.play();
    assert.equal(spoken[0].text, 'Bonjour.');
    spoken[0].onend();
    assert.equal(spoken[1].text, 'Voici le dossier.');
    spoken[1].onboundary({ name: 'word', charIndex: 9 });
    assert.equal(events.words.at(-1), 3);
    assert.equal(events.ends, 0);
    spoken[1].onend();
    assert.equal(spoken[2].text, 'Passons à la suite.');
    spoken[2].onend();
    assert.equal(events.ends, 1);
  } finally { player.stop(); }
});
test('seek cancels old utterances and stale callbacks cannot advance or report errors', () => {
  const { player, spoken, events } = setup();
  try {
    player.play(); const old = spoken[0];
    player.seek(2);
    assert.equal(spoken[1].text, 'le dossier.');
    old.onend(); old.onerror({ error: 'canceled' }); old.onboundary({ name: 'word', charIndex: 0 });
    assert.equal(spoken.length, 2);
    assert.equal(events.ends, 0);
    assert.equal(events.errors.length, 0);
    assert.equal(events.words.at(-1), 2);
  } finally { player.stop(); }
});
test('pause prevents the next sentence; resume continues without double reading', () => {
  const { player, spoken } = setup();
  try {
    player.play(); player.pause(); spoken[0].onend();
    assert.equal(spoken.length, 1);
    player.play(); assert.equal(spoken.length, 2);
    player.play(); assert.equal(spoken.length, 2);
  } finally { player.stop(); }
});
test('stop invalidates callbacks on slide changes; real errors stop playback', () => {
  const { player, spoken, events } = setup();
  player.play(); const old = spoken[0]; player.stop();
  old.onend(); assert.equal(events.ends, 0);
  player.play(); spoken[1].onerror({ error: 'voice-unavailable' });
  assert.equal(events.errors.length, 1);
  assert.equal(player.paused, true);
  player.stop();
});
test('without word boundaries fallback progresses within the phrase, never advances slides', async () => {
  const { player, spoken, events } = setup('Un dossier complet.', '');
  try {
    player.options.rate = 100;
    player.play(); spoken[0].onstart();
    await new Promise((resolve) => setTimeout(resolve, 210));
    assert.equal(events.words.at(-1), 2);
    assert.equal(events.ends, 0);
    spoken[0].onend(); assert.equal(events.ends, 1);
  } finally { player.stop(); }
});

test('native pause and resume retain the current utterance', () => {
  const { player, synth, spoken, events } = setup('Évaluer ce dossier.', '');
  let pauses = 0; let resumes = 0;
  synth.pause = () => pauses++;
  synth.resume = () => resumes++;
  try {
    player.play(); spoken[0].onstart();
    spoken[0].onboundary({ name: 'word', charIndex: 8 });
    player.pause(); player.play();
    assert.equal(pauses, 1); assert.equal(resumes, 1);
    assert.equal(spoken.length, 1);
    assert.equal(events.words.at(-1), 1);
  } finally { player.stop(); }
});
test('if browser loses paused speech, resume restarts at the current word', () => {
  const { player, synth, spoken } = setup('Évaluer ce dossier.', '');
  try {
    player.play(); spoken[0].onboundary({ name: 'word', charIndex: 8 }); player.pause();
    synth.speaking = false; synth.pending = false;
    player.play(); assert.equal(spoken[1].text, 'ce dossier.');
  } finally { player.stop(); }
});
