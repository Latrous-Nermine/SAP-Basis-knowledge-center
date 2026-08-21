sap.ui.define([
  "../BaseController",
  "../../model/search/formatter",
  "sap/m/MessageToast"
], function(BaseController, formatter, MessageToast) {
  "use strict";

  return BaseController.extend("aymax.hub.controller.search.Search", {

    formatter: formatter,

    getViewModel: function() {
      return this.getOwnerComponent().getModel("view-search");
    },

    onInit: function() {
      this.oSearchModel = this.getOwnerComponent().getModel("search");
      this.getViewModel().setData({
        query: "",
        lastQuery: "",
        total: 0,
        activeFacet: "",
        facetCounts: { knowledge: 0, question: 0, expert: 0 },
        results: [],
        filteredResults: []
      });
      this.getRouter().getRoute("search").attachPatternMatched(this._onRouteMatched, this);
    },

    // Landing here with a shared/bookmarked #/search?q=... link (e.g. from
    // Feed's own search box, once wired) runs the search immediately
    // instead of showing an empty page the user has to re-trigger by hand.
    _onRouteMatched: function(oEvent) {
      var mQuery = (oEvent.getParameter("arguments") || {})["?query"] || {};
      if (mQuery.q) {
        this.getViewModel().setProperty("/query", mQuery.q);
        this._runSearch(mQuery.q);
      }
    },

    onSearch: function(oEvent) {
      var sQuery = (oEvent.getParameter("query") || "").trim();
      if (!sQuery) return;
      // Same fix as App.controller.js#onHeaderSearch - router.navTo's
      // own {"?query": {...}} object serialization double-encodes the
      // value. Setting the hash directly re-fires _onRouteMatched below
      // (which then runs the actual search), so there's no separate
      // _runSearch call needed here.
      window.location.hash = "#/search?q=" + encodeURIComponent(sQuery);
    },

    _runSearch: function(sQuery) {
      var that = this;
      // bindAction returns the still-unexecuted operation - execute it
      // and read the result the same way every other action/function
      // call in this shell already does.
      var oOperation = this.bindAction(this.oSearchModel, "/search", { q: sQuery, type: null });
      oOperation.execute().then(function() {
        var oData = oOperation.getBoundContext().getObject();
        var mCounts = { knowledge: 0, question: 0, expert: 0 };
        (oData.facets || []).forEach(function(oFacet) {
          mCounts[oFacet.type] = oFacet.count;
        });
        that.getViewModel().setProperty("/lastQuery", oData.query);
        that.getViewModel().setProperty("/total", oData.total);
        that.getViewModel().setProperty("/facetCounts", mCounts);
        that.getViewModel().setProperty("/results", oData.results || []);
        that.getViewModel().setProperty("/activeFacet", "");
        that.getViewModel().setProperty("/filteredResults", oData.results || []);
      }).catch(function() {
        MessageToast.show("Une erreur est survenue pendant la recherche.");
      });
    },

    _applyFacet: function(sFacet) {
      this.getViewModel().setProperty("/activeFacet", sFacet);
      var aResults = this.getViewModel().getProperty("/results") || [];
      var aFiltered = sFacet ? aResults.filter(function(o) { return o.type === sFacet; }) : aResults;
      this.getViewModel().setProperty("/filteredResults", aFiltered);
    },

    onFacetAll: function() { this._applyFacet(""); },
    onFacetKnowledge: function() { this._applyFacet("knowledge"); },
    onFacetQuestion: function() { this._applyFacet("question"); },
    onFacetExpert: function() { this._applyFacet("expert"); },

    onResultPress: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("view-search");
      var sType = oContext.getProperty("type");
      var sId = oContext.getProperty("id");

      if (sType === "knowledge") {
        this.getRouter().navTo("knowledgeDetail", { itemID: sId });
      } else if (sType === "expert") {
        this.getRouter().navTo("profile", { userID: sId });
      } else if (sType === "question") {
        // Questions live in the standalone Lot 1/3 app, not this shell -
        // same cross-app pattern already used for Rooms/Questions/Tags
        // nav links and the Notifications bell redirect.
        window.location.href = "/feed/webapp/index.html#/questions/" + sId;
      }
    }
  });
});
