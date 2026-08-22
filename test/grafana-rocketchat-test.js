const { expect } = require('chai');
const { createTestBot, TestBotContext } = require('./common/TestBot');

describe('rocketchat', () => {
  describe('rocketchat upload', () => {
    /** @type {TestBotContext} */
    let ctx;

    beforeEach(async () => {
      process.env.ROCKETCHAT_URL = 'http://chat.example.com';
      process.env.ROCKETCHAT_USER = 'user1';
      process.env.ROCKETCHAT_PASSWORD = 'sekret';

      ctx = await createTestBot({
        adapterName: 'hubot-rocketchat',
      });

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

    it('uploads the rendered dashboard to RocketChat', async () => {
      ctx
        .nock('http://chat.example.com')
        .post('/api/v1/login')
        .replyWithFile(200, `${__dirname}/fixtures/rocketchat/login.json`);

      const uploadRequest = ctx.createAwaitableValue();
      ctx
        .nock('http://chat.example.com')
        .post('/api/v1/rooms.upload/undefined')
        .reply(function reply(uri, requestBody) {
          uploadRequest.set(requestBody, this.req.headers);
          return [200, { success: true }];
        });

      await ctx.send('@hubot graf db 97PlYC7Mk:panel-3');
      const [rawRequestBody] = await uploadRequest;
      const requestBody = Buffer.from(rawRequestBody, 'hex').toString('utf8');

      // Verify a real multipart body was sent (this is what new FormData(formData)
      // could never actually produce -- it threw before a request was ever made).
      expect(requestBody).to.include('name="msg"');
      expect(requestBody).to.include(
        'logins: https://play.grafana.org/d/97PlYC7Mk/?panelId=3&fullscreen&from=now-6h&to=now'
      );
      expect(requestBody).to.include('name="file"');
      expect(requestBody).to.include('filename="logins');
    });

    it('reports an authentication failure without crashing', async () => {
      ctx
        .nock('http://chat.example.com')
        .post('/api/v1/login')
        .reply(200, { status: 'error', message: 'Bad credentials' });

      const response = await ctx.sendAndWaitForResponse('@hubot graf db 97PlYC7Mk:panel-3');
      expect(response).to.eql(
        'logins - [Rocketchat auth Error - Bad credentials] - https://play.grafana.org/d/97PlYC7Mk/?panelId=3&fullscreen&from=now-6h&to=now'
      );
    });
  });

  describe('rocketchat and s3', () => {
    /** @type {TestBotContext} */
    let ctx;

    beforeEach(async () => {
      process.env.ROCKETCHAT_URL = 'http://chat.example.com';
      process.env.ROCKETCHAT_USER = 'user1';
      process.env.ROCKETCHAT_PASSWORD = 'sekret';
      process.env.HUBOT_GRAFANA_S3_BUCKET = 'graf';

      ctx = await createTestBot({
        adapterName: 'hubot-rocketchat',
      });

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
      delete process.env.HUBOT_GRAFANA_S3_BUCKET;

      ctx?.shutdown();
    });

    it('should respond with an uploaded graph', async () => {
      ctx
        .nock('https://graf.s3.us-standard.amazonaws.com')
        .filteringPath(/[a-z0-9]+\.png/g, 'abdcdef0123456789.png')
        .put('/grafana/abdcdef0123456789.png')
        .query({ 'x-id': 'PutObject' })
        .reply(200);

      let response = await ctx.sendAndWaitForResponse('@hubot graf db 97PlYC7Mk:panel-3');
      response = response.replace(/\/[a-f0-9]{40}\.png/i, '/abdcdef0123456789.png');
      expect(response).to.eql(
        'logins: https://graf.s3.us-standard.amazonaws.com/grafana/abdcdef0123456789.png - https://play.grafana.org/d/97PlYC7Mk/?panelId=3&fullscreen&from=now-6h&to=now'
      );
    });
  });
});
