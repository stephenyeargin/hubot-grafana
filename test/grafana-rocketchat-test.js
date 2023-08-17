const { expect } = require('chai');
const { createTestBot, TestBotContext } = require('./common/TestBot');

describe('rocketchat', () => {
  /** @type {TestBotContext} */
  let ctx;

  beforeEach(async () => {
    process.env.ROCKETCHAT_URL = 'http://chat.example.com';
    process.env.ROCKETCHAT_USER = 'user1';
    process.env.ROCKETCHAT_PASSWORD = 'sekret';

    ctx = await createTestBot();

    ctx
      .nock('https://play.grafana.org')
      .get('/api/dashboards/uid/97PlYC7Mk')
      .replyWithFile(200, `${__dirname}/fixtures/v8/dashboard-grafana-play.json`);

    ctx
      .nock('https://play.grafana.org')
      .defaultReplyHeaders({
        'Content-Type': 'image/png',
      })
      .get('/render/d-solo/97PlYC7Mk/')
      .query({
        panelId: 3,
        width: 1000,
        height: 500,
        from: 'now-6h',
        to: 'now',
      })
      .replyWithFile(200, `${__dirname}/fixtures/v8/dashboard-grafana-play.png`);
  });

  afterEach(() => {
    delete process.env.ROCKETCHAT_URL;
    delete process.env.ROCKETCHAT_USER;
    delete process.env.ROCKETCHAT_PASSWORD;

    ctx?.shutdown();
  });

  describe('rocketchat upload', () => {
    beforeEach(function () {
      ctx
        .nock('http://chat.example.com')
        .post('/api/v1/login')
        .replyWithFile(200, `${__dirname}/fixtures/rocketchat/login.json`);

      ctx
        .nock('http://chat.example.com')
        .post('/api/v1/rooms.upload/undefined')
        .replyWithFile(200, `${__dirname}/fixtures/rocketchat/rooms.upload.json`);
    });

    it('should respond with an uploaded graph', async () => {
      let response = await ctx.sendAndWaitForResponse('@hubot graf db 97PlYC7Mk:panel-3');
      expect(response).to.eql(
        'logins: https://play.grafana.org/render/d-solo/97PlYC7Mk/?panelId=3&width=1000&height=500&from=now-6h&to=now - https://play.grafana.org/d/97PlYC7Mk/?panelId=3&fullscreen&from=now-6h&to=now'
      );
    });
  });

  describe('rocketchat and s3', () => {
    beforeEach(() => {
      process.env.HUBOT_GRAFANA_S3_BUCKET = 'graf';
    });

    afterEach(() => {
      delete process.env.HUBOT_GRAFANA_S3_BUCKET;
    });

    it('should respond with an uploaded graph', async () => {
      ctx
        .nock('https://graf.s3.us-east-2.amazonaws.com')
        .filteringPath(/[a-z0-9]+\.png/g, 'abdcdef0123456789.png')
        .put('/grafana/abdcdef0123456789.png')
        .query({ 'x-id': 'PutObject' })
        .reply(200);

      let response = await ctx.sendAndWaitForResponse('@hubot graf db 97PlYC7Mk:panel-3');
      response = response.replace(/\/[a-f0-9]{40}\.png/i, '/abdcdef0123456789.png');
      expect(response).to.eql(
        'logins: https://play.grafana.org/render/d-solo/97PlYC7Mk/?panelId=3&width=1000&height=500&from=now-6h&to=now - https://play.grafana.org/d/97PlYC7Mk/?panelId=3&fullscreen&from=now-6h&to=now'
      );
    });
  });
});
