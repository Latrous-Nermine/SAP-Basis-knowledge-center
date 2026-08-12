// Mock review-project data for the Excellence Center. Shape mirrors what a
// future ExcellenceCenterService would expose (projects -> phases/findings/
// recommendations/actionItems/lessons), so a later OData binding can
// replace this model without reshaping the view - see TODO-INTEGRATION.md
// once that service exists.
//
// phases[].key must stay within the 12 keys formatter.js (PHASE_NAME_KEYS)
// and i18n.properties (phase.<key>) both know about - this is the same
// enum-key + i18n-lookup pattern Knowledge Centre uses for `category`.
sap.ui.define([], function() {
  "use strict";

  var PHASE_ORDER = [
    "context", "financial", "planning", "scope", "technical", "quality",
    "team", "client", "process", "findings", "recommendations", "lessons"
  ];

  function phases(aStates) {
    return PHASE_ORDER.map(function(sKey, i) {
      return { key: sKey, state: aStates[i] };
    });
  }

  return [
    {
      ID: "PRJ-S4HANA-001",
      name: "Migration SAP S/4HANA",
      client: "ACME Manufacturing",
      department: "SAP Technique",
      reviewStatus: "in_progress",
      projectManager: "Sonia Mejri",
      reviewLead: "Karim Trabelsi",
      startDate: "2026-02-02",
      endDate: "2026-07-18",
      kpis: {
        budgetPlanned: 80000,
        budgetActual: 104500,
        budgetCouldHaveBeen: 90000,
        durationPlannedWeeks: 20,
        durationActualWeeks: 26,
        durationCouldHaveBeenWeeks: 22
      },
      reviewTeam: [
        { name: "Karim Trabelsi", role: "Lead de revue" },
        { name: "Amira Zouari", role: "Experte technique" },
        { name: "Mehdi Gharbi", role: "Analyste financier" }
      ],
      originalTeam: [
        { name: "Sonia Mejri", role: "Chef de projet" },
        { name: "Yassine Cherni", role: "Consultant technique" },
        { name: "Rania Haddad", role: "Consultante fonctionnelle" }
      ],
      // Deliberately exercises all four phase states at once, so this
      // project alone is enough to verify completed/current/pending/blocked
      // rendering side by side.
      phases: phases([
        "completed", "completed", "completed", "completed", "completed", "blocked",
        "completed", "completed", "current", "pending", "pending", "pending"
      ]),
      findings: [
        {
          ID: "F-014", category: "financial", title: "Sous-estimation du budget d'intégration", severity: "high", status: "validated",
          observation: "Le budget initial ne prenait pas en compte les développements d'intégration avec le système tiers ajouté en phase 2.",
          impact: "+14 500 €",
          rootCause: "Les activités d'intégration n'ont pas été incluses dans le chiffrage initial.",
          contributingFactors: ["Absence d'atelier de découverte technique en cadrage", "Prestataire tiers confirmé après le chiffrage"],
          recommendationID: "R-005", owner: "Mehdi Gharbi"
        },
        {
          ID: "F-009", category: "technical", title: "Architecture d'intégration définie tardivement", severity: "medium", status: "validated",
          observation: "L'architecture cible n'a été formalisée qu'après le début du développement, nécessitant plusieurs itérations sur des interfaces déjà construites.",
          impact: "Retard de 3 semaines sur le lot technique",
          rootCause: "Le besoin d'intégration est apparu après le cadrage initial, une fois le prestataire tiers confirmé.",
          contributingFactors: ["Connecteur tiers ajouté en phase 2"],
          recommendationID: "R-002", owner: "Amira Zouari"
        },
        {
          ID: "F-021", category: "planning", title: "Absence de jalon dédié aux tests d'intégration", severity: "low", status: "proposed",
          observation: "Le planning ne prévoyait pas de jalon spécifique pour les tests d'intégration, réalisés en fin de projet dans l'urgence.",
          impact: "Risque de non-détection tardive d'anomalies",
          rootCause: "Le planning initial ne couvrait pas le lot d'intégration ajouté ultérieurement.",
          contributingFactors: [],
          recommendationID: null, owner: "Sonia Mejri"
        }
      ],
      recommendations: [
        {
          ID: "R-005", title: "Rendre obligatoire l'atelier de découverte des intégrations en cadrage", priority: "high", status: "proposed",
          description: "Ajouter un atelier obligatoire de découverte technique lors du cadrage de tout projet impliquant des systèmes tiers.",
          reason: "Le budget et le planning ont été impactés par une intégration non anticipée en phase de cadrage.",
          expectedBenefit: "Réduire le risque de sous-estimation budgétaire liée aux intégrations non anticipées.",
          owner: "Sonia Mejri", targetDate: "2026-09-30", relatedFindingID: "F-014"
        },
        {
          ID: "R-002", title: "Ajouter un jalon de revue d'architecture avant le développement", priority: "medium", status: "proposed",
          description: "Introduire un jalon formel de validation d'architecture avant le démarrage du développement.",
          reason: "L'architecture d'intégration a été définie après le début du développement.",
          expectedBenefit: "Réduire les itérations coûteuses sur des interfaces déjà développées.",
          owner: "Karim Trabelsi", targetDate: "2026-09-15", relatedFindingID: "F-009"
        }
      ],
      actionItems: [
        {
          ID: "A-011", title: "Créer un modèle de check-list d'intégration pour le cadrage", owner: "Karim Trabelsi", status: "in_progress",
          priority: "high", deadline: "2026-09-01", relatedRecommendationID: "R-005"
        },
        {
          ID: "A-013", title: "Documenter les leçons apprises pour l'équipe Intégration", owner: "Amira Zouari", status: "not_started",
          priority: "medium", deadline: "2026-09-15", relatedRecommendationID: null
        }
      ],
      lessons: [
        {
          ID: "L-004", title: "Toujours cartographier les systèmes tiers avant le chiffrage", appliesTo: "Cadrage de projet",
          whatHappened: "Un connecteur tiers non identifié en cadrage a été ajouté en phase 2, entraînant une refonte partielle de l'architecture d'intégration.",
          whyItHappened: "Aucun atelier de découverte technique systématique n'était prévu lors du cadrage.",
          whatWeLearned: "Les systèmes tiers impactés par un projet doivent être cartographiés avant le chiffrage, pas après.",
          whatShouldChange: "Ajouter un atelier de découverte technique obligatoire en phase de cadrage.",
          recommendation: "Rendre obligatoire l'atelier de découverte des intégrations en cadrage (voir R-005)."
        }
      ],
      // Per-phase detail (Section 10/14/21) - only phases with real review
      // work behind them get an entry. A "pending" phase hasn't started, so
      // it has no analysis yet - that's a real empty state, not missing data.
      phaseContent: {
        context: {
          analysis: "Le contexte du projet a été documenté sur la base des ateliers de cadrage avec ACME Manufacturing. Le périmètre initial couvrait la migration des modules Finance et Achats vers S/4HANA, sans intégration tierce identifiée à ce stade.",
          evidence: [
            { name: "Compte-rendu atelier de cadrage.pdf", type: "report" },
            { name: "Charte de projet.docx", type: "report" }
          ],
          discussion: []
        },
        financial: {
          analysis: "L'analyse financière confirme un dépassement budgétaire de 31% par rapport au chiffrage initial, principalement lié aux travaux d'intégration non anticipés en phase de cadrage.",
          evidence: [{ name: "Suivi budgétaire.xlsx", type: "metrics" }],
          discussion: [
            { author: "Mehdi Gharbi", role: "Analyste financier", timestamp: "2026-07-22T09:10:00", message: "Le dépassement est concentré sur les 8 dernières semaines, correspondant à la phase d'intégration." }
          ]
        },
        planning: {
          analysis: "Le planning initial prévoyait 20 semaines. Le calendrier a été révisé après l'ajout du lot d'intégration, portant la durée totale à 26 semaines.",
          evidence: [{ name: "Planning révisé.xlsx", type: "metrics" }],
          discussion: []
        },
        scope: {
          analysis: "Le périmètre fonctionnel couvre les modules Finance et Achats. Le module Ventes, envisagé initialement, a été exclu du périmètre lors du cadrage.",
          evidence: [{ name: "Document de périmètre.docx", type: "report" }],
          discussion: []
        },
        technical: {
          analysis: "L'architecture d'intégration a été définie tardivement, après le début du développement, ce qui a nécessité plusieurs itérations sur des interfaces déjà construites.",
          evidence: [
            { name: "Diagramme d'architecture v2.pdf", type: "diagram" },
            { name: "Spécifications d'interface.docx", type: "report" }
          ],
          discussion: [
            { author: "Amira Zouari", role: "Experte technique", timestamp: "2026-07-24T14:05:00", message: "L'architecture d'intégration initiale ne tenait pas compte du connecteur tiers ajouté en phase 2." },
            { author: "Sonia Mejri", role: "Chef de projet", timestamp: "2026-07-24T14:20:00", message: "Confirmé. Le besoin d'intégration est apparu après le cadrage initial, une fois le prestataire tiers confirmé." }
          ]
        },
        quality: {
          analysis: "La revue qualité est bloquée en attente des résultats des tests de non-régression sur le module Achats, actuellement en cours côté équipe projet.",
          evidence: [],
          discussion: [
            { author: "Karim Trabelsi", role: "Lead de revue", timestamp: "2026-07-25T10:00:00", message: "Impossible de valider ce point tant que les tests de non-régression ne sont pas finalisés." }
          ]
        },
        team: {
          analysis: "L'équipe projet comptait 6 personnes à son pic d'activité, avec un seul remplacement sur toute la durée du projet.",
          evidence: [],
          discussion: []
        },
        client: {
          analysis: "La satisfaction client a été mesurée via deux enquêtes intermédiaires. Le principal point d'attention concerne les délais de validation des livrables côté client.",
          evidence: [{ name: "Synthèse enquête satisfaction.pdf", type: "report" }],
          discussion: []
        }
      },
      // Newest first, like any activity feed (Section 16).
      activity: [
        { timestamp: "2026-07-25T10:00:00", actor: "Karim Trabelsi", description: "a bloqué la phase Qualité, en attente des tests de non-régression" },
        { timestamp: "2026-07-24T14:20:00", actor: "Sonia Mejri", description: "a commenté la phase Analyse technique" },
        { timestamp: "2026-07-24T14:05:00", actor: "Amira Zouari", description: "a commenté la phase Analyse technique" },
        { timestamp: "2026-07-22T09:10:00", actor: "Mehdi Gharbi", description: "a commenté la phase Analyse financière" },
        { timestamp: "2026-07-20T09:00:00", actor: "Karim Trabelsi", description: "a ajouté le constat F-014" },
        { timestamp: "2026-07-18T16:30:00", actor: "Amira Zouari", description: "a terminé la phase Analyse financière" }
      ]
    },
    {
      ID: "PRJ-BTP-INTEG-002",
      name: "Plateforme d'intégration SAP BTP",
      client: "AYMAX (projet interne)",
      department: "Intégration & BTP",
      reviewStatus: "in_progress",
      projectManager: "Yassine Cherni",
      reviewLead: "Mehdi Gharbi",
      startDate: "2026-05-05",
      endDate: "2026-11-30",
      kpis: {
        budgetPlanned: 45000,
        budgetActual: 21000,
        budgetCouldHaveBeen: 42000,
        durationPlannedWeeks: 26,
        durationActualWeeks: 11,
        durationCouldHaveBeenWeeks: 24
      },
      reviewTeam: [
        { name: "Mehdi Gharbi", role: "Lead de revue" },
        { name: "Rania Haddad", role: "Experte fonctionnelle" }
      ],
      originalTeam: [
        { name: "Yassine Cherni", role: "Chef de projet" },
        { name: "Amira Zouari", role: "Consultante technique" }
      ],
      phases: phases([
        "completed", "completed", "completed", "completed", "current", "pending",
        "pending", "pending", "pending", "pending", "pending", "pending"
      ]),
      findings: [
        {
          ID: "F-030", category: "planning", title: "Périmètre d'intégration encore incomplet à ce stade", severity: "medium", status: "proposed",
          observation: "Le périmètre exact des systèmes à intégrer n'est pas encore stabilisé à ce stade de la revue.",
          impact: "À déterminer",
          rootCause: "Le dossier de cadrage ne liste pas exhaustivement les systèmes tiers concernés.",
          contributingFactors: [],
          recommendationID: null, owner: "Mehdi Gharbi"
        }
      ],
      // Empty on purpose - review still early, nothing proposed yet. Real
      // empty state, not a missing-data bug (see §23 of the design brief).
      recommendations: [],
      actionItems: [
        {
          ID: "A-018", title: "Planifier l'atelier d'analyse technique", owner: "Mehdi Gharbi", status: "not_started",
          priority: "medium", deadline: "2026-08-20", relatedRecommendationID: null
        }
      ],
      lessons: [],
      phaseContent: {
        technical: {
          analysis: "L'analyse technique est en cours. Les premières investigations montrent une dépendance non documentée avec le système de facturation existant.",
          evidence: [{ name: "Note d'analyse préliminaire.docx", type: "report" }],
          discussion: [
            { author: "Mehdi Gharbi", role: "Lead de revue", timestamp: "2026-08-02T11:00:00", message: "Cette dépendance n'était pas mentionnée dans le dossier de cadrage initial - à creuser avec l'équipe projet." }
          ]
        }
      },
      activity: [
        { timestamp: "2026-08-02T11:00:00", actor: "Mehdi Gharbi", description: "a commenté la phase Analyse technique" },
        { timestamp: "2026-07-28T09:00:00", actor: "Yassine Cherni", description: "a démarré la revue du projet" }
      ]
    },
    {
      ID: "PRJ-FIORI-PROC-003",
      name: "Portail Fiori Achats",
      client: "XYZ Industries",
      department: "UX / Fiori",
      reviewStatus: "completed",
      projectManager: "Rania Haddad",
      reviewLead: "Amira Zouari",
      startDate: "2025-09-08",
      endDate: "2026-01-30",
      kpis: {
        budgetPlanned: 52000,
        budgetActual: 49500,
        budgetCouldHaveBeen: 52000,
        durationPlannedWeeks: 18,
        durationActualWeeks: 17,
        durationCouldHaveBeenWeeks: 18
      },
      reviewTeam: [
        { name: "Amira Zouari", role: "Lead de revue" },
        { name: "Karim Trabelsi", role: "Expert technique" }
      ],
      originalTeam: [
        { name: "Rania Haddad", role: "Cheffe de projet" },
        { name: "Sonia Mejri", role: "Consultante UX" }
      ],
      phases: phases([
        "completed", "completed", "completed", "completed", "completed", "completed",
        "completed", "completed", "completed", "completed", "completed", "completed"
      ]),
      // Closed with no open findings/actions - a genuinely clean review,
      // not an oversight. Another real empty state (actionItems below).
      findings: [],
      recommendations: [
        {
          ID: "R-009", title: "Réutiliser ce cadrage UX comme référence pour les prochains portails Fiori", priority: "low", status: "accepted",
          description: "Documenter le cadrage UX de ce projet comme modèle réutilisable pour les prochains portails Fiori.",
          reason: "Le cadrage UX précoce a limité les retours en phase de recette.",
          expectedBenefit: "Accélérer le cadrage des futurs projets Fiori similaires.",
          owner: "Amira Zouari", targetDate: "2026-03-01", relatedFindingID: null
        }
      ],
      actionItems: [],
      lessons: [
        {
          ID: "L-002", title: "Impliquer les utilisateurs finaux dès les maquettes réduit les retours en phase de test", appliesTo: "Conception UX",
          whatHappened: "Les utilisateurs finaux ont participé aux revues de maquettes dès la phase de conception.",
          whyItHappened: "Le chef de projet a intégré des sessions de feedback utilisateur au planning initial.",
          whatWeLearned: "L'implication précoce des utilisateurs finaux réduit significativement les retours tardifs.",
          whatShouldChange: "Généraliser cette pratique aux prochains projets Fiori.",
          recommendation: "Réutiliser ce cadrage UX comme référence pour les prochains portails Fiori (voir R-009)."
        }
      ],
      phaseContent: {
        technical: {
          analysis: "L'architecture retenue (composants Fiori réutilisables) a permis de livrer le portail dans les délais, sans dette technique majeure identifiée.",
          evidence: [{ name: "Revue d'architecture finale.pdf", type: "report" }],
          discussion: []
        },
        client: {
          analysis: "Les utilisateurs finaux ont été impliqués dès la phase de maquettage, ce qui a limité les retours en phase de recette à des ajustements mineurs.",
          evidence: [{ name: "Retour utilisateurs - recette.pdf", type: "report" }],
          discussion: []
        }
      },
      activity: [
        { timestamp: "2026-01-30T15:00:00", actor: "Amira Zouari", description: "a clôturé la revue du projet" },
        { timestamp: "2026-01-28T10:00:00", actor: "Rania Haddad", description: "a ajouté la recommandation R-009" }
      ]
    }
  ];
});
