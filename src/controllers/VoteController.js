const VoteService = require("../services/VoteService");
const SOCKET_EVENTS = require("../constants/socketEvents");

class VoteController {
  constructor(socketHandler) {
    this.socketHandler = socketHandler;
    this.addVote = this.addVote.bind(this);
    this.lockVote = this.lockVote.bind(this);
    this.addVoteOption = this.addVoteOption.bind(this);
    this.deleteVoteOption = this.deleteVoteOption.bind(this);
    this.selectVoteOption = this.selectVoteOption.bind(this);
    this.deselectVoteOption = this.deselectVoteOption.bind(this);
  }

  // [GET] /api/votes/:channelId
  async getVotesByChannelId(req, res, next) {
    try {
      const { channelId } = req.params;
      const votes = await VoteService.getVotesByChannelId(channelId);
      res.json(votes);
    } catch (error) {
      next(error);
    }
  }

  // [POST] /api/votes
  async addVote(req, res, next) {
    try {
      const vote = req.body;
      const newVote = await VoteService.addVote(vote);
      res.json(newVote);

      if (this.socketHandler) {
        this.socketHandler.emitToConversation(
          newVote.conversationId.toString(),
          SOCKET_EVENTS.CREATE_VOTE,
          newVote
        );
      }
    } catch (error) {
      next(error);
    }
  }

  // [PUT] /api/votes/:voteId
  async lockVote(req, res, next) {
    try {
      const { voteId } = req.params;
      const memberId = req.body.memberId;
      const vote = await VoteService.lockVote(voteId, memberId);
      res.json(vote);
    } catch (error) {
      next(error);
    }
  }

  // [POST] /api/votes/option/:voteId
  async addVoteOption(req, res, next) {
    try {
      const { voteId } = req.params;
      const memberId = req.body.memberId;
      const newOption = req.body.option;
      const vote = await VoteService.addVoteOption(voteId, memberId, newOption);
      res.json(vote);
    } catch (error) {
      next(error);
    }
  }

  // [DELETE] /api/votes/option/:voteId/:optionId
  async deleteVoteOption(req, res, next) {
    try {
      const { voteId, optionId } = req.params;
      const memberId = req.body.memberId;
      const vote = await VoteService.deleteVoteOption(
        voteId,
        memberId,
        optionId
      );
      res.json(vote);
    } catch (error) {
      next(error);
    }
  }

  // [POST] /api/votes/option/select/:voteId/:optionId
  async selectVoteOption(req, res, next) {
    try {
      const { voteId, optionId } = req.params;
      const memberId = req.body.memberId;
      const memberInfo = req.body.memberInfo; // { name, avatar, avatarColor }
      const vote = await VoteService.selectVoteOption(
        voteId,
        memberId,
        memberInfo,
        optionId
      );
      res.json(vote);

      if (this.socketHandler) {
        this.socketHandler.emitToConversation(
          vote.conversationId.toString(),
          SOCKET_EVENTS.VOTE_OPTION_SELECTED,
          vote
        );
      }
    } catch (error) {
      next(error);
    }
  }

  // [DELETE] /api/votes/option/deselect/:voteId/:optionId
  async deselectVoteOption(req, res, next) {
    try {
      const { voteId, optionId } = req.params;
      const memberId = req.body.memberId;
      const vote = await VoteService.deselectVoteOption(
        voteId,
        memberId,
        optionId
      );
      res.json(vote);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = VoteController;
