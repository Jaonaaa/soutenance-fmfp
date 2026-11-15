import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeSpeech, wordEffort, createSpeechTimeline, cueAtTime } from '../../src/speech-timing.mjs';

test('French punctuation, accents and numbers remain readable tokens', () => {
  assert.deepEqual(tokenizeSpeech('  L’évaluateur vérifie 5 à 8 %.\nEnsuite… '), ['L’évaluateur', 'vérifie', '5', 'à', '8', '%.', 'Ensuite…']);
  assert.ok(wordEffort('évaluation') > wordEffort('le'));
  assert.ok(wordEffort('FMFP') > wordEffort('le'));
});
test('timeline preserves target duration with positive, contiguous cues', () => {
  const cues = createSpeechTimeline(['Un', 'dossier,', 'deux', 'utilisateurs.'], ['Passons', 'à', 'la', 'suite.'], 55);
  assert.ok(cues[0].start > 0);
  assert.equal(cues.at(-1).end, 55);
  cues.forEach((cue, index) => {
    assert.ok(cue.end > cue.start);
    if (index) assert.equal(cue.start, cues[index - 1].end);
  });
});
test('punctuation and transition add breathing time', () => {
  const cues = createSpeechTimeline(['cas', 'cas,', 'cas.'], ['cas'], 20);
  const lengths = cues.map(cue => cue.end - cue.start);
  assert.ok(lengths[1] > lengths[0]);
  assert.ok(lengths[2] > lengths[1]);
});
test('seeking chooses the right cue at boundaries and ends', () => {
  const cues = createSpeechTimeline(['Le', 'dossier', 'est', 'complet.'], [], 10);
  assert.equal(cueAtTime(cues, 0), 0);
  cues.forEach((cue, index) => {
    assert.equal(cueAtTime(cues, cue.start), index);
    assert.equal(cueAtTime(cues, (cue.start + cue.end) / 2), index);
  });
  assert.equal(cueAtTime(cues, 10), 3);
  assert.equal(cueAtTime([], 10), -1);
});
test('empty and invalid timelines do not cause division errors', () => {
  for (const duration of [0, -1, NaN, Infinity]) assert.deepEqual(createSpeechTimeline(['test'], [], duration), []);
  assert.deepEqual(createSpeechTimeline([], [], 5), []);
  const short = createSpeechTimeline(['Très', 'court.'], [], .1);
  assert.equal(short.at(-1).end, .1);
});
