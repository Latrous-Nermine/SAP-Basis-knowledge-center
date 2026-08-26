sap.ui.define([
  "sap/m/Token",
  "../feed/ODataService"
], function(Token, ODataService) {
  "use strict";

  // Reusable tag-selection logic, extracted from the Feed module's own
  // (working) MultiInput pattern (Feed.controller.js: onTagLiveChange,
  // onTagTokenUpdate, _addTagValidator, _linkTags, _ensureTagAndLink) so
  // Knowledge Center and Questions can offer the same "pick an existing
  // tag or type a new one" UX without duplicating that logic a second and
  // third time. Feed itself is left untouched - only new callers use this.
  return {

    // All existing tags, for the picker's default (no-query) suggestion list.
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

    // Filters the full tag list by the user's query; when nothing matches
    // exactly, prepends a "Créer le tag ..." pseudo-item whose key encodes
    // the free-typed name (consumed back out in applyTokenUpdate below).
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

    // Lets the MultiInput accept a freely-typed value with no matching
    // suggestion (an entirely new tag, resolved/created later in linkTags).
    addFreeTextValidator: function(oInput) {
      if (!oInput || !oInput.addValidator) return;
      oInput.addValidator(function(args) {
        var sText = (args.text || "").trim();
        if (!sText) return null;
        if (args.suggestedToken) return args.suggestedToken;
        return new Token({ text: sText, key: "" });
      });
    },

    // Computes the new selected-tags array in response to a MultiInput
    // tokenUpdate event. Caller owns where the result is stored.
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

    // Links each selected tag to the target entity, resolving free-typed
    // (ID-less) tags against existing tags by name first, creating a new
    // Tag row only if genuinely none exists - same three-step resolution
    // Feed's _ensureTagAndLink already does for Posts.
    // sAddAction e.g. "/addTagToItem"; mTargetParam e.g. { itemID: sID },
    // merged with { tagID } on every call.
    linkTags: function(oModelTags, sAddAction, mTargetParam, aTags) {
      var that = this;
      if (!aTags || !aTags.length) return Promise.resolve();
      return aTags.reduce(function(pChain, oTag) {
        return pChain.then(function() {
          if (!oTag || !oTag.name || !oTag.name.trim()) return Promise.resolve();
          return that._ensureTagAndLink(oModelTags, sAddAction, mTargetParam, oTag)
            .catch(function(oError) {
              console.warn("Échec de la liaison du tag", oTag.name, oError);
            });
        });
      }, Promise.resolve());
    },

    _ensureTagAndLink: function(oModelTags, sAddAction, mTargetParam, oTag) {
      var fnLink = function(sTagID) {
        var mParams = Object.assign({ tagID: sTagID }, mTargetParam);
        return ODataService.callAction(oModelTags, sAddAction, mParams);
      };
      if (oTag.ID) return fnLink(oTag.ID);

      return ODataService.callFunction(oModelTags, "/searchTags", { query: oTag.name.trim() })
        .then(function(aResults) {
          var found = (aResults || []).find(function(t) {
            return t && t.name && t.name.toLowerCase() === oTag.name.trim().toLowerCase();
          });
          if (found) return fnLink(found.ID);
          return ODataService.callAction(oModelTags, "/createTag", {
            name: oTag.name.trim(), color: "#1E3A8A", icon: "", description: ""
          }).then(function(oCreated) {
            if (oCreated && oCreated.ID) return fnLink(oCreated.ID);
          });
        });
    }
  };
});
