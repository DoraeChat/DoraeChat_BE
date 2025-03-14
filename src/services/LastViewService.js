const Member = require("../models/Member");

class LastViewService {
  /**
   * Update last view timestamp of a conversation for a user
   * @param {string} conversationId - ID of the conversation
   * @param {string} userId - ID of the user
   * @returns {Promise<Object>} - Result of the update operation
   */
  async updateLastViewOfConversation(conversationId, userId) {
    // Using updateOne is good for performance since we only need to update one field
    return Member.updateOne(
      { conversationId, userId },
      { $set: { lastView: new Date() } }
    );
  }

  /**
   * Update last view timestamp of a channel within a conversation for a user
   * @param {string} conversationId - ID of the conversation
   * @param {string} channelId - ID of the channel
   * @param {string} userId - ID of the user
   * @returns {Promise<Object>} - Result of the update operation
   */
  async updateLastViewOfChannel(conversationId, channelId, userId) {
    // Optimization: Use findOneAndUpdate to avoid separate fetch and update operations
    return Member.findOneAndUpdate(
      {
        conversationId,
        userId,
        "lastViewOfChannels.channelId": channelId.toString(),
      },
      {
        $set: { "lastViewOfChannels.$.lastView": new Date() },
      },
      {
        new: true, // Return the updated document
      }
    );
  }
}

module.exports = new LastViewService();
