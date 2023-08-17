'strict';

const { Uploader } = require('../Uploader');
const { Responder } = require('../Responder');

class SlackUploader extends Uploader {
  /**
   *
   * @param {Hubot.Robot} robot the robot, TODO: let's see if we can refactor it out!
   * @param {Hubot.Log} logger the logger
   * @param {Responder} responder the responder, called when the upload completes
   */
  constructor(robot, logger, responder) {
    super();

    /** @type {boolean} */
    this.use_threads = process.env.HUBOT_GRAFANA_USE_THREADS || false;

    /** @type {Hubot.Robot} */
    this.robot = robot;

    /** @type {Hubot.Log} */
    this.logger = logger;

    /** @type {Responder} */
    this.responder = responder;
  }

  //this.robot.adapter.client.web

  /**
   * Uploads the a screenshot of the dashboards.
   *
   * @param {Hubot.Response} res the context.
   * @param {string} title the title of the dashboard.
   * @param {{ body: Buffer, contentType: string}} file file with the screenshot.
   * @param {string} grafanaChartLink link to the Grafana chart.
   */
  async upload(res, title, file, grafanaChartLink) {
    const thread_ts = this.use_threads ? res.message.rawMessage.ts : null;
    const channel = res.envelope.room;

    try {
      let options = {
        filename: title + '.png',
        file: Buffer.from(file.body),
        title: 'dashboard',
        initial_comment: `${title}: ${grafanaChartLink}`,
        thread_ts: thread_ts,
        channels: channel,
      };

      await this.robot.adapter.client.web.files.uploadV2(options);
    } catch (err) {
      this.logger.error(err, 'SlackUploader.upload.uploadFile');
      res.send(`${title} - [Slack files.upload Error: can't upload file] - ${grafanaChartLink}`);
    }
  }
}

exports.SlackUploader = SlackUploader;
