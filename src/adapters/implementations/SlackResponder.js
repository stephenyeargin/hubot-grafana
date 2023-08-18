'strict';
const { Responder } = require("../Responder");

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
   * @param {string} imageUrl the URL of the image
   * @param {string} dashboardLink the title of the link
   */
  send(res, title, imageUrl, dashboardLink) {

    let thread_ts = null
    if (this.use_threads) {
      thread_ts = res.message.rawMessage.ts;
    }

    res.send({
      attachments: [
        {
          fallback: `${title}: ${imageUrl} - ${dashboardLink}`,
          title,
          title_link: dashboardLink,
          image_url: imageUrl,
        },
      ],
      unfurl_links: false,
      thread_ts: thread_ts
    });
  }
}

exports.SlackResponder = SlackResponder;
