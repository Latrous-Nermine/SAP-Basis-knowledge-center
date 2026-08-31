sap.ui.define([
  "../BaseController",
  "../../model/experts/formatter",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/core/Fragment",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(BaseController, formatter, Filter, FilterOperator, Fragment, MessageToast, MessageBox) {
  "use strict";

  var DEPARTMENTS = ["", "SAP Basis", "SAP Technical", "RH", "IT"];

  // Curated SAP-specific subset of the shared Tags taxonomy (matches the
  // literal Tags.name values seeded in db/data - see Phase 4). Not read
  // from the backend: Tags isn't projected by PeopleService, and this
  // facet is meant to be a fixed, product-name list, not "every tag ever
  // used anywhere in the app" (that would also pull in Java/Angular/etc.).
  var TECHNOLOGIES = [
    "SAP BTP", "CAP", "HANA", "SAP Fiori", "SAPUI5", "CDS", "Cloud Foundry",
    "SAP Basis", "ABAP", "S/4HANA", "SuccessFactors", "Integration Suite",
    "IAS", "XSUAA", "BW/4HANA", "Datasphere"
  ];

  return BaseController.extend("aymax.hub.controller.experts.ExpertsList", {

    formatter: formatter,

    // Overrides BaseController's getResourceBundle() (which returns the
    // shell's own tiny 2-key i18n bundle) so this.getText()/formatter
    // lookups resolve against this module's real, full bundle instead.
    getResourceBundle: function() {
      return this.getOwnerComponent().getModel("i18n-experts").getResourceBundle();
    },

    // Overrides BaseController's getViewModel() so every existing
    // this.getViewModel() call below keeps working unchanged, now pointed
    // at this module's own named model instead of the shell's shared one.
    getViewModel: function() {
      return this.getOwnerComponent().getModel("view-experts");
    },

    onInit: function() {
      formatter.setResourceBundle(this.getResourceBundle());
      // Was the unnamed default model in the old standalone app; now named
      // models, since one shared Component can only have one true default.
      this.oModel = this.getOwnerComponent().getModel("people");
      this.oFeedModel = this.getOwnerComponent().getModel("feed");
      this.oQuestionsModel = this.getOwnerComponent().getModel("questions");

      this._oFilters = { department: "", search: "", expertiseLevel: "", availability: "", technologies: [], skill: "" };

      var oBundle = this.getResourceBundle();
      var aDeptFilters = DEPARTMENTS.map(function(sDept) {
        return { id: sDept, label: sDept === "" ? oBundle.getText("deptAll") : sDept, active: sDept === "" };
      });
      var aTechOptions = TECHNOLOGIES.map(function(sName) {
        return { key: sName, text: sName };
      });

      this.getViewModel().setProperty("/departmentFilters", aDeptFilters);
      this.getViewModel().setProperty("/technologyOptions", aTechOptions);
      this.getViewModel().setProperty("/activeFilterTokens", []);
      this.getViewModel().setProperty("/filters", { expertiseLevel: "", availability: "", technologies: [], skill: "" });
      this.getViewModel().setProperty("/currentUserID", "");

      this._loadCurrentUserID();
    },

    onHomePress: function() {
      // Feed is rendered inside this shell at its own "feed" route
      // (view/feed/Feed.view.xml) - navigate via the router, not a
      // hard page load to the standalone /feed/webapp app.
      this.getRouter().navTo("feed");
    },

    _loadCurrentUserID: function() {
      this.oModel.bindContext("/getMyUserID()").requestObject().then(function(oData) {
        this.getViewModel().setProperty("/currentUserID", (oData && oData.value) || "");
      }.bind(this)).catch(function() { /* not fatal - Follow buttons just stay visible on own card */ });
    },

    // ────────────────────────────────────────────────────────────
    // Filters - department chips + search are always visible; the other
    // four (expertise level, availability, technology, skill) live in the
    // Filtres dialog. All combine through the same _applyFilters() call,
    // one server-side $filter request (see Phase 3/4 for why).
    // ────────────────────────────────────────────────────────────

    onSearch: function(oEvent) {
      this._oFilters.search = (oEvent.getParameter("newValue") || "").trim();
      this._applyFilters();
    },

    onDepartmentFilterPress: function(oEvent) {
      var sDept = oEvent.getSource().getBindingContext("view-experts").getProperty("id");
      this._oFilters.department = sDept;

      var aDeptFilters = this.getViewModel().getProperty("/departmentFilters");
      aDeptFilters.forEach(function(f) { f.active = (f.id === sDept); });
      this.getViewModel().setProperty("/departmentFilters", aDeptFilters);

      this._applyFilters();
    },

    onOpenFilters: function() {
      if (!this._pFilterDialog) {
        this._pFilterDialog = Fragment.load({
          id: this.getView().getId(),
          name: "aymax.hub.view.experts.FilterDialog",
          controller: this
        }).then(function(oDialog) {
          this.getView().addDependent(oDialog);
          return oDialog;
        }.bind(this));
      }
      this.getViewModel().setProperty("/filters", {
        expertiseLevel: this._oFilters.expertiseLevel,
        availability: this._oFilters.availability,
        technologies: this._oFilters.technologies.slice(),
        skill: this._oFilters.skill
      });
      this._pFilterDialog.then(function(oDialog) { oDialog.open(); });
    },

    onApplyFilters: function() {
      var oFilters = this.getViewModel().getProperty("/filters");
      this._oFilters.expertiseLevel = oFilters.expertiseLevel;
      this._oFilters.availability = oFilters.availability;
      this._oFilters.technologies = oFilters.technologies || [];
      this._oFilters.skill = (oFilters.skill || "").trim();

      this._updateActiveFilterTokens();
      this._pFilterDialog.then(function(oDialog) { oDialog.close(); });
      this._applyFilters();
    },

    // Was only clearing the dialog's own edit-buffer (view>/filters) - the
    // applied filter state (this._oFilters), the active-filter token chips
    // and the actual list results were left untouched, so "Réinitialiser"
    // visually cleared the form but the results stayed filtered by
    // whatever was applied before. Now mirrors onApplyFilters: commits the
    // cleared state, refreshes the tokens, re-runs the query, and closes.
    onResetFilters: function() {
      var oEmptyFilters = { expertiseLevel: "", availability: "", technologies: [], skill: "" };
      this.getViewModel().setProperty("/filters", oEmptyFilters);

      this._oFilters.expertiseLevel = "";
      this._oFilters.availability = "";
      this._oFilters.technologies = [];
      this._oFilters.skill = "";

      this._updateActiveFilterTokens();
      this._pFilterDialog.then(function(oDialog) { oDialog.close(); });
      this._applyFilters();
    },

    onRemoveFilterToken: function(oEvent) {
      var sKey = oEvent.getParameter("token").getKey();
      if (sKey === "expertiseLevel") this._oFilters.expertiseLevel = "";
      else if (sKey === "availability") this._oFilters.availability = "";
      else if (sKey === "skill") this._oFilters.skill = "";
      else if (sKey.indexOf("tech:") === 0) {
        var sTech = sKey.slice(5);
        this._oFilters.technologies = this._oFilters.technologies.filter(function(t) { return t !== sTech; });
      }
      this._updateActiveFilterTokens();
      this._applyFilters();
    },

    _updateActiveFilterTokens: function() {
      var oBundle = this.getResourceBundle();
      var aTokens = [];
      if (this._oFilters.expertiseLevel) {
        aTokens.push({ key: "expertiseLevel", text: this._oFilters.expertiseLevel });
      }
      if (this._oFilters.availability) {
        aTokens.push({ key: "availability", text: formatter.availabilityLabel(this._oFilters.availability) });
      }
      if (this._oFilters.skill) {
        aTokens.push({ key: "skill", text: oBundle.getText("filterSkill") + ": " + this._oFilters.skill });
      }
      this._oFilters.technologies.forEach(function(sTech) {
        aTokens.push({ key: "tech:" + sTech, text: sTech });
      });
      this.getViewModel().setProperty("/activeFilterTokens", aTokens);
    },

    // Filter() paths below are relative to whatever model the target list
    // binding itself uses (the "people" named model, per its items= in the
    // view) - Filter objects don't carry their own model prefix, unlike XML
    // bindings, so nothing here needed to change.
    _applyFilters: function() {
      var aFilters = [];
      var f = this._oFilters;

      if (f.department) {
        aFilters.push(new Filter("department", FilterOperator.EQ, f.department));
      }

      if (f.search) {
        aFilters.push(new Filter({
          filters: [
            new Filter("displayName", FilterOperator.Contains, f.search),
            new Filter("jobTitle", FilterOperator.Contains, f.search),
            new Filter({ path: "skills", operator: FilterOperator.Any, variable: "s",
              condition: new Filter("s/skillName", FilterOperator.Contains, f.search) })
          ],
          and: false
        }));
      }

      if (f.expertiseLevel) {
        aFilters.push(new Filter("expertiseLevel", FilterOperator.EQ, f.expertiseLevel));
      }

      if (f.availability) {
        aFilters.push(new Filter("availability", FilterOperator.EQ, f.availability));
      }

      if (f.skill) {
        aFilters.push(new Filter({ path: "skills", operator: FilterOperator.Any, variable: "s",
          condition: new Filter("s/skillName", FilterOperator.Contains, f.skill) }));
      }

      if (f.technologies && f.technologies.length) {
        var aTechConditions = f.technologies.map(function(sTech) {
          return new Filter("t/technologyName", FilterOperator.EQ, sTech);
        });
        aFilters.push(new Filter({ path: "technologies", operator: FilterOperator.Any, variable: "t",
          condition: new Filter({ filters: aTechConditions, and: false }) }));
      }

      this.byId("expertsList").getBinding("items").filter(aFilters);
    },

    // ────────────────────────────────────────────────────────────
    // Card actions
    // ────────────────────────────────────────────────────────────

    onCardPress: function(oEvent) {
      this._navigateToProfile(oEvent.getSource().getBindingContext("people").getProperty("userID"));
    },

    onViewProfilePress: function(oEvent) {
      var sUserID = oEvent.getSource().getBindingContext("people").getProperty("userID");
      this._navigateToProfile(sUserID);
    },

    _navigateToProfile: function(sUserID) {
      if (!sUserID) return;
      // Retroactive fix: Profile was already migrated into this shared app
      // by the time Experts migrated, so this should have been navTo() from
      // the start rather than a full-page redirect to the old standalone
      // copy - caught while wiring the same pattern for Dashboard.
      // "profileDetail", not "profile" (2026-08 fix): the route used to be
      // one "profile" name covering both patterns
      // (["profile","profile/{userID}"]), and navTo() with a userID
      // silently built the param-less URL instead - every card click
      // landed back on the caller's own profile, never the one clicked
      // (see Profile.controller.js#onInit for the full explanation).
      this.getRouter().navTo("profileDetail", { userID: sUserID });
    },

    onContactPress: function(oEvent) {
      var sEmail = oEvent.getSource().getBindingContext("people").getProperty("email");
      if (sEmail) window.location.href = "mailto:" + sEmail;
    },

    onFollowPress: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("people");
      var bIsFollowedByMe = oContext.getProperty("isFollowedByMe");
      var sUserID = oContext.getProperty("userID");
      var sAction = bIsFollowedByMe ? "unfollowUser" : "followUser";
      var sErrorKey = bIsFollowedByMe ? "errorUnfollow" : "errorFollow";

      var oActionContext = this.bindAction(this.oModel, "/" + sAction, { userID: sUserID });
      oActionContext.execute().then(function() {
        oContext.refresh();
      }).catch(function(oError) {
        MessageBox.error((oError && oError.message) || this.getText(sErrorKey));
      }.bind(this));
    },

    // Real Question now (2026-08), not a Feed Post tagged type:"question" -
    // TODO-INTEGRATION.md I-19: the Questions module didn't exist yet
    // when this was first built, so a Post was the only content type
    // available. Same one-click UX (no new dialog), now landing in the
    // Questions module where a question actually belongs, instead of
    // silently vanishing from it.
    onAskQuestionPress: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("people");
      var sDisplayName = oContext.getProperty("displayName");
      var sPrefix = this.getText("askQuestionContentPrefix", [sDisplayName]);

      var oActionContext = this.bindAction(this.oQuestionsModel, "/createQuestion", {
        title: sPrefix,
        content: sPrefix + " ",
        roomID: null,
        tagIDs: [],
        topicIDs: []
      });

      oActionContext.execute().then(function() {
        var oResult = oActionContext.getBoundContext().getObject();
        MessageToast.show(this.getText("askQuestionSuccess"));
        window.location.href = "/feed/webapp/index.html#/questions/" + oResult.ID;
      }.bind(this)).catch(function() {
        MessageBox.error(this.getText("errorAskQuestion"));
      }.bind(this));
    }
  });
});
