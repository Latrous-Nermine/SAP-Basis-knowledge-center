sap.ui.define([
  "sap/ui/core/format/DateFormat",
  "../shared/avatarSrc"
], function(DateFormat, avatarSrcUtil) {
  "use strict";

  // category enum (db/lot2.cds KnowledgeItems.category) -> i18n key
  var CATEGORY_KEYS = {
    article: "category.article",
    documentation: "category.documentation",
    report: "category.report",
    tutorial: "category.tutorial",
    best_practice: "category.bestPractice",
    resolved_question: "category.resolvedQuestion",
    faq: "category.faq",
    template: "category.template"
  };

  // status enum -> { i18n key, ValueState } - docs/design/Knowledge-Center.md's
  // exact mapping: Brouillon/None, En attente/Warning, Approuvé/Success, Rejeté/Error
  var STATUS_META = {
    draft: { key: "status.draft", state: "None" },
    pending: { key: "status.pending", state: "Warning" },
    approved: { key: "status.approved", state: "Success" },
    rejected: { key: "status.rejected", state: "Error" }
  };

  var ROLE_KEYS = {
    author: "roleLabel.author",
    contributor: "roleLabel.contributor",
    reviewer: "roleLabel.reviewer"
  };

  // Visual identity per category (2026-08 "richer" pass) - one accent
  // colour + one recognisable icon each, reused for the card banner and
  // the topic tiles instead of plain text everywhere. `color` is a plain
  // sap.m.AvatarColor enum string, fed to an Avatar's own backgroundColor
  // property - the same proven-reliable single-part enum binding already
  // used for every user avatar in this app (e.g.
  // primaryContributorColor/avatarColorFromID), deliberately NOT a bound
  // `class=` (this app has twice confirmed a class= binding - ternary AND
  // formatter-based - silently never applies) and NOT a CSS data-attribute
  // via core:CustomData either (tried first: XML's default-aggregation
  // handling on HBox/VBox rejects a bare nested <core:CustomData>, and the
  // explicit <Control.customData> aggregation tag isn't recognised on
  // sap.m layout controls in this UI5 version - confirmed empirically,
  // both throw). An Avatar's enum-typed property is the one mechanism
  // proven to reliably carry a per-row colour in this codebase.
  var CATEGORY_VISUALS = {
    article:            { color: "Accent1", icon: "sap-icon://document-text" },
    documentation:      { color: "Accent2", icon: "sap-icon://course-book" },
    report:             { color: "Accent4", icon: "sap-icon://line-chart" },
    tutorial:            { color: "Accent3", icon: "sap-icon://learning-assistant" },
    best_practice:       { color: "Accent5", icon: "sap-icon://lightbulb" },
    resolved_question:   { color: "Accent7", icon: "sap-icon://sys-help-2" },
    faq:                 { color: "Accent8", icon: "sap-icon://question-mark" },
    template:            { color: "Accent9", icon: "sap-icon://form" }
  };
  var DEFAULT_CATEGORY_VISUAL = { color: "Accent1", icon: "sap-icon://document-text" };

  // Topic tiles don't have a fixed enum like category does (KnowledgeTopics
  // is free-text reference data), so this reads a handful of SAP-domain
  // keywords out of the topic NAME instead - covers the seeded topics
  // (SAP BTP, Solutions SAP, Développement Digital, ...) and degrades to a
  // sensible default for anything else, rather than only working for
  // exact, hardcoded topic names. `illustration` (2026-08, real-visuals
  // pass) is one of the 8 hand-authored SVGs in
  // img/knowledge/illustrations/ - the SAME family match drives both the
  // topic tile's small thumbnail and the knowledge card's cover (see
  // cardIllustration below), so a topic and the cards filed under it
  // always show the same visual identity.
  var TOPIC_KEYWORDS = [
    { re: /btp|cloud/i,               color: "Accent1", icon: "sap-icon://cloud",       illustration: "illus-btp-cloud.svg" },
    { re: /hana|data/i,               color: "Accent2", icon: "sap-icon://database",    illustration: "illus-hana-data.svg" },
    { re: /fiori|ux|ui\b/i,           color: "Accent4", icon: "sap-icon://palette",     illustration: "illus-fiori-ui.svg" },
    { re: /cap|d[ée]veloppement|dev|code|digital/i, color: "Accent5", icon: "sap-icon://source-code", illustration: "illus-cap-dev.svg" },
    { re: /basis|solutions|serveur|server/i,        color: "Accent8", icon: "sap-icon://build",        illustration: "illus-basis-server.svg" },
    { re: /s[ée]curit[ée]|security/i, color: "Accent7", icon: "sap-icon://shield",      illustration: "illus-security.svg" }
  ];
  var DEFAULT_TOPIC_VISUAL = { color: "Accent3", icon: "sap-icon://folder-blank", illustration: "illus-general.svg" };

  // Category -> illustration fallback, used only when an item has NO
  // topic (most real content will have one; this is the secondary path).
  // Not arbitrary: report/tutorial/best_practice/template map to the
  // illustration whose real motif fits that category's own nature (data,
  // dev/how-to, achievement, UI/reporting layout); everything else falls
  // back to the generic knowledge illustration rather than forcing a
  // false-specific match.
  var CATEGORY_ILLUSTRATION = {
    article: "illus-general.svg",
    documentation: "illus-general.svg",
    report: "illus-hana-data.svg",
    tutorial: "illus-cap-dev.svg",
    best_practice: "illus-best-practice.svg",
    resolved_question: "illus-general.svg",
    faq: "illus-general.svg",
    template: "illus-fiori-ui.svg"
  };
  var ILLUSTRATION_BASE = "img/knowledge/illustrations/";

  function categoryVisual(sCategory) {
    return CATEGORY_VISUALS[sCategory] || DEFAULT_CATEGORY_VISUAL;
  }

  // Card banner background (2026-08, 3rd iteration) - sap.m.Avatar's own
  // backgroundColor enum turned out to only offer pale pastel tones in
  // this theme (confirmed via computed style: rgb(255,243,184) etc.),
  // which reads as washed-out and leaves white banner text/icons close to
  // invisible - wrong for a bold "featured content" banner even though it
  // was a reliable BINDING mechanism. Back to real saturated gradients,
  // but selected the only way proven reliable on this fragment: one
  // static-class element per category, each toggled by the same two-part
  // composite + targetType:'any' visible= recipe already proven for
  // isNotApproved/canVote above (a single-part formatter-based visible=
  // does NOT reliably apply here - confirmed empirically, more than
  // once). Exactly one of these 8 is ever visible for a given row.
  function makeCategoryMatcher(sKey) {
    return function(sCategory) { return sCategory === sKey; };
  }
  var isCategoryArticle = makeCategoryMatcher("article");
  var isCategoryDocumentation = makeCategoryMatcher("documentation");
  var isCategoryReport = makeCategoryMatcher("report");
  var isCategoryTutorial = makeCategoryMatcher("tutorial");
  var isCategoryBestPractice = makeCategoryMatcher("best_practice");
  var isCategoryResolvedQuestion = makeCategoryMatcher("resolved_question");
  var isCategoryFaq = makeCategoryMatcher("faq");
  var isCategoryTemplate = makeCategoryMatcher("template");

  function topicVisual(sName) {
    if (sName) {
      for (var i = 0; i < TOPIC_KEYWORDS.length; i++) {
        if (TOPIC_KEYWORDS[i].re.test(sName)) return TOPIC_KEYWORDS[i];
      }
    }
    return DEFAULT_TOPIC_VISUAL;
  }

  // The card's real thumbnail (2026-08 "real visuals" pass) - topic wins
  // when it matches a real SAP-domain keyword (a topic assigned by an
  // actual contributor is more specific than the category alone); a topic
  // that exists but matched no keyword (falls through to
  // DEFAULT_TOPIC_VISUAL) is treated the same as "no topic" here, so an
  // unrecognised topic name doesn't force every one of its cards to the
  // generic cover when the category itself has a better-matching
  // illustration.
  function cardIllustration(sCategory, sTopicName) {
    if (sTopicName) {
      var oTopic = topicVisual(sTopicName);
      if (oTopic !== DEFAULT_TOPIC_VISUAL) return ILLUSTRATION_BASE + oTopic.illustration;
    }
    return ILLUSTRATION_BASE + (CATEGORY_ILLUSTRATION[sCategory] || "illus-general.svg");
  }

  function topicIllustration(sName) {
    return ILLUSTRATION_BASE + topicVisual(sName).illustration;
  }

  // Card thumbnail = one of 8 static-class VBox alternatives, each with
  // its own hardcoded CSS background-image, toggled by visible= - the
  // exact same proven mechanism the 8 category banner colours already use
  // (see isCategoryArticle etc. above), reused here rather than gambling
  // on a fresh "dynamic Image.src" binding after everything this session
  // already learned about single-part visible= bindings on this
  // fragment. Deliberately compares against the exact filename
  // cardIllustration() would pick, so both stay in sync from one source
  // of truth instead of duplicating the topic/category matching logic.
  function makeIllustrationMatcher(sFilename) {
    var sFullPath = ILLUSTRATION_BASE + sFilename;
    return function(sCategory, sTopicName) {
      return cardIllustration(sCategory, sTopicName) === sFullPath;
    };
  }
  var isIllustrationBtpCloud = makeIllustrationMatcher("illus-btp-cloud.svg");
  var isIllustrationHanaData = makeIllustrationMatcher("illus-hana-data.svg");
  var isIllustrationFioriUi = makeIllustrationMatcher("illus-fiori-ui.svg");
  var isIllustrationCapDev = makeIllustrationMatcher("illus-cap-dev.svg");
  var isIllustrationBasisServer = makeIllustrationMatcher("illus-basis-server.svg");
  var isIllustrationSecurity = makeIllustrationMatcher("illus-security.svg");
  var isIllustrationBestPractice = makeIllustrationMatcher("illus-best-practice.svg");
  var isIllustrationGeneral = makeIllustrationMatcher("illus-general.svg");

  // Same idea for the rail's topic tiles, just topic-only (no category
  // fallback needed - a topic tile always has a name).
  function makeTopicIllustrationMatcher(sFilename) {
    var sFullPath = ILLUSTRATION_BASE + sFilename;
    return function(sTopicName) {
      return (ILLUSTRATION_BASE + topicVisual(sTopicName).illustration) === sFullPath;
    };
  }
  var isTopicIllustrationBtpCloud = makeTopicIllustrationMatcher("illus-btp-cloud.svg");
  var isTopicIllustrationHanaData = makeTopicIllustrationMatcher("illus-hana-data.svg");
  var isTopicIllustrationFioriUi = makeTopicIllustrationMatcher("illus-fiori-ui.svg");
  var isTopicIllustrationCapDev = makeTopicIllustrationMatcher("illus-cap-dev.svg");
  var isTopicIllustrationBasisServer = makeTopicIllustrationMatcher("illus-basis-server.svg");
  var isTopicIllustrationSecurity = makeTopicIllustrationMatcher("illus-security.svg");
  var isTopicIllustrationGeneral = makeTopicIllustrationMatcher("illus-general.svg");

  var oResourceBundle = null;

  // Plain module-scope functions, not object methods - a formatter invoked
  // via a composite/parts binding is NOT guaranteed to run with `this` bound
  // to this module (unlike a single-property binding), so nothing in this
  // file may rely on `this`.
  function relativeDateTime(vDate) {
    if (!vDate) return "";
    var oFormatter = DateFormat.getDateTimeInstance({ relative: true });
    return oFormatter.format(new Date(vDate));
  }

  function isNotApproved(sStatus) {
    return sStatus !== "approved";
  }

  function canSubmitForReview(sStatus) {
    return sStatus === "draft";
  }

  // A draft has never been published - nothing to comment on yet.
  function canShowComments(sStatus) {
    return sStatus !== "draft";
  }

  // Voting is only allowed on approved items (spec requirement) - the
  // backend is the real enforcement (voteItem rejects otherwise), this
  // just avoids showing a control that would always 403.
  function canVote(sStatus) {
    return sStatus === "approved";
  }

  // myVote is +1 / -1 / null - a server-computed virtual field (batched
  // after-READ hook, see knowledge-service.js), not an expanded
  // association - a plain value, not an array to inspect.
  function isUpvoted(iMyVote) {
    return iMyVote === 1;
  }

  function isDownvoted(iMyVote) {
    return iMyVote === -1;
  }

  // "Sami Ben Youssef" -> "SB", same first+second-word rule as every
  // other avatar initials formatter in this app (Profile/Experts/HR).
  // Still used directly for the Detail page's per-contributor/per-comment
  // Avatars below (those bind one already-scalar row at a time via a plain
  // List item template - no collection involved, so a single-part
  // formatter binding is fine there, unlike the card's "primary
  // contributor" summary which the backend now computes instead - see
  // knowledge-service.js's after-READ hook and its own comment on why).
  function initialsFromName(sName) {
    if (!sName) return "?";
    var aParts = sName.trim().split(/\s+/);
    var sFirst = aParts[0] ? aParts[0].charAt(0) : "";
    var sSecond = aParts.length > 1 ? aParts[1].charAt(0) : "";
    return (sFirst + sSecond).toUpperCase() || "?";
  }

  // Same hash-to-AvatarColor token every other module's formatter uses
  // (Profile/Experts/Dashboard) - identical fallback colour for the
  // same user id everywhere in the app, not a locally-invented one.
  function avatarColorFromID(sUserID) {
    var aTokens = ["Accent1", "Accent2", "Accent3", "Accent4", "Accent5", "Accent6", "Accent7", "Accent8", "Accent9", "Accent10"];
    if (!sUserID) return "Accent6";
    var iHash = 0;
    for (var i = 0; i < sUserID.length; i++) {
      iHash = (iHash * 31 + sUserID.charCodeAt(i)) >>> 0;
    }
    return aTokens[iHash % aTokens.length];
  }

  return {

    setResourceBundle: function(oBundle) {
      oResourceBundle = oBundle;
    },

    categoryLabel: function(sCategory) {
      if (!sCategory || !oResourceBundle) return "";
      var sKey = CATEGORY_KEYS[sCategory];
      return sKey ? oResourceBundle.getText(sKey) : sCategory;
    },

    /**
     * Status is only ever shown to the item's own author (docs/design/
     * Knowledge-Center.md: "showStatus = ownedByMe && status") - in our
     * security model any non-approved item visible at all is guaranteed
     * to belong to the caller, so `isNotApproved` doubles as that check.
     */
    statusLabel: function(sStatus) {
      if (!sStatus || !oResourceBundle) return "";
      var oMeta = STATUS_META[sStatus];
      return oMeta ? oResourceBundle.getText(oMeta.key) : sStatus;
    },

    statusState: function(sStatus) {
      var oMeta = STATUS_META[sStatus];
      return oMeta ? oMeta.state : "None";
    },

    /** No Profile/People service yet (TODO-INTEGRATION.md I-16), so there's
        no display name or photo - initials derived from the user ID itself. */
    initials: function(sUserID) {
      if (!sUserID) return "?";
      return sUserID.slice(0, 2).toUpperCase();
    },

    contributorRoleLabel: function(sRole) {
      if (!sRole || !oResourceBundle) return "";
      var sKey = ROLE_KEYS[sRole];
      return sKey ? oResourceBundle.getText(sKey) : sRole;
    },

    isNotApproved: isNotApproved,
    canSubmitForReview: canSubmitForReview,
    canShowComments: canShowComments,
    canVote: canVote,
    isUpvoted: isUpvoted,
    isDownvoted: isDownvoted,
    relativeDateTime: relativeDateTime,

    tabButtonType: function(bActive) {
      return bActive ? "Emphasized" : "Default";
    },

    // "Articles (12)" - count is set once getCategoryCounts() resolves
    // (KnowledgeList.controller.js#_loadCategoryCounts); undefined until
    // then, so the tab just shows its bare label for one render pass
    // rather than "Articles (undefined)".
    tabLabelWithCount: function(sLabel, vCount) {
      return (vCount === undefined || vCount === null) ? sLabel : sLabel + " (" + vCount + ")";
    },

    // "4 Connaissances" / "1 Connaissance" on a topic tile - singular vs
    // plural resolved here (like viewCountLabel below), not by passing a
    // pre-picked, always-plural i18n string in as a second binding part
    // (found 2026-08: every topic showed "N Connaissances" even at N=1).
    topicChipLabel: function(iArticleCount) {
      var n = iArticleCount || 0;
      if (!oResourceBundle) return String(n);
      return oResourceBundle.getText(n === 1 ? "topicItemCountOne" : "topicItemCountMany", [n]);
    },

    byLine: function(sContributorsLabel, vCreatedAt) {
      if (!oResourceBundle) return "";
      return oResourceBundle.getText("byLine", [sContributorsLabel || "", relativeDateTime(vCreatedAt)]);
    },

    // File-card icon per MIME type (2026-08 detail-page redesign) - the
    // same ALLOWED_ATTACHMENT_TYPES list KnowledgeList.controller.js
    // already validates uploads against, just mapped to a recognisable
    // icon instead of one generic paperclip for every attachment.
    attachmentIcon: function(sFileType) {
      if (!sFileType) return "sap-icon://attachment";
      if (sFileType === "application/pdf") return "sap-icon://pdf-attachment";
      if (sFileType.indexOf("wordprocessingml") !== -1) return "sap-icon://doc-attachment";
      if (sFileType.indexOf("spreadsheetml") !== -1) return "sap-icon://excel-attachment";
      if (sFileType.indexOf("presentationml") !== -1) return "sap-icon://ppt-attachment";
      if (sFileType.indexOf("image/") === 0) return "sap-icon://picture";
      return "sap-icon://attachment";
    },

    fileSize: function(iBytes) {
      if (!iBytes) return "";
      var aSizes = ["o", "Ko", "Mo", "Go"];
      var i = Math.floor(Math.log(iBytes) / Math.log(1024));
      return Math.round((iBytes / Math.pow(1024, i)) * 10) / 10 + " " + aSizes[i];
    },

    // Real photo when the person has uploaded one, "" (initials fallback)
    // otherwise - same shared mechanism already used on Experts/HR/
    // Dashboard/Feed (model/shared/avatarSrc.js), not a new one.
    avatarSrc: avatarSrcUtil.avatarSrc,

    // viewCount is Integer64 - OData V4 serialises that as a numeric
    // STRING (found via direct inspection: "viewCount":"98" in the raw
    // JSON, not a bare number), so this always coerces before formatting
    // rather than trusting the type.
    viewCountLabel: function(vViewCount) {
      var n = parseInt(vViewCount, 10) || 0;
      if (!oResourceBundle) return String(n);
      return oResourceBundle.getText(n === 1 ? "viewCountOne" : "viewCountMany", [n]);
    },

    // Small "X en a répondu" style badge shown only on items promoted
    // from a resolved question (KnowledgeItems.fromQuestion) - mirrors
    // the original design mock's checkmark icon (docs/design/
    // Knowledge-Center.md: it.fromQuestion).
    fromQuestionTooltip: function(bFromQuestion) {
      if (!bFromQuestion || !oResourceBundle) return "";
      return oResourceBundle.getText("fromQuestionTooltip");
    },

    initialsFromName: initialsFromName,
    avatarColorFromID: avatarColorFromID,

    // Topic is a single Association - empty string (not "undefined") when
    // an item has none, so the chip binding's visible= can key off it.
    topicName: function(sTopicName) {
      return sTopicName || "";
    },

    hasTopic: function(sTopicName) {
      return !!sTopicName;
    },

    isCategoryArticle: isCategoryArticle,
    isCategoryDocumentation: isCategoryDocumentation,
    isCategoryReport: isCategoryReport,
    isCategoryTutorial: isCategoryTutorial,
    isCategoryBestPractice: isCategoryBestPractice,
    isCategoryResolvedQuestion: isCategoryResolvedQuestion,
    isCategoryFaq: isCategoryFaq,
    isCategoryTemplate: isCategoryTemplate,

    categoryIcon: function(sCategory) {
      return categoryVisual(sCategory).icon;
    },
    // "Tout" (id === "") isn't a real category - its own icon, not part of
    // CATEGORY_VISUALS.
    categoryTabIcon: function(sCategoryId) {
      return sCategoryId ? categoryVisual(sCategoryId).icon : "sap-icon://grid";
    },
    // Rail category grid (2026-08 "Explore rail" pass) - same Avatar
    // backgroundColor mechanism as topicAvatarColor below (proven-reliable
    // single-part enum binding), reused so the rail's category chips get a
    // real colour badge without the 8-way static-class technique the card
    // thumbnail needs (that one exists only because a flat colour had to
    // fill an entire banner reliably; a small round icon badge doesn't
    // need that weight - Avatar's own enum property already does the job).
    categoryAvatarColor: function(sCategoryId) {
      return categoryVisual(sCategoryId).color;
    },

    // Topic tiles (2026-08) - same keyword-driven visual as the category
    // banner, same color/icon split.
    topicAvatarColor: function(sName) {
      return topicVisual(sName).color;
    },
    topicIcon: function(sName) {
      return topicVisual(sName).icon;
    },

    // Real illustration assets (2026-08 "real visuals" pass) - see
    // cardIllustration/topicIllustration's own comments above.
    cardIllustration: cardIllustration,
    topicIllustration: topicIllustration,

    isIllustrationBtpCloud: isIllustrationBtpCloud,
    isIllustrationHanaData: isIllustrationHanaData,
    isIllustrationFioriUi: isIllustrationFioriUi,
    isIllustrationCapDev: isIllustrationCapDev,
    isIllustrationBasisServer: isIllustrationBasisServer,
    isIllustrationSecurity: isIllustrationSecurity,
    isIllustrationBestPractice: isIllustrationBestPractice,
    isIllustrationGeneral: isIllustrationGeneral,

    isTopicIllustrationBtpCloud: isTopicIllustrationBtpCloud,
    isTopicIllustrationHanaData: isTopicIllustrationHanaData,
    isTopicIllustrationFioriUi: isTopicIllustrationFioriUi,
    isTopicIllustrationCapDev: isTopicIllustrationCapDev,
    isTopicIllustrationBasisServer: isTopicIllustrationBasisServer,
    isTopicIllustrationSecurity: isTopicIllustrationSecurity,
    isTopicIllustrationGeneral: isTopicIllustrationGeneral,

    // "3 commentaires" / "1 pièce jointe" style footer metadata - same
    // singular/plural resolution as topicChipLabel/viewCountLabel above,
    // fed by the new commentsCount/attachmentsCount virtual fields
    // (srv/knowledge-service.js's after-READ hook).
    commentsCountLabel: function(vCount) {
      var n = parseInt(vCount, 10) || 0;
      if (!oResourceBundle) return String(n);
      return oResourceBundle.getText(n === 1 ? "commentsCountOne" : "commentsCountMany", [n]);
    },
    attachmentsCountLabel: function(vCount) {
      var n = parseInt(vCount, 10) || 0;
      if (!oResourceBundle) return String(n);
      return oResourceBundle.getText(n === 1 ? "attachmentsCountOne" : "attachmentsCountMany", [n]);
    },
    hasCount: function(vCount) {
      return (parseInt(vCount, 10) || 0) > 0;
    }
  };
});
