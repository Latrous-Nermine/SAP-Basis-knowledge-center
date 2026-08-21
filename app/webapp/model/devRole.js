sap.ui.define([], function() {
  "use strict";

  /**
   * ============================================================
   *  DEV-ONLY ROLE PREVIEW
   * ============================================================
   *  Temporary, explicitly requested (2026-08) - see CLAUDE.md §5
   *  decision C7 for why this normally isn't allowed and why this
   *  exception exists. MUST be removed before the real XSUAA rollout
   *  (TODO-INTEGRATION.md I-25).
   *
   *  This does NOT bypass or reimplement authorization - it just tags
   *  every request with a plain X-Dev-Role header. The actual identity
   *  swap (rewriting the real Basic-Auth Authorization header to one
   *  of the five already-configured local mocked users - package.json,
   *  CLAUDE.md §7/§13) happens server-side in srv/server.js, early
   *  enough that CAP's own auth middleware processes it for real -
   *  every @restrict/@requires check still runs against a real role.
   *
   *  Two earlier bugs, both confirmed and fixed by actually driving a
   *  real headless browser against the running app (not guessed):
   *  1) setting the Authorization header directly from here didn't
   *     work, because once a browser has completed a native Basic-Auth
   *     login for this origin, it re-attaches its own cached
   *     credentials to every request, silently overriding whatever
   *     this code set. A plain custom header has no such browser-level
   *     caching behavior to fight.
   *  2) `oModel.setHttpHeaders(...)` - that's a v2 ODataModel method
   *     that doesn't exist on v4. The real v4 API is
   *     `changeHttpHeaders(...)`, found by inspecting the live model
   *     instance's prototype chain.
   * ============================================================
   */

  var STORAGE_KEY = "aymax.devRole";

  var VALID_ROLES = ["Employee", "Manager", "HR", "Administrator", "Intern"];

  // Every named OData v4 model declared in this shell's manifest.json -
  // kept in sync by hand (no way to introspect "all OData models"
  // generically from a UIComponent). Feed's own timeline page was
  // migrated into this shell (2026-08) and uses these same models
  // ("feed", "tags"), so it's covered automatically here now - no
  // separate relay needed for it. Its Rooms/Questions/Topics/Tags
  // sub-pages are still the standalone app/feed app for now, which
  // carries the preview via its own app/feed/webapp/model/devRole.js,
  // reading the same sessionStorage key this file writes below.
  var ODATA_MODEL_NAMES = [
    "notification", "people", "knowledge", "dashboard", "rewards",
    "certifications", "admin", "depot", "hr", "reports",
    "rapportsStage", "validation", "feed", "tags", "questions"
  ];

  function getStoredRole() {
    try {
      return window.sessionStorage.getItem(STORAGE_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function storeRole(sRole) {
    try {
      if (sRole) {
        window.sessionStorage.setItem(STORAGE_KEY, sRole);
      } else {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      // sessionStorage unavailable (e.g. private mode edge cases) -
      // the override just won't survive a reload, not fatal.
    }
  }

  // Tags every OData model's requests with X-Dev-Role. Call with ""
  // (or omit) to go back to whatever the browser's own cached login
  // provides - srv/server.js only rewrites Authorization when this
  // header is present and matches a known role.
  function applyToComponent(oComponent, sRole) {
    var mHeaders = VALID_ROLES.indexOf(sRole) !== -1 ? { "X-Dev-Role": sRole } : {};

    ODATA_MODEL_NAMES.forEach(function(sModelName) {
      var oModel = oComponent.getModel(sModelName);
      if (oModel && typeof oModel.changeHttpHeaders === "function") {
        oModel.changeHttpHeaders(mHeaders);
      }
    });
  }

  return {
    getStoredRole: getStoredRole,
    storeRole: storeRole,
    applyToComponent: applyToComponent
  };
});
