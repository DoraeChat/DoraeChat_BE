const router = express.Router();
const FriendController = require('../controllers/FriendController');

const FriendRouter = (io) => {
    const friendController = new FriendController(io);

    router.get('', friendController.getListFriends);
    router.delete('/:userId', friendController.deleteFriend);
    router.post('/invites/me/:userId', friendController.sendFriendInvite);
    router.delete('/invites/me/:userId', friendController.deleteInviteWasSend);

    return router;
}

module.exports = FriendRouter;
