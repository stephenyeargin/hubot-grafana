'strict';
class Responder {
  /**
   * Sends the response to Hubot.
   * @param {Hubot.Response} res the context.
   * @param {string} title the title of the message
   * @param {string} image the URL of the image
   * @param {string} link the title of the link
   */
  send(res, title, image, link) {
    res.send(`${title}: ${image} - ${link}`);
  }
}

exports.Responder = Responder;
