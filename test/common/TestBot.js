const { Robot, TextMessage } = require('hubot/es2015');
const nock = require('nock');
const grafanaScript = require('../../src/grafana');
const { Bot } = require('../../src/bot');

/**
 * @typedef {Object} Settings
 * @property {string?} logLevel - The hubot log level.
 * @property {number?} s3UploadStatusCode - The s3 upload status code.
 * @property {string?} name - The name of the bot.
 * @property {string?} alias - The alias of the bot.
 * @property {string?} adapterName - The name of the adapter.
 * 
 * @typedef {Promise<unknown[]> & { set<unknown[]>(...value:unknown[]):void }} AwaitableValue
 */

class TestBotContext {
  replies = [];
  sends = [];

  /**
   * Represents a TestBot.
   * @constructor
   * @param {Hubot.Robot} robot - The robot.
   * @param {Hubot.User} user - The user.
   */
  constructor(robot, user) {

    /** @type {Hubot.Robot} */
    this.robot = robot;

    /** @type {Hubot.User} */
    this.user = user;

    this.robot.adapter.on('reply', (_, strings) => {
      this.replies.push(strings.join('\n'));
    });

    this.robot.adapter.on('send', (_, strings) => {
      this.sends.push(strings.join('\n'));
    });

    this.bot = new Bot(this.robot);

    /** @type {nock.Scope} */
    this.nock = nock;
  }

  /**
   * Sends a message and waits for a response of the specified type.
   *
   * @param {string} message - The message to send.
   * @param {string} [responseType='send'] - The type of response to wait for.
   * @returns {Promise<string>} A promise that resolves with the response string.
   */
  async sendAndWaitForResponse(message, responseType = 'send') {
    return new Promise((done) => {
      this.robot.adapter.once(responseType, function (_, strings) {
        done(strings[0]);
      });

      this.send(message);
    });
  }

  /**
   * Sends a message.
   * @param {string} message - The message to send.
   * @returns {Promise<void>} - A promise that resolves when the message is sent.
   */
  async send(message) {
    const id = (Math.random() + 1).toString(36).substring(7);
    const textMessage = new TextMessage(this.user, "" + message, id);

    if (message.rawMessage) {
      textMessage.rawMessage = message.rawMessage;
    }

    this.robot.adapter.receive(textMessage);
    await this.wait(1);
  }

  /**
   * Creates an awaitable value.
   */
  createAwaitableValue() {
    return createAwaitableValue();
  }

  /**
   * Waits for the specified number of milliseconds.
   * @param {number} ms - The number of milliseconds to wait.
   * @returns {Promise<void>} - A promise that resolves after the specified time.
   */
  async wait(ms) {
    return new Promise((done) => {
      setTimeout(() => done(), ms);
    });
  }

  /**
   * Shuts down the bot and performs necessary cleanup tasks.
   */
  shutdown() {
    // remove env setup
    delete process.env.HUBOT_LOG_LEVEL;

    delete process.env.HUBOT_GRAFANA_HOST;
    delete process.env.HUBOT_GRAFANA_API_KEY;
    delete process.env.HUBOT_SLACK_TOKEN;

    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;

    delete process.env.NODE_ENV;

    // clean up nock
    nock.cleanAll();

    // bye Hubot!
    this.robot.shutdown();
  }
}

/**
 * Creates a value that can be awaited and execute when the
 * set function is called.
 * @returns {Promise<unknown[]> & { set<unknown[]>(...value:unknown[]):void }}
 */
function createAwaitableValue() {
  let value;
  let resolve;

  const promise = new Promise((done) => {
    if (value !== undefined) {
      done(value);
      return;
    }
    resolve = done;
  });

  promise.set = function () {
    value = arguments;
    if (resolve !== undefined) {
      resolve(value);
    }
  };

  return promise;
}

/**
 * Sets up the environment variables for testing.
 * @param {Settings} settings - The settings object.
 */
function setupEnv(settings) {
  process.env.HUBOT_LOG_LEVEL = settings?.logLevel || 'silent';
  process.env.HUBOT_GRAFANA_HOST = 'https://play.grafana.org';
  process.env.HUBOT_GRAFANA_API_KEY = 'xxxxxxxxxxxxxxxxxxxxxxxxx';
  process.env.HUBOT_SLACK_TOKEN = 'foobarbaz';

  process.env.AWS_ACCESS_KEY_ID = 'key_id';
  process.env.AWS_SECRET_ACCESS_KEY = 'secret_key';

  process.env.NODE_ENV = 'test';
}

/**
 * Sets up the nock interceptors for mocking HTTP requests in the test environment.
 * @param {Settings} settings - Optional settings for customizing the behavior of the nock interceptors.
 */
function setupNock(settings) {
  nock.cleanAll();

  nock('https://play.grafana.org')
    .get('/render/d-solo/97PlYC7Mk/?panelId=3&width=1000&height=500&from=now-6h&to=now')
    .matchHeader('authorization', 'Bearer xxxxxxxxxxxxxxxxxxxxxxxxx')
    .replyWithFile(200, `${__dirname}/../fixtures/v8/dashboard-grafana-play.png`);

  nock('https://graf.s3.us-west-2.amazonaws.com')
    .filteringPath(/[a-z0-9]+\.png/g, 'abdcdef0123456789.png')
    .put('/grafana/abdcdef0123456789.png')
    .query({ 'x-id': 'PutObject' })
    .reply(settings?.s3UploadStatusCode || 200);

  nock('https://graf.s3.us-standard.amazonaws.com')
    .filteringPath(/[a-z0-9]+\.png/g, 'abdcdef0123456789.png')
    .put('/grafana/abdcdef0123456789.png')
    .query({ 'x-id': 'PutObject' })
    .times(3)
    .reply(settings?.s3UploadStatusCode || 200);

  nock('https://play.grafana.org')
    .get('/api/dashboards/uid/97PlYC7Mk')
    .matchHeader('authorization', 'Bearer xxxxxxxxxxxxxxxxxxxxxxxxx')
    .replyWithFile(200, `${__dirname}/../fixtures/v8/dashboard-grafana-play.json`);

  nock.disableNetConnect();
}

/**
 * Creates a test bot with the specified settings.
 * @param {Settings} settings - The settings for the test bot.
 * @returns {Promise<TestBotContext>} A promise that resolves to a TestBotContext object representing the created test bot.
 */
async function createTestBot(settings = null) {
  setupEnv(settings);
  setupNock(settings);

  return new Promise(async (done) => {
    // create new robot, without http, using the mock adapter
    const botName = settings?.name || 'hubot';
    const botAlias = settings?.alias || null;
    const robot = new Robot('hubot-mock-adapter', false, botName, botAlias);
    await robot.loadAdapter();

    grafanaScript(robot);

    robot.adapter.on('connected', () => {
      // create a user
      const user = robot.brain.userForId('1', {
        name: settings?.testUserName || 'mocha',
        room: '#mocha',
      });

      const context = new TestBotContext(robot, user);

      if (settings?.adapterName) {
        robot.adapterName = settings.adapterName;
      }

      done(context);
    });

    robot.run();
  });
}

module.exports = {
  createTestBot,
  TestBotContext,
  createAwaitableValue,
};
