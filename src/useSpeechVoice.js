import { useEffect, useMemo, useRef, useState } from 'react';
import { frenchVoices, preferredVoice, speechSegments, SpeechPlayer } from './speech-player.mjs';

const KEY = 'soutenance-fmfp-voice-v1';
function savedSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY)) || {};
    return { enabled: saved.enabled !== false, uri: typeof saved.uri === 'string' ? saved.uri : '', rate: Number.isFinite(saved.rate) ? Math.min(1.4, Math.max(.7, saved.rate)) : 1 };
  } catch { return { enabled: true, uri: '', rate: 1 }; }
}

export function useSpeechVoice({ narration, transition, allowed, playing, setPlaying, onEnd }) {
  const supported = typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined';
  const [settings, setSettings] = useState(savedSettings);
  const [voices, setVoices] = useState([]);
  const [currentWord, setCurrentWord] = useState(0);
  const [error, setError] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const callbacks = useRef({});
  const current = useRef(0);
  const player = useRef(null);
  const selection = preferredVoice(voices, settings.uri);
  const active = supported && !!selection && settings.enabled && allowed;
  const segments = useMemo(() => speechSegments(narration, transition), [narration, transition]);
  const preview = useRef(false);
  preview.current = previewing;
  callbacks.current = {
    onWord: (index) => { if (!preview.current) { current.current = index; setCurrentWord(index); } },
    onEnd: () => { if (preview.current) setPreviewing(false); else onEnd(); },
    onError: (message) => { setError(message); setPreviewing(false); setPlaying(false); },
  };
  if (!player.current && supported) player.current = new SpeechPlayer(window.speechSynthesis, window.SpeechSynthesisUtterance, {
    onWord: (index) => callbacks.current.onWord(index),
    onEnd: () => callbacks.current.onEnd(),
    onError: (message) => callbacks.current.onError(message),
  });

  useEffect(() => {
    if (!supported) return undefined;
    const update = () => setVoices(frenchVoices(window.speechSynthesis.getVoices()));
    update();
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
  }, [supported]);
  useEffect(() => {
    const stopPreview = () => { if (document.hidden) setPreviewing(false); };
    document.addEventListener('visibilitychange', stopPreview);
    return () => document.removeEventListener('visibilitychange', stopPreview);
  }, []);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* Reading remains available without storage. */ }
  }, [settings]);
  useEffect(() => {
    current.current = 0;
    setCurrentWord(0);
  }, [segments]);
  useEffect(() => {
    const engine = player.current;
    if (!engine || !selection) return undefined;
    setError('');
    engine.load(previewing ? speechSegments('Bonjour. Voici un exemple de lecture pour votre soutenance.', '') : segments,
      { voice: selection, rate: settings.rate }, previewing ? 0 : current.current);
    if ((active && playing) || previewing) engine.play();
    return () => engine.stop();
  }, [segments, selection, settings.rate, active, previewing]);
  useEffect(() => {
    if (!player.current || previewing) return;
    if (active && playing) { setError(''); player.current.play(); }
    else player.current.pause();
  }, [playing, active, previewing]);
  useEffect(() => () => player.current?.stop(), []);

  return {
    supported, voices, selection, enabled: settings.enabled, rate: settings.rate,
    active, currentWord, error, previewing,
    setEnabled: (enabled) => { setPreviewing(false); setSettings((value) => ({ ...value, enabled })); },
    setVoice: (uri) => { setPreviewing(false); setSettings((value) => ({ ...value, uri })); },
    setRate: (rate) => setSettings((value) => ({ ...value, rate })),
    preview: () => { setPlaying(false); setPreviewing((value) => !value); },
    seek: (index) => { setError(''); current.current = index; setCurrentWord(index); player.current?.seek(index); },
  };
}
