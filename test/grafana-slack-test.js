const chai = require('chai');
const { expect } = chai;
const { createTestBot, TestBotContext } = require('./common/TestBot');

describe('slack', () => {
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
            uploadV2(args) {
              uploadResult.done(args);
            },
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
      expect(response.initial_comment).to.eql(
        'logins: https://play.grafana.org/d/97PlYC7Mk/?panelId=3&fullscreen&from=now-6h&to=now'
      );
      expect(response.channels).to.eql('#mocha');
      expect(response.title).to.equal('dashboard');
      expect(response.filename).to.eql('logins.png');
      expect(response.file).not.to.be.null;
    });
  });
});
