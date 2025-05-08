const express = require("express");
const router = express.Router();
const VoteController = require("../controllers/VoteController");

const VoteRouter = (socketHandler) => {
  const voteController = new VoteController(socketHandler);

  router.get("/:channelId", voteController.getVotesByChannelId);
  router.post("/", voteController.addVote);
  router.put("/:voteId", voteController.lockVote);
  router.post("/option/:voteId", voteController.addVoteOption);
  router.delete("/option/:voteId/:optionId", voteController.deleteVoteOption);
  router.post(
    "/option/select/:voteId/:optionId",
    voteController.selectVoteOption
  );
  router.delete(
    "/option/deselect/:voteId/:optionId",
    voteController.deselectVoteOption
  );

  return router;
};

module.exports = VoteRouter;
