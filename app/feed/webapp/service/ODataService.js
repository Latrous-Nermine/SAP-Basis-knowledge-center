sap.ui.define([
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(MessageToast, MessageBox) {
  "use strict";

  return {
    /**
     * Appelle une action OData V4 (non liée)
     * @param {sap.ui.model.odata.v4.ODataModel} oModel
     * @param {string} sActionPath — ex: "/likePost"
     * @param {object} mParameters — paramètres de l'action
     */
    callAction: function(oModel, sActionPath, mParameters) {
      return new Promise(function(resolve, reject) {
        if (!oModel) {
          MessageBox.error("Modèle OData non disponible");
          reject(new Error("Model not ready"));
          return;
        }

        var oOperation = oModel.bindContext(sActionPath + "(...)");
        if (mParameters) {
          Object.keys(mParameters).forEach(function(sKey) {
            oOperation.setParameter(sKey, mParameters[sKey]);
          });
        }

        oOperation.execute().then(function() {
          var oBound = oOperation.getBoundContext();
          var oResult = oBound ? oBound.getObject() : null;
          resolve(oResult);
        }).catch(function(oError) {
          var sMessage = oError.message || "Erreur lors de l'exécution de l'action";
          MessageBox.error(sMessage);
          reject(oError);
        });
      });
    },

    /**
     * Appelle une fonction OData V4 (non liée)
     * @param {sap.ui.model.odata.v4.ODataModel} oModel
     * @param {string} sFunctionPath — ex: "/getTrendingTags"
     * @param {object} mParameters — paramètres de la fonction
     */
    callFunction: function(oModel, sFunctionPath, mParameters) {
      return new Promise(function(resolve, reject) {
        if (!oModel) {
          reject(new Error("Model not ready"));
          return;
        }

        // Construire le path avec paramètres si nécessaire
        var sPath = sFunctionPath + "(";
        if (mParameters && Object.keys(mParameters).length > 0) {
          var aParts = Object.keys(mParameters).map(function(k) {
            var v = mParameters[k];
            return k + "=" + (typeof v === "string" ? "'" + v + "'" : v);
          });
          sPath += aParts.join(",");
        }
        sPath += ")";

        var oContext = oModel.bindContext(sPath);

        oContext.requestObject().then(function(oData) {
          // Les fonctions CAP retournent parfois { value: [...] }
          if (oData && oData.value !== undefined) {
            resolve(oData.value);
          } else {
            resolve(oData);
          }
        }).catch(function(oError) {
          reject(oError);
        });
      });
    }
  };
});
