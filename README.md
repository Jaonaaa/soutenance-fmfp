# Préparation de la soutenance FMFP

Application React + Vite pour préparer les 29 diapositives, leur narration et le montage vidéo de démonstration. L’interface conserve le langage visuel du support existant : fond pointillé, trait manuscrit, bleu FMFP et cartes aux contours dessinés.

## Sources du support

- Le contenu structuré des diapositives (ordre, parties, HTML de la maquette, repères, narration et durée) est dans [`src/data/slides.json`](src/data/slides.json). Il a été porté depuis le `index.html` révisé du 2 novembre 2026.
- La [source Markdown du contenu](Contenu_soutenance_par_diapositive.md) décrit les diapositives et les actions de démonstration. Pour chaque prise, la voix off de `src/data/video-timeline.json` est insérée dans la section correspondante sous forme de tableau à deux colonnes (repère de prise et texte à dire). Les repères globaux et relatifs restent distincts.
- [`src/legacy-slides.css`](src/legacy-slides.css) conserve les règles visuelles de la maquette actuelle. Les 29 aperçus JPG sont sous `public/slides-hifi/`, rendus par [`scripts/render-pdf-slides.swift`](scripts/render-pdf-slides.swift) depuis le PDF de production conservé localement. Le PDF et les fichiers PPTX restent hors du dépôt et de la publication. L’application ouvre la maquette et les aperçus en comparaison ou en plein écran.
- Le texte de référence reste dans [`notes-canva-a-reporter.md`](notes-canva-a-reporter.md). La voix off chronométrée est dans [`video-demo-script.md`](video-demo-script.md), et sa chronologie dans [`src/data/video-timeline.json`](src/data/video-timeline.json). En développement, le tiroir « Chronologie vidéo » lit le fichier local ignoré `video/out/1&2&3.mp4` ; choisir une séquence place le lecteur à son début. Le montage n’est pas envoyé dans le dépôt ni inclus dans la version publiée. La chronologie et la voix off restent disponibles en ligne.
- L’atelier occupe la fenêtre sans défilement de page. La navigation des diapositives et le panneau de narration/chronologie s’ouvrent comme des volets repliables. La voix off reste éditable par clip ; les cartons sont signalés comme muets. En développement local, le lecteur est disponible dans le tiroir de chronologie et depuis le bouton de la maquette de la diapositive 22.

La diapositive 6 présente le problème métier mesuré : 7,95 jours sans commentaire de réserve (77 dossiers), contre 18,81 jours avec au moins deux commentaires (51 dossiers). Le groupe à un commentaire ne compte qu’un dossier. Ces jours calendaires incluent les attentes; ils ne mesurent pas l’effet de l’IA. La diapositive 27 présente le pilote proposé pour mesurer les réserves évitables, la qualité des constats et le temps actif. L’ancienne diapositive 17 de transition est supprimée; le total reste à 29 et la durée indicative reste identique. Les identifiants des pages conservées restent stables pour préserver les notes personnelles dans le navigateur.

Les valeurs sont issues de la section 9.5 et de l’annexe N du mémoire révisé. Les notes à reporter dans Canva sont mises à jour localement; le deck Canva et ses notes ne sont pas synchronisés par cet export. Les fichiers d’analyse détaillés restent dans le dossier local de travail.

Pour reconstruire le PPTX révisé avec les formes et textes natifs, ainsi que le document Word de contenu :

```bash
uv run --with python-pptx --with python-docx --python 3.12 python scripts/export-reserves-deck.py
FONTCONFIG_FILE=/opt/homebrew/etc/fonts/fonts.conf soffice --headless --convert-to pdf --outdir ../output/soutenance-reserves-20261107 ../output/soutenance-reserves-20261107/Soutenance_FMFP_29_diapos_reserves.pptx
swift scripts/render-pdf-slides.swift ../output/soutenance-reserves-20261107/Soutenance_FMFP_29_diapos_reserves.pdf public/slides-hifi
uv run --with python-pptx --with python-docx --python 3.12 python scripts/export-reserves-deck.py --handout-only
```

Les aperçus utilisent la révision définie dans `src/deck-assets.mjs`, également utilisée par le précache hors ligne. Augmenter cette révision lorsque les images du deck changent pour éviter l’affichage d’une ancienne page mise en cache.

Le dessin de la diapositive 6 est défini dans `comparison_slide()` du script d’export : deux grandes illustrations de dossiers, les deux durées et leur écart, sans axes ni tableau. Les effectifs, le cas isolé et les définitions détaillées sont conservés dans les notes orateur. Cette composition génère à la fois les formes et textes natifs du PPTX et le SVG de la maquette (`public/img/reserves-delais.svg`, avec une copie sous `img/`). Les illustrations évoquent les échanges de correction; elles ne reconstituent pas des cycles observés dans l’historique.

## Utiliser l’application

Depuis ce dossier :

```bash
npm install
npm run dev
```

Les modifications de narration et de durée sont enregistrées dans le stockage local du navigateur. **Importer** et **Exporter** permettent de sauvegarder/restaurer la narration des diapositives et des scènes vidéo, ainsi que leurs durées. La durée totale de la vidéo se recalcule à chaque modification.

Pour répéter, cliquer sur **Répéter** dans la barre principale, puis sur le bouton de lecture du studio. Les commandes de lecture, pause, recommencement et navigation sont regroupées sous le texte. **Espace** démarre ou met en pause. Le sélecteur **Écrire / Répéter** permet de revenir à l’édition.

La **voix française** est activée par défaut si le navigateur en propose une. Thomas est sélectionné en priorité lorsqu’il est disponible. Ouvrir le nom de la voix pour choisir une autre voix française, régler la vitesse entre 0,7× et 1,4× ou écouter un exemple. Les préférences restent enregistrées sur cet appareil. Cette lecture utilise les voix du navigateur, sans clé API ni serveur supplémentaire ; les voix proposées dépendent du système et certaines nécessitent une connexion.

Avec la voix, le surlignage suit les événements des mots prononcés lorsque le navigateur les fournit. Sinon, sa position est estimée dans chaque phrase et recalée à la phrase suivante. La diapositive avance à la fin du discours et de sa transition, sans couper une phrase pour respecter le chrono. Le compteur affiche la durée cible restante, puis le dépassement éventuel ; le temps écoulé reste visible sous le texte. La vidéo de la diapositive 22 conserve sa piste audio : la synthèse lit uniquement son introduction et la transition finale.

Sans voix, le karaoké suit la durée prévue avec un rythme tenant compte des mots et de la ponctuation. Les intercalaires durent au moins trois secondes ; une diapositive sans durée utilise une estimation à 125 mots par minute. Cliquer sur un mot permet de se recaler. Le curseur de lecture met en pause pour choisir une position ; **↑ / ↓** reculent ou avancent d’environ trois secondes dans le texte. L’aide clavier reste disponible sous les commandes. Quitter le panneau arrête la synthèse ; masquer l’onglet met la répétition en pause.

Les tests du rythme et du lecteur vocal (voix simulées) se lancent avec `node --test scripts/tests/*.test.mjs`. La qualité de la voix et les événements de mots doivent aussi être vérifiés dans le navigateur cible.

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
