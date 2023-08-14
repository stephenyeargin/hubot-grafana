'strict';

const { post } = require('../../http');
const { Uploader } = require('../Uploader');

class SlackUploader extends Uploader {
  /**
   *
   * @param {Hubot.Robot} robot the robot, TODO: let's see if we can refactor it out!
   * @param {Hubot.Log} logger the logger
   */
  constructor(robot, logger) {
    super();

    /** @type {boolean} */
    this.use_threads = process.env.HUBOT_GRAFANA_USE_THREADS || false;

    /** @type {string} */
    this.slack_token = process.env.HUBOT_SLACK_TOKEN;

    /** @type {Hubot.Robot} */
    this.robot = robot;

    /** @type {Hubot.Log} */
    this.logger = logger;
  }

  /**
   * Uploads the a screenshot of the dashboards.
   *
   * @param {Hubot.Response} res the context.
   * @param {string} title the title of the dashboard.
   * @param {({ body: Buffer, contentType: string})=>void} grafanaDashboardRequest request for getting the screenshot.
   * @param {string} grafanaChartLink link to the Grafana chart.
   */
  upload(res, title, grafanaDashboardRequest, grafanaChartLink) {
    const testAuthData = {
      url: 'https://slack.com/api/auth.test',
      formData: {
        token: this.slack_token,
      },
    };

    // We test auth against slack to obtain the team URL
    return post(this.robot, testAuthData, (err, slackResBodyJson) => {
      if (err) {
        this.logger.error(err);
        res.send(`${title} - [Slack auth.test Error - invalid token/can't fetch team url] - ${grafanaChartLink}`);
        return;
      }
      const slack_url = slackResBodyJson.url;

      // fill in the POST request. This must be www-form/multipart
      const uploadData = {
        url: `${slack_url.replace(/\/$/, '')}/api/files.upload`,
        formData: {
          title: `${title}`,
          channels: res.envelope.room,
          token: this.slack_token,
          // grafanaDashboardRequest() is the method that downloads the .png
          file: grafanaDashboardRequest(),
          filetype: 'png',
        },
      };

      // Post images in thread if configured
      if (this.use_threads) {
        uploadData.formData.thread_ts = res.message.rawMessage.ts;
      }

      // Try to upload the image to slack else pass the link over
      return post(this.robot, uploadData, (err, res) => {
        // Error logging, we must also check the body response.
        // It will be something like: { "ok": <boolean>, "error": <error message> }
        if (err) {
          this.logger.error(err);
          return res.send(`${title} - [Upload Error] - ${grafanaChartLink}`);
        }
        if (!res.ok) {
          this.logger.error(`Slack service error while posting data:${res.error}`);
          return res.send(`${title} - [Form Error: can't upload file] - ${grafanaChartLink}`);
        }
      });
    });
  }
}

exports.SlackUploader = SlackUploader;
