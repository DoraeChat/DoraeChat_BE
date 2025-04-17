const express = require("express");
const router = express.Router();
const FriendController = require("../controllers/FriendController");

const FriendRouter = (socketHandler) => {
  const friendController = new FriendController(socketHandler);

  router.get("", friendController.getListFriends);
  router.delete("/:userId", friendController.deleteFriend);
  router.post("/invites/me/:userId", friendController.sendFriendInvite);
  router.delete("/invites/me/:userId", friendController.deleteInviteWasSend);
  router.delete("/invites/:userId", friendController.deleteFriendInvite);
  router.post("/:userId", friendController.acceptFriend);
  router.get('/invites/me', friendController.getListFriendInvitesWasSend);
  router.get('/suggest', friendController.getSuggestFriends);
  router.get('/invites', friendController.getListFriendInvites);
  return router;
};

module.exports = FriendRouter;
