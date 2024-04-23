/**
 * *Sends an error message.
 * @param {string} message the error message.
 * @param {Hubot.Response} res The context.
 */
const sendError = (message, res) => {
  res.robot.logger.error(message);
  res.send(message);
};

/**
 * Gets the room from the context.
 * @param {Hubot.Response} res The context.
 * @returns {string}
 */
function getRoom(res) {
  // placeholder for further adapter support (i.e. MS Teams) as then room also
  // contains thread conversation id
  return res.envelope.room;
}

exports.sendError = sendError;
exports.getRoom = getRoom;
