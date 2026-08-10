sap.ui.define([
  "./BaseController",
  "../model/formatter",
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

  return BaseController.extend("aymax.experts.controller.ExpertsList", {

    formatter: formatter,

    onInit: function() {
      formatter.setResourceBundle(this.getResourceBundle());
      this.oModel = this.getOwnerComponent().getModel();
      this.oFeedModel = this.getOwnerComponent().getModel("feed");

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
      var sDept = oEvent.getSource().getBindingContext("view").getProperty("id");
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
          name: "aymax.experts.view.FilterDialog",
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

    onResetFilters: function() {
      this.getViewModel().setProperty("/filters", { expertiseLevel: "", availability: "", technologies: [], skill: "" });
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
      this._navigateToProfile(oEvent.getSource().getBindingContext().getProperty("userID"));
    },

    onViewProfilePress: function(oEvent) {
      var sUserID = oEvent.getSource().getBindingContext().getProperty("userID");
      this._navigateToProfile(sUserID);
    },

    _navigateToProfile: function(sUserID) {
      if (!sUserID) return;
      window.location.href = "/profile/webapp/index.html#/profile/" + encodeURIComponent(sUserID);
    },

    onContactPress: function(oEvent) {
      var sEmail = oEvent.getSource().getBindingContext().getProperty("email");
      if (sEmail) window.location.href = "mailto:" + sEmail;
    },

    onFollowPress: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext();
      var bIsFollowedByMe = oContext.getProperty("isFollowedByMe");
      var sUserID = oContext.getProperty("userID");
      var sAction = bIsFollowedByMe ? "unfollowUser" : "followUser";
      var sErrorKey = bIsFollowedByMe ? "errorUnfollow" : "errorFollow";

      var oActionContext = this.oModel.bindContext("/" + sAction)({ userID: sUserID });
      oActionContext.execute().then(function() {
        oContext.refresh();
      }).catch(function(oError) {
        MessageBox.error((oError && oError.message) || this.getText(sErrorKey));
      }.bind(this));
    },

    // Lot 3's Questions entity doesn't exist yet (TODO-INTEGRATION.md I-19) -
    // this creates a real Post of type 'question' via Lot 1's FeedService,
    // pre-filled toward the expert, then hands off to Feed. Forward
    // compatible: swapping this for a real Question is a one-line change
    // once Lot 3 ships it, not a rewrite.
    onAskQuestionPress: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext();
      var sDisplayName = oContext.getProperty("displayName");
      var sPrefix = this.getText("askQuestionContentPrefix", [sDisplayName]);

      var oListBinding = this.oFeedModel.bindList("/Posts");
      var oNewContext = oListBinding.create({
        content: sPrefix + " ",
        type: "question",
        status: "published"
      });

      oNewContext.created().then(function() {
        MessageToast.show(this.getText("askQuestionSuccess"));
        window.location.href = "/feed/webapp/index.html";
      }.bind(this)).catch(function() {
        MessageBox.error(this.getText("errorAskQuestion"));
      }.bind(this));
    }
  });
});
