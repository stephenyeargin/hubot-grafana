'strict';
const { Responder } = require("./Responder");

class SlackResponder extends Responder {
  constructor() {
    super();

    /** @type {boolean} */
    this.use_threads = process.env.HUBOT_GRAFANA_USE_THREADS || false;
  }

  /**
   * Sends the response to Hubot.
   * @param {Hubot.Response} res the context.
   * @param {string} title the title of the message
   * @param {string} image the URL of the image
   * @param {string} link the title of the link
   */
  send(res, title, image, link) {
    if (this.use_threads) {
      res.message.thread_ts = res.message.rawMessage.ts;
    }

    res.send({
      attachments: [
        {
          fallback: `${title}: ${image} - ${link}`,
          title,
          title_link: link,
          image_url: image,
        },
      ],
      unfurl_links: false,
    });
  }
}

exports.SlackResponder = SlackResponder;
