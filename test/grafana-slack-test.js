const { expect } = require('chai');
const { createTestBot, TestBotContext, createAwaitableValue } = require('./common/TestBot');
const { SlackResponder } = require('../src/adapters/implementations/SlackResponder');
const { SlackUploader } = require('../src/adapters/implementations/SlackUploader');
const { overrideResponder, clearOverrideResponder } = require('../src/adapters/Adapter');
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
      send(res, title, image, link) {
        res.send('Hiding dashboard: ' + title);
      }
    }

    /** @type {TestBotContext} */
    let ctx;

    beforeEach(async () => {
      overrideResponder(new CustomResponder());
      process.env.HUBOT_GRAFANA_S3_BUCKET = 'graf';
      ctx = await createTestBot({
        adapterName: 'hubot-slack',
      });
    });

    afterEach(function () {
      delete process.env.HUBOT_GRAFANA_S3_BUCKET;
      ctx?.shutdown();
      clearOverrideResponder();
    });

    it('should respond with an uploaded graph', async () => {
      let response = await ctx.sendAndWaitForResponse('@hubot graf db 97PlYC7Mk:panel-3');
      expect(response).to.eql('Hiding dashboard: logins');
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
      let response = await ctx.sendAndWaitForResponse('@hubot graf db 97PlYC7Mk:panel-3');

      expect(response).to.be.a('object');
      expect(response).to.have.property('attachments');
      expect(response.unfurl_links).to.eql(false);

      expect(response.attachments).to.have.lengthOf(1);
      expect(response.attachments[0].title).to.eql('logins');
      expect(response.attachments[0].title_link).to.eql(
        'https://play.grafana.org/d/97PlYC7Mk/?panelId=3&fullscreen&from=now-6h&to=now'
      );
      expect(response.attachments[0]).to.have.property('title_link');
      expect(response.attachments[0]).to.have.property('fallback');
      expect(response.attachments[0]).to.have.property('image_url');

      let imageUrl = response.attachments[0].image_url || '';
      imageUrl = imageUrl.replace(/\/[a-f0-9]{40}\.png/i, '/abdcdef0123456789.png');
      expect(imageUrl).to.eql('https://graf.s3.us-standard.amazonaws.com/grafana/abdcdef0123456789.png');
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
      let response = await ctx.sendAndWaitForResponse('@hubot graf db 97PlYC7Mk:panel-3');
      expect(response).to.eql(
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
      let responder = new SlackResponder();
      let resSendResponse = createAwaitableValue();

      let res = {
        message: {
          rawMessage: {
            ts: 42,
          },
        },
        send: resSendResponse.set,
      };

      let title = 'logins';
      let imageUrl = 'https://graf.s3.us-standard.amazonaws.com/grafana/abdcdef0123456789.png';
      let dashboardUrl = 'https://play.grafana.org/d/97PlYC7Mk/?panelId=3&fullscreen&from=now-6h&to=now';

      responder.send(res, title, imageUrl, dashboardUrl);

      let response = await resSendResponse;
      response = response[0];

      expect(response).to.be.a('object');
      expect(response).to.have.property('attachments');
      expect(response.unfurl_links).to.eql(false);
      expect(response.thread_ts).to.eql(42);

      expect(response.attachments).to.have.lengthOf(1);
      expect(response.attachments[0].title).to.eql(title);
      expect(response.attachments[0].title_link).to.eql(dashboardUrl);
      expect(response.attachments[0]).to.have.property('title_link');
      expect(response.attachments[0]).to.have.property('fallback');
      expect(response.attachments[0]).to.have.property('image_url');

      expect(response.attachments[0].image_url).to.eql(imageUrl);
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
      let response = await uploadResult;

      expect(response).not.to.be.null;
      expect(response).to.be.of.length(1);
      expect(response[0].initial_comment).to.eql(
        'logins: https://play.grafana.org/d/97PlYC7Mk/?panelId=3&fullscreen&from=now-6h&to=now'
      );
      expect(response[0].channels).to.eql('#mocha');
      expect(response[0].title).to.equal('dashboard');
      expect(response[0].filename).to.eql('logins.png');
      expect(response[0].file).not.to.be.null;
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
      let response = await ctx.sendAndWaitForResponse('@hubot graf db 97PlYC7Mk:panel-3');
      expect(response).to.eql(
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
      let uploadResult = createAwaitableValue();

      let robot = {
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

      let res = {
        message: {
          rawMessage: {
            ts: 42,
          },
        },
        envelope: {
          room: 'C1337',
        },
      };

      let uploader = new SlackUploader(robot, robot.logger);
      let title = 'logins';
      let dashboardUrl = 'https://play.grafana.org/d/97PlYC7Mk/?panelId=3&fullscreen&from=now-6h&to=now';

      await uploader.upload(
        res,
        title,
        {
          body: Buffer.from('Hello world!'),
          contentType: 'plain/txt',
        },
        dashboardUrl
      );

      let response = await uploadResult;

      expect(response).not.to.be.null;
      expect(response).to.be.of.length(1);
      expect(response[0].initial_comment).to.eql(
        'logins: https://play.grafana.org/d/97PlYC7Mk/?panelId=3&fullscreen&from=now-6h&to=now'
      );
      expect(response[0].thread_ts).to.eql(42);
      expect(response[0].channels).to.eql('C1337');
      expect(response[0].title).to.equal('dashboard');
      expect(response[0].filename).to.eql(title + '.png');
      expect(response[0].file).not.to.be.null;
    });
  });
});
