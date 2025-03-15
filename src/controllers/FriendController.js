const friendService = require('../services/FriendService');
const redisDb = require('../config/redis');
const CustomError = require('../exceptions/CustomError');

class FriendController {
    constructor(io) {
        this.io = io;
        this.sendFriendInvite = this.sendFriendInvite.bind(this);
        this.deleteFriend = this.deleteFriend.bind(this);
        this.deleteFriendInvite = this.deleteFriendInvite.bind(this);
        this.deleteInviteWasSend = this.deleteInviteWasSend.bind(this);
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
                try {
                    const cachedUser = await redisDb.get(friendId + '');
                    if (cachedUser) {
                        friendResult.isOnline = cachedUser.isOnline;
                        friendResult.lastLogin = cachedUser.lastLogin;
                    } else {
                        friendResult.isOnline = false;
                        friendResult.lastLogin = null;
                    }
                } catch (redisError) {
                    console.error('Redis error:', redisError);
                    friendResult.isOnline = false;
                    friendResult.lastLogin = null;
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

    //[DELETE]  /invites/:userId
    async deleteFriendInvite(req, res, next) {
        const { _id } = req;
        const { userId } = req.params;

        try {
            await friendService.deleteFriendInvite(_id, userId);
            this.io.to(userId + '').emit('deleted-friend-invite', _id);

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

            try {
                const cachedUser = await redisDb.get(_id);
                if (cachedUser) {
                    const { name, avatar } = cachedUser;
                    this.io
                        .to(userId + '')
                        .emit('send-friend-invite', { _id, name, avatar });
                } else {
                    this.io.to(userId + '').emit('send-friend-invite', { _id });
                }
            } catch (redisError) {
                console.error('Redis error:', redisError);
                this.io.to(userId + '').emit('send-friend-invite', { _id });
            }

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
