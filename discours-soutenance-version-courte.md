# Discours de la soutenance — version courte

## 1. Couverture

Bonjour Messieurs les membres du jury. Aujourd’hui, je vais vous parler du projet que j’ai mené pendant mon stage au Fonds Malgache de Formation Professionnelle, le FMFP. Mon travail s’intitule : « Conception d’un système intelligent de scoring, de recommandations et d’aide à la décision pour la gestion des financements de la formation professionnelle ». Dans ce projet, j’ai conçu une assistance pour faciliter l’analyse des demandes de financement et le suivi des corrections. Mon objectif était d’aider les équipes dans leur travail, tout en leur laissant la décision finale.

*Transition* — Voici le fil de ma présentation.

## 2. Le fil de la présentation

Je vais partir du besoin, puis présenter la solution que j’ai construite. Je montrerai ensuite son fonctionnement, avant de revenir sur les résultats et les suites possibles.

*Transition* — Je commence par les deux acteurs au cœur de ce projet : l’entreprise et l’équipe du FMFP.

## 3. Une demande de financement, deux besoins

Les besoins se situent à deux moments : aider l’entreprise à s’orienter, puis aider l’équipe du FMFP à examiner le dossier.

*Transition* — Pour comprendre leurs besoins, j’ai d’abord retracé le parcours d’une demande.

## 4. Le parcours existe déjà

Le parcours existe déjà, mais les informations sont réparties dans plusieurs rubriques. Mon objectif était d’apporter une aide directement dans ce parcours.

*Transition* — J’ai ensuite comparé les délais observés selon le nombre de commentaires de réserve.

## 5. Réserves et délais

Sur 129 dossiers dont les dates sont connues, le délai moyen est d’environ huit jours pour les 77 dossiers sans commentaire de réserve, contre dix-neuf jours pour les 51 dossiers avec au moins deux commentaires de réserve. Dans ces cas, le délai s’allonge avec le temps nécessaire à l’entreprise pour répondre et apporter les corrections demandées. L’assistance vise à repérer les problèmes plus tôt pour limiter les réserves évitables et les allers-retours qu’elles entraînent.

*Transition* — Voyons maintenant comment rendre le résultat attendu mesurable.

## 6. Une demande de formation textile

Dans cet exemple fictif, BEMA est une entreprise textile qui veut former douze agents à la sécurité et à la qualité des finitions. Dans son dossier, le résultat attendu reste vague : « les équipes seront mieux formées à la sécurité et à la qualité ». Cet objectif ambigu et non mesurable risque de provoquer une réserve. Pour le rendre mesurable, on fixe une cible : appliquer correctement au moins neuf contrôles de sécurité et de qualité sur dix lors d’un examen en fin de formation.

*Transition* — À partir de ce besoin, j’ai posé la question centrale de mon projet.

## 7. Comment aider les entreprises à préparer des dossiers plus complets et cohérents, tout en facilitant leur analyse ?

Comment aider les entreprises à préparer des dossiers plus complets et cohérents, tout en facilitant leur analyse ? Pour y répondre, j’ai retenu trois objectifs : mieux orienter les entreprises, faciliter l’analyse des dossiers et suivre les corrections.

*Transition* — J’ai ensuite délimité ce que je pouvais réaliser pendant le stage.

## 8. Un périmètre à annoncer clairement

L’orientation, certains contrôles et le suivi sont disponibles. L’accompagnement complet de la préparation reste à développer ; la pertinence des résultats doit encore être validée avec les utilisateurs.

*Transition* — Une fois le périmètre établi, il me restait à choisir l’architecture adaptée.

## 9. Pourquoi un service interne ?

J’ai pris les règles métier comme point de départ. Pour intégrer les autres aides, j’ai comparé l’ajout direct à la plateforme, le recours à un fournisseur externe et la réécriture. J’ai retenu un service interne pour préserver le parcours du FMFP et faire évoluer les traitements séparément.

*Transition* — Une fois ce choix fait, j’ai organisé le travail en étapes successives.

## 10. Mon travail, du besoin à la solution

J’ai avancé par itérations courtes, avec un backlog Trello et des revues avec mon tuteur. Le cadrage prévoyait 86 jours de charge pour 84 jours ouvrés de stage.

*Transition* — Cette démarche se retrouve dans l’architecture : la plateforme et le service analytique ont chacun un rôle précis.

## 11. Des responsabilités séparées

La plateforme gère les droits et le parcours. Le service analytique contrôle le dossier à partir de données consultées en lecture seule.

*Transition* — Je reprends maintenant le cas de BEMA pour montrer comment cette aide intervient dans le parcours.

## 12. Avant le dépôt : trouver une orientation

BEMA décrit son besoin de formation. Le conseiller recommande le guichet Requête individuelle et affiche l’appel RIE39. L’entreprise peut consulter les conditions avant de commencer.

*Transition* — Une fois le guichet repéré, BEMA peut préciser ce qu’elle attend de la formation.

## 13. Le conseiller IA éclaire le dossier

Le conseiller reprend le critère déjà saisi dans le cahier des charges : appliquer correctement au moins neuf contrôles de sécurité et de qualité sur dix en mise en situation. BEMA s’en sert pour préciser le résultat attendu.

*Transition* — Après l’objectif de formation, je passe aux pièces qui accompagnent le dossier.

## 14. Le CV du formateur : quatre points à corriger

J’ai testé le contrôle avec un CV incomplet. Il signale quatre points à corriger : les dates, les sections, la mise en page et la signature. Je remplace ensuite le fichier.

*Transition* — J’élargis maintenant le contrôle aux autres pièces du dossier.

## 15. Vérifier les trois annexes avant l’envoi

Les trois annexes sont présentes et la demande reste en brouillon. Je passe maintenant à la démonstration : vous verrez la préparation côté entreprise, puis les outils de l’évaluateur.

*[Lancer et commenter la démonstration de 5 min 38.]*

*Transition* — Après cette démonstration, revenons aux vérifications réalisées.

## 16. Ce qui a été testé

Lors des vérifications locales, 1 349 tests ont réussi, 2 ont été ignorés et la couverture était de 86,89 %. Un essai sur 150 dossiers a aussi servi à ajuster les contrôles. L’utilité pour les équipes reste à mesurer.

*Transition* — J’ai aussi évalué le score prédictif, et les résultats montrent une limite importante.

## 17. Ce qui reste à valider

Dans le test sur des dossiers plus récents, le modèle n’a détecté que 5 à 8 rejets parmi 100 dossiers finalement rejetés. L’évaluateur ne peut donc pas compter sur le score pour signaler tous les dossiers à examiner. Il reste aussi à vérifier la justesse des autres aides et la confidentialité des appels externes.

*Transition* — Il reste une question pratique : qu’apporte cette assistance au travail quotidien ?

## 18. Mesurer le progrès sur le travail réel

Je propose un pilote avec des dossiers similaires, avec et sans aide. Il permettra de comparer la qualité des dossiers, la justesse des remarques et le temps de travail actif. Cette mesure reste à réaliser.

*Transition* — Avant de conclure, je fais le point sur les livrables en service et ceux qui restent à valider.

## 19. Bilan des livrables et prochaines étapes

L’historique, la messagerie et le tableau de bord sont en production. Le score, les assistants, les dossiers comparables, le contrôle du CV et les alertes sont en préproduction, c’est-à-dire en test sur le serveur du FMFP. Je commencerais par valider les aides déjà en test avec les équipes avant d’élargir le périmètre.

*Transition* — Après ce bilan, je peux résumer l’apport du stage et les prochaines étapes.

## 20. L’apport du stage

J’ai conçu, intégré et testé ces aides, de l’orientation à l’évaluation, à partir de données issues de dossiers de financement réels. Ces essais m’ont permis d’en vérifier l’utilité sur les cas évalués. J’ai aussi appris à les intégrer dans un parcours déjà utilisé par les équipes. Il reste à mesurer plus largement leur effet sur la qualité des dossiers et le temps de travail. Merci pour votre attention.
