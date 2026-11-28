# Discours de la soutenance — version courte

## 1. Couverture

Bonjour Messieurs les membres du jury. Aujourd’hui, je vais vous parler du projet que j’ai mené pendant mon stage au Fonds Malgache de Formation Professionnelle, le FMFP. Mon travail s’intitule : « Conception d’un système intelligent de scoring, de recommandations et d’aide à la décision pour la gestion des financements de la formation professionnelle ». Dans ce projet, j’ai conçu une assistance pour faciliter l’analyse des demandes de financement et le suivi des corrections. Mon objectif était d’aider les équipes dans leur travail, tout en leur laissant la décision finale.

*Transition* — Voici le fil de ma présentation.

## 2. Le fil de la présentation

Je vais partir du besoin, puis présenter la solution que j’ai construite. Je montrerai ensuite son fonctionnement, avant de revenir sur les résultats et les suites possibles.

*Transition* — Commençons par voir qui utilise ce dossier.

## 3. Une demande de financement, deux besoins

Une demande de financement concerne deux acteurs : l’entreprise qui prépare son dossier et l’équipe du FMFP qui l’examine. J’ai cherché à faciliter leur travail à tous les deux.

*Transition* — Pour les aider, j’ai regardé comment le dossier passe de l’un à l’autre.

## 4. Le parcours existe déjà

Le parcours existe déjà, mais les informations sont réparties dans plusieurs rubriques. Mon objectif était d’apporter une aide directement dans ce parcours.

*Transition* — Les anciens dossiers donnent aussi une idée des délais.

## 5. Réserves et délais

Avant de concevoir l’aide, j’ai regardé les dossiers passés. Entre le premier dépôt identifiable et la décision, j’observe environ huit jours sans commentaire de réserve, contre dix-neuf jours avec au moins deux. Ces délais incluent l’attente. Ils me donnent un point de départ, sans expliquer à eux seuls l’écart.

*Transition* — Dans un dossier, voyons ce qui peut rendre une demande difficile à vérifier.

## 6. Une demande de formation textile

Pour illustrer la suite, je prends un exemple fictif : BEMA, une entreprise textile, souhaite former ses équipes. Dans sa demande, elle écrit simplement que les équipes seront mieux formées. Comment rendre ce résultat vérifiable ?

*Transition* — Cet exemple m’amène à la question du projet.

## 7. Comment aider les entreprises à préparer des dossiers plus complets et cohérents, tout en facilitant leur analyse ?

Ma question était de savoir comment aider à préparer des dossiers plus complets et plus faciles à examiner. J’ai retenu trois objectifs : mieux orienter, faciliter l’analyse et suivre les corrections.

*Transition* — Voici ce que j’ai pu mettre en place pendant le stage.

## 8. Un périmètre à annoncer clairement

L’orientation, certains contrôles et le suivi sont disponibles. L’accompagnement complet de la préparation reste à développer ; la pertinence des résultats doit encore être validée avec les utilisateurs.

*Transition* — Restait à décider comment intégrer cette aide à la plateforme.

## 9. Pourquoi un service interne ?

J’ai pris les règles métier comme point de départ. Pour intégrer les autres aides, j’ai comparé l’ajout direct à la plateforme, le recours à un fournisseur externe et la réécriture. J’ai retenu un service interne pour préserver le parcours du FMFP et faire évoluer les traitements séparément. En contrepartie, il faut maintenir les échanges et surveiller le service.

*Transition* — Pour vérifier que cette architecture convenait, j’ai avancé par étapes.

## 10. Mon travail, du besoin à la solution

J’ai travaillé en itérations courtes, inspirées de Scrum, avec un backlog Trello et des revues avec mon tuteur. Le cadrage prévoyait 86 jours ; la réalisation a pris davantage de temps. La confidentialité et la fiabilité restent à valider.

*Transition* — La plateforme et le service d’analyse ont chacun leur rôle.

## 11. Des responsabilités séparées

La plateforme conserve les droits et le parcours, tandis que le service analytique apporte les contrôles. Pour concevoir cette aide, je me suis appuyé sur le modèle de données : le dossier est relié notamment à l’entreprise, aux annexes et à l’évaluation. Les données métier sont consultées en lecture seule.

*Transition* — Passons à un exemple pour voir ces outils en action.

## 12. Avant le dépôt : trouver une orientation

On retrouve notre entreprise textile. Avant le dépôt, elle décrit son besoin. Le conseiller lui propose une piste et explique les conditions du guichet.

*Transition* — Une fois le guichet repéré, elle précise ce qu’elle veut obtenir de la formation.

## 13. Le conseiller IA éclaire le dossier

À partir du document de référence, l’assistant propose une cible vérifiable : réussir au moins neuf contrôles sur dix pendant un exercice. L’entreprise vérifie cette proposition avant de la retenir.

*Transition* — Une fois le résultat précisé, je passe à la vérification des pièces.

## 14. Le CV du formateur : quatre points à corriger

J’ai testé le contrôle avec un CV fictif volontairement incomplet. Il signale quatre points : les dates, les sections, la mise en page et la signature. Je remplace ensuite le fichier.

*Transition* — Il reste à vérifier que les autres pièces sont présentes.

## 15. Vérifier les trois annexes avant l’envoi

Les trois annexes sont présentes et la demande reste en brouillon. Dans la vidéo, regardez comment l’entreprise vérifie sa préparation, puis comment un évaluateur peut examiner un dossier dans ce même scénario.

*[Lancer et commenter la démonstration de 5 min 36.]*

*Transition* — On vient de voir le parcours. Voyons maintenant ce que j’ai vérifié par les tests.

## 16. Ce qui a été testé

Après le stage, 1 349 tests ont réussi, 2 ont été ignorés et la couverture était de 86,89 %. Un essai sur 150 dossiers a aussi servi à ajuster les contrôles. L’utilité pour les équipes reste à mesurer.

*Transition* — Le modèle de prédiction, lui, donne des résultats plus limités.

## 17. Ce qui reste à valider

Sur des dossiers plus récents, le modèle ne repère que 5 à 8 rejets réels sur 100. L’évaluateur ne peut donc pas compter sur le score pour signaler tous les dossiers à examiner. Il reste aussi à vérifier la justesse des autres aides et la confidentialité des appels externes.

*Transition* — Pour savoir si l’aide est utile, il faut l’essayer dans le travail quotidien.

## 18. Mesurer le progrès sur le travail réel

Je propose un pilote avec des dossiers similaires, avec et sans aide. Il permettra de comparer la qualité des dossiers, la justesse des remarques et le temps de travail actif. Cette mesure reste à réaliser.

*Transition* — Avant de lancer ce pilote, voici où en sont les livrables.

## 19. Bilan des livrables et prochaines étapes

L’historique, la messagerie et le tableau de bord sont en production. Le score, les assistants, les dossiers comparables, le contrôle du CV et les alertes sont en préproduction. Je commencerais par valider les aides déjà en test avec les équipes avant d’élargir le périmètre.

*Transition* — Pour finir, je résume ce que le stage a apporté.

## 20. L’apport du stage

J’ai conçu, intégré et testé ces aides, de l’orientation à l’évaluation, à partir de données issues de dossiers de financement réels. Ces essais m’ont permis d’en vérifier l’utilité sur les cas évalués. J’ai aussi appris à les intégrer dans un parcours déjà utilisé par les équipes. Il reste à mesurer plus largement leur effet sur la qualité des dossiers et le temps de travail. Merci pour votre attention.
