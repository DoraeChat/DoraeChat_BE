const friendService = require('../services/FriendService');
const CustomError = require('../exceptions/CustomError');
const MeService = require('../services/MeService');

// Add this at the top of the file
const requestCache = new Map();
const CACHE_TTL = 2000; // 2 seconds cache lifetime

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
            // Create a cache key based on user ID and search name
            const cacheKey = `friends_${_id}_${name}`;

            // Check if we have a recent response in cache
            if (requestCache.has(cacheKey)) {
                const { data, timestamp } = requestCache.get(cacheKey);
                const now = Date.now();

                // If cache is still fresh, return cached data
                if (now - timestamp < CACHE_TTL) {
                    console.log('Returning cached friends response');
                    return res.json(data);
                }
            }

            const friends = await friendService.getList(name, _id);

            const friendsTempt = [];
            for (const friendEle of friends) {
                const friendResult = { ...friendEle };
                friendsTempt.push(friendResult);
            }

            console.log('friendsTempt', friendsTempt);

            // Store in cache
            requestCache.set(cacheKey, {
                data: friendsTempt,
                timestamp: Date.now()
            });

            // Clean up old cache entries periodically
            if (Math.random() < 0.1) { // 10% chance to clean up on each request
                this.cleanupCache();
            }

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
                const user = await MeService.getById(friendId);
                const { name, avatar } = user;
                this.io
                    .to(userId + '')
                    .emit('send-friend-invite', { _id, name, avatar });
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
            this.io
                .to(userId + '')
                .emit('accept-friend', { _id, name, avatar });


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
}

module.exports = FriendController;
