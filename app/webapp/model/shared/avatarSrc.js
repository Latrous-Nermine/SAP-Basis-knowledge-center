sap.ui.define([], function() {
  "use strict";

  // One URL builder for every module that shows a real person's avatar -
  // all of them read the same media stream (PeopleService's People
  // entity), regardless of which service's own list surfaced that person
  // (Experts, HR, Dashboard's suggested-experts, Feed's post/comment
  // authors, ...). Was duplicated per-module drift waiting to happen
  // (like the notification-icon maps were) - one place instead (2026-08).
  //
  // Returns "" whenever no real photo has ever been uploaded (mimeType
  // null) - every Avatar/Image control here falls back to its own
  // initials/placeholder when src is empty, same mechanism as Profile's
  // own avatarSrc (model/profile/formatter.js).
  function avatarSrc(sUserID, sMimeType) {
    if (!sUserID || !sMimeType) return "";
    return "/odata/v4/people/People('" + encodeURIComponent(sUserID) + "')/avatar";
  }

  return {
    avatarSrc: avatarSrc
  };
});
