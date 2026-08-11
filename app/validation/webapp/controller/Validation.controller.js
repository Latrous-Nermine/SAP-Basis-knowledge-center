sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/Input",
  "sap/m/TextArea",
  "sap/m/Label",
  "sap/ui/layout/VerticalLayout",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, Dialog, Button, Input, TextArea, Label, VerticalLayout, Filter, FilterOperator, JSONModel) {
  "use strict";

  return Controller.extend("aymax.validation.controller.Validation", {

    onInit: function () {
      this.oViewModel = this.getOwnerComponent().getModel("view");
      if (!this.oViewModel) {
        this.oViewModel = new JSONModel();
        this.getView().setModel(this.oViewModel, "view");
      }
      this.oViewModel.setProperty("/filterStatus", "pending");
      this.oViewModel.setProperty("/counts", { pending: 0, approved: 0, rejected: 0, all: 0 });

      this._loadCounts();
      this._applyListFilter("pending");
    },

    _loadCounts: function () {
      var oModel = this.getView().getModel();
      var that = this;

      if (!oModel) {
        console.error("OData model not found.");
        return;
      }

      var oBinding = oModel.bindList("/ValidationCounts");

      oBinding.requestContexts(0, 1)
        .then(function (aContexts) {
          if (!aContexts.length) {
            console.warn("ValidationCounts is empty.");
            return;
          }

          var oData = aContexts[0].getObject();

          that.oViewModel.setProperty("/counts", {
            pending: Number(oData.pending || 0),
            approved: Number(oData.approved || 0),
            rejected: Number(oData.rejected || 0),
            all: Number(oData.total || 0)
          });
        })
        .catch(function (oError) {
          console.error("Error loading ValidationCounts:", oError);
        });
    },

    _applyListFilter: function (sKey) {
      var oList = this.byId("validationList");
      if (!oList) return;

      var oBinding = oList.getBinding("items");
      if (!oBinding) return;

      var aFilters = [];
      if (sKey !== "all") {
        aFilters.push(new Filter("status", FilterOperator.EQ, sKey));
      }

      oBinding.filter(aFilters);
    },

    onNavToApp: function (oEvent) {
      var sTarget = oEvent.getSource().data("targetApp");
      if (!sTarget) return;

      if (sap.ushell && sap.ushell.Container) {
        sap.ushell.Container.getServiceAsync("CrossApplicationNavigation").then(function (oCrossAppNav) {
          oCrossAppNav.toExternal({
            target: { semanticObject: sTarget, action: "display" }
          });
        });
      } else {
        window.location.href = "/" + sTarget + "/webapp/index.html";
      }
    },

    onTabSelect: function (oEvent) {
      var sKey = oEvent.getSource().data("key");
      this.oViewModel.setProperty("/filterStatus", sKey);
      this._applyListFilter(sKey);
    },

    onChangeStatus: function (oEvent, sNewStatus) {
      var oContext = oEvent.getSource().getBindingContext();
      if (!oContext) return;

      oContext.setProperty("status", sNewStatus);

      var oModel = oContext.getModel();

      if (oModel && oModel.hasPendingChanges()) {
        oModel.submitBatch("$auto")
          .then(function () {
            MessageToast.show("Statut mis à jour : " + sNewStatus);

            this._loadCounts();

            var sCurrentFilter = this.oViewModel.getProperty("/filterStatus");
            this._applyListFilter(sCurrentFilter);
          }.bind(this))
          .catch(function (oError) {
            console.error("Status update error:", oError);
            MessageToast.show("Erreur lors de la mise à jour.");
          });
      }
    },

    onApprove: function (oEvent) {
      this.onChangeStatus(oEvent, "approved");
    },

    onReject: function (oEvent) {
      this.onChangeStatus(oEvent, "rejected");
    },

    onModify: function (oEvent) {
      var oContext = oEvent.getSource().getBindingContext();
      if (!oContext) return;

      var sCurrentTitle = oContext.getProperty("title");
      var sCurrentExcerpt = oContext.getProperty("excerpt");

      if (!this.oEditContentDialog) {
        this.oEditContentDialog = new Dialog({
          title: "Éditer le contenu",
          contentWidth: "500px",
          content: new VerticalLayout({
            width: "100%",
            content: [
              new Label({ text: "Titre", labelFor: "editContentTitle" }).addStyleClass("sapUiTinyMarginTopBottom"),
              new Input("editContentTitle"),
              new Label({ text: "Extrait / Contenu", labelFor: "editContentExcerpt" }).addStyleClass("sapUiTinyMarginTopBottom"),
              new TextArea("editContentExcerpt", { width: "100%", rows: 5 })
            ]
          }).addStyleClass("sapUiContentPadding"),
          beginButton: new Button({
            text: "Enregistrer",
            type: "Emphasized",
            press: function () {
              var sTitle = sap.ui.getCore().byId("editContentTitle").getValue();
              var sExcerpt = sap.ui.getCore().byId("editContentExcerpt").getValue();

              var oCtx = this.oEditContentDialog.getBindingContext();
              if (oCtx) {
                oCtx.setProperty("title", sTitle);
                oCtx.setProperty("excerpt", sExcerpt);

                var oModel = oCtx.getModel();
                if (oModel && oModel.hasPendingChanges()) {
                  oModel.submitBatch("$auto")
                    .then(function () {
                      MessageToast.show("Contenu mis à jour.");
                    })
                    .catch(function (oError) {
                      console.error(oError);
                      MessageToast.show("Erreur lors de la modification.");
                    });
                }
              }

              this.oEditContentDialog.close();
            }.bind(this)
          }),
          endButton: new Button({
            text: "Annuler",
            press: function () {
              this.oEditContentDialog.close();
            }.bind(this)
          })
        });

        this.getView().addDependent(this.oEditContentDialog);
      }

      this.oEditContentDialog.setBindingContext(oContext);
      sap.ui.getCore().byId("editContentTitle").setValue(sCurrentTitle || "");
      sap.ui.getCore().byId("editContentExcerpt").setValue(sCurrentExcerpt || "");
      this.oEditContentDialog.open();
    },

    formatStatusState: function (sStatus) {
      if (sStatus === "approved") return "Success";
      if (sStatus === "rejected") return "Error";
      return "Warning";
    },

    formatStatusText: function (sStatus) {
      if (sStatus === "approved") return "Approuvé";
      if (sStatus === "rejected") return "Rejeté";
      return "En attente";
    }
  });
});