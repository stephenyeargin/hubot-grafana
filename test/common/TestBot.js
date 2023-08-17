const { Robot, TextMessage } = require('hubot/es2015');
const nock = require('nock');
const grafanaScript = require('../../src/grafana');

class TestBotContext {
  replies = [];
  sends = [];

  constructor(robot, user) {
    this.robot = robot;
    this.user = user;
    this.robot.adapter.on('reply', (_, strings) => {
      this.replies.push(strings.join('\n'));
    });

    this.robot.adapter.on('send', (_, strings) => {
      this.sends.push(strings.join('\n'));
    });

    this.nock = nock;
  }

  async sendAndWaitForResponse(message, responseType = 'send') {
    return new Promise((done) => {
      this.robot.adapter.once(responseType, function (_, strings) {
        done(strings[0]);
      });

      this.send(message);
    });
  }

  async send(message) {
    const id = (Math.random() + 1).toString(36).substring(7);
    const textMessage = new TextMessage(this.user, message, id);
    this.robot.adapter.receive(textMessage);
    await this.wait(1);
  }

  createAwaitableValue() {
    return createAwaitableValue();
  }

  async wait(ms) {
    return new Promise((done) => {
      setTimeout(() => done(), ms);
    });
  }

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
 * @returns {Promise<any[]> & { set<any[]>(...value:any[]):void }}
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

function setupEnv(settings) {
  process.env.HUBOT_LOG_LEVEL = settings?.logLevel || 'silent';
  process.env.HUBOT_GRAFANA_HOST = 'https://play.grafana.org';
  process.env.HUBOT_GRAFANA_API_KEY = 'xxxxxxxxxxxxxxxxxxxxxxxxx';
  process.env.HUBOT_SLACK_TOKEN = 'foobarbaz';

  process.env.AWS_ACCESS_KEY_ID = 'key_id';
  process.env.AWS_SECRET_ACCESS_KEY = 'secret_key';

  process.env.NODE_ENV = 'test';

  nock.cleanAll();
}

function setupNock() {
  nock('https://play.grafana.org')
    .get('/render/d-solo/97PlYC7Mk/?panelId=3&width=1000&height=500&from=now-6h&to=now')
    .replyWithFile(200, `${__dirname}/../fixtures/v8/dashboard-grafana-play.png`);

  nock('https://graf.s3.us-west-2.amazonaws.com')
    .filteringPath(/[a-z0-9]+\.png/g, 'abdcdef0123456789.png')
    .put('/grafana/abdcdef0123456789.png')
    .query({ 'x-id': 'PutObject' })
    .reply(200);

  nock('https://graf.s3.us-standard.amazonaws.com')
    .filteringPath(/[a-z0-9]+\.png/g, 'abdcdef0123456789.png')
    .put('/grafana/abdcdef0123456789.png')
    .query({ 'x-id': 'PutObject' })
    .times(3)
    .reply(200);

  nock('https://play.grafana.org')
    .get('/api/dashboards/uid/97PlYC7Mk')
    .replyWithFile(200, `${__dirname}/../fixtures/v8/dashboard-grafana-play.json`);

  nock.disableNetConnect();
}

async function createTestBot(settings = null) {
  setupEnv(settings);
  setupNock();

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
