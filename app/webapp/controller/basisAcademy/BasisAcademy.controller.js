sap.ui.define([
  "../BaseController",
  "../../model/basisAcademy/RoadmapRenderer",
  "../../model/basisAcademy/formatter",
  "sap/ui/core/Fragment",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(BaseController, RoadmapRenderer, formatter, Fragment, MessageToast, MessageBox) {
  "use strict";

  // ============================================================
  // MOCK DATA (2026-08, frontend-first build - no backend yet, see
  // TODO-INTEGRATION.md). Shape is deliberately close to what a real
  // BasisAcademyDomains/BasisAcademySteps/UserStepProgress CDS model
  // would return, so wiring the real service later is a data-source
  // swap, not a rewrite of this controller's logic.
  //
  // x/y are coordinates on a fixed 1000x420 canvas (the SVG path in
  // the view uses the same viewBox) - a hand-tuned 2-row "snake" of 10
  // waypoints, not a formula, because 10 is a fixed, known count: a
  // formula that has to also produce a pleasant curve is more moving
  // parts than just placing 10 points once.
  // ============================================================

  var DOMAINS = [
    { id: "fundamentals", order: 1, icon: "sap-icon://education", x: 70, y: 90, steps: [
      { id: "f1", title: "Architecture SAP & NetWeaver", desc: "Vue d'ensemble d'un système SAP : instance, mandants, couches applicative/DB/présentation.", type: "knowledge" },
      { id: "f2", title: "Navigation SAP GUI & Fiori", desc: "Transactions, modes, favoris, Fiori Launchpad et espaces applicatifs.", type: "practical", prereq: ["f1"] },
      { id: "f3", title: "Cycle de vie d'un système SAP", desc: "Développement → Qualification → Production, et le rôle de chaque système.", type: "knowledge", prereq: ["f1"] }
    ] },
    { id: "admin", order: 2, icon: "sap-icon://permission", x: 290, y: 90, steps: [
      { id: "a1", title: "Gestion des utilisateurs & rôles (PFCG)", desc: "Création d'utilisateurs, rôles composites, profils d'autorisation.", type: "practical" },
      { id: "a2", title: "Transport Management (STMS)", desc: "Paysage de transport, ordres, import en cascade DEV→QA→PRD.", type: "practical", prereq: ["a1"] },
      { id: "a3", title: "Monitoring système (ST22 / SM21 / SM37)", desc: "Dumps ABAP, journal système, jobs en arrière-plan.", type: "scenario", prereq: ["a1"] },
      { id: "a4", title: "Administration des mandants (SCC4)", desc: "Création, copie et verrouillage de mandants.", type: "practical", prereq: ["a2"] }
    ] },
    { id: "s4hana", order: 3, icon: "sap-icon://process", x: 510, y: 90, steps: [
      { id: "s1", title: "Architecture S/4HANA", desc: "Différences avec ECC, modèle de données simplifié, embedded analytics.", type: "knowledge" },
      { id: "s2", title: "Post-installation S/4HANA", desc: "Tâches de post-installation, activation des business functions.", type: "practical", prereq: ["s1"] },
      { id: "s3", title: "Fiori Launchpad & rôles applicatifs", desc: "Catalogues, groupes, rôles techniques Fiori pour S/4HANA.", type: "practical", prereq: ["s1"] }
    ] },
    { id: "tuning", order: 4, icon: "sap-icon://performance", x: 730, y: 90, steps: [
      { id: "t1", title: "Administration HANA de base", desc: "HANA Cockpit, gestion mémoire, sauvegardes.", type: "practical" },
      { id: "t2", title: "Tuning mémoire & work processes", desc: "Dimensionnement des work processes, analyse ST02/ST06.", type: "scenario", prereq: ["t1"] },
      { id: "t3", title: "Analyse de performance ABAP (ST05 / SAT)", desc: "Trace SQL, profiling ABAP, identification des goulots d'étranglement.", type: "scenario", prereq: ["t2"] }
    ] },
    { id: "security", order: 5, icon: "sap-icon://shield", x: 930, y: 90, steps: [
      { id: "sec1", title: "Concept d'autorisations SAP", desc: "Objets d'autorisation, valeurs, matrice de séparation des tâches.", type: "knowledge" },
      { id: "sec2", title: "Audit & traçabilité (SM19 / SM20)", desc: "Security Audit Log, configuration et analyse des traces.", type: "practical", prereq: ["sec1"] },
      { id: "sec3", title: "Durcissement système & SSO", desc: "Paramètres de sécurité critiques, authentification unique.", type: "manager", important: true, prereq: ["sec2"] }
    ] },
    { id: "btp", order: 6, icon: "sap-icon://cloud", x: 930, y: 330, steps: [
      { id: "b1", title: "Fondamentaux SAP BTP", desc: "Sous-comptes, espaces Cloud Foundry, catalogue de services.", type: "knowledge" },
      { id: "b2", title: "Cloud Connector", desc: "Connectivité on-premise ↔ cloud, mapping des systèmes internes.", type: "practical", prereq: ["b1"] },
      { id: "b3", title: "Intégration API (Integration Suite)", desc: "Flux d'intégration, API Management, monitoring des échanges.", type: "scenario", prereq: ["b2"] }
    ] },
    { id: "solman", order: 7, icon: "sap-icon://workflow-tasks", x: 730, y: 330, steps: [
      { id: "sm1", title: "Change Request Management (ChaRM)", desc: "Cycle de vie d'un changement, intégration avec le transport.", type: "practical" },
      { id: "sm2", title: "Monitoring centralisé", desc: "Focused Run / Solution Manager : vue transverse du paysage.", type: "scenario", prereq: ["sm1"] },
      { id: "sm3", title: "Gouvernance ALM", desc: "Processus de gestion du cycle de vie applicatif à l'échelle du paysage.", type: "manager", important: true, prereq: ["sm2"] }
    ] },
    { id: "infra", order: 8, icon: "sap-icon://database", x: 510, y: 330, steps: [
      { id: "i1", title: "Sizing & dimensionnement", desc: "Estimation CPU/RAM/stockage à partir d'un rapport QuickSizer.", type: "knowledge" },
      { id: "i2", title: "Haute disponibilité & PRA", desc: "Clustering, réplication HANA System Replication, plan de reprise.", type: "scenario", prereq: ["i1"] },
      { id: "i3", title: "Déploiement cloud (hyperscaler)", desc: "Déploiement d'un paysage SAP sur Azure/AWS/GCP.", type: "practical", prereq: ["i1"] }
    ] },
    { id: "architecture", order: 9, icon: "sap-icon://org-chart", x: 290, y: 330, steps: [
      { id: "arc1", title: "Architecture d'entreprise SAP", desc: "Positionnement du SI SAP dans l'architecture globale de l'entreprise.", type: "knowledge" },
      { id: "arc2", title: "Conception de paysage multi-système", desc: "Stratégie de landscape : nombre de systèmes, rôles, flux de transport.", type: "manager", important: true, prereq: ["arc1"] },
      { id: "arc3", title: "Gouvernance IT/SAP", desc: "Standards, comités d'architecture, gestion de la dette technique.", type: "manager", important: true, prereq: ["arc2"] }
    ] },
    { id: "rise", order: 10, icon: "sap-icon://forward", x: 70, y: 330, steps: [
      { id: "r1", title: "RISE with SAP - fondamentaux", desc: "Offre, responsabilités partagées, Business Technology Platform incluse.", type: "knowledge" },
      { id: "r2", title: "Stratégies de migration", desc: "Greenfield, Brownfield, Bluefield : critères de choix.", type: "scenario", prereq: ["r1"] },
      { id: "r3", title: "GROW with SAP & Clean Core", desc: "Principes Clean Core, extensibilité side-by-side.", type: "manager", important: true, prereq: ["r2"] }
    ] }
  ];

  // validatedCount = number of domains (in order) fully validated - the
  // member's current domain is always validatedCount+1 (in_progress),
  // everything after that is locked. Reuses this app's existing seeded
  // people so the demo reads as one real team, not placeholder names.
  var TEAM = [
    { userID: "sami",   displayName: "Sami Ben Youssef", initials: "SY", color: "Accent6", validatedCount: 2 },
    { userID: "karim",  displayName: "Karim Trabelsi",   initials: "KT", color: "Accent2", validatedCount: 5 },
    { userID: "manon",  displayName: "Manon Jelassi",    initials: "MJ", color: "Accent5", validatedCount: 8 },
    { userID: "mehdi",  displayName: "Mehdi Khelifi",    initials: "MK", color: "Accent9", validatedCount: 0 },
    { userID: "syrine", displayName: "Syrine Aouadi",    initials: "SA", color: "Accent7", validatedCount: 4 }
  ];
  var RETAKE_WAIT_DAYS = 7;

  return BaseController.extend("aymax.hub.controller.basisAcademy.BasisAcademy", {

    // Prototype-level, not assigned in onInit - XML bindings resolve
    // formatter references against the controller while the view is
    // being built, before onInit ever runs (found the hard way earlier
    // this session, on KnowledgeList's own validationFormatter).
    formatter: formatter,

    getResourceBundle: function() {
      return this.getOwnerComponent().getModel("i18n-basisAcademy").getResourceBundle();
    },

    getViewModel: function() {
      return this.getOwnerComponent().getModel("view-basisAcademy");
    },

    onInit: function() {
      this.oPeopleModel = this.getOwnerComponent().getModel("people");
      this._loadRole();
    },

    // sap.ui.core.HTML's own `afterRendering` event only fires on the
    // control's FIRST render - swapping /roadmapHtml later (team <->
    // individual view) updates its content in place without firing it
    // again, so a listener bound there goes stale the moment you switch
    // views (confirmed live: the delegated handler worked on the initial
    // team roadmap but never fired again after switching to a member's
    // roadmap). The view's own root DOM node is never torn down while
    // this route is active, so binding delegation there ONCE, in the
    // controller's own onAfterRendering (fires once, like onInit), stays
    // correct no matter how many times the roadmap HTML underneath it
    // gets replaced.
    onAfterRendering: function() {
      if (this._bRoadmapDelegationBound) return;
      this._bRoadmapDelegationBound = true;
      jQuery(this.getView().getDomRef()).on("click", ".baDomainNode", function(oDomEvent) {
        var sDomainId = oDomEvent.currentTarget.getAttribute("data-domain-id");
        if (sDomainId) this._openDomainDialog(sDomainId);
      }.bind(this));
    },

    onHomePress: function() {
      window.location.href = "/feed/webapp/index.html";
    },

    // Same server-resolved-role pattern used everywhere else in this
    // shell (App.controller.js, KnowledgeDetail, Rewards) - a UI hint
    // only; there is no backend for this module yet to enforce it for
    // real (TODO-INTEGRATION.md), but the identity/role resolution
    // itself is already real, not mocked.
    _loadRole: function() {
      this.oPeopleModel.bindContext("/getMyRole()").requestObject().then(function(oData) {
        var sRole = (oData && oData.value) || "Employee";
        this._sRole = sRole;
        this.getViewModel().setProperty("/isManager", sRole === "Manager");
        this._initTeamView();
      }.bind(this)).catch(function() {
        this._sRole = "Employee";
        this.getViewModel().setProperty("/isManager", false);
        this._initTeamView();
      }.bind(this));
    },

    _currentTeamMember: function() {
      // Best-effort: resolve the logged-in mocked user against the mock
      // team roster. Non-Basis-team demo logins (rh/admin/stagiaire, or
      // the Manager herself) fall back to the first roster entry so the
      // "Ma progression" tab always has something real to show -
      // acceptable for a frontend-only build, revisited once real team
      // membership exists server-side.
      var sMyID = this._sMyUserID;
      var oMatch = TEAM.filter(function(m) { return m.userID === sMyID; })[0];
      return oMatch || TEAM[0];
    },

    // Team view is the default landing experience for everyone (Member
    // and Manager alike) - "the team can visually see where everyone
    // is" isn't manager-only. _sMyUserID is still resolved eagerly so
    // "Ma progression" has an answer the instant it's pressed, but
    // resolving it must NOT itself switch the tab away from "team".
    _initTeamView: function() {
      this._showTeamRoadmap();
      this.oPeopleModel.bindContext("/getMyUserID()").requestObject().then(function(oData) {
        this._sMyUserID = (oData && oData.value) || "";
      }.bind(this)).catch(function() {
        this._sMyUserID = "";
      }.bind(this));
    },

    _showTeamRoadmap: function() {
      var oBundle = this.getResourceBundle();
      var aDomains = this._buildTeamDomainNodes();
      var aTeam = TEAM.map(function(oMember) {
        var oCurrent = DOMAINS.filter(function(d) { return d.order === oMember.validatedCount + 1; })[0];
        return Object.assign({}, oMember, {
          currentDomainLabel: oCurrent
            ? oBundle.getText("currentlyOn", [oBundle.getText("domain." + oCurrent.id)])
            : oBundle.getText("allDomainsValidated")
        });
      });
      this.getViewModel().setProperty("/domains", aDomains);
      this.getViewModel().setProperty("/team", aTeam);
      this.getViewModel().setProperty("/activeTab", "team");
      this.getViewModel().setProperty("/roadmapHtml", RoadmapRenderer.renderRoadmap(aDomains));
    },

    // Team view: nodes carry a completion RING (fraction of the team
    // that has validated that domain) - the individual-member concept
    // of "locked/in progress/validated" doesn't apply to a group, this
    // is the group-level equivalent. Avatars are placed once each, at
    // their own current domain only (never a trail of past domains) -
    // "where is everyone right now", not a history.
    _buildTeamDomainNodes: function() {
      var oBundle = this.getResourceBundle();
      return DOMAINS.map(function(oDomain) {
        var iValidatedBy = TEAM.filter(function(m) { return m.validatedCount >= oDomain.order; }).length;
        var aHere = TEAM.filter(function(m) { return m.validatedCount + 1 === oDomain.order; });
        return {
          id: oDomain.id, order: oDomain.order, icon: oDomain.icon,
          label: oBundle.getText("domain." + oDomain.id),
          completionRatio: TEAM.length ? iValidatedBy / TEAM.length : 0,
          completionLabel: iValidatedBy + "/" + TEAM.length,
          members: aHere
        };
      });
    },

    onSelectTeamView: function() {
      this._showTeamRoadmap();
    },

    onSelectMineView: function() {
      this._showMemberRoadmap(this._currentTeamMember().userID);
    },

    // Manager clicking a team-summary row, or an avatar on the team
    // roadmap - both open the same per-member roadmap.
    onOpenMemberProgress: function(oEvent) {
      var sUserID = oEvent.getSource().getBindingContext("view-basisAcademy").getProperty("userID");
      this._showMemberRoadmap(sUserID);
    },

    _showMemberRoadmap: function(sUserID) {
      var oMember = TEAM.filter(function(m) { return m.userID === sUserID; })[0] || TEAM[0];
      var aDomains = this._buildMemberDomainNodes(oMember);
      this.getViewModel().setProperty("/activeTab", "mine");
      this.getViewModel().setProperty("/viewedMember", oMember);
      this.getViewModel().setProperty("/viewedMemberSubtitle", this.getText("memberProgressSubtitle", [oMember.displayName]));
      this.getViewModel().setProperty("/domains", aDomains);
      this.getViewModel().setProperty("/roadmapHtml", RoadmapRenderer.renderRoadmap(aDomains));
    },

    // Individual view: every domain gets a real state (locked/available/
    // in_progress/validated) relative to THIS member, and their avatar
    // appears exactly once, on their current domain.
    _buildMemberDomainNodes: function(oMember) {
      var oBundle = this.getResourceBundle();
      return DOMAINS.map(function(oDomain) {
        var sState;
        if (oDomain.order <= oMember.validatedCount) {
          sState = "validated";
        } else if (oDomain.order === oMember.validatedCount + 1) {
          sState = "inProgress";
        } else {
          sState = "locked";
        }
        return {
          id: oDomain.id, order: oDomain.order, icon: oDomain.icon,
          label: oBundle.getText("domain." + oDomain.id),
          state: sState,
          members: sState === "inProgress" ? [oMember] : []
        };
      });
    },

    // ============================================================
    // Domain detail dialog
    // ============================================================
    _openDomainDialog: function(sDomainId) {
      var oDomain = DOMAINS.filter(function(d) { return d.id === sDomainId; })[0];
      if (!oDomain) return;

      var oViewModel = this.getViewModel();
      var sTab = oViewModel.getProperty("/activeTab");
      var oMember = sTab === "mine" ? oViewModel.getProperty("/viewedMember") : null;
      var oBundle = this.getResourceBundle();
      var bIsMemberContext = !!oMember;
      // this._sRole === "Manager" && sTab === "mine"
      var bIsManagerViewing = this._sRole === "Manager" && sTab === "mine";

      // isMemberContext/isManagerViewing are denormalised onto every step
      // (not just read once on /dialog) because a JSONModel list item's
      // binding context has no reliable "../../" navigation back up past
      // the steps array in an expression binding - confirmed live: those
      // relative paths resolved to undefined for every row. Repeating
      // the two flags on each row sidesteps that entirely.
      var aSteps = oDomain.steps.map(function(oStep) {
        var sStatus = "notStarted";
        if (oMember) {
          if (oDomain.order <= oMember.validatedCount) {
            sStatus = "validated";
          } else if (oDomain.order === oMember.validatedCount + 1) {
            // Deterministic mock within the in-progress domain: first
            // step done, second under way, the rest still ahead -
            // always demonstrates a real "in progress" state rather
            // than an all-or-nothing domain.
            var iIndex = oDomain.steps.indexOf(oStep);
            sStatus = iIndex === 0 ? "validated" : (iIndex === 1 ? "inProgress" : "notStarted");
          } else {
            sStatus = "locked";
          }
        }
        var aPrereqTitles = (oStep.prereq || []).map(function(sId) {
          var oPrereqStep = oDomain.steps.filter(function(s) { return s.id === sId; })[0];
          return oPrereqStep ? oPrereqStep.title : sId;
        });
        return {
          id: oStep.id, title: oStep.title, desc: oStep.desc, type: oStep.type,
          typeLabel: oBundle.getText("assessment" + oStep.type.charAt(0).toUpperCase() + oStep.type.slice(1)),
          important: !!oStep.important, status: sStatus,
          statusLabel: oBundle.getText("status" + sStatus.charAt(0).toUpperCase() + sStatus.slice(1)),
          prereqLabel: aPrereqTitles.length ? aPrereqTitles.join(", ") : oBundle.getText("domainDialogNoPrereq"),
          isMemberContext: bIsMemberContext,
          isManagerViewing: bIsManagerViewing
        };
      });

      oViewModel.setProperty("/dialog", {
        domainId: oDomain.id,
        // Resolved to a plain string here, not a key - {i18n>...} XML
        // bindings need the key literally in the binding string, they
        // can't take the key itself from another binding.
        title: oBundle.getText("domain." + oDomain.id),
        isMemberContext: bIsMemberContext,
        isManagerViewing: bIsManagerViewing,
        memberName: oMember ? oMember.displayName : "",
        steps: aSteps
      });

      if (!this._pDomainDialog) {
        this._pDomainDialog = Fragment.load({
          id: this.getView().getId(),
          name: "aymax.hub.view.basisAcademy.DomainDetailDialog",
          controller: this
        }).then(function(oDialog) {
          this.getView().addDependent(oDialog);
          return oDialog;
        }.bind(this));
      }
      this._pDomainDialog.then(function(oDialog) { oDialog.open(); });
    },

    onCloseDomainDialog: function() {
      this._pDomainDialog.then(function(oDialog) { oDialog.close(); });
    },

    // ============================================================
    // Step actions - simulated (MessageToast only): there is no
    // backend for this module yet (frontend-first build, explicit
    // request). Wiring these to a real BasisAcademyService is the
    // next milestone, not something to fake with a fabricated OData
    // call here.
    // ============================================================
    _stepTitleFromEvent: function(oEvent) {
      return oEvent.getSource().getBindingContext("view-basisAcademy").getProperty("title");
    },

    onStepStart: function(oEvent) {
      MessageToast.show(this.getText("stepStarted", [this._stepTitleFromEvent(oEvent)]));
    },

    onStepTakeAssessment: function(oEvent) {
      MessageToast.show(this.getText("assessmentSubmitted", [this._stepTitleFromEvent(oEvent)]));
    },

    onStepValidate: function(oEvent) {
      var sMemberName = this.getViewModel().getProperty("/dialog/memberName");
      MessageToast.show(this.getText("stepValidated", [this._stepTitleFromEvent(oEvent), sMemberName]));
    },

    onStepRequestRetake: function(oEvent) {
      var sTitle = this._stepTitleFromEvent(oEvent);
      var oDate = new Date();
      oDate.setDate(oDate.getDate() + RETAKE_WAIT_DAYS);
      var sDate = oDate.toLocaleDateString("fr-FR");
      MessageBox.confirm(this.getText("retakeRequested", [sTitle, sDate]), {
        title: this.getText("btnRequestRetake")
      });
    }
  });
});
