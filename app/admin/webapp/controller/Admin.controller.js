sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/Input",
  "sap/m/Label",
  "sap/ui/layout/VerticalLayout"
], function(Controller, MessageToast, Dialog, Button, Input, Label, VerticalLayout) {
  "use strict";

  return Controller.extend("aymax.admin.controller.Admin", {
    onInit: function() {
      this.oViewModel = this.getOwnerComponent().getModel("view");
    },

    onNavToApp: function(oEvent) {
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

    onTabSelect: function(oEvent) {
      var sKey = oEvent.getSource().data("key");
      this.oViewModel.setProperty("/activeTab", sKey);
    },

    onSaveSettings: function() {
      MessageToast.show("Paramètres enregistrés avec succès.");
    },

    onAddRole: function() {
      if (!this.oAddRoleDialog) {
        this.oAddRoleDialog = new Dialog({
          title: "Nouveau rôle",
          contentWidth: "400px",
          content: new VerticalLayout({
            width: "100%",
            content: [
              new Label({ text: "Nom du rôle", labelFor: "inputRoleName" }).addStyleClass("sapUiTinyMarginTopBottom"),
              new Input("inputRoleName", { placeholder: "Ex: Développeur" }),
              new Label({ text: "Description", labelFor: "inputRoleDesc" }).addStyleClass("sapUiTinyMarginTopBottom"),
              new Input("inputRoleDesc", { placeholder: "Description du rôle" })
            ]
          }).addStyleClass("sapUiContentPadding"),
          beginButton: new Button({
            text: "Créer",
            type: "Emphasized",
            press: function () {
              var sName = sap.ui.getCore().byId("inputRoleName").getValue();
              var sDesc = sap.ui.getCore().byId("inputRoleDesc").getValue();
              
              var oModel = this.getView().getModel();
              var oListBinding = oModel.bindList("/Roles");
              oListBinding.create({
                name: sName,
                desc: sDesc,
                count: 0
              });
              
              this.oAddRoleDialog.close();
              MessageToast.show("Rôle créé avec succès.");
            }.bind(this)
          }),
          endButton: new Button({
            text: "Annuler",
            press: function () {
              this.oAddRoleDialog.close();
            }.bind(this)
          })
        });
        this.getView().addDependent(this.oAddRoleDialog);
      }
      sap.ui.getCore().byId("inputRoleName").setValue("");
      sap.ui.getCore().byId("inputRoleDesc").setValue("");
      this.oAddRoleDialog.open();
    },

    onEditRole: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext();
      if (!oContext) return;
      
      var sCurrentName = oContext.getProperty("name");
      var sCurrentDesc = oContext.getProperty("desc");
      
      if (!this.oEditRoleDialog) {
        this.oEditRoleDialog = new Dialog({
          title: "Modifier le rôle",
          contentWidth: "400px",
          content: new VerticalLayout({
            width: "100%",
            content: [
              new Label({ text: "Nom du rôle", labelFor: "editRoleName" }).addStyleClass("sapUiTinyMarginTopBottom"),
              new Input("editRoleName"),
              new Label({ text: "Description", labelFor: "editRoleDesc" }).addStyleClass("sapUiTinyMarginTopBottom"),
              new Input("editRoleDesc")
            ]
          }).addStyleClass("sapUiContentPadding"),
          beginButton: new Button({
            text: "Enregistrer",
            type: "Emphasized",
            press: function () {
              var sName = sap.ui.getCore().byId("editRoleName").getValue();
              var sDesc = sap.ui.getCore().byId("editRoleDesc").getValue();
              
              var oCtx = this.oEditRoleDialog.getBindingContext();
              if (oCtx) {
                  oCtx.setProperty("name", sName);
                  oCtx.setProperty("desc", sDesc);
                  
                  var oModel = oCtx.getModel();
                  if (oModel.hasPendingChanges()) {
                      oModel.submitBatch("$auto");
                  }
              }
              this.oEditRoleDialog.close();
              MessageToast.show("Rôle mis à jour.");
            }.bind(this)
          }),
          endButton: new Button({
            text: "Annuler",
            press: function () {
              this.oEditRoleDialog.close();
            }.bind(this)
          })
        });
        this.getView().addDependent(this.oEditRoleDialog);
      }
      
      this.oEditRoleDialog.setBindingContext(oContext);
      sap.ui.getCore().byId("editRoleName").setValue(sCurrentName);
      sap.ui.getCore().byId("editRoleDesc").setValue(sCurrentDesc);
      this.oEditRoleDialog.open();
    },

    /* ================= Formatters ================= */

    formatPermIcon: function(bVal) {
      return bVal ? "sap-icon://accept" : "sap-icon://less";
    },

    formatPermColor: function(bVal) {
      return bVal ? "#16a34a" : "#b7c1d6";
    },

    formatRoleInitials: function(sName) {
      if (!sName) return "?";
      var words = sName.split(" ");
      if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
      return sName.substring(0, 2).toUpperCase();
    }
  });
});
