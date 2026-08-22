'strict';

const { Responder } = require('./Responder');
const { SlackResponder } = require('./implementations/SlackResponder');
const { BearyChatResponder } = require('./implementations/BearyChatResponder');
const { HipChatResponder } = require('./implementations/HipChatResponder');

// eslint-disable-next-line no-unused-vars -- imported for the @type {Uploader} JSDoc annotation below
const { Uploader } = require('./Uploader');
const { S3Uploader } = require('./implementations/S3Uploader');
const { RocketChatUploader } = require('./implementations/RocketChatUploader');
const { TelegramUploader } = require('./implementations/TelegramUploader');
const { SlackUploader } = require('./implementations/SlackUploader');

const { TypingIndicator } = require('./TypingIndicator');
const { SlackTypingIndicator } = require('./implementations/SlackTypingIndicator');

/**
 * The override responder is used to override the default responder.
 * This can be used to inject a custom responder to influence the message formatting.
 * @type {Responder|null}
 */
let overrideResponder = null;

/**
 * The Adapter will hide away platform specific details for file upload and
 * response messages. When an S3 bucket is configured, it will always take
 * precedence.
 */
class Adapter {
  /**
   * @param {Hubot.Robot} robot The robot -- TODO: let's see if we can refactor this one out.
   */
  constructor(robot) {
    /** @type {Hubot.robot} */
    this.robot = robot;

    /** @type {string} */
    this.s3_bucket = process.env.HUBOT_GRAFANA_S3_BUCKET;
  }

  /**
   * The site defines where the file should be uploaded to.
   */
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

  /**
   * The responder is responsible for sending a (platform specific) response.
   */
  /** @type {Responder} */
  get responder() {
    if (overrideResponder) {
      return overrideResponder;
    }

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

  /**
   * The responder is responsible for doing a (platform specific) upload.
   * If an upload is not supported, the method will throw an error.
   */
  /** @type {Uploader} */
  get uploader() {
    switch (this.site) {
      case 's3':
        return new S3Uploader(this.responder, this.robot.logger);
      case 'rocketchat':
        return new RocketChatUploader(this.robot, this.robot.logger);
      case 'slack':
        return new SlackUploader(this.robot, this.robot.logger);
      case 'telegram':
        return new TelegramUploader();
      default:
        throw new Error(`Upload not supported for '${this.robot.adapterName}'`);
    }
  }

  /**
   * Indicates if an upload is supported.
   * @returns {boolean}
   */
  isUploadSupported() {
    return this.site !== '';
  }

  /**
   * The typing indicator shows a (platform specific) "working" status while
   * a command is being processed. Adapters that don't support this no-op.
   */
  /** @type {TypingIndicator} */
  get typingIndicator() {
    if (/slack/i.test(this.robot.adapterName)) {
      return new SlackTypingIndicator(this.robot, this.robot.logger);
    }

    return new TypingIndicator();
  }
}

/**
 * Overrides the responder.
 * @param {Responder} responder The responder to use.
 */
exports.setResponder = function setResponder(responder) {
  overrideResponder = responder;
};

/**
 * Clears the override responder.
 */
exports.clearResponder = function clearResponder() {
  overrideResponder = null;
};

exports.Adapter = Adapter;
