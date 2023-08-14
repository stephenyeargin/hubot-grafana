'strict';

const { BearyChatResponder } = require("./adapters/BearyChatResponder");
const { HipChatResponder } = require("./adapters/HipChatResponder");
const { Responder } = require("./adapters/Responder");
const { SlackResponder } = require("./adapters/SlackResponder");

class Adapter {
  /**
   * @param {Hubot.Robot} robot
   */
  constructor(robot) {
    /** @type {Hubot.robot} */
    this.robot = robot;

    /** @type {stirng} */
    this.s3_bucket = process.env.HUBOT_GRAFANA_S3_BUCKET;
  }

  get site() {
    // prioritize S3 if configured
    if (this.s3_bucket) {
      return 's3';
    }
    if (/slack/i.test(this.robot.adapterName)) {
      return 'slack';
    }
    if (/rocketchat/i.test(this.robot.adapterName)) {
      return 'rocketchat';
    }
    if (/telegram/i.test(this.robot.adapterName)) {
      return 'telegram';
    }
    return '';
  }

  get responder() {
    if (/slack/i.test(this.robot.adapterName)) {
      return new SlackResponder();
    }
    if (/hipchat/i.test(this.robot.adapterName)) {
      return new HipChatResponder();
    }
    if (/bearychat/i.test(this.robot.adapterName)) {
      return new BearyChatResponder();
    }

    return new Responder();
  }
}

module.exports = {
  Adapter,
};
