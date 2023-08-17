const chai = require('chai');
const { expect } = chai;
const { createTestBot, TestBotContext, createAwaitableValue } = require('./common/TestBot');
const { Response } = require('hubot/src/response');
const { TelegramUploader } = require('../src/adapters/implementations/TelegramUploader');

describe('telegram', () => {
  describe('and s3 upload', () => {
    /** @type {TestBotContext} */
    let ctx;

    beforeEach(async () => {
      process.env.HUBOT_GRAFANA_S3_BUCKET = 'graf';
      ctx = await createTestBot({
        adapterName: 'hubot-telegram',
      });
    });

    afterEach(function () {
      delete process.env.HUBOT_GRAFANA_S3_BUCKET;
      ctx?.shutdown();
    });

    it('should respond with an uploaded graph', async () => {
      let response = await ctx.sendAndWaitForResponse('@hubot graf db 97PlYC7Mk:panel-3');
      response = response.replace(/\/[a-f0-9]{40}\.png/i, '/abdcdef0123456789.png');
      expect(response).to.eql(
        'logins: https://graf.s3.us-standard.amazonaws.com/grafana/abdcdef0123456789.png - https://play.grafana.org/d/97PlYC7Mk/?panelId=3&fullscreen&from=now-6h&to=now'
      );
    });
  });

  describe('and Telegram upload', () => {
    // We test the uploader, because it is hard
    // to Mock the Response object.

    it('should respond with an uploaded graph', async () => {
      let uploader = new TelegramUploader();
      let sendPhotoResult = createAwaitableValue();
      let res = {
        sendPhoto: function () {
          sendPhotoResult.done(arguments);
        },
        envelope: {
          room: '#mocha',
        },
      };

      uploader.upload(
        res,
        'My title',
        {
          body: Buffer.from('Hello world!'),
          contentType: 'plain/txt',
        },
        'https://play.grafana.org/d/97PlYC7Mk/?panelId=3&fullscreen&from=now-6h&to=now'
      );

      var result = await sendPhotoResult;

      expect(result).to.be.of.length(3);
      expect(result[0]).to.eql('#mocha');
      expect(result[2].caption).to.eql(
        'My title: https://play.grafana.org/d/97PlYC7Mk/?panelId=3&fullscreen&from=now-6h&to=now'
      );
    });
  });
});
