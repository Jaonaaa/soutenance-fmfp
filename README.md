# Préparation de la soutenance FMFP

Application React + Vite pour préparer les 29 diapositives, leur narration et le montage vidéo de démonstration. L’interface conserve le langage visuel du support existant : fond pointillé, trait manuscrit, bleu FMFP et cartes aux contours dessinés.

## Sources du support

- Le contenu structuré des diapositives (ordre, parties, HTML de la maquette, repères, narration et durée) est dans [`src/data/slides.json`](src/data/slides.json). Il a été porté depuis le `index.html` révisé du 2 novembre 2026.
- [`src/legacy-slides.css`](src/legacy-slides.css) conserve les règles visuelles de la maquette actuelle. Le rendu haute fidélité vient du PDF [`Soutenance_FMFP_29_diapos_illustree.pdf`](../output/canva-style-v1-refined/Soutenance_FMFP_29_diapos_illustree.pdf), rendu en 29 images sous `public/slides-hifi/` par [`scripts/render-pdf-slides.swift`](scripts/render-pdf-slides.swift). L’application ouvre les deux sources en comparaison ou en plein écran.
- Le texte de référence reste dans [`notes-canva-a-reporter.md`](notes-canva-a-reporter.md). La voix off chronométrée est dans [`video-demo-script.md`](video-demo-script.md), et sa chronologie dans [`src/data/video-timeline.json`](src/data/video-timeline.json). Le tiroir « Chronologie vidéo » lit `video/out/1&2&3.mp4` ; choisir une séquence place le lecteur à son début. Le MP4 est inclus par Vite mais n’est pas précaché hors ligne, car il pèse 19 Mo.
- L’atelier occupe la fenêtre sans défilement de page. La navigation des diapositives et le panneau de narration/chronologie s’ouvrent comme des volets repliables. La voix off reste éditable par clip ; les cartons sont signalés comme muets. Le lecteur de démonstration est disponible dans le tiroir de chronologie et depuis le bouton de la maquette de la diapositive 22.

## Utiliser l’application

Depuis ce dossier :

```bash
npm install
npm run dev
```

Les modifications de narration et de durée sont enregistrées dans le stockage local du navigateur. **Importer** et **Exporter** permettent de sauvegarder/restaurer la narration des diapositives et des scènes vidéo, ainsi que leurs durées. La durée totale de la vidéo se recalcule à chaque modification.

## Production et validation

```bash
npm run build
npm run preview
```

Vite est configuré pour le chemin GitHub Pages `/soutenance-fmfp/`. Le workflow [pages.yml](.github/workflows/pages.yml) compile `dist/` et le déploie à chaque push sur `main` ; la source GitHub Pages du dépôt doit être réglée sur **GitHub Actions**. Le service worker est généré pendant le build à partir de `service-worker.js` et met en cache l’application compilée et ses images pour le mode hors ligne. Il faut augmenter `CACHE_NAME` dans ce fichier quand les ressources changent.

Avant une publication, réaligner les faits, métriques et limites avec le mémoire révisé, puis vérifier le deck Canva et les notes orateur. Le déploiement se déclenche sur GitHub après un push ; `npm run build` ne publie pas le site.

## Sources académiques

- [Mémoire BIHAR — révision assistance métier](https://docs.google.com/document/d/1RErKYxmuakrnbvYlpcl3dBbDCQ5GQqD0sEkyAWJItVc/edit?tab=t.0)
- [Canva V2 — Soutenance FMFP](https://www.canva.com/design/DAHZaZtOuqk/01PuTDUUC4YzCQptHQfSJw/edit)
- Les preuves et notes de travail restent dans `../fmfp/stage_doc/` et ne sont pas publiées avec le site.
