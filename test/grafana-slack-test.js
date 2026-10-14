const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { createTestBot, createAwaitableValue } = require('./common/TestBot');
/** @typedef {import('./common/TestBot').TestBotContext} TestBotContext */
const { SlackResponder } = require('../src/adapters/implementations/SlackResponder');
const { SlackUploader } = require('../src/adapters/implementations/SlackUploader');
const { setResponder, clearResponder } = require('../src/adapters/Adapter');
const { Responder } = require('../src/adapters/Responder');

describe('slack', () => {
  describe('and override responder upload', () => {
    class CustomResponder extends Responder {
      /**
       * Sends the response to Hubot.
       * @param {Hubot.Response} res the context.
       * @param {string} title the title of the message
       * @param {string} image the URL of the image
       * @param {string} link the title of the link
       */
      send(res, title) {
        res.send('Hiding dashboard: ' + title);
      }
    }

    /** @type {TestBotContext} */
    let ctx;

    beforeEach(async () => {
      setResponder(new CustomResponder());
      process.env.HUBOT_GRAFANA_S3_BUCKET = 'graf';
      ctx = await createTestBot({
        adapterName: 'hubot-slack',
      });
    });

    afterEach(function () {
      delete process.env.HUBOT_GRAFANA_S3_BUCKET;
      clearResponder();
      ctx?.shutdown();
    });

    it('should respond with an uploaded graph', async () => {
      const response = await ctx.sendAndWaitForResponse('@hubot graf db 97PlYC7Mk:panel-3');
      assert.equal(response, 'Hiding dashboard: logins');
    });
  });

  describe('and s3 upload', () => {
    /** @type {TestBotContext} */
    let ctx;

    beforeEach(async () => {
      process.env.HUBOT_GRAFANA_S3_BUCKET = 'graf';
      ctx = await createTestBot({
        adapterName: 'hubot-slack',
      });
    });

    afterEach(function () {
      delete process.env.HUBOT_GRAFANA_S3_BUCKET;
      ctx?.shutdown();
    });

    it('should respond with an uploaded graph', async () => {
      const response = await ctx.sendAndWaitForResponse('@hubot graf db 97PlYC7Mk:panel-3');

      assert.notEqual(response, null);
      assert.equal(typeof response, 'object');
      assert.ok('attachments' in response);
      assert.equal(response.unfurl_links, false);

      assert.equal(response.attachments.length, 1);
      assert.equal(response.attachments[0].title, 'logins');
      assert.equal(response.attachments[0].title_link,
        'https://play.grafana.org/d/97PlYC7Mk/?panelId=3&fullscreen&from=now-6h&to=now'
      );
      assert.ok('title_link' in response.attachments[0]);
      assert.ok('fallback' in response.attachments[0]);
      assert.ok('image_url' in response.attachments[0]);

      let imageUrl = response.attachments[0].image_url || '';
      imageUrl = imageUrl.replace(/\/[a-f0-9]{40}\.png/i, '/abdcdef0123456789.png');
      assert.equal(imageUrl, 'https://graf.s3.us-standard.amazonaws.com/grafana/abdcdef0123456789.png');
    });
  });

  describe('and s3 upload fail', () => {
    /** @type {TestBotContext} */
    let ctx;

    beforeEach(async () => {
      process.env.HUBOT_GRAFANA_S3_BUCKET = 'graf';
      ctx = await createTestBot({
        adapterName: 'hubot-slack',
        s3UploadStatusCode: 403,
      });
    });

    afterEach(function () {
      delete process.env.HUBOT_GRAFANA_S3_BUCKET;
      ctx?.shutdown();
    });

    it('should respond with an uploaded graph', async () => {
      const response = await ctx.sendAndWaitForResponse('@hubot graf db 97PlYC7Mk:panel-3');
      assert.equal(response,
        'logins - [Upload Error] - https://play.grafana.org/d/97PlYC7Mk/?panelId=3&fullscreen&from=now-6h&to=now'
      );
    });
  });

  describe('and respond in thread', () => {
    beforeEach(function () {
      process.env.HUBOT_GRAFANA_USE_THREADS = 1;
    });

    afterEach(function () {
      delete process.env.HUBOT_GRAFANA_USE_THREADS;
    });

    it('with threaded message', async () => {
      const responder = new SlackResponder();
      const resSendResponse = createAwaitableValue();

      const res = {
        message: {
          rawMessage: {
            ts: 42,
          },
        },
        send: resSendResponse.set,
      };

      const title = 'logins';
      const imageUrl = 'https://graf.s3.us-standard.amazonaws.com/grafana/abdcdef0123456789.png';
      const dashboardUrl = 'https://play.grafana.org/d/97PlYC7Mk/?panelId=3&fullscreen&from=now-6h&to=now';

      responder.send(res, title, imageUrl, dashboardUrl);

      let response = await resSendResponse;
      response = response[0];

      assert.notEqual(response, null);
      assert.equal(typeof response, 'object');
      assert.ok('attachments' in response);
      assert.equal(response.unfurl_links, false);
      assert.equal(response.thread_ts, 42);

      assert.equal(response.attachments.length, 1);
      assert.equal(response.attachments[0].title, title);
      assert.equal(response.attachments[0].title_link, dashboardUrl);
      assert.ok('title_link' in response.attachments[0]);
      assert.ok('fallback' in response.attachments[0]);
      assert.ok('image_url' in response.attachments[0]);

      assert.equal(response.attachments[0].image_url, imageUrl);
    });
  });

  describe('and Slack upload', () => {
    /** @type {TestBotContext} */
    let ctx;
    let uploadResult;

    beforeEach(async () => {
      ctx = await createTestBot({
        adapterName: 'hubot-slack',
      });

      uploadResult = ctx.createAwaitableValue();

      ctx.robot.adapter.client = {
        web: {
          files: {
            uploadV2: uploadResult.set,
          },
        },
      };
    });

    afterEach(function () {
      ctx?.shutdown();
    });

    it('should respond with an uploaded graph', async () => {
      await ctx.send('@hubot graf db 97PlYC7Mk:panel-3');
      const response = await uploadResult;

      assert.notEqual(response, null);
      assert.equal(response.length, 1);
      assert.equal(response[0].initial_comment,
        'logins: https://play.grafana.org/d/97PlYC7Mk/?panelId=3&fullscreen&from=now-6h&to=now'
      );
      assert.equal(response[0].channels, '#mocha');
      assert.equal(response[0].title, 'dashboard');
      assert.equal(response[0].filename, 'logins.png');
      assert.notEqual(response[0].file, null);
    });
  });

  describe('and Slack upload with fail', () => {
    /** @type {TestBotContext} */
    let ctx;

    beforeEach(async () => {
      ctx = await createTestBot({
        adapterName: 'hubot-slack',
      });

      ctx.robot.adapter.client = {
        web: {
          files: {
            uploadV2: () => {
              throw new Error('Fail');
            },
          },
        },
      };
    });

    afterEach(function () {
      ctx?.shutdown();
    });

    it('should respond with an failed message ', async () => {
      const response = await ctx.sendAndWaitForResponse('@hubot graf db 97PlYC7Mk:panel-3');
      assert.equal(response,
        "logins - [Slack files.upload Error: can't upload file] - https://play.grafana.org/d/97PlYC7Mk/?panelId=3&fullscreen&from=now-6h&to=now"
      );
    });
  });

  describe('and Slack upload in thread', () => {
    beforeEach(function () {
      process.env.HUBOT_GRAFANA_USE_THREADS = 1;
    });

    afterEach(function () {
      delete process.env.HUBOT_GRAFANA_USE_THREADS;
    });

    it('should respond with a threaded message', async () => {
      const uploadResult = createAwaitableValue();

      const robot = {
        adapter: {
          client: {
            web: {
              files: {
                uploadV2: uploadResult.set,
              },
            },
          },
        },
        logger: {
          info: () => {},
          error: () => {},
          debug: () => {},
        },
      };

      const res = {
        message: {
          rawMessage: {
            ts: 42,
          },
        },
        envelope: {
          room: 'C1337',
        },
      };

      const uploader = new SlackUploader(robot, robot.logger);
      const title = 'logins';
      const dashboardUrl = 'https://play.grafana.org/d/97PlYC7Mk/?panelId=3&fullscreen&from=now-6h&to=now';

      await uploader.upload(
        res,
        title,
        {
          body: Buffer.from('Hello world!'),
          contentType: 'plain/txt',
        },
        dashboardUrl
      );

      const response = await uploadResult;

      assert.notEqual(response, null);
      assert.equal(response.length, 1);
      assert.equal(response[0].initial_comment,
        'logins: https://play.grafana.org/d/97PlYC7Mk/?panelId=3&fullscreen&from=now-6h&to=now'
      );
      assert.equal(response[0].thread_ts, 42);
      assert.equal(response[0].channels, 'C1337');
      assert.equal(response[0].title, 'dashboard');
      assert.equal(response[0].filename, title + '.png');
      assert.notEqual(response[0].file, null);
    });
  });
});
