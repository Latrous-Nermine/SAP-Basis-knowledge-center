sap.ui.define([
  "sap/m/Token",
  "../service/ODataService"
], function(Token, ODataService) {
  "use strict";

  // Reusable tag-selection logic for Questions' create dialog, mirroring
  // this app's own PostCreateDialog tag picker (Feed.controller.js) so
  // both offer the same "pick an existing tag or type a new one" UX
  // without duplicating that logic a second time within this app. A
  // structurally identical copy (not a shared file - a separate UI5
  // Component with no shared resource loading) lives in the main shell
  // at app/webapp/model/shared/TagPicker.js for Knowledge Center.
  return {

    loadAllTags: function(oModelTags) {
      return new Promise(function(resolve) {
        if (!oModelTags) { resolve([]); return; }
        var oBinding;
        try {
          oBinding = oModelTags.bindList("/Tags", null, null, null, { "$$skipCount": true });
        } catch (oError) {
          resolve([]);
          return;
        }
        oBinding.requestContexts().then(function(aContexts) {
          resolve(aContexts.map(function(oContext) { return oContext.getObject(); }));
        }).catch(function() { resolve([]); });
      });
    },

    filterSuggestions: function(aAllTags, sQuery) {
      var sValue = (sQuery || "").trim().toLowerCase();
      if (!sValue) {
        return aAllTags.slice().sort(function(a, b) {
          return (b.usageCount || 0) - (a.usageCount || 0);
        }).slice(0, 8);
      }
      var aFiltered = aAllTags.filter(function(oTag) {
        return oTag.name && oTag.name.toLowerCase().indexOf(sValue) >= 0;
      });
      var bExact = aFiltered.some(function(oTag) {
        return oTag.name && oTag.name.toLowerCase() === sValue;
      });
      if (!bExact && sValue.length >= 2) {
        aFiltered = [{
          ID: "__new__:" + encodeURIComponent(sValue),
          name: 'Créer le tag "' + sValue + '"'
        }].concat(aFiltered);
      }
      return aFiltered;
    },

    addFreeTextValidator: function(oInput) {
      if (!oInput || !oInput.addValidator) return;
      oInput.addValidator(function(args) {
        var sText = (args.text || "").trim();
        if (!sText) return null;
        if (args.suggestedToken) return args.suggestedToken;
        return new Token({ text: sText, key: "" });
      });
    },

    applyTokenUpdate: function(oEvent, aCurrentTags) {
      var aTags = (aCurrentTags || []).slice();
      var sType = oEvent.getParameter("type");

      if (sType === "added") {
        (oEvent.getParameter("addedTokens") || []).forEach(function(oToken) {
          var sKey  = oToken.getKey();
          var sName = oToken.getText().trim();
          if (sKey && sKey.indexOf("__new__:") === 0) {
            sName = decodeURIComponent(sKey.substring(8));
            if (oToken.setText) oToken.setText(sName);
          }
          if (!sName) return;
          var bExists = aTags.some(function(oTag) {
            return oTag.name && oTag.name.toLowerCase() === sName.toLowerCase();
          });
          if (bExists) {
            oToken.destroy();
          } else {
            var bIsNew = sKey && sKey.indexOf("__new__:") === 0;
            aTags.push({ ID: bIsNew ? null : (oToken.getKey() || null), name: sName });
          }
        });
      } else if (sType === "removed") {
        var aRemovedNames = (oEvent.getParameter("removedTokens") || []).map(function(oToken) {
          return oToken.getText();
        });
        aTags = aTags.filter(function(oTag) {
          return aRemovedNames.indexOf(oTag.name) < 0;
        });
      }
      return aTags;
    },

    // Resolves each selected tag to a real Tag ID (creating it first if
    // it was free-typed), returning a plain array of tagIDs - Questions
    // takes tagIDs directly on createQuestion rather than a separate
    // link-after-create action, unlike Knowledge/Feed's addTagTo* calls.
    resolveTagIDs: function(oModelTags, aTags) {
      var that = this;
      if (!aTags || !aTags.length) return Promise.resolve([]);
      return aTags.reduce(function(pChain, oTag) {
        return pChain.then(function(aIDs) {
          if (!oTag || !oTag.name || !oTag.name.trim()) return aIDs;
          return that._resolveTagID(oModelTags, oTag).then(function(sID) {
            if (sID) aIDs.push(sID);
            return aIDs;
          }).catch(function(oError) {
            console.warn("Échec de la résolution du tag", oTag.name, oError);
            return aIDs;
          });
        });
      }, Promise.resolve([]));
    },

    _resolveTagID: function(oModelTags, oTag) {
      if (oTag.ID) return Promise.resolve(oTag.ID);

      return ODataService.callFunction(oModelTags, "/searchTags", { query: oTag.name.trim() })
        .then(function(aResults) {
          var found = (aResults || []).find(function(t) {
            return t && t.name && t.name.toLowerCase() === oTag.name.trim().toLowerCase();
          });
          if (found) return found.ID;
          return ODataService.callAction(oModelTags, "/createTag", {
            name: oTag.name.trim(), color: "#1E3A8A", icon: "", description: ""
          }).then(function(oCreated) {
            return oCreated && oCreated.ID;
          });
        });
    }
  };
});
