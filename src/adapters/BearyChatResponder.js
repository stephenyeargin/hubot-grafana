'strict';
const { Responder } = require('./Responder');

class BearyChatResponder extends Responder {
  /**
   *
   * @param {Hubot.Robot} robot
   */
  constructor(robot) {
    super();

    /** @type {Hubot.Robot} */
    this.robot = robot;
  }
  /**
   * Sends the response to Hubot.
   * @param {Hubot.Response} res the context.
   * @param {string} title the title of the message
   * @param {string} image the URL of the image
   * @param {string} link the title of the link
   */
  send(res, title, image, link) {
    this.robot.emit('bearychat.attachment', {
      message: {
        room: res.envelope.room,
      },
      text: `[${title}](${link})`,
      attachments: [
        {
          fallback: `${title}: ${image} - ${link}`,
          images: [{ url: image }],
        },
      ],
    });
  }
}

exports.BearyChatResponder = BearyChatResponder;
