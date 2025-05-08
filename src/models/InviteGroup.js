const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const NotFoundError = require("../exceptions/NotFoundError");

const inviteGroupSchema = new Schema(
  {
    conversationId: { type: ObjectId, required: true, ref: "Conversation" },
    inviterId: { type: ObjectId, required: true, ref: "User" }, // Người mời
    inviteeId: { type: ObjectId, ref: "User" }, // Người được mời (null cho link chung)
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    token: { type: String, required: true }, // Token để xác thực link
    expiresAt: { type: Date, required: true }, // Thời gian hết hạn
  },
  { timestamps: true }
);

inviteGroupSchema.index({ conversationId: 1, inviteeId: 1 });
inviteGroupSchema.index({ token: 1 }, { unique: true });
inviteGroupSchema.statics = {
  async findValidToken(token) {
    const invite = await this.findOne({ token });
    if (!invite) throw new NotFoundError("Invitation");
    if (invite.expiresAt < new Date())
      throw new Error("Invitation link has expired");
    return invite;
  },

  async createOrUpdateInvite(
    conversationId,
    inviterId,
    inviteeId,
    token,
    expiresAt
  ) {
    let invite = await this.findOneAndUpdate(
      { conversationId, inviteeId },
      { inviterId, token, expiresAt, status: "pending" },
      { new: true, upsert: true }
    );
    return invite;
  },

  async acceptInvite(token, userId) {
    const invite = await this.findValidToken(token);
    if (invite.status !== "pending")
      throw new Error("This invitation is no longer valid");
    invite.status = "accepted";
    invite.inviteeId = userId;
    await invite.save();
    return invite;
  },

  async rejectInvite(token) {
    const invite = await this.findValidToken(token);
    invite.status = "rejected";
    await invite.save();
    return invite;
  },
};

// Instance methods (dùng với document)
inviteGroupSchema.methods = {
  isExpired() {
    return this.expiresAt < new Date();
  },

  async markAccepted(userId) {
    this.status = "accepted";
    this.inviteeId = userId;
    return await this.save();
  },

  async markRejected() {
    this.status = "rejected";
    return await this.save();
  },
};

const InviteGroup = mongoose.model("InviteGroup", inviteGroupSchema);
module.exports = InviteGroup;
