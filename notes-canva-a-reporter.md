# Notes du présentateur à reporter dans Canva

Source : discours de `index.html`. Ordre des 32 pages du Canva `Soutenance_Master_editable.pptx`.

Les phrases « Transition » se disent avant de passer à la page suivante. Les intercalaires servent uniquement de pause visuelle.

## Page 1

Durée indicative : 40 s.

Bonjour à toutes et à tous, merci d'être présents aujourd'hui. Je vais vous présenter le fruit de mon travail au Fonds Malgache de Formation Professionnelle, le FMFP. Mon travail est parti d'une question concrète : comment aider les équipes à évaluer les demandes de financement quand les informations utiles sont réparties entre plusieurs parties du dossier ? J'ai conçu un système d'aide à la décision qui rassemble ces éléments, met en évidence les points à vérifier et propose des repères pour l'évaluation. Je vais vous présenter le problème rencontré, la démarche suivie, puis vous montrer ce que le système apporte en pratique.

Transition : « Voici le parcours de cette présentation. »

Repère : Marquer une courte pause après le problème ; garder les détails pour la suite.

## Page 2

Durée indicative : 20 s.

Je vais d'abord vous présenter le contexte et le problème rencontré. Puis la façon dont j'ai travaillé, ce que j'ai construit, ce que ça donne vraiment — avec ses limites — et enfin ce que j'en retiens.

Transition : « Et pour commencer, il faut comprendre ce qu'est le FMFP. »

## Page 3 — intercalaire

Partie : Introduction et contexte. Pause visuelle : aucun discours à lire.

## Page 4

Durée indicative : 50 s.

Au FMFP, les entreprises versent une cotisation égale à 1 % des salaires qu'elles paient. Le fonds est géré par les employeurs, les syndicats et l'État. [pause] Cet argent finance des formations pour les salariés, les jeunes et les travailleurs du secteur informel. Depuis 2019, plus de 70 000 salariés ont été formés dans les 23 régions. Pour obtenir cette aide, une entreprise doit déposer un dossier.

Transition : « Voyons ce que contient ce dossier et comment il est traité. »

Repère : Chiffres : bilan public 2024 (fmfp.mg). Les dire de mémoire, sans lire.

## Page 5

Durée indicative : 50 s.

Dans ce dossier, on trouve son projet, les modules de formation, les salariés concernés, le budget, le prestataire, et les pièces justificatives. Ce dossier passe ensuite par plusieurs étapes : on vérifie qu'il est complet, qu'il est éligible, puis vient l'étape clé — l'évaluation. Un évaluateur analyse le dossier avec une grille de critères, lui donne une note et rédige un avis. Ensuite seulement, la direction décide.

Transition : « C'est cet évaluateur que nous allons suivre. »

## Page 6

Durée indicative : 45 s.

Imaginez. Lundi matin. Un évaluateur ouvre le dossier d'un projet du BTP : quinze bénéficiaires, qui veulent se former à AutoCAD, à la planification et à l'établissement des devis. Pour se faire un avis, il doit ouvrir le budget… les pièces… les cotisations… les modules… les bénéficiaires… Huit rubriques. [pause] Rien ne manque vraiment. Mais tout est dispersé. Gardez ce dossier en tête : il va nous accompagner jusqu'à la fin.

Transition : « Et en observant ce travail, j'ai relevé trois difficultés. »

Repère : Ce dossier BTP devient le fil rouge de toute la présentation.

## Page 7 — intercalaire

Partie : Problématique et objectifs. Pause visuelle : aucun discours à lire.

## Page 8

Durée indicative : 40 s.

Première difficulté : l'information est dispersée. Deuxième : les règles changent selon le type de financement demandé. Troisième : presque tout est vérifié à la main. Résultat : un nombre de bénéficiaires qui change d'une rubrique à l'autre, ou une rubrique laissée vide, peut tout simplement passer inaperçu.

Transition : « D'où la question qui a guidé tout mon stage. »

## Page 9

Durée indicative : 30 s.

Comment aider les équipes du FMFP à analyser les dossiers plus clairement, tout en gardant une décision humaine, expliquée et conforme aux règles ? [pause] Mon objectif était de rendre les points à vérifier plus visibles et de faciliter la première lecture du dossier. Le gain de temps sur l'instruction complète reste à mesurer.

Transition : « Et pour y répondre, je me suis fixé une règle dès le premier jour. »

## Page 10

Durée indicative : 20 s.

L'IA conseille. Elle ne décide jamais. [pause] Un score, une alerte, une suggestion : ce sont des aides à la lecture. La décision reste toujours celle d'une personne. Tout ce que je vais vous montrer découle de cette règle.

Transition : « Concrètement, l'équipe avait quatre besoins. »

## Page 11

Durée indicative : 40 s.

Voir ce qui manque : ce seront des alertes automatiques. Comprendre un risque : un score, toujours expliqué. Bien orienter l'entreprise : un conseiller de guichet. Et suivre le dossier dans le temps : un historique, une comparaison des versions et une messagerie.

Transition : « Restait à choisir comment les construire. »

## Page 12 — intercalaire

Partie : Démarche de réalisation. Pause visuelle : aucun discours à lire.

## Page 13

Durée indicative : 50 s.

J'ai d'abord étudié ce qui existe. Et j'ai choisi avec un critère principal : pouvoir expliquer chaque résultat à un évaluateur. Pour le score, un modèle de gradient boosting, reconnu sur ce type de données. Pour l'orientation, les règles du FMFP, parce qu'il n'y avait pas assez d'historique pour faire plus complexe. Pour les alertes, des règles explicites : chaque alerte a une raison lisible. Et un service séparé, qu'on peut retirer sans rien casser.

Transition : « Mais il y avait une contrainte forte. »

Repère : Si le jury creuse : l'état de l'art complet est au chapitre 3 du mémoire.

## Page 14

Durée indicative : 50 s.

La contrainte, c'est que la plateforme du FMFP tourne en production. Tous les jours, des entreprises et des évaluateurs l'utilisent. Pas question de tout réécrire. J'ai donc avancé par petites étapes. D'abord un premier prototype, juste pour vérifier que toute la chaîne fonctionnait. Puis l'intégration dans les écrans, l'assistant IA… et enfin la mise en production. Chaque étape testée avant de passer à la suivante.

Transition : « Voyons maintenant comment tout cela s'organise. »

## Page 15 — intercalaire

Partie : Architecture et fonctionnalités. Pause visuelle : aucun discours à lire.

## Page 16

Durée indicative : 50 s.

L'idée centrale est simple : séparer celui qui décide de celui qui calcule. La plateforme garde les utilisateurs, les règles et la décision. À côté, un service d'analyse lit les données — sans jamais les modifier — calcule, et explique. Chaque échange est sécurisé et tracé. Et si le service tombe en panne ? La plateforme continue de fonctionner, comme avant.

Transition : « Et maintenant, reprenons notre dossier BTP. »

Repère : Détail technique si on vous le demande : CodeIgniter 3 / FastAPI, contrat JSON validé, jeton Bearer, request_id.

## Page 17

Durée indicative : 25 s.

Plutôt que de vous lister des modules, nous allons le suivre du début à la fin. Cinq étapes : orienter, vérifier, évaluer, corriger… et échanger. [pause] Et à chaque étape, l'IA aide la bonne personne : l'entreprise quand elle prépare son dossier, l'évaluateur quand il l'analyse.

Transition : « Tout commence avant même que le dossier soit déposé. »

## Page 18

Durée indicative : 50 s.

Notre entreprise ne sait pas quel financement demander. Elle décrit son besoin. L'outil regarde son secteur, sa taille, ses cotisations… et lui propose le guichet adapté, en expliquant pourquoi. Et s'il n'y a rien de compatible ? Il ne propose rien. [pause] C'est voulu : mieux vaut aucune réponse qu'une mauvaise réponse.

Transition : « Le dossier est déposé. Il faut maintenant le vérifier. »

## Page 19

Durée indicative : 1 min.

Il y a en fait deux assistants. Le premier accompagne l'entreprise : il l'aide à compléter son dossier avant de le soumettre. Le second accompagne l'évaluateur, quand le dossier arrive au FMFP. [pause] Vous vous souvenez de notre lundi matin ? Cette fois, l'évaluateur demande simplement : qu'est-ce qui manque dans ce dossier ? Et l'assistant relève huit points, classés par priorité. Ici, la problématique du projet n'est pas renseignée. Là, le nombre de bénéficiaires n'est pas le même d'une rubrique à l'autre : 11 d'un côté, 15 de l'autre. Il ne corrige rien : il dit à l'évaluateur quoi vérifier.

Transition : « Le dossier est vérifié. L'évaluateur peut maintenant l'évaluer. »

Repère : Preuve si on vous la demande : les 144 champs des formulaires ont été audités, aucun n'est oublié.

## Page 20

Durée indicative : 1 min.

La grille reste au centre : seule la note saisie par l'évaluateur devient officielle. À côté, l'assistant affiche un risque de rejet calculé par le modèle, puis un score indicatif ajusté par les règles du FMFP. Il peut aussi proposer des notes par critère de la grille. Ces trois valeurs sont des aides à vérifier ; l'évaluateur remplit la grille et rédige lui-même son avis.

Transition : « Imaginons maintenant que l'évaluateur demande une correction. »

Repère : Si on vous le demande : trois scores en réalité — grille, modèle, et final (modèle + règles FMFP).

## Page 21

Durée indicative : 1 min.

L'évaluateur trouve le budget trop élevé. Il met le dossier en réserve. L'entreprise corrige et renvoie. Avant, une question revenait sans cesse : qu'est-ce qui a changé ? Il fallait tout relire. Maintenant, chaque modification est tracée : qui, quand, avant, après. Et l'évaluateur voit les deux versions côte à côte. En rouge ce qui a été retiré, en vert ce qui a été ajouté. Il repère les changements sans relire tout le dossier.

Transition : « Pour que cette correction se fasse sans perdre le fil, les échanges restent dans le dossier. »

## Page 22

Durée indicative : 45 s.

Avant, la demande de correction partait par e-mail… et parfois se perdait. Maintenant, chaque dossier a sa propre messagerie. Dès la mise en réserve, la discussion s'ouvre automatiquement. L'entreprise répond, joint son nouveau devis… et tout reste attaché au dossier.

Transition : « Et pour la direction, il fallait une vue d'ensemble. »

## Page 23

Durée indicative : 30 s.

Une seule question compte : où est-ce que ça bloque ? Le tableau de bord y répond d'un coup d'œil : combien de dossiers sont en cours, à quelle étape ils attendent le plus, et combien aboutissent.

Transition : « Voyons maintenant ce que montrent les tests, et les limites du système. »

## Page 24 — intercalaire

Partie : Résultats et garde-fous. Pause visuelle : aucun discours à lire.

## Page 25

Durée indicative : 1 min.

J'ai comparé deux modèles sur 1 635 dossiers déjà décidés. Au seuil qui déclenche l'avertissement, V2 signale environ 6 % des dossiers. Parmi ses alertes, 37 % concernent effectivement un rejet, et elle retrouve 46 % des rejets. V1 en retrouve davantage, 80 %, mais signale 26 % des dossiers, avec beaucoup plus de fausses alertes. J'ai retenu V2 pour limiter la charge de vérification. Ce choix a un prix : plus d'un rejet sur deux n'est pas signalé. Le seuil devra être discuté avec les évaluateurs du FMFP.

Transition : « Ce choix reste limité par ce que montre le test dans le temps. »

Repère : À nombre d'alertes égal, V1 et V2 se valent. Le seuil doit être validé avec le FMFP.

## Page 26

Durée indicative : 40 s.

Dans un test plus exigeant, j'ai appris sur les dossiers les plus anciens pour prédire les suivants. Le F1 macro tombe autour de 0,53, et très peu de rejets sont retrouvés. [pause] Deux causes sont possibles : seulement 261 dossiers étaient disponibles pour l'apprentissage, et les dossiers ont peut-être évolué dans le temps. Je ne peux pas encore les séparer. Le score reste donc un repère à vérifier, pas une prédiction fiable pour une nouvelle période.

Transition : « C'est pourquoi tout le système est entouré de garde-fous. »

## Page 27

Durée indicative : 50 s.

Le système a plusieurs garde-fous. La décision reste humaine. Le service d'analyse lit le dossier sans modifier les données métier. Si ce service est indisponible, l'évaluateur peut continuer son travail à la main, et chaque appel est tracé. Plus de 1 200 tests automatiques vérifient le logiciel. La procédure de retour à la version précédente est développée, mais son déclenchement volontaire reste à tester en préproduction.

Transition : « Mais plutôt que de vous le décrire, je vous propose de le voir. »

## Page 28

Durée indicative : 3 min.

Je reprends notre dossier BTP, dans le même ordre que tout à l'heure. [démonstration]

Transition : « Pour conclure, revenons à notre lundi matin. »

Repère : Scénario complet : bouton « Ouvrir le scénario » ou touche S. Démo en direct, vidéo de secours découpée par étape.

## Page 29 — intercalaire

Partie : Conclusion et échanges. Pause visuelle : aucun discours à lire.

## Page 30

Durée indicative : 1 min.

Avant, l'évaluateur devait croiser plusieurs rubriques pour commencer son analyse. Maintenant, les points à vérifier sont regroupés, les modifications sont visibles côte à côte et les échanges restent liés au dossier. Cela facilite sa première lecture et devrait lui faire gagner du temps. Le gain sur la durée complète d'instruction n'a pas encore été chronométré : c'est une mesure à mener avec les équipes du FMFP.

Transition : « Et pour la suite ? »

## Page 31

Durée indicative : 45 s.

Trois chantiers : suivre le modèle dans le temps, valider certains contrôles avec les équipes, et offrir un tableau de bord aux comités. Et personnellement ? Ce stage m'a appris quelque chose d'essentiel : un bon outil, ce n'est pas le plus intelligent. C'est celui que l'équipe comprend, utilise… et peut reprendre après vous.

Transition : « Et je terminerai avec la phrase du début. »

## Page 32

L'IA conseille. Elle ne décide jamais. [pause] Je remercie mes tuteurs et les équipes du FMFP pour leur confiance, et vous, membres du jury, pour votre attention. Je suis prêt à répondre à vos questions.
