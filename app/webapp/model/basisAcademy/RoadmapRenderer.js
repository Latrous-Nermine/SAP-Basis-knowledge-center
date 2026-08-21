sap.ui.define([
  "sap/ui/core/IconPool"
], function(IconPool) {
  "use strict";

  // Fixed 1000x420 canvas, matching the position classes in
  // css/basisAcademy/style.css (.baPos-<domainId>) - see that file's
  // own comment for why this is hand-tuned rather than computed.
  //
  // Rendered as one HTML string (SVG backdrop + absolutely-positioned
  // node/avatar overlays) rather than as declarative UI5 controls:
  // this is a free-form visual layout (a curved path with items
  // positioned along it), which UI5's XML data binding has no natural
  // primitive for. The controller wires a single delegated click
  // listener onto the rendered root (BasisAcademy.controller.js
  // #onRoadmapRendered) rather than per-node press handlers.
  var PATH_D = "M70,90 C143,60 216,120 290,90 C363,60 436,120 510,90 " +
    "C583,60 656,120 730,90 C803,60 876,120 930,90 " +
    "C1050,170 1050,250 930,330 " +
    "C857,300 803,360 730,330 C657,300 583,360 510,330 " +
    "C437,300 363,360 290,330 C217,300 143,360 70,330";

  function escapeHtml(sText) {
    return String(sText == null ? "" : sText).replace(/[&<>"']/g, function(c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // IconPool resolves a sap-icon:// URI to its real font codepoint -
  // there is no CSS class per icon, only a Unicode character in the
  // SAP-icons font, which is what makes every <core:Icon> in the rest
  // of this app render correctly. Raw HTML has to do that lookup
  // itself since there's no <core:Icon> control here to do it for us.
  function iconGlyphHtml(sIconUri, sExtraClass) {
    var oInfo = IconPool.getIconInfo(sIconUri);
    if (!oInfo) return "";
    return '<span class="sapUiIcon' + (sExtraClass ? " " + sExtraClass : "") + '" ' +
      'style="font-family:' + oInfo.fontFamily + '">' + oInfo.content + "</span>";
  }

  function renderAvatar(oMember) {
    return '<div class="baAvatarCircle" style="background:var(--sapAvatar_' + oMember.color + '_Background,#556b82)" ' +
      'title="' + escapeHtml(oMember.displayName) + '">' + escapeHtml(oMember.initials) + "</div>";
  }

  // aDomains: array of { id, order, icon, label, state?, completionRatio?,
  // completionLabel?, members }. `state` present = individual mode
  // (validated/inProgress/locked); absent = team mode (ratio ring).
  function renderRoadmap(aDomains) {
    var sNodes = aDomains.map(function(oDomain) {
      var bTeamMode = !oDomain.state;
      var sStateClass = bTeamMode ? "" : ("baState" + oDomain.state.charAt(0).toUpperCase() + oDomain.state.slice(1));
      var sIconHtml = iconGlyphHtml(oDomain.icon);

      var sCircle = bTeamMode
        ? '<div class="baRingWrap" style="--ba-ratio:' + oDomain.completionRatio + '">' +
            '<div class="baDomainNodeCircle">' + sIconHtml +
            '<div class="baDomainNodeOrder">' + oDomain.order + "</div></div></div>"
        : '<div class="baDomainNodeCircle">' + sIconHtml +
            '<div class="baDomainNodeOrder">' + oDomain.order + "</div>" +
            (oDomain.state === "locked" ? '<div class="baLockOverlay">' + iconGlyphHtml("sap-icon://locked") + "</div>" : "") +
            "</div>";

      var sAvatars = oDomain.members && oDomain.members.length
        ? '<div class="baAvatarCluster">' + oDomain.members.map(renderAvatar).join("") + "</div>"
        : "";

      return '<button type="button" class="baDomainNode baPos-' + escapeHtml(oDomain.id) + " " + sStateClass + '" ' +
        'data-domain-id="' + escapeHtml(oDomain.id) + '" aria-label="' + escapeHtml(oDomain.label) + '">' +
        sCircle +
        '<div class="baDomainNodeLabel">' + escapeHtml(oDomain.label) + "</div>" +
        sAvatars +
        "</button>";
    }).join("");

    var sSvg = '<svg class="baRoadmapSvg" viewBox="0 0 1000 420" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><linearGradient id="baPathGradient" x1="0%" y1="0%" x2="100%" y2="100%">' +
      '<stop offset="0%" stop-color="#293681"/><stop offset="100%" stop-color="#4274D9"/>' +
      "</linearGradient></defs>" +
      '<path class="baRoadmapPathShadow" d="' + PATH_D + '"/>' +
      '<path class="baRoadmapPath" d="' + PATH_D + '"/>' +
      "</svg>";

    return '<div class="baRoadmapCanvasInner">' + sSvg + sNodes + "</div>";
  }

  return { renderRoadmap: renderRoadmap };
});
