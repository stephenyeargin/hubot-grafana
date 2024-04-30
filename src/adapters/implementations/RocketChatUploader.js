'strict';
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

    if (
      this.rocketchat_url &&
      !this.rocketchat_url.startsWith('http://') &&
      !this.rocketchat_url.startsWith('https://')
    ) {
      this.rocketchat_url = `http://${rocketchat_url}`;
    }

    /** @type {Hubot.Robot} */
    this.robot = robot;

    /** @type {Hubot.Log} */
    this.logger = logger;
  }

  /**
   * Logs in to the RocketChat API using the provided credentials.
   * @returns {Promise<{'X-Auth-Token': string, 'X-User-Id': string}>} A promise that resolves to the authentication headers if successful.
   * @throws {Error} If authentication fails.
   */
  async login() {
    const authUrl = `${this.rocketchat_url}/api/v1/login`;
    const authForm = {
      username: this.rocketchat_user,
      password: this.rocketchat_password,
    };

    let rocketchatResBodyJson = null;

    try {
      rocketchatResBodyJson = await post(authUrl, authForm);
    } catch (err) {
      this.logger.error(err);
      throw new Error('Could not authenticate.');
    }

    const { status } = rocketchatResBodyJson;
    if (status === 'success') {
      return      {
        'X-Auth-Token': rocketchatResBodyJson.data.authToken,
        'X-User-Id': rocketchatResBodyJson.data.userId,
      };
    }

    const errMsg = rocketchatResBodyJson.message;
    this.logger.error(errMsg);
    throw new Error(errMsg);
  }

  /**
   * Uploads the a screenshot of the dashboards.
   *
   * @param {Hubot.Response} res the context.
   * @param {string} title the title of the dashboard.
   * @param {{ body: Buffer, contentType: string}=>void} file the screenshot.
   * @param {string} grafanaChartLink link to the Grafana chart.
   */
  async upload(res, title, file, grafanaChartLink) {
    let authHeaders = null;
    try {
      authHeaders = await this.login();
    } catch (ex) {
      let msg = ex == 'Could not authenticate.' ? "invalid url, user or password/can't access rocketchat api" : ex;
      res.send(`${title} - [Rocketchat auth Error - ${msg}] - ${grafanaChartLink}`);
      return;
    }

    // fill in the POST request. This must be www-form/multipart
    // TODO: needs some extra testing!
    const uploadUrl = `${this.rocketchat_url}/api/v1/rooms.upload/${res.envelope.user.roomID}`;
    const uploadForm = {
      msg: `${title}: ${grafanaChartLink}`,
      // grafanaDashboardRequest() is the method that downloads the .png
      file: {
        value: file.body,
        options: {
          filename: `${title} ${Date()}.png`,
          contentType: 'image/png',
        },
      },
    };

    let body = null;

    try {
      body = await this.post(uploadUrl, uploadForm, authHeaders);
    } catch (err) {
      this.logger.error(err);
      res.send(`${title} - [Upload Error] - ${grafanaChartLink}`);
      return;
    }

    if (!body.success) {
      this.logger.error(`rocketchat service error while posting data:${body.error}`);
      return res.send(`${title} - [Form Error: can't upload file : ${body.error}] - ${grafanaChartLink}`);
    }
  }

  /**
   * Posts the data data to the specified url and returns JSON.
   * @param {string} url - the URL
   * @param {Record<string, unknown>} formData - formatData
   * @param {Record<string, string>|null} headers - formatData
   * @returns {Promise<unknown>} The deserialized JSON response or an error if something went wrong.
   */
  async post(url, formData, headers = null) {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: new FormData(formData),
    });

    if (!response.ok) {
      throw new Error('HTTP request failed');
    }

    const data = await response.json();
    return data;
  }
}

exports.RocketChatUploader = RocketChatUploader;
