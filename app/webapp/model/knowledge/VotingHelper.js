sap.ui.define([], function() {
  "use strict";

  // Shared between KnowledgeList.controller.js (card voting) and
  // KnowledgeDetail.controller.js (detail page voting) - both need the
  // exact same "which action, with what params" decision, so it lives
  // here once rather than twice.
  //
  // iCurrentVote is KnowledgeItems.myVote - +1 / -1 / null, a server-
  // computed virtual field (batched after-READ hook), not an expanded
  // association. Pressing the same vote again toggles it off
  // (removeVote); anything else is a fresh vote or a direction change,
  // both handled by voteItem's own upsert logic server-side.
  return {
    resolveVoteAction: function(iCurrentVote, iValue) {
      var bAlreadyThisValue = iCurrentVote === iValue;
      return bAlreadyThisValue
        ? { action: "removeVote", params: {} }
        : { action: "voteItem", params: { value: iValue } };
    }
  };
});
