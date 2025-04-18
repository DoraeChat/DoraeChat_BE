const friendService = require('../services/FriendService');
const CustomError = require('../exceptions/CustomError');
const MeService = require('../services/MeService');
const SOCKET_EVENTS = require('../constants/socketEvents');

// Add this at the top of the file
const requestCache = new Map();
const CACHE_TTL = 1000;

class FriendController {
    constructor(io) {
        this.io = io;
        this.acceptFriend = this.acceptFriend.bind(this);
        this.sendFriendInvite = this.sendFriendInvite.bind(this);
        this.deleteFriend = this.deleteFriend.bind(this);
        this.deleteFriendInvite = this.deleteFriendInvite.bind(this);
        this.deleteInviteWasSend = this.deleteInviteWasSend.bind(this);
    }

    // [GET] /?name
    async getListFriends(req, res, next) {
        console.log('getListFriends', req._id);
        const { _id } = req;
        const { name = '' } = req.query;

        try {
            const friends = await friendService.getList(name, _id);

            const friendsTempt = [];
            for (const friendEle of friends) {
                const friendResult = { ...friendEle };
                friendsTempt.push(friendResult);
            }

            console.log('friendsTempt', friendsTempt);


            res.json(friendsTempt);
        } catch (err) {
            next(err);
        }
    }

    cleanupCache() {
        const now = Date.now();
        for (const [key, { timestamp }] of requestCache.entries()) {
            if (now - timestamp > CACHE_TTL) {
                requestCache.delete(key);
            }
        }
    }

    // [DELETE] /:userId
    async deleteFriend(req, res, next) {
        const { _id } = req;
        const { userId } = req.params;
        try {
            await friendService.deleteFriend(_id, userId);

            this.io.to(userId + '').emit(SOCKET_EVENTS.DELETED_FRIEND, _id);

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
            this.io.to(userId + '').emit(SOCKET_EVENTS.DELETED_FRIEND_INVITE, _id);

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
                // Fix: friendId is not defined, should be _id
                const user = await MeService.getById(_id);
                const { name, avatar } = user;
                this.io
                    .to(userId + '')
                    .emit(SOCKET_EVENTS.SEND_FRIEND_INVITE, { _id, name, avatar });
            } catch (error) {
                console.error('Error getting user data:', error);
                this.io.to(userId + '').emit(SOCKET_EVENTS.SEND_FRIEND_INVITE, { _id });
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
            this.io.to(userId + '').emit(SOCKET_EVENTS.DELETED_INVITE_WAS_SEND, _id);
            res.status(204).json();
        } catch (err) {
            next(err);
        }
    }

    // [GET] /invites
    async getListFriendInvites(req, res, next) {
        const { _id } = req;
        try {
            const friendInvites = await friendService.getListInvites(_id);

            res.json(friendInvites);
        } catch (err) {
            next(err);
        }
    }


    // [POST] /:userId
    async acceptFriend(req, res, next) {
        const { _id } = req;
        const { userId } = req.params;
        console.log('acceptFriend', _id, userId);
        try {
            const result = await friendService.acceptFriend(_id, userId);

            const user = await MeService.getById(_id);
            const { name, avatar } = user;
            // this.io
            //     .to(userId + '')
            //     .emit(SOCKET_EVENTS.ACCEPT_FRIEND, { _id, name, avatar });

            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    }

    // [GET] /invites/me
    async getListFriendInvitesWasSend(req, res, next) {
        const { _id } = req;
        try {
            const friendInvites = await friendService.getListInvitesWasSend(
                _id
            );
            console.log('friendInvites', friendInvites);
            res.json(friendInvites);
        } catch (err) {
            next(err);
        }
    }

    // [GET] /suggest
    async getSuggestFriends(req, res, next) {
        const { _id } = req;
        const { page = 0, size = 12 } = req.query;

        try {
            const suggestFriends = await friendService.getSuggestFriends(
                _id,
                parseInt(page),
                parseInt(size)
            );

            res.json(suggestFriends);
        } catch (err) {
            next(err);
        }
    }

    async isFriend(req, res, next) {
        const { userId1, userId2 } = req.query;
        console.log('isFriend', userId1, userId2);

        try {
            const isFriend = await friendService.isFriend(userId1, userId2);

            res.json(isFriend);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = FriendController;
