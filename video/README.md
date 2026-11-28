# Vidéo de démonstration FMFP — guide pour un autre agent

Le montage de 5 min 38 suit le cas fictif BEMA : orientation, préparation du brouillon, contrôle des pièces et évaluation sur un dossier de test distinct. L’aperçu des conditions du guichet dure sept secondes. Deux cartons annoncent les changements d’étape.

## Pipeline
1. **Capture** (`scenes/NN-*.mjs`) : Playwright + Chrome pilotent l'app ; capture par CDP `Page.screencast` (JPEG q92, 1600×900) vers `out/rec-NN/` ; chaque scène écrit un **journal d'événements** `{k, t}` (temps, marqueur) sur la sortie standard → à enregistrer en `out/NN.events.json` pour caler zooms et halos au montage.
2. **Encodage** (`encode.sh out/rec-NN out/NN.mp4`) : MP4 H.264 30 i/s constant, `setpts=PTS-STARTPTS`, `+faststart`.
3. **Montage** (Remotion 4 ou ffmpeg) : cadre, stepper de chapitres, zooms 130–180 %, halos, pastilles de chiffres, bulle avant→après, curseur dessiné d'après le journal, sous-titres. Voir `../video-demo-script.md` §2.
4. **Voix** : enregistrement de l'orateur scène par scène, `highpass=80`, `afftdn`, `loudnorm=I=-16`. Piste repère possible avec `say -v Thomas -r 150`.
5. **Export** : MP4 1920×1080 CRF 16 + `.srt` ; copie légère pour la diapo 22.

## Montage modifiable des clips

L'assemblage des scènes 01 et 02 est décrit dans `timeline-1-2.json`. `timeline-1-2-3.json` ajoute la scène évaluateur. Le carton final facultatif est séparé. Pour ajuster le début, la fin ou la vitesse d'un clip, modifiez `start`, `end` et `speed` dans son bloc, puis lancez depuis ce dossier :

```bash
python3 render-video.py timeline-1-2.json
```

`start` et `end` sont en secondes dans le clip source ; `end: null` va jusqu'à sa fin. `speed: 1.0` garde la vitesse normale, `1.5` accélère, et `0.8` ralentit. Le premier fichier de configuration rend `out/1&2.mp4` ; le second rend `out/1&2&3.mp4`.

Dans `timeline-1-2-3.json`, les segments `type: "image"` sont des cartons fixes : modifiez leur `duration` pour régler le temps à l'écran. Leurs compositions restent éditables dans `scenes/transitions/*.html` ; `node render-transitions.mjs` recrée les PNG à 1600×900 avant l'assemblage. La police Virgil d'Excalidraw est dans `assets/fonts/` avec sa licence SIL OFL.

Les dossiers `out/rec-*` contiennent les images JPEG brutes d'une prise. Après vérification du MP4 et conservation de son journal `.events.json`, ils peuvent être supprimés ; les scripts de scène les recréent lors d'une nouvelle capture.

## Prérequis (poste local)
- Services : Apache (`plateforme-fmfp.local`), MySQL et `fmfp-ml` sur le port 8100 (`cd fmfp-ml && ./run.sh`).
- `npm i` dans ce dossier ; Chrome installé (`channel:'chrome'`) ; `ffmpeg` (Homebrew).
- Utiliser le compte entreprise BEMA déjà préparé dans la base locale. Les identifiants restent hors des fichiers versionnés et sont fournis au script par variables d’environnement ; ne pas les inscrire dans le dépôt.
- Connexion par script : `ENT_CNAPS='<identifiant local>' ENT_CODE='<code local>' node login.mjs ent` → `.state/ent.json`.
- Pour la scène 02, `ENT_FORM_URL` pointe vers le brouillon BEMA déjà préparé. Le brouillon reste non soumis. Ne pas en créer un nouveau depuis la carte « Soumettre ».

Capture de la scène 02, après connexion et démarrage des services :

```bash
DEMO_TRAINER_CV_WRONG='out/CV_demo_nonconforme.docx' DEMO_TRAINER_CV_CORRECT='out/CV_demo_canevas_conforme.docx' DEMO_ANNUAL_PLAN='out/Demo_Plan_Formation_Annuel_Fictif.xlsx' DEMO_FUNDING_LETTER='out/Demo_Lettre_Demande_Financement_Fictive.pdf' DEMO_TRAINER_CV_RESET_LEGACY=1 ENT_FORM_URL='http://plateforme-fmfp.local/formulaire/soumission/formulaire_demande_RIE/13847/22778' node scenes/02-deposer.mjs
./encode.sh out/rec-02 out/02-deposer.mp4
```

La scène 03 utilise un dossier local réservé aux essais évaluateur. Son identifiant est conservé dans `.state/evaluator-fixture.json` (dossier ignoré par Git) :

```bash
ADM_USER=admin ADM_PASS='<mot de passe local>' node login.mjs adm
STATE=.state/adm.json node scenes/03-evaluer.mjs
./encode.sh out/rec-03 out/03-evaluer.mp4
```

Le même dossier de test est réutilisé pour toutes les prises : son identifiant est lu dans `.state/evaluator-fixture.json`. Il reprend les données et pièces fictives du scénario textile, est soumis uniquement dans la base locale et affecté au compte administrateur de test pour apparaître dans sa file d'évaluation. Chaque prise efface l'ancienne conversation de l'assistant pour montrer un seul échange propre. Les requêtes IA suivent la configuration habituelle du service ML. Le brouillon de la vidéo 02 (n° 22778) reste distinct et non soumis. Dans la scène 03, le commentaire d'évaluation est enregistré uniquement pour la prise puis restauré à son contenu initial après l'arrêt de la capture ; aucune réponse de grille ni décision n'est enregistrée.

Les quatre documents restent des fichiers locaux dans `out/`, dossier ignoré par Git. Le CV conforme est entièrement fictif et porte la mention « SIGNATURE DE DÉMONSTRATION - FICTIVE - NON VALABLE » : son image ne constitue pas une vraie signature. Les deux autres pièces sont un plan annuel XLSX et une lettre de financement PDF, marqués fictifs et non valables ; la lettre ne porte aucune vraie signature. Le CV non conforme sert uniquement à montrer le contrôle et son remplacement. Le script précharge le plan et la lettre dans le brouillon BEMA avant l'enregistrement, puis montre les trois cartes requises complètes après correction. Il n'envoie jamais le dossier. Les noms visibles sont floutés ; le nom peut recevoir un suffixe horodaté. Ne jamais ajouter les documents, vidéos ou journaux de `out/` à Git.

Le drapeau `DEMO_TRAINER_CV_RESET_LEGACY=1` autorise la remise à zéro d'un CV connu de démonstration dans ce brouillon. Le script refuse les pièces inconnues ou les doublons et précharge les deux documents fictifs manquants avant la prise. Il remplit les rubriques, le cahier des charges et le budget avec une retombée volontairement trop vague. Le chat « Assistant du dossier » affiche son retour contextualisé ; l'entreprise corrige le champ et la synthèse le recontrôle. Le contrôle inline commence avec le CV seul manquant. Le script fait défiler les résultats, ajoute le CV fictif non conforme et met en évidence les écarts de structure. Il le remplace ensuite par le CV fictif conforme, vérifie les trois cartes annexes vertes et termine sur « Dossier cohérent ». Les pauses sur les champs importants et le défilement sont lisibles, sans prolonger le résultat final. Le conseil du chat, le contrôle du CV et l'audit de synthèse sont trois résultats distincts. Le dossier n'est jamais envoyé : ne pas cliquer sur **Soumettre le projet** ni sur une confirmation d'envoi. Le code BEMA reste fourni uniquement à `login.mjs` via `ENT_CODE` et n'est pas stocké dans le dépôt.

## Règles de capture (obligatoires)
- **Attendre la fin du chargement avant de lancer l'enregistrement** : `goto` puis `waitReady(p)` (attend que `#ent-page-overlay` disparaisse). Sans cela, le début de la vidéo est un écran gris flou, et le lecteur affiche du noir pendant plusieurs secondes.
- **Toujours encoder avec `encode.sh`** (réinitialise les horodatages). L'ancienne commande ffmpeg sans `setpts` produisait un flux démarrant à 5,8 s, donc un **écran noir de ~6 à 10 s** à la lecture.
- Vérifier chaque export : `ffprobe -show_entries stream=start_time` doit afficher `0.000000` ; `ffmpeg -i x.mp4 -vf blackdetect=d=0.2:pix_th=0.2 -f null -` ne doit rien signaler ; regarder la première image.
- **Défilement fidèle au portail entreprise** : la navigation `.sb` reste fixe et le contenu défile dans le vrai `<main class="main">` (`overflow-y:auto`). Placer le pointeur dans `.main`, jamais sur `body` ou la fenêtre. Toute marge de capture doit être `aria-hidden`, à l'intérieur de `.main`, puis retirée au changement d'étape ; ainsi le clavier et les lecteurs d'écran ne rencontrent aucun contrôle fictif.
- Souris : `glide/click/type` de `lib.mjs` (courbes ease-in-out, frappe 32–90 ms/caractère). Le curseur injecté n'apparaît pas dans la capture headless : le dessiner au montage.
- Données : noms/identités masqués comme dans `soutenance/img/captures-locales.json` ; messagerie nettoyée (pas de « fds », contenus masqués).
- Pour le brouillon n° 22778, montrer le contrôle inline de synthèse, corriger l'anomalie volontaire, puis montrer l'état recalculé et l'audit inline actualisé. Ces contrôles n'envoient pas le dossier ; ne pas cliquer sur **Soumettre le projet**. Les annexes fabriquées pour la démonstration doivent rester clairement fictives et ne jamais être présentées comme des justificatifs réels.
- Chargements longs (modèle externe) : accélérer ×3–×4 au montage ; prévoir une prise avec résultat mémorisé.

## Scènes : instructions action par action
Temps cibles = `../video-demo-script.md` § Déroulé. La vidéo finale ne montre pas un dossier évaluateur séparé.

| # | Scène | Session | Étapes à scripter |
|---|---|---|---|
| 00 | Titre | — | Carton BEMA · sécurité et qualité textile |
| 01 | Orienter | `ent` | `goto /entreprises/appel_projet` → `waitReady` → ouvrir le conseiller → montrer objectif et contexte → lancer l’orientation → souligner brièvement la recommandation expliquée. **Fait** : `scenes/01-orienter.mjs` |
| 02 | Déposer et vérifier | `ent` | Ouvrir d’abord la configuration RIE39 issue de la scène 01 → afficher « Requête individuelle », le secteur textile et l’intitulé « Sécurité et qualité en atelier textile » → ne pas cliquer sur « Démarrer » → reprendre le brouillon local déjà préparé → remplir les rubriques, demander le conseil IA, corriger la retombée, remplacer le CV et vérifier les trois annexes → terminer sur « Dossier cohérent », sans envoyer |
| 03 | Évaluer avec l'IA | `adm` | Présenter les outils, scores, critères et preuves → contrôle de cohérence → dossiers comparables → question contextualisée → générer et reformuler le brouillon → appliquer la réécriture à « Pertinence » → l'insérer comme appréciation et l'enregistrer sans l'envoyer → montrer le commentaire à côté de la grille de réponses vide. Après l'arrêt de la capture, restaurer le commentaire à son contenu initial. Aucun score ni décision. Script : `scenes/03-evaluer.mjs` |
| 04 | Conclusion (facultatif) | — | Carton de 5 s « Résultats et limites · Dossier cohérent · brouillon non soumis ». Ressources : `scenes/04-conclusion.html` et `scenes/04-conclusion.mjs` |

## État au 2 novembre 2026
- **Fait** : scène 01 révisée et exportée à 22,4 s (1600×900, 30 i/s, horodatage initial à 0, sans noir détecté). L'objectif ne répète plus l'effectif ; le panneau du conseiller est agrandi et défilé jusqu'au guichet recommandé, mis en évidence en vert. La capture attend la vraie réponse et coupe 0,94 s d'attente pour ne laisser qu'environ 1,15 s de chargement visible. Résultat observé : « Requête individuelle · recommandée · adéquation partielle 99/100 · appel ouvert RIE39 · 6 conditions ». Détails et positions dans `out/01.events.json` ; essai : `out/01-orienter-essai.mp4`.
- **Fait — prise autonome actuelle** : scène 03 dure 174,03 s. Elle met en évidence les cinq outils IA, distingue prédiction historique, score ajusté aux règles FMFP et grille de réponses humaine, puis montre 15 critères, leur raisonnement et les extraits des pièces sources. Elle poursuit avec la cohérence des modules, les dossiers comparables (signal sémantique IA séparé de la proximité textuelle, calendrier et méthode), une question contextualisée et le brouillon d'appréciation en cinq rubriques. L'évaluateur demande une reformulation, l'applique à « Pertinence », insère les cinq rubriques dans l'appréciation et enregistre le commentaire sans l'envoyer. La prise finit avec ce commentaire visible à côté de la grille vide. Après l'arrêt de la capture, le script restaure le commentaire initial et vérifie sa restauration ; aucune réponse de grille ni décision n'est enregistrée. Les attentes de calcul sont raccourcies dans l'export. Détails et temps dans `out/03.events.json`, clip autonome `out/03-evaluer.mp4`.
- **Carton final facultatif** : cinq secondes, déplacé en scène 04. Il rappelle « Résultats et limites » et « Dossier cohérent · brouillon non soumis » sans présenter un contrôle comme une décision de financement.
- **Scène 02 — prise réactualisée** : `out/02-deposer.mp4` (durée recalculée à chaque prise, 1600×900, 30 i/s, départ à 0, sans écran noir). Elle commence par la configuration du même appel RIE39 que la scène 01 : type « Requête individuelle », secteur textile et intitulé identique au brouillon préparé. « Démarrer » n’est pas cliqué ; la prise reprend le brouillon existant. Le plan annuel et la lettre fictive sont préchargés dans le brouillon avant la prise. Le champ de retombées est remonté et surligné après un défilement d'environ 1,4 s ; le contrôle inline passe de 1 point (CV absent) à 4 avec le CV non conforme, puis à « Dossier cohérent » après remplacement. Les défilements restent dans le vrai `<main class="main">` du portail ; la barre latérale fixe ne bouge pas. Le bloc du CV non conforme est descendu pour cadrer la carte et ses quatre constats. La marge de défilement temporaire reste dans `.main`, est masquée aux technologies d'assistance et est retirée au changement d'étape. Les toasts de l'application sont masqués sur toutes les pages. À la fin des annexes, les trois cartes sont visibles et le CV est remonté au centre. Les 26,47 s d'attente réelle du dernier audit sont coupées, avec 0,9 s de chargement conservée. Le bouton « Soumettre le projet » est disponible à la fin mais n'est pas cliqué.
- **Assemblage courant** : `out/1&2&3.mp4` réunit les scènes 01, 02 et 03 à vitesse normale, avec deux cartons illustrés de 2,4 s (5 min 36, 1600×900, 30 i/s). Le MP4 muet est déjà intégré au lecteur du tiroir « Chronologie vidéo » de l’application locale ; ses segments permettent de vérifier les repères de voix off. Le carton final facultatif reste séparé. **À faire ensuite** : enregistrer la narration et réaliser le montage visuel final. La voix off enregistrée et les sous-titres restent facultatifs ; le rendu destiné à la présentation et à la diapo 22 reste à valider.
- **Pièges connus** : compte `9Z1234` bloqué après 4 échecs ; `sed -i` sur macOS exige `''` ; le screencast renvoie 1600×813 si la fenêtre est plus petite (l'encodage ajoute du blanc) ; les captures statiques de `soutenance/img/` restent le plan B.

## Note d'avancement — scène 2 (1er au 2 novembre 2026)
- Le brouillon BEMA n° 22778 de l'appel 13847 est repris directement ; son statut reste non soumis.
- **Prise réactualisée le 2 novembre** : le contrôle inline montre 1 point quand seul le CV manque → 4 constats avec le CV non conforme → « Dossier cohérent » après son remplacement par le CV fictif marqué. Le plan annuel et la lettre fictifs sont préchargés avant la capture. Le champ rouge est remonté après défilement ; la carte du CV non conforme et ses quatre constats sont visibles avant le remplacement. Tous les mouvements verticaux restent dans `.main`, ce qui garde la barre latérale immobile ; la marge temporaire, masquée aux lecteurs d'écran, est retirée au changement d'étape. Les trois cartes requises sont ensuite montrées complètes avec un défilement progressif ; le CV est centré et entièrement lisible. Les toasts de l'application restent masqués. La vérification finale reste à l'écran environ deux secondes. L'attente du dernier audit est raccourcie à 0,9 s ; le journal suit le temps de l'export. Le bouton de soumission est disponible mais aucun clic d'envoi n'est fait. Durée : 121,73 s.
- Le journal des marqueurs est dans `out/02.events.json`. La narration reste à enregistrer et le montage (curseur, zooms, halos, sous-titres) reste à faire.
## Compte de démo BEMA (local uniquement)

Les identifiants du compte de démonstration restent locaux et ne sont pas versionnés.
Le script de connexion lit les valeurs depuis les variables système décrites plus haut.
La base de démonstration est locale et n’est pas présente en production.

### Mise à jour — 2 novembre 2026 : annexes de démonstration et scène 02
- Création dans `out/` de deux documents fictifs : `CV_demo_nonconforme.docx` pour le premier contrôle et `CV_demo_canevas_conforme.docx` pour le remplacement. Le second respecte les huit contrôles structurels ; le cartouche « SIGNATURE DE DÉMONSTRATION - FICTIVE - NON VALABLE » exclut tout usage réel. Une image graphique présente dans le CV n'est pas une signature authentique.
- Le plan de formation annuel (`Demo_Plan_Formation_Annuel_Fictif.xlsx`) et la lettre (`Demo_Lettre_Demande_Financement_Fictive.pdf`) sont fictifs et marqués non valables. La lettre est en PDF parce que la validation serveur locale a rejeté son DOCX malgré l'extension annoncée dans le champ de dépôt. Ces deux pièces et les CV restent dans `out/`, ignoré par Git.
- La prise dure 121,73 s. Elle montre le retour du chat, la correction et son recontrôle, un premier audit à un point (CV absent), quatre constats avec le CV non conforme cadrés dans la carte du CV, les trois cartes annexes complètes, puis l'audit final « Dossier cohérent ». Les défilements restent dans `.main` et la barre latérale fixe reste stable. Le champ rouge est aussi remonté pour rester bien visible. La marge de défilement temporaire est masquée aux technologies d'assistance et retirée avant l'étape suivante. Les toasts sont masqués et le CV est centré dans la dernière vue des annexes. Le bouton de soumission n'est pas cliqué. Les marqueurs sont dans `out/02.events.json` ; le chargement final est réduit à 0,9 s et les temps des événements après la coupe sont recalés.
