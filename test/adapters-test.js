const { Adapter } = require('../src/adapters/Adapter');
const { Uploader } = require('../src/adapters/Uploader');
const { expect } = require('chai');
const { SlackUploader } = require('../src/adapters/implementations/SlackUploader');
const { createTestBot, TestBotContext } = require('./common/TestBot');
const { SlackResponder } = require('../src/adapters/implementations/SlackResponder');
const { TelegramUploader } = require('../src/adapters/implementations/TelegramUploader');
const { S3Uploader } = require('../src/adapters/implementations/S3Uploader');
const { BearyChatResponder } = require('../src/adapters/implementations/BearyChatResponder');
const { HipChatResponder } = require('../src/adapters/implementations/HipChatResponder');
const { Responder } = require('../src/adapters/Responder');
const { RocketChatUploader } = require('../src/adapters/implementations/RocketChatUploader');

describe('adapter', () => {
  it('Uploader class cannot upload', function () {
    let uploader = new Uploader();
    expect(function () {
      uploader.upload();
    }).to.throw('Not supported');
  });

  describe('uploader', () => {
    /** @type {TestBotContext} */
    let ctx;

    beforeEach(async () => {
      ctx = await createTestBot();
    });

    afterEach(function () {
      delete process.env.HUBOT_GRAFANA_S3_BUCKET;
      ctx?.shutdown();
    });

    it('should support hubot-slack adapter', () => {
      ctx.robot.adapterName = 'hubot-slack';
      const adapter = new Adapter(ctx.robot);
      expect(adapter.uploader).to.be.an.instanceOf(SlackUploader);
      expect(adapter.site).to.eql('slack');
      expect(adapter.isUploadSupported()).to.eql(true);
    });

    it('should support hubot-slack adapter, but be overridden by S3', () => {
      process.env.HUBOT_GRAFANA_S3_BUCKET = 'graf';
      ctx.robot.adapterName = 'hubot-slack';
      const adapter = new Adapter(ctx.robot);
      expect(adapter.uploader).to.be.an.instanceOf(S3Uploader);
      expect(adapter.site).to.eql('s3');
      expect(adapter.isUploadSupported()).to.eql(true);
    });

    it('should support @hubot-friends/hubot-slack', () => {
      ctx.robot.adapterName = '@hubot-friends/hubot-slack';
      const adapter = new Adapter(ctx.robot);
      expect(adapter.uploader).to.be.an.instanceOf(SlackUploader);
      expect(adapter.site).to.eql('slack');
      expect(adapter.isUploadSupported()).to.eql(true);
    });

    it('should support @hubot-friends/hubot-slack, but be overridden by S3', () => {
      process.env.HUBOT_GRAFANA_S3_BUCKET = 'graf';
      ctx.robot.adapterName = '@hubot-friends/hubot-slack';
      const adapter = new Adapter(ctx.robot);
      expect(adapter.uploader).to.be.an.instanceOf(S3Uploader);
      expect(adapter.site).to.eql('s3');
      expect(adapter.isUploadSupported()).to.eql(true);
    });

    it('should support hubot-telegram', () => {
      ctx.robot.adapterName = 'hubot-telegram';
      const adapter = new Adapter(ctx.robot);
      expect(adapter.uploader).to.be.an.instanceOf(TelegramUploader);
      expect(adapter.site).to.eql('telegram');
      expect(adapter.isUploadSupported()).to.eql(true);
    });

    it('should support hubot-telegram, but be overridden by S3', () => {
      process.env.HUBOT_GRAFANA_S3_BUCKET = 'graf';
      ctx.robot.adapterName = 'hubot-telegram';
      const adapter = new Adapter(ctx.robot);
      expect(adapter.uploader).to.be.an.instanceOf(S3Uploader);
      expect(adapter.site).to.eql('s3');
      expect(adapter.isUploadSupported()).to.eql(true);
    });

    it('should support hubot-rocketchat', () => {
      ctx.robot.adapterName = 'hubot-rocketchat';
      const adapter = new Adapter(ctx.robot);
      expect(adapter.uploader).to.be.an.instanceOf(RocketChatUploader);
      expect(adapter.site).to.eql('rocketchat');
      expect(adapter.isUploadSupported()).to.eql(true);
    });

    it('should support hubot-rocketchat, but be overridden by S3', () => {
      process.env.HUBOT_GRAFANA_S3_BUCKET = 'graf';
      ctx.robot.adapterName = 'hubot-rocketchat';
      const adapter = new Adapter(ctx.robot);
      expect(adapter.uploader).to.be.an.instanceOf(S3Uploader);
      expect(adapter.site).to.eql('s3');
      expect(adapter.isUploadSupported()).to.eql(true);
    });

    it('should not support upload for unknown adapter', () => {
      ctx.robot.adapterName = 'my-amazing-fancy-super-unknown-thingy';
      const adapter = new Adapter(ctx.robot);
      expect(function () {
        adapter.uploader;
      }).to.throw("Upload not supported for 'my-amazing-fancy-super-unknown-thingy'");
      expect(adapter.site).to.eql('');
      expect(adapter.isUploadSupported()).to.eql(false);
    });

    it('should support unknown adapter with S3 override', () => {
      process.env.HUBOT_GRAFANA_S3_BUCKET = 'graf';
      ctx.robot.adapterName = 'my-amazing-fancy-super-unknown-thingy';
      const adapter = new Adapter(ctx.robot);
      expect(adapter.uploader).to.be.an.instanceOf(S3Uploader);
      expect(adapter.site).to.eql('s3');
      expect(adapter.isUploadSupported()).to.eql(true);
    });
  });

  describe('responder', () => {
    /** @type {TestBotContext} */
    let ctx;

    beforeEach(async () => {
      ctx = await createTestBot();
    });

    afterEach(function () {
      ctx?.shutdown();
    });

    it('should support hubot-slack adapter', () => {
      ctx.robot.adapterName = 'hubot-slack';
      const adapter = new Adapter(ctx.robot);
      expect(adapter.responder).to.be.an.instanceOf(SlackResponder);
    });

    it('should support @hubot-friends/hubot-slack', () => {
      ctx.robot.adapterName = '@hubot-friends/hubot-slack';
      const adapter = new Adapter(ctx.robot);
      expect(adapter.responder).to.be.an.instanceOf(SlackResponder);
    });

    it('should support hubot-bearychat', () => {
      ctx.robot.adapterName = 'hubot-bearychat';
      const adapter = new Adapter(ctx.robot);
      expect(adapter.responder).to.be.an.instanceOf(BearyChatResponder);
    });

    it('should support hubot-hipchat', () => {
      ctx.robot.adapterName = 'hubot-hipchat';
      const adapter = new Adapter(ctx.robot);
      expect(adapter.responder).to.be.an.instanceOf(HipChatResponder);
    });

    it('should support unknown adapter with default responder', () => {
      ctx.robot.adapterName = 'my-amazing-fancy-super-unknown-thingy';
      const adapter = new Adapter(ctx.robot);
      expect(adapter.responder).to.be.an.instanceOf(Responder);
    });
  });
});
