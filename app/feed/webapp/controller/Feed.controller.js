sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/m/Token",
  "sap/m/ActionSheet",
  "sap/m/Button",
  "sap/ui/core/Fragment",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "aymax/feed/service/ODataService",
  "aymax/feed/model/formatter"
], function(Controller, MessageToast, MessageBox, Token, ActionSheet, Button, Fragment, JSONModel, Filter, FilterOperator, ODataService, formatter) {
  "use strict";

  return Controller.extend("aymax.feed.controller.Feed", {

    formatter: formatter,

    // ============================================================
    // INITIALISATION
    // ============================================================
    onInit: function() {
      this.oModel     = this.getOwnerComponent().getModel();
      this.oViewModel = this.getOwnerComponent().getModel("view");
      this.oModelTags = this.getOwnerComponent().getModel("tags");
      this.oCommentModel = new JSONModel({
        postID: "",
        postTitle: "",
        comments: [],
        newText: "",
        replyTo: null,
        sending: false
      });
      this.getView().setModel(this.oCommentModel, "comment");

      var sSavedApiKey = localStorage.getItem("aymax_gemini_api_key") || "";

      // Initialiser l'état du view model
      this.oViewModel.setData({
        currentUser:    {},
        postText:       "",
        quickType:      "knowledge", // Type du quick post : knowledge | announcement
        selectedFilter: "all",
        quickFiles:     [],       // Fichiers joints au quick post
        quickTags:      [],       // Tags sélectionnés pour le quick post
        allTags:        [],       // Tous les tags existants (suggestions)
        tagSuggestions: [],       // Suggestions filtrées pour le champ tag
        showQuickTags:  false,    // Afficher le sélecteur de tags du quick post
        publishing:     false,    // Indicateur de publication en cours
        geminiApiKey:   sSavedApiKey,
        shortcuts: {
          myPostsCount:       0,
          myQuestionsCount:   0,
          favoriteRoomsCount: 0,
          savedContents:      0
        },
        trendingTags: [],
        postDialog: {
          content:      "",
          summary:      "",
          type:         "knowledge",
          room_ID:      "",
          statusIndex:  0,
          pendingFiles: [],
          tags:         [],
          uploading:    false,
          generatingAi: false,
          showTagInput: false,
          visibility:   "interne"
        }
      });

      // Charger le profil utilisateur et les données initiales
      this._loadCurrentUser();
      this._loadShortcuts();
      this._loadTrendingTags();
      this._loadTags();

      // Validateur des champs de tags : permet de créer un nouveau tag en saisie libre
      this._addTagValidator(this.byId("quickTagInput"));
    },

    // ============================================================
    // CHARGEMENT DONNÉES INITIALES
    // ============================================================
    _loadCurrentUser: function() {
      var oViewModel = this.oViewModel;
      ODataService.callFunction(this.oModel, "/getCurrentUserProfile", {})
        .then(function(oUser) {
          if (oUser) {
            oUser.role = oUser.role || "Admin";
            oViewModel.setProperty("/currentUser", oUser);
          }
        })
        .catch(function() {
          // En mode dev sans auth, on utilise un profil fictif
          oViewModel.setProperty("/currentUser", {
            userID:      "sami.ben.youssef",
            displayName: "Développeur AYMAX",
            jobTitle:    "SAP Consultant",
            department:  "SAP BTP",
            reputation:  0,
            badgesCount: 0,
            role:        "Admin"
          });
        });
    },

    _loadShortcuts: function() {
      var oViewModel = this.oViewModel;
      ODataService.callFunction(this.oModel, "/getMyShortcuts", {})
        .then(function(oData) {
          if (oData) {
            oViewModel.setProperty("/shortcuts", {
              myPostsCount:       oData.myPostsCount       || 0,
              myQuestionsCount:   oData.myQuestionsCount   || 0,
              favoriteRoomsCount: oData.favoriteRoomsCount || 0,
              savedContents:      oData.savedContents       || 0
            });
          }
        })
        .catch(function() { /* Silencieux — pas bloquant */ });
    },

    _loadTrendingTags: function() {
      var oViewModel = this.oViewModel;
      ODataService.callFunction(this.oModel, "/getTrendingTags", {})
        .then(function(aTags) {
          if (Array.isArray(aTags)) {
            oViewModel.setProperty("/trendingTags", aTags);
          }
        })
        .catch(function() { /* Silencieux */ });
    },

    _loadTags: function() {
      var oViewModel = this.oViewModel;
      if (!this.oModelTags) return;

      var oBinding;
      try {
        oBinding = this.oModelTags.bindList("/Tags", null, null, null, { "$$skipCount": true });
      } catch (oError) {
        return;
      }

      oBinding.requestContexts().then(function(aContexts) {
        var aTags = aContexts.map(function(oContext) { return oContext.getObject(); });
        var aSorted = aTags.slice().sort(function(a, b) {
          return (b.usageCount || 0) - (a.usageCount || 0);
        });
        oViewModel.setProperty("/allTags", aSorted);
        oViewModel.setProperty("/tagSuggestions", aSorted.slice(0, 8));
      }).catch(function() { /* Silencieux */ });
    },

    // ============================================================
    // GESTION CLÉ API GEMINI
    // ============================================================
    onSaveGeminiApiKey: function(oEvent) {
      var sKey = oEvent.getParameter("value");
      if (sKey) {
        localStorage.setItem("aymax_gemini_api_key", sKey.trim());
        MessageToast.show("Clé API Gemini sauvegardée ✓");
      }
    },

    // ============================================================
    // FONCTIONNALITÉ IA — RÉSUMÉ DE DOCUMENT (GEMINI)
    // ============================================================
    onGenerateAiSummary: function() {
      var oPostDialog = this.oViewModel.getProperty("/postDialog");
      var aFiles      = (oPostDialog.pendingFiles || []).filter(function(oFile) { return !oFile.existing; });
      var sContent    = oPostDialog.content || "";
      var sApiKey     = this.oViewModel.getProperty("/geminiApiKey") || localStorage.getItem("aymax_gemini_api_key") || "";

      if (aFiles.length === 0 && !sContent.trim()) {
        MessageToast.show("Veuillez d'abord joindre un document ou saisir du texte.");
        return;
      }

      this.oViewModel.setProperty("/postDialog/generatingAi", true);
      MessageToast.show("Génération du résumé IA en cours...");

      var oFile = aFiles[0];
      var sFileName = oFile ? oFile.name : "Publication.txt";
      var sFileType = oFile ? oFile.fileType : "txt";
      var sBase64   = oFile ? oFile.base64 : btoa(unescape(encodeURIComponent(sContent)));

      ODataService.callAction(this.oModel, "/summarizeDocumentWithAI", {
        apiKey:   sApiKey,
        fileName: sFileName,
        fileType: sFileType,
        content:  sBase64
      }).then(function(sSummary) {
        this.oViewModel.setProperty("/postDialog/generatingAi", false);
        if (sSummary) {
          this.oViewModel.setProperty("/postDialog/summary", sSummary);
          MessageToast.show("✨ Résumé IA généré avec succès !");
        }
      }.bind(this)).catch(function(oError) {
        this.oViewModel.setProperty("/postDialog/generatingAi", false);
        MessageBox.error("Erreur lors de la génération IA : " + (oError.message || oError));
      }.bind(this));
    },

    // ============================================================
    // PUBLICATION RAPIDE (Quick Post)
    // ============================================================
    onQuickPostChange: function() {
      this.oViewModel.refresh();
    },

    onPublishPost: function() {
      var sText       = this.oViewModel.getProperty("/postText") || "";
      var aQuickFiles = this.oViewModel.getProperty("/quickFiles") || [];
      var aQuickTags  = this.oViewModel.getProperty("/quickTags") || [];

      if (sText.trim().length === 0 && aQuickFiles.length === 0) {
        MessageToast.show("Veuillez saisir du contenu ou joindre un fichier.");
        return;
      }

      this.oViewModel.setProperty("/publishing", true);

      var oListBinding = this.oModel.bindList("/Posts");
      var oContext = oListBinding.create({
        content: sText.trim() || "(Fichier joint)",
        type:    this.oViewModel.getProperty("/quickType") || "knowledge",
        status:  "published"
      });

      oContext.created().then(function() {
        var sPostID = oContext.getProperty("ID");
        var that = this;

        // Uploader les fichiers joints si présents
        var pUpload = aQuickFiles.length > 0 ? this._uploadFiles(sPostID, aQuickFiles) : Promise.resolve();
        return pUpload.then(function() {
          // Lier les tags au post
          return that._linkTags(sPostID, aQuickTags);
        });
      }.bind(this)).then(function() {
        MessageToast.show("Publication envoyée ✓");
        this.oViewModel.setProperty("/postText", "");
        this.oViewModel.setProperty("/quickFiles", []);
        this.oViewModel.setProperty("/quickTags", []);
        this.oViewModel.setProperty("/showQuickTags", false);
        this.oViewModel.setProperty("/publishing", false);
        var oQuickTagInput = this.byId("quickTagInput");
        if (oQuickTagInput) oQuickTagInput.removeAllTokens();
        this.byId("feedList").getBinding("items").refresh();
        this._loadShortcuts(); // Mettre à jour le compteur
        this._loadTrendingTags(); // Mettre à jour les compteurs de tags
      }.bind(this)).catch(function(oError) {
        this.oViewModel.setProperty("/publishing", false);
        MessageBox.error("Erreur lors de la publication : " + (oError.message || oError));
      }.bind(this));
    },

    // ============================================================
    // GESTION FICHIERS — QUICK POST
    // ============================================================
    onQuickFileSelected: function(oEvent) {
      var oFiles = oEvent.getParameter("files"); // FileList HTML5
      if (!oFiles || oFiles.length === 0) return;

      var aCurrentFiles = this.oViewModel.getProperty("/quickFiles") || [];

      // Limite de 5 fichiers au total
      var iRoom = 5 - aCurrentFiles.length;
      if (iRoom <= 0) {
        MessageToast.show("Maximum 5 fichiers joints.");
        return;
      }
      var aSelected = Array.prototype.slice.call(oFiles, 0, iRoom);
      if (oFiles.length > iRoom) {
        MessageToast.show("Maximum 5 fichiers joints — les fichiers en trop ont été ignorés.");
      }

      // Validation type + taille (10 MB par fichier)
      var aValid = aSelected.filter(function(oF) {
        var sExt = (oF.name.split(".").pop() || "").toLowerCase();
        return oF.size <= 10 * 1024 * 1024 && _ALLOWED_FILE_TYPES.indexOf(sExt) >= 0;
      });
      if (aValid.length < aSelected.length) {
        MessageToast.show("Fichiers non autorisés ou supérieurs à 10 MB ignorés. Formats acceptés : PDF, DOC, DOCX, PNG, JPG, JPEG, WEBP.");
      }
      if (aValid.length === 0) return;

      this._readFilesAsBase64(aValid).then(function(aNewFiles) {
        var aAllFiles = aCurrentFiles.concat(aNewFiles);
        this.oViewModel.setProperty("/quickFiles", aAllFiles);
        this.oViewModel.refresh();
      }.bind(this));
    },

    onRemoveQuickFile: function(oEvent) {
      var oContext = oEvent.getSource().getParent().getParent().getBindingContext("view");
      var sPath    = oContext.getPath(); // e.g. "/quickFiles/2"
      var iIndex   = parseInt(sPath.split("/").pop(), 10);
      var aFiles   = this.oViewModel.getProperty("/quickFiles");
      aFiles.splice(iIndex, 1);
      this.oViewModel.setProperty("/quickFiles", aFiles);
    },

    onFileTypeMismatch: function(oEvent) {
      MessageToast.show("Type de fichier non supporté : " + oEvent.getParameter("fileName"));
    },

    onFileSizeExceed: function(oEvent) {
      MessageToast.show("Fichier trop volumineux (max 10 MB) : " + oEvent.getParameter("fileName"));
    },

    // ============================================================
    // GESTION TAGS — QUICK POST & DIALOGUE
    // ============================================================
    onToggleQuickTags: function() {
      var bVisible = this.oViewModel.getProperty("/showQuickTags");
      this.oViewModel.setProperty("/showQuickTags", !bVisible);
      if (!bVisible) {
        setTimeout(function() {
          var oInput = this.byId("quickTagInput");
          if (oInput) oInput.focus();
        }.bind(this), 60);
      }
    },

    onTagLiveChange: function(oEvent) {
      var sValue   = (oEvent.getParameter("value") || "").trim().toLowerCase();
      var aAllTags = this.oViewModel.getProperty("/allTags") || [];
      var aFiltered;

      if (sValue) {
        aFiltered = aAllTags.filter(function(oTag) {
          return oTag.name && oTag.name.toLowerCase().indexOf(sValue) >= 0;
        });
        // Proposer la création du tag s'il n'existe pas encore
        var bExact = aFiltered.some(function(oTag) {
          return oTag.name && oTag.name.toLowerCase() === sValue;
        });
        if (!bExact && sValue.length >= 2) {
          aFiltered = [{
            ID:   "__new__:" + encodeURIComponent(sValue.trim()),
            name: 'Créer le tag "' + sValue.trim() + '"'
          }].concat(aFiltered);
        }
      } else {
        aFiltered = aAllTags.slice().sort(function(a, b) {
          return (b.usageCount || 0) - (a.usageCount || 0);
        }).slice(0, 8);
      }
      this.oViewModel.setProperty("/tagSuggestions", aFiltered);
    },

    onTagTokenUpdate: function(oEvent) {
      var sType   = oEvent.getParameter("type");
      var sTarget = this._getTagPath(oEvent.getSource());
      var aTags   = (this.oViewModel.getProperty(sTarget) || []).slice();
      var bChanged = false;

      if (sType === "added") {
        var aAdded = oEvent.getParameter("addedTokens") || [];
        aAdded.forEach(function(oToken) {
          var sKey  = oToken.getKey();
          var sName = oToken.getText().trim();
          // Suggestion "Créer le tag XXX" → le vrai nom du tag est encodé dans la clé
          if (sKey && sKey.indexOf("__new__:") === 0) {
            sName = decodeURIComponent(sKey.substring(8));
            if (oToken.setText) oToken.setText(sName);
          }
          if (!sName) return;
          var bExists = aTags.some(function(oTag) {
            return oTag.name && oTag.name.toLowerCase() === sName.toLowerCase();
          });
          if (bExists) {
            // Éviter les doublons dans le contrôle
            oToken.destroy();
          } else {
            var bIsNew = sKey && sKey.indexOf("__new__:") === 0;
            aTags.push({ ID: bIsNew ? null : (oToken.getKey() || null), name: sName });
            bChanged = true;
          }
        });
      } else if (sType === "removed") {
        var aRemovedNames = (oEvent.getParameter("removedTokens") || []).map(function(oToken) {
          return oToken.getText();
        });
        var iBefore = aTags.length;
        aTags = aTags.filter(function(oTag) {
          return aRemovedNames.indexOf(oTag.name) < 0;
        });
        bChanged = aTags.length !== iBefore;
      }

      if (bChanged) {
        this.oViewModel.setProperty(sTarget, aTags);
      }
    },

    // Suppression d'une chip de tag dans le Tokenizer du quick post
    onQuickTagChipDelete: function(oEvent) {
      var sType = oEvent.getParameter("type");
      if (sType !== "removed") return;
      var aRemoved = (oEvent.getParameter("removedTokens") || []).map(function(oToken) {
        return oToken.getText();
      });
      var aTags = (this.oViewModel.getProperty("/quickTags") || []).filter(function(oTag) {
        return aRemoved.indexOf(oTag.name) < 0;
      });
      this.oViewModel.setProperty("/quickTags", aTags);
    },

    _getTagPath: function(oControl) {
      if (oControl && oControl.getCustomData) {
        var aData = oControl.getCustomData();
        for (var i = 0; i < aData.length; i++) {
          if (aData[i].getKey() === "tagPath") return aData[i].getValue();
        }
      }
      return "/quickTags";
    },

    // Permet à un MultiInput d'accepter un nouveau tag saisi librement
    _addTagValidator: function(oInput) {
      if (!oInput || !oInput.addValidator) return;
      oInput.addValidator(function(args) {
        var sText = (args.text || "").trim();
        if (!sText) return null;
        if (args.suggestedToken) return args.suggestedToken;
        // Nouveau tag : pas d'ID, il sera créé au moment de la publication
        return new Token({ text: sText, key: "" });
      });
    },

    // Associe une liste de tags à un post (crée les tags manquants si besoin)
    _linkTags: function(sPostID, aTags) {
      var that = this;
      if (!sPostID || !aTags || aTags.length === 0) return Promise.resolve();
      return aTags.reduce(function(pChain, oTag) {
        return pChain.then(function() {
          if (!oTag || !oTag.name || !oTag.name.trim()) return Promise.resolve();
          return that._ensureTagAndLink(oTag, sPostID).catch(function(oError) {
            console.warn("Échec de la liaison du tag", oTag.name, oError);
          });
        });
      }, Promise.resolve());
    },

    _ensureTagAndLink: function(oTag, sPostID) {
      var that = this;
      if (oTag.ID) {
        return ODataService.callAction(this.oModelTags, "/addTagToPost", {
          tagID: oTag.ID,
          postID: sPostID
        });
      }
      return ODataService.callFunction(this.oModelTags, "/searchTags", { query: oTag.name.trim() })
        .then(function(aResults) {
          var found = (aResults || []).find(function(t) {
            return t && t.name && t.name.toLowerCase() === oTag.name.trim().toLowerCase();
          });
          if (found) {
            return ODataService.callAction(that.oModelTags, "/addTagToPost", {
              tagID: found.ID,
              postID: sPostID
            });
          }
          return ODataService.callAction(that.oModelTags, "/createTag", {
            name:        oTag.name.trim(),
            color:       "#1E3A8A",
            icon:        "",
            description: ""
          }).then(function(oCreated) {
            if (oCreated && oCreated.ID) {
              return ODataService.callAction(that.oModelTags, "/addTagToPost", {
                tagID:  oCreated.ID,
                postID: sPostID
              });
            }
          });
        });
    },

    // ============================================================
    // DIALOGUE CRÉATION AVANCÉE
    // ============================================================
    onCreatePostDialog: function() {
      var sSavedApiKey = localStorage.getItem("aymax_gemini_api_key") || "";
      this.oViewModel.setProperty("/geminiApiKey", sSavedApiKey);

      // Le dialogue propose deux types : Connaissance / Annonce
      var sQuickType = this.oViewModel.getProperty("/quickType") || "knowledge";

      this.oViewModel.setProperty("/postDialog", {
        content:        this.oViewModel.getProperty("/postText") || "",
        title:          "",
        summary:        "",
        type:           sQuickType,
        room_ID:        "",
        statusIndex:    0,
        pendingFiles:   this.oViewModel.getProperty("/quickFiles") || [],
        tags:           JSON.parse(JSON.stringify(this.oViewModel.getProperty("/quickTags") || [])),
        uploading:      false,
        generatingAi:   false,
        showProgress:   false,
        uploadProgress: 0,
        uploadLabel:    "",
        showTagInput:   false,
        visibility:     "interne"
      });
      this._editingPostID = null;
      this._openPostDialog(false);
    },

    _openPostDialog: function(bEdit) {
      if (!this._pPostDialog) {
        this._pPostDialog = Fragment.load({
          id:         this.getView().getId(),
          name:       "aymax.feed.view.fragments.PostCreateDialog",
          controller: this
        }).then(function(oDialog) {
          this.getView().addDependent(oDialog);
          // Validateur : permet de créer un nouveau tag en saisie libre
          this._addTagValidator(this.byId("postTagInput"));
          return oDialog;
        }.bind(this));
      }
      this._pPostDialog.then(function(oDialog) {
        oDialog.setTitle(bEdit ? "Modifier la publication" : "Nouvelle publication");
        var oSubmitBtn = this.byId("postSubmitBtn");
        if (oSubmitBtn) oSubmitBtn.setText(bEdit ? "Modifier" : "Publier");

        // Recharger les tokens du sélecteur de tags du dialogue
        var oTagInput = this.byId("postTagInput");
        if (oTagInput) {
          oTagInput.removeAllTokens();
          (this.oViewModel.getProperty("/postDialog/tags") || []).forEach(function(oTag) {
            oTagInput.addToken(new Token({ text: oTag.name, key: oTag.ID || "" }));
          });
        }
        oDialog.open();
      }.bind(this));
    },

    // ============================================================
    // NOUVEAUX BOUTONS — Modern Publish Dialog
    // ============================================================
    onAddImageClick: function() {
      var oUploader = this.byId("postFileUploader");
      if (oUploader) {
        oUploader.setValue("");  // Réinitialiser
        oUploader.onclick({ target: { value: "" } });  // Déclencher le click
      }
    },

    onAddDocumentClick: function() {
      var oUploader = this.byId("postFileUploader");
      if (oUploader) {
        oUploader.setValue("");  // Réinitialiser
        oUploader.onclick({ target: { value: "" } });  // Déclencher le click
      }
    },

    onAddTagsClick: function() {
      // Afficher/masquer le sélecteur de tags
      var bShowTags = !this.oViewModel.getProperty("/postDialog/showTagInput");
      this.oViewModel.setProperty("/postDialog/showTagInput", bShowTags);
      
      if (bShowTags) {
        setTimeout(function() {
          var oTagInput = this.byId("postTagInput");
          if (oTagInput) oTagInput.focus();
        }.bind(this), 200);
      }
    },

    onFileSelected: function(oEvent) {
      var oFiles = oEvent.getParameter("files");
      if (!oFiles || oFiles.length === 0) return;

      var aPendingFiles = this.oViewModel.getProperty("/postDialog/pendingFiles") || [];

      // Limite de 5 fichiers au total
      var iRoom = 5 - aPendingFiles.length;
      if (iRoom <= 0) {
        MessageToast.show("Maximum 5 fichiers joints.");
        return;
      }
      var aSelected = Array.prototype.slice.call(oFiles, 0, iRoom);
      if (oFiles.length > iRoom) {
        MessageToast.show("Maximum 5 fichiers joints — les fichiers en trop ont été ignorés.");
      }

      // Limite de 10 MB par fichier + vérification du format
      var aValid = aSelected.filter(function(oF) {
        var sExt = (oF.name.split(".").pop() || "").toLowerCase();
        return oF.size <= 10 * 1024 * 1024 && _ALLOWED_FILE_TYPES.indexOf(sExt) >= 0;
      });
      if (aValid.length < aSelected.length) {
        MessageToast.show("Fichiers non autorisés ou supérieurs à 10 MB ignorés. Formats acceptés : PDF, DOC, DOCX, PNG, JPG, JPEG, WEBP.");
      }
      if (aValid.length === 0) return;

      this.oViewModel.setProperty("/postDialog/showProgress", true);
      this.oViewModel.setProperty("/postDialog/uploadLabel", "Lecture des fichiers...");

      this._readFilesAsBase64(aValid, function(iPercent) {
        this.oViewModel.setProperty("/postDialog/uploadProgress", iPercent);
      }.bind(this)).then(function(aNewFiles) {
        var aAllFiles = aPendingFiles.concat(aNewFiles);
        this.oViewModel.setProperty("/postDialog/pendingFiles", aAllFiles);
        this.oViewModel.setProperty("/postDialog/showProgress", false);
        this.oViewModel.setProperty("/postDialog/uploadProgress", 0);
        this.oViewModel.refresh();
      }.bind(this)).catch(function() {
        this.oViewModel.setProperty("/postDialog/showProgress", false);
        MessageToast.show("Erreur lors de la lecture des fichiers.");
      }.bind(this));
    },

    onRemovePendingFile: function(oEvent) {
      var oContext = oEvent.getSource().getParent().getParent().getBindingContext("view");
      var sPath    = oContext.getPath();
      var iIndex   = parseInt(sPath.split("/").pop(), 10);
      var aFiles   = this.oViewModel.getProperty("/postDialog/pendingFiles");
      var oFile    = aFiles[iIndex];
      if (!oFile) return;

      // Fichier déjà en base → suppression réelle côté backend
      if (oFile.existing && oFile.documentID) {
        var that = this;
        ODataService.callAction(this.oModel, "/deleteDocument", { documentID: oFile.documentID })
          .then(function() {
            aFiles.splice(iIndex, 1);
            that.oViewModel.setProperty("/postDialog/pendingFiles", aFiles);
          })
          .catch(function(oError) {
            MessageBox.error("Erreur lors de la suppression du fichier : " + (oError.message || oError));
          });
      } else {
        aFiles.splice(iIndex, 1);
        this.oViewModel.setProperty("/postDialog/pendingFiles", aFiles);
      }
    },

    onConfirmCreatePost: function() {
      var oData = this.oViewModel.getProperty("/postDialog");

      // Validation — champs obligatoires
      if (!oData.content || !oData.content.trim()) {
        MessageToast.show("Le contenu de la publication est obligatoire.");
        return;
      }
      if (!oData.type || ["knowledge", "announcement"].indexOf(oData.type) < 0) {
        MessageToast.show("Le type de publication est obligatoire (Connaissance ou Annonce).");
        return;
      }

      // Mode modification d'un post existant
      if (this._editingPostID) {
        this._updatePost();
        return;
      }

      this.oViewModel.setProperty("/postDialog/uploading", true);
      this.oViewModel.setProperty("/postDialog/showProgress", true);
      this.oViewModel.setProperty("/postDialog/uploadLabel", "Publication en cours...");

      var sStatus      = oData.statusIndex === 1 ? "draft" : "published";
      var oListBinding = this.oModel.bindList("/Posts");
      var oContext     = oListBinding.create({
        content:  oData.content.trim(),
        title:    oData.title ? oData.title.trim() : null,
        summary:  oData.summary || null,
        type:     oData.type || "knowledge",
        status:   sStatus,
        room_ID:  oData.room_ID || null
      });

      oContext.created().then(function() {
        var sPostID = oContext.getProperty("ID");
        var aFiles  = oData.pendingFiles || [];
        var aTags   = oData.tags || [];
        var that    = this;

        var pUpload = aFiles.length > 0
          ? this._uploadFiles(sPostID, aFiles, oData.summary, function(iPercent, iDone, iTotal) {
              this.oViewModel.setProperty("/postDialog/uploadProgress", iPercent);
              this.oViewModel.setProperty("/postDialog/uploadLabel", "Upload des pièces jointes " + iDone + "/" + iTotal + " ...");
            }.bind(this))
          : Promise.resolve();
        return pUpload.then(function() {
          return that._linkTags(sPostID, aTags);
        });
      }.bind(this)).then(function() {
        this.oViewModel.setProperty("/postDialog/uploading", false);
        this.oViewModel.setProperty("/postDialog/showProgress", false);
        this.oViewModel.setProperty("/postDialog/uploadProgress", 0);
        MessageToast.show(sStatus === "draft" ? "Brouillon enregistré ✓" : "Publication effectuée ✓");
        this.oViewModel.setProperty("/postText", "");
        this.oViewModel.setProperty("/quickFiles", []);
        this.oViewModel.setProperty("/quickTags", []);
        this.oViewModel.setProperty("/postDialog/tags", []);
        this.oViewModel.setProperty("/showQuickTags", false);
        var oQuickTagInput = this.byId("quickTagInput");
        if (oQuickTagInput) oQuickTagInput.removeAllTokens();
        this.onCancelCreatePost();
        this.byId("feedList").getBinding("items").refresh();
        this._loadShortcuts();
        this._loadTrendingTags();
      }.bind(this)).catch(function(oError) {
        this.oViewModel.setProperty("/postDialog/uploading", false);
        this.oViewModel.setProperty("/postDialog/showProgress", false);
        MessageBox.error("Erreur : " + (oError.message || oError));
      }.bind(this));
    },

    onCancelCreatePost: function() {
      // Ne pas effacer le brouillon pendant une publication en cours
      if (this.oViewModel.getProperty("/postDialog/uploading")) return;

      // Effacer le brouillon
      var sQuickType = this.oViewModel.getProperty("/quickType") || "knowledge";
      this.oViewModel.setProperty("/postDialog", {
        content:        "",
        title:          "",
        summary:        "",
        type:           sQuickType,
        room_ID:        "",
        statusIndex:    0,
        pendingFiles:   [],
        tags:           [],
        uploading:      false,
        generatingAi:   false,
        showProgress:   false,
        uploadProgress: 0,
        uploadLabel:    ""
      });
      this._editingPostID = null;

      if (this._pPostDialog) {
        this._pPostDialog.then(function(oDialog) { oDialog.close(); });
      }
    },

    // ============================================================
    // MES PUBLICATIONS — Modifier / Supprimer un post
    // ============================================================
    onPostOverflow: function(oEvent) {
      var oButton  = oEvent.getSource();
      var oContext = oButton.getBindingContext();
      if (!oContext) return;

      var oUser      = this.oViewModel.getProperty("/currentUser") || {};
      var sAuthorID  = oContext.getProperty("author/userID");
      if (sAuthorID !== oUser.userID) {
        MessageToast.show("Ces options sont disponibles uniquement pour vos publications");
        return;
      }

      this._editingContext = oContext;

      if (!this._postActionSheet) {
        this._postActionSheet = new ActionSheet({
          placement: "Bottom",
          buttons: [
            new Button({ text: "Modifier", icon: "sap-icon://edit", press: this._openEditPost.bind(this) }),
            new Button({ text: "Supprimer", icon: "sap-icon://delete", type: "Reject", press: this._deletePost.bind(this) })
          ]
        });
        this._postActionSheet.addStyleClass("aymaxActionSheet");
        this.getView().addDependent(this._postActionSheet);
      }
      this._postActionSheet.openBy(oButton);
    },

    _openEditPost: function() {
      var oContext = this._editingContext;
      if (!oContext) return;
      var oPost = oContext.getObject();

      var aTags = (oPost.tags || []).map(function(t) {
        return { ID: (t.tag && t.tag.ID) || null, name: (t.tag && t.tag.name) || "" };
      }).filter(function(t) { return !!t.name; });

      // Fichiers déjà attachés au post (supprimables dans le formulaire)
      var aExistingDocs = (oPost.documents || []).map(function(d) {
        return {
          name:       d.fileName,
          fileType:   d.fileType,
          size:       d.fileSize,
          base64:     null,
          existing:   true,
          documentID: d.ID
        };
      });

      this.oViewModel.setProperty("/postDialog", {
        content:        oPost.content || "",
        title:          oPost.title || "",
        summary:        oPost.summary || "",
        type:           oPost.type || "knowledge",
        room_ID:        oPost.room_ID || "",
        statusIndex:    oPost.status === "draft" ? 1 : 0,
        pendingFiles:   aExistingDocs,
        tags:           aTags,
        uploading:      false,
        generatingAi:   false,
        showProgress:   false,
        uploadProgress: 0,
        uploadLabel:    ""
      });
      this._editingPostID = oPost.ID;
      this._openPostDialog(true);
    },

    _deletePost: function() {
      var that    = this;
      var oContext = this._editingContext;
      if (!oContext) return;
      var sPostID = oContext.getProperty("ID");

      MessageBox.confirm(
        "Voulez-vous vraiment supprimer cette publication ? Cette action est irréversible.",
        {
          title: "Supprimer la publication",
          onClose: function(sAction) {
            if (sAction !== MessageBox.Action.OK) return;
            that.oModel.delete("/Posts(" + sPostID + ")").then(function() {
              MessageToast.show("Publication supprimée");
              that.byId("feedList").getBinding("items").refresh();
              that._loadShortcuts();
            }).catch(function(oError) {
              MessageBox.error("Erreur lors de la suppression : " + (oError.message || oError));
            });
          }
        }
      );
    },

    _updatePost: function() {
      var that    = this;
      var oData   = this.oViewModel.getProperty("/postDialog");
      var sPostID = this._editingPostID;
      var aFiles  = oData.pendingFiles || [];
      var aTags   = oData.tags || [];
      var sStatus = oData.statusIndex === 1 ? "draft" : "published";

      this.oViewModel.setProperty("/postDialog/uploading", true);
      this.oViewModel.setProperty("/postDialog/showProgress", true);
      this.oViewModel.setProperty("/postDialog/uploadLabel", "Modification en cours...");

      this.oModel.update("/Posts(" + sPostID + ")", {
        content: oData.content.trim(),
        title:   oData.title ? oData.title.trim() : null,
        summary: oData.summary || null,
        type:    oData.type || "knowledge",
        status:  sStatus,
        room_ID: oData.room_ID || null
      }).then(function() {
        var pUpload = aFiles.length > 0
          ? that._uploadFiles(sPostID, aFiles, oData.summary, function(iPercent, iDone, iTotal) {
              that.oViewModel.setProperty("/postDialog/uploadProgress", iPercent);
              that.oViewModel.setProperty("/postDialog/uploadLabel", "Upload des pièces jointes " + iDone + "/" + iTotal + " ...");
            })
          : Promise.resolve();
        return pUpload.then(function() {
          return that._replacePostTags(sPostID, aTags);
        });
      }).then(function() {
        that.oViewModel.setProperty("/postDialog/uploading", false);
        that.oViewModel.setProperty("/postDialog/showProgress", false);
        that.oViewModel.setProperty("/postDialog/uploadProgress", 0);
        MessageToast.show("Publication modifiée ✓");
        that._editingPostID = null;
        that.onCancelCreatePost();
        that.byId("feedList").getBinding("items").refresh();
        that._loadShortcuts();
      }).catch(function(oError) {
        that.oViewModel.setProperty("/postDialog/uploading", false);
        that.oViewModel.setProperty("/postDialog/showProgress", false);
        MessageBox.error("Erreur lors de la modification : " + (oError.message || oError));
      });
    },

    // Remplace les tags d'un post : supprime les anciennes liaisons puis re-lie
    _replacePostTags: function(sPostID, aTags) {
      var that = this;
      var oListBinding = this.oModel.bindList("/PostTags", undefined, undefined,
        [new Filter("post_ID", FilterOperator.EQ, sPostID)]);
      return oListBinding.requestContexts().then(function(aContexts) {
        var aDeletes = (aContexts || []).map(function(oCtx) {
          return that.oModel.delete("/PostTags(" + oCtx.getProperty("ID") + ")");
        });
        return Promise.all(aDeletes).then(function() {
          return that._linkTags(sPostID, aTags);
        });
      });
    },

    // ============================================================
    // UTILITAIRE — Lecture fichiers en base64
    // ============================================================
    _readFilesAsBase64: function(oFileList, fProgress) {
      var aFiles  = Array.from(oFileList);
      var iTotal  = aFiles.reduce(function(acc, f) { return acc + (f.size || 0); }, 0);
      var iLoaded = 0;
      var aPromises = aFiles.map(function(oFile) {
        return new Promise(function(resolve, reject) {
          var oReader = new FileReader();
          oReader.onprogress = function(e) {
            if (fProgress && e.lengthComputable && iTotal > 0) {
              fProgress(Math.min(100, Math.round((iLoaded + e.loaded) / iTotal * 100)));
            }
          };
          oReader.onload = function(e) {
            iLoaded += oFile.size || 0;
            var sBase64Full = e.target.result; // data:...;base64,<content>
            var sBase64     = sBase64Full.split(",")[1] || sBase64Full;
            var sExt        = oFile.name.split(".").pop().toLowerCase();
            resolve({
              name:     oFile.name,
              fileType: sExt,
              size:     oFile.size,
              base64:   sBase64
            });
          };
          oReader.onerror = reject;
          oReader.readAsDataURL(oFile);
        });
      });
      return Promise.all(aPromises);
    },

    // ============================================================
    // UTILITAIRE — Upload séquentiel des fichiers vers CAP
    // ============================================================
    _uploadFiles: function(sPostID, aFiles, sSummary, fProgress) {
      var that   = this;
      var aNew   = (aFiles || []).filter(function(oFile) { return !oFile.existing; });
      var iDone  = 0;
      var iTotal = aNew.length;
      if (iTotal === 0) return Promise.resolve();
      return aNew.reduce(function(pChain, oFile) {
        return pChain.then(function() {
          if (fProgress) fProgress(Math.round((iDone / iTotal) * 100), iDone, iTotal);
          return ODataService.callAction(that.oModel, "/uploadDocument", {
            postID:   sPostID,
            fileName: oFile.name,
            fileType: oFile.fileType,
            fileSize: oFile.size,
            content:  oFile.base64,
            summary:  sSummary || null
          }).then(function() {
            iDone++;
            if (fProgress) fProgress(Math.round((iDone / iTotal) * 100), iDone, iTotal);
          });
        });
      }, Promise.resolve());
    },

    // ============================================================
    // ACTIONS SOCIALES
    // ============================================================
    onLikePress: function(oEvent) {
      var oSource  = oEvent.getSource();
      var oContext = oSource.getBindingContext();
      if (!oContext) return;
      var sPostID  = oContext.getProperty("ID");
      var bLiked   = !!oContext.getProperty("isLikedByMe");
      var sAction  = bLiked ? "/unlikePost" : "/likePost";

      ODataService.callAction(this.oModel, sAction, { postID: sPostID })
        .then(function() { oContext.refresh(); })
        .catch(function(oError) {
          MessageBox.error("Erreur lors de la mise à jour du like : " + (oError.message || oError));
        });
    },

    onDownvotePress: function(oEvent) {
      var oSource   = oEvent.getSource();
      var oContext  = oSource.getBindingContext();
      if (!oContext) return;
      var sPostID   = oContext.getProperty("ID");
      var bDisliked = !!oContext.getProperty("isDislikedByMe");
      var sAction   = bDisliked ? "/undislikePost" : "/dislikePost";

      ODataService.callAction(this.oModel, sAction, { postID: sPostID })
        .then(function() { oContext.refresh(); })
        .catch(function(oError) {
          MessageBox.error("Erreur lors de la mise à jour du dislike : " + (oError.message || oError));
        });
    },

    // Republier une publication (crée un repost lié à l'original)
    onRepost: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext();
      if (!oContext) return;
      var sPostID  = oContext.getProperty("ID");
      var that     = this;

      ODataService.callAction(this.oModel, "/repostPost", { postID: sPostID })
        .then(function() {
          MessageToast.show("Publication republiée ✓");
          that.byId("feedList").getBinding("items").refresh();
        })
        .catch(function(oError) {
          MessageBox.error("Erreur lors de la republication : " + (oError.message || oError));
        });
    },

    onCommentPress: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext();
      if (!oContext) return;
      this._openCommentDialog(oContext);
    },

    _openCommentDialog: function(oContext) {
      var oPost = oContext.getObject() || {};
      this._commentContext = oContext;
      this.oCommentModel.setData({
        postID: oPost.ID || "",
        postTitle: oPost.title || "",
        comments: this._normalizeCommentThread(oPost.comments || []),
        newText: "",
        replyTo: null,
        sending: false
      });

      if (!this._pCommentDialog) {
        this._pCommentDialog = Fragment.load({
          id:         this.getView().getId(),
          name:       "aymax.feed.view.fragments.CommentDialog",
          controller: this
        }).then(function(oDialog) {
          this.getView().addDependent(oDialog);
          return oDialog;
        }.bind(this));
      }

      this._pCommentDialog.then(function(oDialog) {
        oDialog.setTitle(oPost.title ? "Commentaires - " + oPost.title : "Commentaires");
        oDialog.open();
        setTimeout(function() {
          var oArea = this.byId("commentTextArea");
          if (oArea) oArea.focus();
        }.bind(this), 60);
      }.bind(this));
    },

    _normalizeCommentThread: function(aComments) {
      var aCloned = JSON.parse(JSON.stringify(aComments || []));
      var mById = {};

      aCloned.forEach(function(oComment) {
        oComment.level = 0;
        mById[oComment.ID] = oComment;
      });

      aCloned.forEach(function(oComment) {
        if (oComment.parent_ID && mById[oComment.parent_ID]) {
          oComment.level = Math.min(2, (mById[oComment.parent_ID].level || 0) + 1);
          oComment.parentDisplayName = (oComment.parent && oComment.parent.author && oComment.parent.author.displayName)
            || (mById[oComment.parent_ID].author && mById[oComment.parent_ID].author.displayName)
            || "";
        }
      });

      return aCloned.sort(function(a, b) {
        var iA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        var iB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return iA - iB;
      });
    },

    _buildLocalComment: function(sText, oParent) {
      var oUser = this.oViewModel.getProperty("/currentUser") || {};
      return {
        ID: "local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
        content: sText,
        createdAt: new Date().toISOString(),
        author: {
          userID: oUser.userID || "",
          displayName: oUser.displayName || "Moi",
          avatarUrl: oUser.avatarUrl || ""
        },
        parent_ID: oParent && oParent.ID ? oParent.ID : null,
        parent: oParent ? {
          ID: oParent.ID,
          author: oParent.author || null,
          content: oParent.content || ""
        } : null
      };
    },

    onReplyToComment: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("comment");
      if (!oContext) return;
      this.oCommentModel.setProperty("/replyTo", oContext.getObject());

      setTimeout(function() {
        var oArea = this.byId("commentTextArea");
        if (oArea) oArea.focus();
      }.bind(this), 40);
    },

    onCancelReplyToComment: function() {
      this.oCommentModel.setProperty("/replyTo", null);
    },

    onCloseCommentDialog: function() {
      if (this._pCommentDialog) {
        this._pCommentDialog.then(function(oDialog) {
          oDialog.close();
        });
      }
      this.oCommentModel.setProperty("/replyTo", null);
      this.oCommentModel.setProperty("/newText", "");
    },

    onSendComment: function() {
      var sText = (this.oCommentModel.getProperty("/newText") || "").trim();
      var sPostID = this.oCommentModel.getProperty("/postID");
      var oReplyTo = this.oCommentModel.getProperty("/replyTo");

      if (!sText) {
        MessageToast.show("Veuillez saisir un commentaire.");
        return;
      }

      this.oCommentModel.setProperty("/sending", true);

      ODataService.callAction(this.oModel, "/addComment", {
        postID: sPostID,
        content: sText,
        parentID: oReplyTo && oReplyTo.ID ? oReplyTo.ID : null
      }).then(function(oCreatedComment) {
        var aComments = (this.oCommentModel.getProperty("/comments") || []).slice();
        var oLocalComment = this._buildLocalComment(sText, oReplyTo);

        if (oCreatedComment && oCreatedComment.ID) {
          oLocalComment.ID = oCreatedComment.ID;
        }

        if (oReplyTo && oReplyTo.ID) {
          var iIndex = aComments.findIndex(function(oComment) {
            return oComment.ID === oReplyTo.ID;
          });
          if (iIndex >= 0) {
            aComments.splice(iIndex + 1, 0, oLocalComment);
          } else {
            aComments.push(oLocalComment);
          }
        } else {
          aComments.push(oLocalComment);
        }

        this.oCommentModel.setProperty("/comments", this._normalizeCommentThread(aComments));
        this.oCommentModel.setProperty("/newText", "");
        this.oCommentModel.setProperty("/replyTo", null);
        this.oCommentModel.setProperty("/sending", false);

        if (this._commentContext && this._commentContext.refresh) {
          this._commentContext.refresh();
        }
        var oFeedBinding = this.byId("feedList") && this.byId("feedList").getBinding("items");
        if (oFeedBinding) {
          oFeedBinding.refresh();
        }
        this._loadShortcuts();
        MessageToast.show("Commentaire ajouté ✓");
      }.bind(this)).catch(function(oError) {
        this.oCommentModel.setProperty("/sending", false);
        MessageBox.error("Erreur lors de l'ajout du commentaire : " + (oError.message || oError));
      }.bind(this));
    },

    onFavoritePress: function(oEvent) {
      var oSource  = oEvent.getSource();
      var oContext = oSource.getBindingContext();
      var sPostID  = oContext.getProperty("ID");
      var bFav     = oContext.getProperty("isFavoritedByMe");

      var sAction  = bFav ? "/removeFavorite" : "/addFavorite";
      ODataService.callAction(this.oModel, sAction, { targetType: "post", targetID: sPostID })
        .then(function() {
          oContext.refresh();
          this._loadShortcuts();
          MessageToast.show(bFav ? "Sauvegarde retirée" : "Contenu sauvegardé ✓");
        }.bind(this));
    },

    // ============================================================
    // DOCUMENTS — Aperçu & Téléchargement
    // ============================================================
    onDocumentPress: function(oEvent) {
      var oContext  = oEvent.getSource().getBindingContext();
      var sFileUrl  = oContext.getProperty("fileUrl");
      var sFileName = oContext.getProperty("fileName");
      var sFileType = (oContext.getProperty("fileType") || "").toLowerCase();

      if (!sFileUrl) {
        MessageToast.show("URL du document non disponible.");
        return;
      }

      if (["png", "jpg", "jpeg", "webp", "gif", "pdf"].indexOf(sFileType) >= 0) {
        this._openDocumentPreview(sFileUrl, sFileName, sFileType);
      } else {
        this._downloadDocument(sFileUrl, sFileName);
      }
    },

    _openDocumentPreview: function(sFileUrl, sFileName, sFileType) {
      var that = this;
      if (!this._pPreviewDialog) {
        this._pPreviewDialog = Fragment.load({
          id:         this.getView().getId(),
          name:       "aymax.feed.view.fragments.DocumentPreviewDialog",
          controller: this
        }).then(function(oDialog) {
          this.getView().addDependent(oDialog);
          return oDialog;
        }.bind(this));
      }
      this._pPreviewDialog.then(function(oDialog) {
        var sBlobUrl = that._convertDataUriToBlobUrl(sFileUrl);
        that._previewUrl      = sBlobUrl;
        that._previewFileName = sFileName;
        that.byId("previewTitle").setText(sFileName);
        that.byId("previewDownloadBtn").setTooltip("Télécharger " + sFileName);

        var oImg      = that.byId("previewImage");
        var oPdfHost  = that.byId("previewPdfHost");
        var oOtherBox = that.byId("previewOtherBox");

        if (sFileType === "pdf") {
          oImg.setVisible(false);
          oOtherBox.setVisible(false);
          oPdfHost.setVisible(true);
          oPdfHost.setContent(
            '<iframe src="' + sBlobUrl + '" style="width:100%;height:480px;border:none;"></iframe>'
          );
        } else if (["png", "jpg", "jpeg", "webp", "gif"].indexOf(sFileType) >= 0) {
          oPdfHost.setVisible(false);
          oOtherBox.setVisible(false);
          oImg.setVisible(true);
          oImg.setSrc(sBlobUrl);
        } else {
          oImg.setVisible(false);
          oPdfHost.setVisible(false);
          oOtherBox.setVisible(true);
        }

        oDialog.open();
      });
    },

    onPreviewDownload: function() {
      this._downloadDocument(this._previewUrl || "", this._previewFileName || "document");
    },

    onCloseDocumentPreview: function() {
      if (this._pPreviewDialog) {
        this._pPreviewDialog.then(function(oDialog) { oDialog.close(); });
      }
    },

    _convertDataUriToBlobUrl: function(sDataUri) {
      if (!sDataUri || sDataUri.indexOf("data:") !== 0) return sDataUri;
      var iComma  = sDataUri.indexOf(",");
      var sMeta   = sDataUri.substring(0, iComma);
      var sBase64 = sDataUri.substring(iComma + 1);
      var sMime   = (sMeta.match(/data:([^;]+)/) || [])[1] || "application/octet-stream";
      try {
        var sBinary = atob(sBase64);
        var aBytes  = new Uint8Array(sBinary.length);
        for (var i = 0; i < sBinary.length; i++) aBytes[i] = sBinary.charCodeAt(i);
        var oBlob = new Blob([aBytes], { type: sMime });
        return URL.createObjectURL(oBlob);
      } catch (e) {
        return sDataUri;
      }
    },

    _downloadDocument: function(sFileUrl, sFileName) {
      var oLink = document.createElement("a");
      oLink.href     = sFileUrl;
      oLink.download = sFileName || "document";
      oLink.rel      = "noopener";
      document.body.appendChild(oLink);
      oLink.click();
      document.body.removeChild(oLink);
    },

    // ============================================================
    // FILTRES FEED
    // ============================================================
    onFilterChange: function(oEvent) {
      var sKey     = oEvent.getParameter("item").getKey();
      var oList    = this.byId("feedList");
      var aFilters = [new Filter("status", FilterOperator.EQ, "published")];

      if (sKey === "rooms") {
        aFilters.push(new Filter("room_ID", FilterOperator.NE, null));
      }
      oList.getBinding("items").filter(aFilters);
      this.oViewModel.setProperty("/selectedFilter", sKey);
    },

    // ============================================================
    // NAVIGATION — RACCOURCIS
    // ============================================================
    onShortcutMyPosts: function() {
      var oList = this.byId("feedList");
      var oUser = this.oViewModel.getProperty("/currentUser");
      if (oUser && oUser.userID) {
        oList.getBinding("items").filter([
          new Filter("author_userID", FilterOperator.EQ, oUser.userID)
        ]);
        this.oViewModel.setProperty("/selectedFilter", "mine");
        MessageToast.show("Affichage de vos publications");
      } else {
        MessageToast.show("Profil utilisateur non chargé");
      }
    },

    onShortcutMyQuestions: function() {
      this.getOwnerComponent().getRouter().navTo("questions");
    },

    onShortcutSaved: function() {
      MessageToast.show("Vos contenus sauvegardés sont accessibles depuis ce raccourci.");
    },

    onNavToRooms: function() {
      this.getOwnerComponent().getRouter().navTo("rooms");
    },

    onNavToTopics: function() {
      this.getOwnerComponent().getRouter().navTo("topics");
    },

    onNavToTags: function() {
      this.getOwnerComponent().getRouter().navTo("tags");
    },

    onRoomPress: function(oEvent) {
      var sRoomId = oEvent.getSource().getBindingContext().getProperty("ID");
      this.getOwnerComponent().getRouter().navTo("roomDetail", { roomId: sRoomId });
    },

    onTagPress: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("view");
      var sTagName = oContext.getProperty("view>name");
      MessageToast.show("Filtre par tag : " + sTagName);
    },

    // Badge de tag cliquable dans le feed
    onFeedTagPress: function(oEvent) {
      var oToken = oEvent.getParameter("token");
      var sTagName = oToken ? oToken.getText() : "";
      if (sTagName) {
        MessageToast.show("Filtre par tag : " + sTagName);
      }
    },

    onFollowUser: function(oEvent) {
      MessageToast.show("Fonctionnalité suivi d'utilisateur à venir...");
    },

    // ============================================================
    // FORMATTERS
    // ============================================================
    formatAvatar:        function(sUrl, sName)  { return formatter.formatAvatar(sUrl, sName); },
    formatDate:          function(sDate)         { return formatter.formatDate(sDate); },
    formatRelativeTime:  function(sDate)         { return formatter.formatRelativeTime(sDate); },
    formatFileSize:      function(iBytes)        { return formatter.formatFileSize(iBytes); },
    formatFileIcon:      function(sType)         { return formatter.formatFileIcon(sType); },

    // Texte du bouton like : "J'aime" / "J'aime (N)"
    formatLikeButtonText: function(iCount, bLiked) {
      var n = parseInt(iCount, 10) || 0;
      var sLabel = "J'aime";
      return n > 0 ? sLabel + " (" + n + ")" : sLabel;
    },

    // Texte du bouton dislike : "J'aime pas" / "J'aime pas (N)"
    formatDislikeButtonText: function(iCount, bDisliked) {
      var n = parseInt(iCount, 10) || 0;
      var sLabel = "J'aime pas";
      return n > 0 ? sLabel + " (" + n + ")" : sLabel;
    },

    // Formatter pour le texte des statistiques de réactions (LinkedIn)
    formatReactionsStatText: function(iLikeCount, iDislikeCount) {
      var l = parseInt(iLikeCount, 10) || 0;
      var d = parseInt(iDislikeCount, 10) || 0;
      if (l === 0 && d === 0) return "";

      var parts = [];
      if (l > 0) {
        parts.push(l + " J'aime");
      }
      if (d > 0) {
        parts.push(d + " J'aime pas");
      }
      return parts.join(" · ");
    },

    // Formatter pour les commentaires (LinkedIn)
    formatCommentsStatText: function(iCommentCount) {
      var n = parseInt(iCommentCount, 10) || 0;
      if (n === 0) return "";
      return n === 1 ? "1 commentaire" : n + " commentaires";
    },

    // Formatter pour les partages (LinkedIn)
    formatSharesStatText: function(iShareCount) {
      var n = parseInt(iShareCount, 10) || 0;
      if (n === 0) return "";
      return n === 1 ? "1 partage" : n + " partages";
    },

    // En-tête de la zone commentaires : "Commentaires (N)"
    formatCommentsHeader: function(iCount) {
      var n = parseInt(iCount, 10) || 0;
      return n === 0 ? "Commentaires" : "Commentaires (" + n + ")";
    },

    // Métadonnée de fichier : "123 Ko · PDF"
    formatFileMeta: function(iBytes, sType) {
      var sSize = formatter.formatFileSize(iBytes);
      var sTypeUp = (sType || "").toUpperCase();
      return sSize + " · " + sTypeUp;
    },

    isImageFileType: function(sType) {
      return ["png", "jpg", "jpeg", "webp", "gif"].indexOf((sType || "").toLowerCase()) >= 0;
    },

    isNotImageFileType: function(sType) {
      return ["png", "jpg", "jpeg", "webp", "gif"].indexOf((sType || "").toLowerCase()) < 0;
    },

    formatPostType: function(sType) {
      var mTypes = { knowledge: "Connaissance", question: "Question", announcement: "Annonce" };
      return mTypes[sType] || sType;
    },

    formatPostTypeState: function(sType) {
      var mStates = { knowledge: "Success", question: "Warning", announcement: "Error" };
      return mStates[sType] || "None";
    },

    formatPostCardClass: function(sType) {
      return "aymaxPostType-" + (sType || "knowledge");
    },

    formatFavoriteIcon: function(bFavorited) {
      return bFavorited ? "sap-icon://favorite" : "sap-icon://unfavorite";
    }
  });
});

// Formats de fichiers autorisés pour les pièces jointes
var _ALLOWED_FILE_TYPES = ["pdf", "doc", "docx", "png", "jpg", "jpeg", "webp"];