import React, { useEffect, useMemo, useRef, useState } from 'react';
import { tokenizeSpeech, createSpeechTimeline, cueAtTime } from './speech-timing.mjs';
import { useSpeechVoice } from './useSpeechVoice';

const words = tokenizeSpeech;
const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export default function Rehearsal({ slide, playing, setPlaying, onNext, onPrevious, first, last, nextTitle, slideCount, videoUrl }) {
  const demo = slide.id === 'slide-22';
  const narration = words(slide.narration);
  const transition = words(slide.transition);
  const [phase, setPhase] = useState('speech');
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const activeWord = useRef(null);
  const script = useRef(null);
  const video = useRef(null);
  const count = demo && phase === 'speech' ? narration.length
    : demo && phase === 'transition' ? transition.length : narration.length + transition.length;
  const duration = slide.divider ? Math.max(3, Number(slide.durationSeconds) || 0)
    : demo ? Math.max(2, count * 60 / 125)
      : Math.max(1, Number(slide.durationSeconds) || count * 60 / 125);
  const cues = useMemo(() => createSpeechTimeline(
    demo && phase === 'transition' ? [] : narration,
    demo && phase === 'speech' ? [] : transition,
    duration,
  ), [slide.narration, slide.transition, phase, duration, demo]);
  const complete = () => {
    if (last) { setFinished(true); setPlaying(false); }
    else onNext();
  };
  const finishSpeech = () => {
    if (demo && phase === 'speech') { setElapsed(0); setPhase(videoUrl ? 'video' : 'transition'); }
    else complete();
  };
  const voice = useSpeechVoice({
    narration: demo && phase === 'transition' ? '' : slide.narration,
    transition: demo && phase === 'speech' ? '' : slide.transition,
    allowed: !slide.divider && phase !== 'video' && !finished,
    playing, setPlaying, onEnd: finishSpeech,
  });
  const current = voice.active ? voice.currentWord : cueAtTime(cues, elapsed);
  const cursor = voice.active ? cues[Math.min(current, cues.length - 1)]?.start || 0 : Math.min(duration, elapsed);

  useEffect(() => {
    const pauseWhenHidden = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, [setPlaying]);

  useEffect(() => {
    if (!playing || phase === 'video' || finished) return undefined;
    let frame;
    let previous = performance.now();
    const tick = (now) => {
      const delta = (now - previous) / 1000;
      previous = now;
      setElapsed((value) => voice.active ? value + delta : Math.min(duration, value + delta));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, phase, finished, duration, voice.active]);

  useEffect(() => {
    if (!playing || phase === 'video' || elapsed < duration || finished || voice.active) return;
    finishSpeech();
  }, [elapsed, duration, playing, phase, finished, voice.active]);

  useEffect(() => {
    if (phase !== 'video' || !video.current) return;
    if (playing) video.current.play().catch(() => setPlaying(false));
    else video.current.pause();
  }, [playing, phase, setPlaying]);

  useEffect(() => {
    const container = script.current;
    const word = activeWord.current;
    if (!container || !word) return;
    const bounds = container.getBoundingClientRect();
    const position = word.getBoundingClientRect();
    // Scroll only when a new line leaves the comfortable reading area.
    if (position.top < bounds.top + 24 || position.bottom > bounds.bottom - 40) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      container.scrollTo({ top: container.scrollTop + position.top - bounds.top - container.clientHeight * .35, behavior: reduced ? 'instant' : 'smooth' });
    }
  }, [current, phase]);

  const seekSpeech = (seconds) => {
    setFinished(false);
    if (voice.active) { voice.seek(cueAtTime(cues, seconds)); return; }
    setElapsed(Math.max(0, Math.min(duration - .001, seconds)));
  };

  const renderWords = (list, offset = 0) => list.map((word, index) => {
    const position = offset + index;
    return <span key={index} ref={position === current ? activeWord : undefined}
      onClick={() => seekSpeech(cues[position]?.start || 0)}
      title="Reprendre la lecture à ce mot"
      className={position === current ? 'karaoke-word current' : position < current ? 'karaoke-word read' : 'karaoke-word'}>{word}{' '}</span>;
  });

  const restart = () => {
    setPlaying(false);
    voice.seek(0);
    setPhase('speech');
    setElapsed(0);
    setFinished(false);
    setVideoError(false);
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.target instanceof HTMLElement && event.target.closest('button, input, textarea, select, video, [contenteditable="true"]')) return;
      if (event.code === 'Space' && !event.repeat && !finished && !videoError) {
        event.preventDefault();
        setPlaying((value) => !value);
      }
      if (phase !== 'video' && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        seekSpeech(Math.max(0, Math.min(duration - .001, cursor + (event.key === 'ArrowUp' ? -3 : 3))));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finished, videoError, setPlaying, phase, duration, cursor, voice.active]);

  const progress = Math.min(1, cursor / duration);
  const playbackLabel = playing ? 'Mettre en pause' : elapsed > 0 || phase === 'video' ? 'Reprendre' : 'Démarrer la répétition';
  const symbol = (name) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{
    name === 'play' ? <path d="m9 5 11 7-11 7z" fill="currentColor" stroke="none" />
      : name === 'pause' ? <path d="M8 5v14M16 5v14" strokeWidth="4" />
        : name === 'previous' ? <><path d="m15 6-6 6 6 6" /><path d="M5 6v12" /></>
          : name === 'next' ? <><path d="m9 6 6 6-6 6" /><path d="M19 6v12" /></>
            : <><path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" /></>
  }</svg>;

  return <div className="rehearsal" data-playing={playing}>
    <div className="rehearsal-heading">
      <div className="rehearsal-slide-meta"><span className="eyebrow">DIAPOSITIVE {String(slide.number).padStart(2, '0')} <i>/ {slideCount}</i></span><span className="practice-status" role="status"><i />{finished ? 'Terminée' : playing ? 'En cours' : elapsed > 0 ? 'En pause' : 'Prêt à commencer'}</span></div>
      <div className="practice-timer" title={voice.active ? 'Durée cible ; la diapositive avance à la fin de la voix.' : 'Temps restant'} style={{ '--timer-angle': `${Math.min(1, elapsed / duration) * 360}deg` }}><div><strong>{phase === 'video' ? 'Vidéo' : `${elapsed > duration ? '+' : ''}${clock(Math.ceil(Math.abs(duration - elapsed)))}`}</strong><small>{phase === 'video' ? 'DÉMONSTRATION' : elapsed > duration ? 'DÉPASSEMENT' : voice.active ? 'CIBLE' : 'RESTANT'}</small></div></div>
    </div>
    <div className="voice-toolbar">
      <button className="voice-toggle" aria-pressed={voice.enabled && !!voice.selection} disabled={!voice.supported || !voice.selection} onClick={() => voice.setEnabled(!voice.enabled)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m11 5-6 4H2v6h3l6 4zM15 8c3 2 3 6 0 8M18 5c5 4 5 10 0 14" /></svg>{voice.enabled && voice.selection ? 'Voix activée' : 'Voix désactivée'}</button>
      {voice.selection && <details className="voice-settings"><summary>{voice.selection.name} · {voice.rate.toFixed(1)}×</summary><div className="voice-settings-panel"><label>Voix française<select value={voice.selection.voiceURI} onChange={(event) => voice.setVoice(event.target.value)}>{voice.voices.map((item) => <option key={item.voiceURI} value={item.voiceURI}>{item.name} ({item.lang})</option>)}</select></label><label>Vitesse de lecture<span className="voice-rate"><input aria-label="Vitesse de lecture" type="range" min="0.7" max="1.4" step="0.1" value={voice.rate} onChange={(event) => voice.setRate(Number(event.target.value))} /><output>{voice.rate.toFixed(1)}×</output></span></label><button onClick={voice.preview}>{voice.previewing ? 'Arrêter l’exemple' : 'Écouter un exemple'}</button><p>La voix guide le surlignage et le passage des diapositives. La durée affichée reste votre objectif.</p></div></details>}
    </div>
    {(!voice.supported || !voice.selection) && <p className="voice-notice" role="status">{voice.supported ? 'Aucune voix française disponible pour le moment. La répétition utilise le chronomètre.' : 'La lecture vocale n’est pas disponible dans ce navigateur. Le chronomètre reste utilisable.'}</p>}
    {voice.error && <p className="voice-notice" role="alert">{voice.error}</p>}
    {finished ? <div className="rehearsal-message" role="status"><strong>Répétition terminée.</strong><p>Prenez un instant avant les questions du jury.</p></div>
      : phase === 'video' ? <div className="rehearsal-video">
        <video ref={video} src={videoUrl} playsInline controls
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
          onEnded={() => { setElapsed(0); setPhase('transition'); setPlaying(true); }}
          onError={() => { setVideoError(true); setPlaying(false); }} />
        {videoError && <p role="alert">La vidéo ne peut pas être chargée. Recommencez la diapositive ou passez à la suivante.</p>}
      </div>
      : <div ref={script} className="karaoke-script" role="region" tabIndex={0} aria-label="Discours à suivre. Flèche haut : reculer de trois secondes. Flèche bas : avancer de trois secondes." aria-describedby="rehearsal-keyboard-help">
        {slide.divider ? <div className="practice-divider"><span>Une respiration</span><p>Laissez apparaître le titre.<br />La suite arrive dans quelques secondes.</p></div>
          : <>
            {(!demo || phase === 'speech') && <p>{renderWords(narration)}</p>}
            {(!demo || phase === 'transition') && transition.length > 0 && <p className="karaoke-transition"><small>Pour enchaîner</small>{renderWords(transition, demo ? 0 : narration.length)}</p>}
          </>}
      </div>}
    <div className="practice-player">
      <div className="practice-track"><span>{phase === 'video' ? 'Montage complet' : clock(elapsed)}</span>{phase === 'video' ? <span>Lecture vidéo</span> : <input className="practice-seek" type="range" min="0" max={duration} step="0.1" value={cursor} aria-label="Position dans le discours" aria-valuetext={voice.active ? `Mot ${current + 1} sur ${count}. Durée cible ${clock(Math.ceil(duration))}.` : `${clock(elapsed)} sur ${clock(Math.ceil(duration))}`} onChange={(event) => { setPlaying(false); seekSpeech(Number(event.target.value)); }} style={{ '--seek-progress': `${progress * 100}%` }} />}<span>{phase === 'video' ? '5:36' : clock(Math.ceil(duration))}</span></div>
      <div className="rehearsal-controls">
        <button className="practice-restart" onClick={restart} aria-label="Recommencer la diapositive" title="Recommencer la diapositive">{symbol('restart')}</button>
        <div className="practice-transport"><button onClick={onPrevious} disabled={first} aria-label="Diapositive précédente" title="Diapositive précédente">{symbol('previous')}</button><button className="practice-play" onClick={() => setPlaying(!playing)} disabled={finished || videoError} aria-label={playbackLabel} title={playbackLabel}>{symbol(playing ? 'pause' : 'play')}</button><button onClick={onNext} disabled={last} aria-label="Diapositive suivante" title="Diapositive suivante">{symbol('next')}</button></div>
        <span className="practice-play-label">{finished ? 'Terminé' : playing ? 'Pause' : 'Lecture'}</span>
      </div>
      <div className="practice-up-next"><span>À SUIVRE</span><strong>{nextTitle || 'Questions du jury'}</strong><span aria-hidden="true">↗</span></div>
      <details className="practice-keyboard-help" id="rehearsal-keyboard-help"><summary>Clavier et synchronisation</summary><p><kbd>Espace</kbd> Lecture / pause · <kbd>↑</kbd> Reculer · <kbd>↓</kbd> Avancer. Cliquez sur un mot pour vous recaler. Le curseur est accessible avec Tab et les flèches. Avec la voix, le surlignage suit les mots prononcés lorsque le navigateur le permet ; sinon il est estimé et recalé à chaque phrase. Sans voix, il suit la durée prévue.</p></details>
    </div>
  </div>;
}
