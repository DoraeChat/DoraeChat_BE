const friendService = require('../services/FriendService');
const redis = require('../config/redis')

class FriendController {
    constructor(io) {
        this.io = io;
    }

    // [GET] /?name
    async getListFriends(req, res, next) {
        const { _id } = req;
        const { name = '' } = req.query;

        try {
            const friends = await friendService.getList(name, _id);

            const friendsTempt = [];
            for (const friendEle of friends) {
                const friendResult = { ...friendEle };

                const friendId = friendEle._id;
                const cachedUser = await redisDb.get(friendId + '');
                if (cachedUser) {
                    friendResult.isOnline = cachedUser.isOnline;
                    friendResult.lastLogin = cachedUser.lastLogin;
                }

                friendsTempt.push(friendResult);
            }

            res.json(friendsTempt);
        } catch (err) {
            next(err);
        }
    }

    // [DELETE] /:userId
    async deleteFriend(req, res, next) {
        const { _id } = req;
        const { userId } = req.params;
        try {
            await friendService.deleteFriend(_id, userId);

            this.io.to(userId + '').emit('deleted-friend', _id);

            res.status(204).json();
        } catch (err) {
            next(err);
        }
    }

    // [POST] /invites/me/:userId
    async sendFriendInvite(req, res, next) {
        const { _id } = req;
        const { userId } = req.params;
        try {
            await friendService.sendFriendInvite(_id, userId);

            const { name, avatar } = await redisDb.get(_id);
            this.io
                .to(userId + '')
                .emit('send-friend-invite', { _id, name, avatar });

            res.status(201).json();
        } catch (err) {
            next(err);
        }
    }

    //[DELETE] /invites/me/:userId
    async deleteInviteWasSend(req, res, next) {
        const { _id } = req;
        const { userId } = req.params;

        try {
            await friendService.deleteInviteWasSend(_id, userId);
            this.io.to(userId + '').emit('deleted-invite-was-send', _id);
            res.status(204).json();
        } catch (err) {
            next(err);
        }
    }

}

module.exports = FriendController;
