sap.ui.define([], function() {
  "use strict";

  /**
   * ============================================================
   *  DEV-ONLY ROLE PREVIEW — Feed's half
   * ============================================================
   *  The "Rôle" preview dropdown lives in the shared shell
   *  (app/webapp/model/devRole.js, CLAUDE.md §5 C7 exception) -
   *  Feed is a separate app/Component with its own OData models, so
   *  it doesn't automatically pick up the header that dropdown sets
   *  on the shell's models.
   *
   *  sessionStorage is per-origin and per-tab, not per-page, so it
   *  survives the plain `window.location.href` navigation from the
   *  shell to Feed (they're the same origin, same tab) - this file
   *  only has to READ the key the shell already wrote
   *  ("aymax.devRole") and re-apply it to Feed's own models. It never
   *  writes that key itself; there's no dropdown here, Feed just
   *  follows whatever the shell last set.
   * ============================================================
   */

  var STORAGE_KEY = "aymax.devRole";
  var VALID_ROLES = ["Employee", "Manager", "HR", "Administrator", "Intern"];
  // Feed's own default (unnamed) model, plus its three named ones.
  // getModel("") does NOT resolve the default model in this UI5
  // version - only the no-argument form does (getModel() vs
  // getModel("") return different things; confirmed by inspecting the
  // live component - see the comment on _applyToModel below).
  var NAMED_MODEL_NAMES = ["rooms", "topics", "tags", "questions"];

  function getStoredRole() {
    try {
      return window.sessionStorage.getItem(STORAGE_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function _applyToModel(oModel, mHeaders) {
    if (oModel && typeof oModel.changeHttpHeaders === "function") {
      oModel.changeHttpHeaders(mHeaders);
    }
  }

  function applyToComponent(oComponent) {
    var sRole = getStoredRole();
    var mHeaders = VALID_ROLES.indexOf(sRole) !== -1 ? { "X-Dev-Role": sRole } : {};

    _applyToModel(oComponent.getModel(), mHeaders); // default model - no argument, not ""
    NAMED_MODEL_NAMES.forEach(function(sModelName) {
      _applyToModel(oComponent.getModel(sModelName), mHeaders);
    });
  }

  return {
    applyToComponent: applyToComponent
  };
});
