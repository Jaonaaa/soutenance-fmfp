import React, { useEffect, useMemo, useRef, useState } from 'react';
import Rehearsal from './Rehearsal';
import slides from './data/slides.json';
import timeline from './data/video-timeline.json';
import { customSlideImagePath, slideImagePath } from './deck-assets.mjs';

const demoVideoUrl = import.meta.env.DEV
  ? `${import.meta.env.BASE_URL}video/out/1&2&3.mp4`
  : null;

const STORAGE_KEY = 'soutenance-fmfp-preparation-v1';
const MAX_DURATION = 3600;
const videoScenes = timeline.scenes.reduce((items, scene) => {
  const videoStartSeconds = items.length ? items[items.length - 1].videoEndSeconds : 0;
  items.push({
    ...scene,
    videoStartSeconds,
    videoEndSeconds: videoStartSeconds + Number(scene.durationSeconds || 0),
  });
  return items;
}, []);

function readSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { slides: {}, scenes: {}, activeSlideId: slides[0].id, restored: false };
    const saved = JSON.parse(raw);
    if (saved?.schemaVersion !== 1) {
      return { slides: {}, scenes: {}, activeSlideId: slides[0].id, restored: false };
    }
    return {
      slides: saved.slides && typeof saved.slides === 'object' ? saved.slides : {},
      scenes: saved.videoScenes && typeof saved.videoScenes === 'object' ? saved.videoScenes : {},
      activeSlideId: slides.some((slide) => slide.id === saved.activeSlideId)
        ? saved.activeSlideId
        : slides[0].id,
      restored: true,
    };
  } catch {
    return { slides: {}, scenes: {}, activeSlideId: slides[0].id, restored: false };
  }
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

function formatSlideDuration(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  if (!safe) return '0 s';
  if (safe < 60) return `${safe} s`;
  return safe % 60 === 0 ? `${safe / 60} min` : formatTime(safe);
}

function formatClipDuration(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  return `${Number.isInteger(safe) ? safe : safe.toFixed(1)} s`;
}

function parseClock(value) {
  const [minutes, seconds] = value.split(':').map(Number);
  return minutes * 60 + seconds;
}

function parseNarrationCues(narration) {
  const marker = /(?:^|\n)(\d{2}:\d{2})–(\d{2}:\d{2})\s*—\s*/g;
  const matches = [...narration.matchAll(marker)];
  return matches.map((match, index) => {
    const bodyStart = match.index + match[0].length;
    const bodyEnd = index + 1 < matches.length ? matches[index + 1].index : narration.length;
    return {
      start: match[1],
      end: match[2],
      text: narration.slice(bodyStart, bodyEnd).trim(),
    };
  });
}

function boundedDuration(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.min(MAX_DURATION, Math.max(0, parsed)) : 0;
}

function mediaPath(html) {
  return html.replace(/(src|data-zoom)="img\//g, `$1="${import.meta.env.BASE_URL}img/`);
}

function importBackup(payload) {
  if (payload?.schemaVersion !== 1 || !payload.slides || !payload.videoScenes) {
    throw new Error('Fichier invalide ou version non prise en charge.');
  }
  const importedSlides = {};
  for (const slide of slides) {
    const item = payload.slides[slide.id];
    if (!item) continue;
    if (typeof item.narration !== 'string' || !Number.isFinite(Number(item.durationSeconds))) {
      throw new Error(`Données invalides pour la diapositive ${slide.number}.`);
    }
    importedSlides[slide.id] = {
      narration: item.narration,
      durationSeconds: boundedDuration(item.durationSeconds),
    };
  }
  const importedScenes = {};
  for (const scene of videoScenes) {
    const item = payload.videoScenes[scene.id];
    if (!item) continue;
    if (typeof item.narration !== 'string' || !Number.isFinite(Number(item.durationSeconds))) {
      throw new Error(`Données invalides pour la scène ${scene.order}.`);
    }
    importedScenes[scene.id] = {
      narration: item.narration,
      durationSeconds: boundedDuration(item.durationSeconds),
    };
  }
  return { slides: importedSlides, scenes: importedScenes };
}

function exportFile(slideEdits, sceneEdits) {
  const backup = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    slides: Object.fromEntries(slides.map((slide) => [slide.id, {
      narration: slideEdits[slide.id]?.narration ?? slide.narration,
      durationSeconds: slideEdits[slide.id]?.durationSeconds ?? slide.durationSeconds,
    }])),
    videoScenes: Object.fromEntries(videoScenes.map((scene) => [scene.id, {
      narration: sceneEdits[scene.id]?.narration ?? scene.narration,
      durationSeconds: sceneEdits[scene.id]?.durationSeconds ?? scene.durationSeconds,
    }])),
  };
  const blob = new Blob([`${JSON.stringify(backup, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'soutenance-fmfp-preparation.json';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Icon({ name }) {
  const paths = {
    list: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    note: <><path d="M5 4.5h14v15H5z" /><path d="M8 8h8M8 11.5h8M8 15h5" /></>,
    time: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    tools: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1-1.6 2.7-.2-.1a2.2 2.2 0 0 0-2.2 0l-.2.1-1.6 2.7h-3.2L9 17.8l-.2-.1a2.2 2.2 0 0 0-2.2 0l-.2.1-1.6-2.7.1-.1a2.2 2.2 0 0 0 0-2.2l-.1-.2 1.6-2.7.2.1a2.2 2.2 0 0 0 2.2 0l.2-.1 1.6-2.7h3.2l1.6 2.7.2.1a2.2 2.2 0 0 0 2.2 0l.2-.1 1.6 2.7-.1.2a2.2 2.2 0 0 0 0 2.2Z" transform="translate(-1 -2) scale(1.08)" /></>,
    compare: <><rect x="3" y="4" width="8" height="16" rx="1.5" /><rect x="13" y="4" width="8" height="16" rx="1.5" /></>,
    pen: <><path d="m4 16.5-.7 4.2 4.2-.7L19 8.5 15.5 5z" /><path d="m13.8 6.7 3.5 3.5" /></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 17 5-5 3 3 3-4 5 6" /></>,
    import: <><path d="M12 15V3M8 7l4-4 4 4" /><path d="M5 13v6h14v-6" /></>,
    export: <><path d="M12 3v12m-4-4 4 4 4-4" /><path d="M5 15v5h14v-5" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    play: <><path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none" /></>,
    repeat: <><path d="M20 8a8 8 0 0 0-14-2L3 9m0-5v5h5" /><path d="M4 16a8 8 0 0 0 14 2l3-3m0 5v-5h-5" /></>,
    pause: <><path d="M8 5h3v14H8zM15 5h3v14h-3z" fill="currentColor" stroke="none" /></>,
    back: <><path d="M11 5 4 12l7 7" /><path d="M20 5 13 12l7 7" /></>,
    fullscreen: <><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function App() {
  const [initial] = useState(readSavedState);
  const [slideEdits, setSlideEdits] = useState(initial.slides);
  const [sceneEdits, setSceneEdits] = useState(initial.scenes);
  const [slideIndex, setSlideIndex] = useState(() => Math.max(
    0,
    slides.findIndex((item) => item.id === initial.activeSlideId),
  ));
  const [sceneId, setSceneId] = useState(videoScenes[0].id);
  const [viewMode, setViewMode] = useState(() => window.innerWidth >= 980 ? 'compare' : 'hifi');
  const [compact, setCompact] = useState(() => window.innerWidth < 900);
  const [slidesOpen, setSlidesOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('narration');
  const [rehearsal, setRehearsal] = useState(false);
  const [rehearsalPlaying, setRehearsalPlaying] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState(initial.restored ? 'Modifications retrouvées' : 'Sauvegarde locale prête');
  const [notice, setNotice] = useState('');
  const [zoomImage, setZoomImage] = useState('');
  const [videoPreviewOpen, setVideoPreviewOpen] = useState(() => window.innerWidth >= 980);
  const [videoLoadError, setVideoLoadError] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef(null);
  const playerShellRef = useRef(null);
  const activeCueRef = useRef(null);
  const speechDocumentRef = useRef(null);

  const slide = slides[slideIndex];
  const scene = videoScenes.find((item) => item.id === sceneId) || videoScenes[0];
  const currentSlide = { ...slide, ...(slideEdits[slide.id] || {}) };
  const currentScene = {
    ...scene,
    narration: sceneEdits[scene.id]?.narration ?? scene.narration,
  };
  const narrationWordCount = currentSlide.narration.trim().split(/\s+/).filter(Boolean).length;
  const slideProgress = ((currentSlide.number / slides.length) * 100).toFixed(2);
  const totalSlideSeconds = useMemo(() => slides.reduce(
    (total, item) => total + (slideEdits[item.id]?.durationSeconds ?? item.durationSeconds), 0,
  ), [slideEdits]);
  const totalVideoSeconds = videoScenes[videoScenes.length - 1]?.videoEndSeconds || 0;
  const narrationCues = parseNarrationCues(currentScene.narration);
  const relativeVideoTime = Math.max(0, videoCurrentTime - scene.videoStartSeconds);
  const activeCueIndex = narrationCues.findIndex((cue) =>
    relativeVideoTime >= parseClock(cue.start) && relativeVideoTime < parseClock(cue.end),
  );

  useEffect(() => {
    if (!drawerOpen || drawerTab !== 'narration') setRehearsalPlaying(false);
  }, [drawerOpen, drawerTab]);

  useEffect(() => {
    if (drawerOpen && drawerTab === 'video' && activeCueIndex >= 0) {
      activeCueRef.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [drawerOpen, drawerTab, sceneId, activeCueIndex]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        schemaVersion: 1,
        activeSlideId: slide.id,
        slides: slideEdits,
        videoScenes: sceneEdits,
      }));
      setSaveMessage('Enregistré sur cet appareil');
    } catch {
      setSaveMessage('Stockage local indisponible');
    }
  }, [slide.id, slideEdits, sceneEdits]);

  useEffect(() => {
    const onResize = () => {
      const nextCompact = window.innerWidth < 900;
      setCompact(nextCompact);
      if (nextCompact) setViewMode((current) => current === 'compare' ? 'hifi' : current);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!drawerOpen || drawerTab !== 'video' || !videoPreviewOpen) return undefined;
    const player = videoRef.current;
    if (!player) return undefined;

    const seekToScene = () => {
      const start = Number(scene.videoStartSeconds) || 0;
      if (!Number.isFinite(player.duration)) return;
      player.pause();
      player.currentTime = Math.min(start, Math.max(0, player.duration - 0.1));
      setVideoCurrentTime(player.currentTime);
      setVideoPlaying(false);
    };

    if (player.readyState >= 1) seekToScene();
    else player.addEventListener('loadedmetadata', seekToScene);
    return () => player.removeEventListener('loadedmetadata', seekToScene);
  }, [drawerOpen, drawerTab, videoPreviewOpen, sceneId, scene.videoStartSeconds]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, button'))) return;
      if (event.key === 'ArrowRight') setSlideIndex((index) => Math.min(slides.length - 1, index + 1));
      if (event.key === 'ArrowLeft') setSlideIndex((index) => Math.max(0, index - 1));
      if (event.key === 'Escape') {
        setSlidesOpen(false);
        setDrawerOpen(false);
        setToolsOpen(false);
        setZoomImage('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const editSlide = (patch) => setSlideEdits((current) => ({
    ...current,
    [slide.id]: { ...current[slide.id], ...patch },
  }));
  const openSpeechDocument = () => {
    setRehearsalPlaying(false);
    const dialog = speechDocumentRef.current;
    dialog.showModal();
    dialog.querySelector('.speech-document-scroll').focus();
  };
  const editScene = (id, patch) => setSceneEdits((current) => ({
    ...current,
    [id]: { ...current[id], ...patch },
  }));

  const seekVideo = (seconds) => {
    const player = videoRef.current;
    const safeTime = Math.min(Math.max(0, Number(seconds) || 0), videoDuration || totalVideoSeconds);
    setVideoCurrentTime(safeTime);
    if (player) {
      player.currentTime = safeTime;
      player.pause();
      setVideoPlaying(false);
    }
  };

  const toggleVideoPlayback = () => {
    const player = videoRef.current;
    if (!player) return;
    if (player.paused) player.play().catch(() => setVideoPlaying(false));
    else player.pause();
  };

  const toggleVideoFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else playerShellRef.current?.requestFullscreen?.();
  };

  const editNarrationCue = (index, value) => {
    const cues = parseNarrationCues(currentScene.narration);
    const updated = cues.map((cue, cueIndex) =>
      `${cue.start}–${cue.end} — ${cueIndex === index ? value : cue.text}`,
    ).join('\n');
    editScene(scene.id, { narration: updated });
  };
  const selectSlide = (index) => {
    setSlideIndex(Math.max(0, Math.min(slides.length - 1, index)));
    setSlidesOpen(false);
  };
  const openDrawer = (tab) => {
    setDrawerTab(tab);
    setDrawerOpen(true);
    setToolsOpen(false);
    setViewMode('hifi');
  };
  const selectDrawerTab = (tab) => {
    setDrawerTab(tab);
    setViewMode('hifi');
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = importBackup(JSON.parse(await file.text()));
      setSlideEdits(imported.slides);
      setSceneEdits(imported.scenes);
      setNotice('Sauvegarde importée. Les champs absents reprennent leur contenu d’origine.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Impossible de lire ce fichier.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div
      className="app-shell"
      data-bottom-open={drawerOpen && compact}
      data-drawer-open={drawerOpen}
      data-side-drawer={drawerOpen && !compact}
      data-side-open={slidesOpen}
      data-rehearsal={drawerOpen && drawerTab === 'narration' && rehearsal}
    >
      <main className="stage" aria-label="Préparation de la soutenance">
        <div className="stage-ident">
          <button className="float-button stage-list-button" onClick={() => setSlidesOpen(true)} aria-label="Ouvrir les diapositives" aria-expanded={slidesOpen}>
            <Icon name="list" />
          </button>
          <div className="stage-ident-copy">
            <span>PRÉPARATION DE LA SOUTENANCE</span>
            <strong>{currentSlide.title}</strong>
          </div>
        </div>

        <div className="stage-progress" role="progressbar" aria-label="Progression dans les diapositives" aria-valuemin="1" aria-valuemax={slides.length} aria-valuenow={currentSlide.number}>
          <span style={{ width: `${slideProgress}%` }} />
        </div>

        <div className="stage-actions" role="group" aria-label="Commandes de présentation">
          <button className="rehearsal-launch" onClick={() => { setRehearsal(true); setRehearsalPlaying(false); openDrawer('narration'); }}><Icon name="repeat" /><span>Répéter</span></button>
          <button className="speech-document-launch" onClick={openSpeechDocument} aria-haspopup="dialog" aria-label="Lire le discours complet" title="Lire le discours complet"><Icon name="note" /><span>Discours complet</span></button>
          <div className="view-switch" role="group" aria-label="Affichage des diapositives">
            {!compact && <button className={viewMode === 'compare' ? 'active' : ''} onClick={() => setViewMode('compare')} aria-pressed={viewMode === 'compare'} aria-label="Comparer les deux rendus" title="Comparer les deux rendus"><Icon name="compare" /><span>Comparer</span></button>}
            <button className={viewMode === 'maquette' ? 'active' : ''} onClick={() => setViewMode('maquette')} aria-pressed={viewMode === 'maquette'} aria-label="Afficher la maquette" title="Afficher la maquette"><Icon name="pen" /><span>Maquette</span></button>
            <button className={viewMode === 'hifi' ? 'active' : ''} onClick={() => setViewMode('hifi')} aria-pressed={viewMode === 'hifi'} aria-label="Afficher le rendu PDF" title="Afficher le rendu PDF"><Icon name="image" /><span>Rendu PDF</span></button>
          </div>
          <div className="tools-wrap">
            <button className="float-button tools-trigger" onClick={() => setToolsOpen((open) => !open)} aria-label="Ouvrir les outils" aria-expanded={toolsOpen}><Icon name="tools" /></button>
            {toolsOpen && (
              <div className="tools-popover">
                <span className="tools-save"><i />{saveMessage}</span>
                <label className="menu-item"><Icon name="import" />Importer une sauvegarde<input type="file" accept="application/json,.json" onChange={handleImport} /></label>
                <button className="menu-item" onClick={() => exportFile(slideEdits, sceneEdits)}><Icon name="export" />Exporter les modifications</button>
              </div>
            )}
          </div>
        </div>

        <section className={`stage-center mode-${viewMode}`} aria-label="Aperçu de la diapositive">
          {(viewMode === 'compare' || viewMode === 'maquette') && <SlideWireframe slide={currentSlide} onZoom={setZoomImage} onOpenVideo={() => openDrawer('video')} />}
          {(viewMode === 'compare' || viewMode === 'hifi') && <SlideHighFidelity slide={currentSlide} onZoom={setZoomImage} allowZoom={!drawerOpen} />}
        </section>

        <button className={`float-pill bottom-open ${drawerOpen ? 'is-open' : ''}`} onClick={() => drawerOpen ? setDrawerOpen(false) : openDrawer('narration')} aria-expanded={drawerOpen}>
          <Icon name="note" /><span>{drawerOpen ? 'Fermer' : 'Notes orateur'}</span>
        </button>
        <nav className="float-pill slide-nav" aria-label="Navigation des diapositives">
          <button onClick={() => selectSlide(slideIndex - 1)} disabled={slideIndex === 0} aria-label="Diapositive précédente">‹</button>
          <span>{String(currentSlide.number).padStart(2, '0')} <i>/</i> {slides.length}</span>
          <button onClick={() => selectSlide(slideIndex + 1)} disabled={slideIndex === slides.length - 1} aria-label="Diapositive suivante">›</button>
        </nav>
        <button className={`float-pill timeline-open ${drawerOpen && drawerTab === 'video' ? 'is-open' : ''}`} onClick={() => drawerOpen && drawerTab === 'video' ? setDrawerOpen(false) : openDrawer('video')} aria-expanded={drawerOpen && drawerTab === 'video'}>
          <Icon name="time" /><span>Vidéo · {formatTime(totalVideoSeconds)}</span>
        </button>
      </main>

      {slidesOpen && (
        <>
          <button className="stage-scrim" aria-label="Fermer la liste des diapositives" onClick={() => setSlidesOpen(false)} />
          <aside className="slide-drawer" aria-label="Liste des diapositives">
            <div className="drawer-heading">
              <div><span className="eyebrow">Votre support · {formatTime(totalSlideSeconds)}</span><h2>Les diapositives</h2></div>
              <button className="float-button close-drawer" onClick={() => setSlidesOpen(false)} aria-label="Fermer"><Icon name="close" /></button>
            </div>
            <nav className="slide-list">
              {slides.map((item, index) => (
                <div className="slide-list-item" key={item.id}>
                  {(index === 0 || slides[index - 1].section !== item.section) && <span className="section-label">{item.sectionNumber ? `0${item.sectionNumber} · ` : ''}{item.section}</span>}
                  <button className={`slide-link ${index === slideIndex ? 'selected' : ''} ${item.divider ? 'divider-link' : ''}`} onClick={() => selectSlide(index)} aria-current={index === slideIndex ? 'true' : undefined}>
                    <span className="slide-link-number">{String(item.number).padStart(2, '0')}</span>
                    <span className="slide-link-copy"><strong>{item.title}</strong><small>{formatSlideDuration(slideEdits[item.id]?.durationSeconds ?? item.durationSeconds)}</small></span>
                  </button>
                </div>
              ))}
            </nav>
          </aside>
        </>
      )}

      {drawerOpen && (
        <section className={`notes-drawer ${!compact ? 'notes-drawer--side' : ''}`} aria-label={drawerTab === 'video' ? 'Chronologie vidéo' : 'Notes orateur'}>
          <div className="drawer-heading bottom-heading">
            {drawerTab === 'narration' ? <div className="practice-header"><span className="practice-mark"><Icon name={rehearsal ? 'repeat' : 'note'} /></span><div><small>SOUTENANCE FMFP</small><strong>{rehearsal ? 'Studio de répétition' : 'Notes orateur'}</strong></div></div> : <div className="drawer-tabs" role="tablist" aria-label="Panneau inférieur">
              <button role="tab" aria-selected={drawerTab === 'narration'} className={drawerTab === 'narration' ? 'selected' : ''} onClick={() => selectDrawerTab('narration')}><Icon name="note" /> Narration</button>
              <button role="tab" aria-selected={drawerTab === 'video'} className={drawerTab === 'video' ? 'selected' : ''} onClick={() => selectDrawerTab('video')}><Icon name="time" /> Chronologie vidéo</button>
            </div>}
            <div className="practice-header-actions">
              {drawerTab === 'narration' && <button className="practice-video-link" onClick={openSpeechDocument} aria-haspopup="dialog" aria-label="Lire le discours complet" title="Discours complet"><Icon name="note" /></button>}
              {drawerTab === 'narration' && <button className="practice-video-link" onClick={() => selectDrawerTab('video')} aria-label="Ouvrir la chronologie vidéo" title="Chronologie vidéo"><Icon name="time" /></button>}
              <button className="float-button close-drawer" onClick={() => setDrawerOpen(false)} aria-label="Fermer le panneau"><Icon name="close" /></button>
            </div>
          </div>
          {drawerTab === 'narration' && <div className="practice-modes" role="group" aria-label="Mode des notes"><button aria-pressed={!rehearsal} onClick={() => { setRehearsal(false); setRehearsalPlaying(false); }}><Icon name="pen" />Écrire</button><button aria-pressed={rehearsal} onClick={() => { setRehearsal(true); setRehearsalPlaying(false); }}><Icon name="repeat" />Répéter</button><span>Discours & transitions</span></div>}
          {drawerTab === 'narration' && rehearsal ? (
            <Rehearsal key={slide.id} slide={currentSlide} playing={rehearsalPlaying} setPlaying={setRehearsalPlaying} onNext={() => selectSlide(slideIndex + 1)} onPrevious={() => selectSlide(slideIndex - 1)} first={slideIndex === 0} last={slideIndex === slides.length - 1} nextTitle={slides[slideIndex + 1]?.title} slideCount={slides.length} videoUrl={demoVideoUrl} />
          ) : drawerTab === 'narration' ? (
            <div className="notes-editor">
              <div className="narration-field">
                <div className="narration-field-heading">
                  <div className="narration-meta">
                    <label className="narration-title" htmlFor={`narration-${slide.id}`}>Diapositive {String(currentSlide.number).padStart(2, '0')} · {currentSlide.title}</label>
                    <span className="word-count">{narrationWordCount} mots · environ {formatSlideDuration(currentSlide.durationSeconds)}</span>
                  </div>
                  <label className="duration-field"><span>Durée</span><span className="duration-input-wrap"><input aria-label="Durée de la diapositive en secondes" type="number" min="0" max={MAX_DURATION} step="5" value={currentSlide.durationSeconds} onChange={(event) => editSlide({ durationSeconds: boundedDuration(event.target.value) })} /><small>sec</small></span></label>
                </div>
                <textarea id={`narration-${slide.id}`} value={currentSlide.narration} onChange={(event) => editSlide({ narration: event.target.value })} placeholder="Rédigez la narration de cette diapositive…" rows="4" />
              </div>
              <div className="speaker-cues">
                <span>Repères</span>
                {currentSlide.cue && <p>{currentSlide.cue}</p>}
                {currentSlide.reminder && <p className="reminder-copy"><b>À garder en tête</b>{currentSlide.reminder}</p>}
                {currentSlide.transition && <p className="transition-copy"><b>Pour enchaîner</b>« {currentSlide.transition} »</p>}
              </div>
            </div>
          ) : (
            <div className="video-editor">
              <div className="timeline-heading">
                <div className="timeline-title">
                  <span className="eyebrow">DÉMO BEMA · TEXTILE</span>
                  <strong>Du dépôt à l’évaluation</strong>
                </div>
                <div className="runtime-total"><span>Durée totale</span><b>{formatTime(totalVideoSeconds)}</b></div>
              </div>
              <div className="video-overview">
              <section className="video-preview" aria-label="Lecteur vidéo">
                <div className="video-preview-heading">
                  <span><b>Visionner le montage</b><small>Voix off à enregistrer · 3 séquences · 2 transitions</small></span>
                  <button type="button" onClick={() => setVideoPreviewOpen((open) => !open)} aria-expanded={videoPreviewOpen}>
                    {videoPreviewOpen ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
                {videoPreviewOpen ? (
                  !demoVideoUrl ? (
                    <div className="video-load-error" role="status">
                      Le montage reste disponible en local et n’est pas inclus dans la version publiée.
                    </div>
                  ) : videoLoadError ? (
                    <div className="video-load-error" role="status">
                      La vidéo n’a pas pu être lue. <a href={demoVideoUrl} target="_blank" rel="noreferrer">Ouvrir le MP4</a>
                    </div>
                  ) : (
                    <div className="custom-player" ref={playerShellRef}>
                      <video
                        ref={videoRef}
                        className="video-preview-player"
                        playsInline
                        preload="metadata"
                        src={demoVideoUrl}
                        aria-label="Vidéo de démonstration BEMA, clips 1 à 3"
                        onLoadedMetadata={(event) => {
                          setVideoDuration(event.currentTarget.duration);
                          setVideoCurrentTime(event.currentTarget.currentTime);
                        }}
                        onDurationChange={(event) => setVideoDuration(event.currentTarget.duration)}
                        onTimeUpdate={(event) => setVideoCurrentTime(event.currentTarget.currentTime)}
                        onPlay={() => setVideoPlaying(true)}
                        onPause={() => setVideoPlaying(false)}
                        onEnded={() => setVideoPlaying(false)}
                        onError={() => setVideoLoadError(true)}
                      />
                      {!videoPlaying && (
                        <button className="player-big-play" type="button" onClick={toggleVideoPlayback} aria-label="Lire la vidéo">
                          <Icon name="play" />
                        </button>
                      )}
                      <div className="player-controls">
                        <button className="player-control-button" type="button" onClick={toggleVideoPlayback} aria-label={videoPlaying ? 'Mettre en pause' : 'Lire la vidéo'} title={videoPlaying ? 'Pause' : 'Lecture'}>
                          <Icon name={videoPlaying ? 'pause' : 'play'} />
                        </button>
                        <button className="player-control-button player-skip-button" type="button" onClick={() => seekVideo(videoCurrentTime - 10)} aria-label="Reculer de dix secondes" title="Reculer de 10 s">
                          <Icon name="back" />
                          <span>10</span>
                        </button>
                        <span className="player-time"><b>{formatTime(videoCurrentTime)}</b><i>/</i>{formatTime(videoDuration || totalVideoSeconds)}</span>
                        <input
                          className="player-progress"
                          type="range"
                          min="0"
                          max={videoDuration || totalVideoSeconds}
                          step="0.1"
                          value={Math.min(videoCurrentTime, videoDuration || totalVideoSeconds)}
                          onChange={(event) => seekVideo(event.target.value)}
                          aria-label="Position dans la vidéo"
                          style={{ '--progress': `${((videoCurrentTime / (videoDuration || totalVideoSeconds)) * 100) || 0}%` }}
                        />
                        <button className="player-control-button" type="button" onClick={toggleVideoFullscreen} aria-label="Plein écran" title="Plein écran">
                          <Icon name="fullscreen" />
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <p className="video-preview-note">Sélectionnez une séquence pour placer le lecteur à son début. Les deux cartons sont muets.</p>
                )}
              </section>
              <div className="segment-heading"><b>Parcours</b><span>Choisissez une séquence pour la visionner et lire sa voix off.</span></div>
              <div className="timeline-track">
                {videoScenes.map((item) => {
                  const start = Number(item.videoStartSeconds) || 0;
                  const end = start + Number(item.durationSeconds || 0);
                  return (
                    <div className={`scene-card ${item.id === sceneId ? 'active' : ''} ${item.type === 'card' ? 'scene-card--silent' : ''}`} key={item.id}>
                      <button className="scene-select" onClick={() => { setSceneId(item.id); seekVideo(start); }} aria-pressed={item.id === sceneId}>
                        <span className="scene-index">{String(item.order).padStart(2, '0')}</span>
                        <span className="scene-copy"><strong>{item.title.replace(/^\d+\s*·\s*/, '')}</strong><small>{formatTime(start)}–{formatTime(end)}</small></span>
                      </button>
                    </div>
                  );
                })}
              </div>
              </div>
              <section className={`video-narration-field ${scene.silent ? 'is-silent' : ''}`} aria-label="Texte de la voix off">
                {scene.silent ? (
                  <div className="silent-voice-note"><b>Transition · sans narration</b><span>{scene.description} Choisissez une séquence parlée pour afficher son texte.</span></div>
                ) : (
                  <>
                    <div className="script-heading">
                      <div><span className="eyebrow">TEXTE À ENREGISTRER</span><h3>Voix off · {scene.title.replace(/^\d+\s*·\s*/, '')}</h3></div>
                      <span className="script-count">{narrationCues.length} passages</span>
                    </div>
                    <div className="script-cues">
                      {narrationCues.map((cue, index) => (
                        <article className={`script-cue ${activeCueIndex === index ? 'is-current' : ''}`} key={`${scene.id}-${cue.start}-${index}`} ref={activeCueIndex === index ? activeCueRef : undefined}>
                          <button type="button" className="script-cue-time" onClick={() => seekVideo(scene.videoStartSeconds + parseClock(cue.start))} title={`Écouter à ${cue.start}`}>
                            <span>{cue.start}</span><small>{cue.end}</small>
                          </button>
                          <textarea
                            rows={Math.min(12, Math.max(2, Math.ceil(cue.text.length / (compact ? 38 : 58))))}
                            value={cue.text}
                            onChange={(event) => editNarrationCue(index, event.target.value)}
                            aria-label={`Texte de voix off, ${cue.start} à ${cue.end}`}
                          />
                          {activeCueIndex === index && <span className="cue-live-label">À l’écran</span>}
                        </article>
                      ))}
                      {!narrationCues.length && <textarea className="script-plain-editor" value={currentScene.narration} onChange={(event) => editScene(scene.id, { narration: event.target.value })} aria-label={`Voix off du clip ${scene.clip}`} />}
                    </div>
                  </>
                )}
              </section>
            </div>
          )}
        </section>
      )}

      {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Fermer le message">×</button></div>}
      <SpeechDocument dialogRef={speechDocumentRef} slideEdits={slideEdits} sceneEdits={sceneEdits} videoSeconds={totalVideoSeconds} />
      {zoomImage && <div className="app-zoom" role="dialog" aria-modal="true" aria-label="Aperçu agrandi" onClick={() => setZoomImage('')}><button onClick={() => setZoomImage('')} aria-label="Fermer l’aperçu">×</button><img src={zoomImage} alt={`Diapositive ${slide.number} agrandie`} /></div>}
    </div>
  );
}

function SpeechDocument({ dialogRef, slideEdits, sceneEdits, videoSeconds }) {
  const previewRef = useRef(null);
  const [previewSlide, setPreviewSlide] = useState(null);

  const openPreview = (slide) => {
    setPreviewSlide(slide);
    previewRef.current.showModal();
  };

  return (
    <>
      <dialog ref={dialogRef} className="speech-document" aria-label="Discours complet" onKeyDown={(event) => event.stopPropagation()}>
        <button className="float-button speech-document-close" onClick={() => dialogRef.current.close()} aria-label="Fermer le discours"><Icon name="close" /></button>
        <div className="speech-document-scroll" tabIndex={0} aria-label="Texte du discours">
          <article className="speech-document-paper">
            {slides.map((slide) => {
              const narration = slideEdits[slide.id]?.narration ?? slide.narration;
              return (
                <section className="speech-document-section" key={slide.id} aria-label={`Diapositive ${slide.number}`}>
                  <div className="speech-document-copy">
                    {narration.trim() && <p>{narration}</p>}
                    {slide.demoAfter && (
                      <details className="speech-document-demo">
                        <summary>Démonstration · {formatTime(videoSeconds)} <span>Texte à dire pendant la vidéo</span></summary>
                        {videoScenes.filter((scene) => !scene.silent).map((scene) => {
                          const text = sceneEdits[scene.id]?.narration ?? scene.narration;
                          const cues = parseNarrationCues(text);
                          return (
                            <div className="speech-document-clip" key={scene.id}>
                              <h4>{scene.title.replace(/^\d+\s*·\s*/, '')}</h4>
                              {cues.length ? cues.map((cue) => (
                                <p key={cue.start}><time>{formatTime(scene.videoStartSeconds + parseClock(cue.start))}</time>{cue.text}</p>
                              )) : <p>{text}</p>}
                            </div>
                          );
                        })}
                      </details>
                    )}
                    {slide.transition.trim() && <p className="speech-document-transition">{slide.transition}</p>}
                  </div>
                  <button type="button" className="speech-slide-thumbnail" onClick={() => openPreview(slide)} aria-haspopup="dialog" aria-label={`Agrandir la diapositive ${slide.number} : ${slide.title}`}>
                    <span className="speech-slide-thumbnail-image"><img src={slidePreviewSource(slide)} alt="" loading="lazy" /></span>
                    <span className="speech-slide-number">{String(slide.number).padStart(2, '0')}</span>
                  </button>
                </section>
              );
            })}
          </article>
        </div>
      </dialog>
      <dialog ref={previewRef} className="speech-slide-preview" aria-label={previewSlide ? `Aperçu de la diapositive ${previewSlide.number}` : 'Aperçu de la diapositive'} onClose={() => setPreviewSlide(null)} onKeyDown={(event) => event.stopPropagation()}>
        <button type="button" className="float-button" onClick={() => previewRef.current.close()} aria-label="Fermer l’aperçu"><Icon name="close" /></button>
        {previewSlide && <img src={slidePreviewSource(previewSlide)} alt={previewSlide.title} />}
      </dialog>
    </>
  );
}

function SlideWireframe({ slide, onZoom, onOpenVideo }) {
  const content = `${mediaPath(slide.contentHtml)}${slide.sectionNumber && !slide.divider ? `<span class="chip">0${slide.sectionNumber} · ${slide.section}</span>` : ''}<span class="num">${slide.number}</span>`;
  return (
    <article className="preview-card wireframe-card">
      <div className="preview-card-heading"><span className="preview-dot wire-dot" /><strong>Maquette actuelle</strong></div>
      <div className={`frame slide-frame ${slide.className} slide-frame--wireframe`} onClick={(event) => {
        const clicked = event.target instanceof Element ? event.target : null;
        const videoButton = clicked?.closest('[data-demo]');
        if (videoButton) {
          event.preventDefault();
          onOpenVideo();
          return;
        }
        const target = clicked?.closest('[data-zoom]');
        if (target) onZoom(target.dataset.zoom);
      }} dangerouslySetInnerHTML={{ __html: content }} />
    </article>
  );
}

function slidePreviewSource(slide) {
  return `${import.meta.env.BASE_URL}${slide.customImage ? customSlideImagePath(slide.customImage) : slideImagePath(slide.sourceNumber ?? slide.number)}`;
}

function SlideHighFidelity({ slide, onZoom, allowZoom }) {
  const source = slidePreviewSource(slide);
  const image = <img src={source} alt={`Diapositive ${slide.number} : ${slide.title}`} draggable="false" />;
  return (
    <article className="preview-card final-card">
      <div className="preview-card-heading"><span className="preview-dot final-dot" /><strong>Rendu haute fidélité</strong></div>
      {allowZoom
        ? <button className="hifi-canvas" onClick={() => onZoom(source)} aria-label={`Agrandir la diapositive ${slide.number}`}>{image}</button>
        : <div className="hifi-canvas hifi-canvas--static">{image}</div>}
    </article>
  );
}

export default App;
