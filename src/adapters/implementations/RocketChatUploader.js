'strict';
const { post } = require('../../http');
const { Uploader } = require('../Uploader');

class RocketChatUploader extends Uploader {
  /**
   * Creates a new instance.
   * @param {Hubot.Robot} robot the robot, TODO: let's see if we can refactor it out!
   * @param {Hubot.Log} logger the logger
   */
  constructor(robot, logger) {
    super();

    /** @type {string} */
    this.rocketchat_user = process.env.ROCKETCHAT_USER;

    /** @type {string} */
    this.rocketchat_password = process.env.ROCKETCHAT_PASSWORD;

    /** @type {string} */
    this.rocketchat_url = process.env.ROCKETCHAT_URL;

    if (this.rocketchat_url && !this.rocketchat_url.startsWith('http')) {
      this.rocketchat_url = `http://${rocketchat_url}`;
    }

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
    const authData = {
      url: `${this.rocketchat_url}/api/v1/login`,
      form: {
        username: this.rocketchat_user,
        password: this.rocketchat_password,
      },
    };

    // We auth against rocketchat to obtain the auth token
    return post(robot, authData, (err, rocketchatResBodyJson) => {
      if (err) {
        this.logger.error(err);
        res.send(`${title} - [Rocketchat auth Error - invalid url, user or password/can't access rocketchat api] - ${grafanaChartLink}`);
        return;
      }
      let errMsg;
      const { status } = rocketchatResBodyJson;
      if (status !== 'success') {
        errMsg = rocketchatResBodyJson.message;
        this.logger.error(errMsg);
        res.send(`${title} - [Rocketchat auth Error - ${errMsg}] - ${grafanaChartLink}`);
        return;
      }

      const auth = rocketchatResBodyJson.data;

      // fill in the POST request. This must be www-form/multipart
      const uploadData = {
        url: `${this.rocketchat_url}/api/v1/rooms.upload/${res.envelope.user.roomID}`,
        headers: {
          'X-Auth-Token': auth.authToken,
          'X-User-Id': auth.userId,
        },
        formData: {
          msg: `${title}: ${grafanaChartLink}`,
          // grafanaDashboardRequest() is the method that downloads the .png
          file: {
            value: grafanaDashboardRequest(),
            options: {
              filename: `${title} ${Date()}.png`,
              contentType: 'image/png',
            },
          },
        },
      };

      // Try to upload the image to rocketchat else pass the link over
      return post(this.robot, uploadData, (err, body) => {
        // Error logging, we must also check the body response.
        // It will be something like: { "success": <boolean>, "error": <error message> }
        if (err) {
          this.logger.error(err);
          return res.send(`${title} - [Upload Error] - ${grafanaChartLink}`);
        }
        if (!body.success) {
          errMsg = body.error;
          this.logger.error(`rocketchat service error while posting data:${errMsg}`);
          return res.send(`${title} - [Form Error: can't upload file : ${errMsg}] - ${grafanaChartLink}`);
        }
      });
    });
  }
}

exports.RocketChatUploader = RocketChatUploader;
