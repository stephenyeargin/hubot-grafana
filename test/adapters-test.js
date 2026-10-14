const { describe, it, beforeEach, afterEach } = require('node:test');
const { Adapter } = require('../src/adapters/Adapter');
const { Uploader } = require('../src/adapters/Uploader');
const assert = require('node:assert/strict');
const { SlackUploader } = require('../src/adapters/implementations/SlackUploader');
const { createTestBot } = require('./common/TestBot');
/** @typedef {import('./common/TestBot').TestBotContext} TestBotContext */
const { SlackResponder } = require('../src/adapters/implementations/SlackResponder');
const { TelegramUploader } = require('../src/adapters/implementations/TelegramUploader');
const { S3Uploader } = require('../src/adapters/implementations/S3Uploader');
const { BearyChatResponder } = require('../src/adapters/implementations/BearyChatResponder');
const { HipChatResponder } = require('../src/adapters/implementations/HipChatResponder');
const { Responder } = require('../src/adapters/Responder');
const { RocketChatUploader } = require('../src/adapters/implementations/RocketChatUploader');

describe('adapter', () => {
  it('Uploader class cannot upload', function () {
    const uploader = new Uploader();
    assert.throws(function () {
      uploader.upload();
    }, /Not supported/);
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
      assert.ok(adapter.uploader instanceof SlackUploader);
      assert.equal(adapter.site, 'slack');
      assert.equal(adapter.isUploadSupported(), true);
    });

    it('should support hubot-slack adapter, but be overridden by S3', () => {
      process.env.HUBOT_GRAFANA_S3_BUCKET = 'graf';
      ctx.robot.adapterName = 'hubot-slack';
      const adapter = new Adapter(ctx.robot);
      assert.ok(adapter.uploader instanceof S3Uploader);
      assert.equal(adapter.site, 's3');
      assert.equal(adapter.isUploadSupported(), true);
    });

    it('should support @hubot-friends/hubot-slack', () => {
      ctx.robot.adapterName = '@hubot-friends/hubot-slack';
      const adapter = new Adapter(ctx.robot);
      assert.ok(adapter.uploader instanceof SlackUploader);
      assert.equal(adapter.site, 'slack');
      assert.equal(adapter.isUploadSupported(), true);
    });

    it('should support @hubot-friends/hubot-slack, but be overridden by S3', () => {
      process.env.HUBOT_GRAFANA_S3_BUCKET = 'graf';
      ctx.robot.adapterName = '@hubot-friends/hubot-slack';
      const adapter = new Adapter(ctx.robot);
      assert.ok(adapter.uploader instanceof S3Uploader);
      assert.equal(adapter.site, 's3');
      assert.equal(adapter.isUploadSupported(), true);
    });

    it('should support hubot-telegram', () => {
      ctx.robot.adapterName = 'hubot-telegram';
      const adapter = new Adapter(ctx.robot);
      assert.ok(adapter.uploader instanceof TelegramUploader);
      assert.equal(adapter.site, 'telegram');
      assert.equal(adapter.isUploadSupported(), true);
    });

    it('should support hubot-telegram, but be overridden by S3', () => {
      process.env.HUBOT_GRAFANA_S3_BUCKET = 'graf';
      ctx.robot.adapterName = 'hubot-telegram';
      const adapter = new Adapter(ctx.robot);
      assert.ok(adapter.uploader instanceof S3Uploader);
      assert.equal(adapter.site, 's3');
      assert.equal(adapter.isUploadSupported(), true);
    });

    it('should support hubot-rocketchat', () => {
      ctx.robot.adapterName = 'hubot-rocketchat';
      const adapter = new Adapter(ctx.robot);
      assert.ok(adapter.uploader instanceof RocketChatUploader);
      assert.equal(adapter.site, 'rocketchat');
      assert.equal(adapter.isUploadSupported(), true);
    });

    it('should support hubot-rocketchat, but be overridden by S3', () => {
      process.env.HUBOT_GRAFANA_S3_BUCKET = 'graf';
      ctx.robot.adapterName = 'hubot-rocketchat';
      const adapter = new Adapter(ctx.robot);
      assert.ok(adapter.uploader instanceof S3Uploader);
      assert.equal(adapter.site, 's3');
      assert.equal(adapter.isUploadSupported(), true);
    });

    it('should not support upload for unknown adapter', () => {
      ctx.robot.adapterName = 'my-amazing-fancy-super-unknown-thingy';
      const adapter = new Adapter(ctx.robot);
      assert.throws(function () {
        return adapter.uploader;
      }, /Upload not supported for 'my-amazing-fancy-super-unknown-thingy'/);
      assert.equal(adapter.site, '');
      assert.equal(adapter.isUploadSupported(), false);
    });

    it('should support unknown adapter with S3 override', () => {
      process.env.HUBOT_GRAFANA_S3_BUCKET = 'graf';
      ctx.robot.adapterName = 'my-amazing-fancy-super-unknown-thingy';
      const adapter = new Adapter(ctx.robot);
      assert.ok(adapter.uploader instanceof S3Uploader);
      assert.equal(adapter.site, 's3');
      assert.equal(adapter.isUploadSupported(), true);
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
      assert.ok(adapter.responder instanceof SlackResponder);
    });

    it('should support @hubot-friends/hubot-slack', () => {
      ctx.robot.adapterName = '@hubot-friends/hubot-slack';
      const adapter = new Adapter(ctx.robot);
      assert.ok(adapter.responder instanceof SlackResponder);
    });

    it('should support hubot-bearychat', () => {
      ctx.robot.adapterName = 'hubot-bearychat';
      const adapter = new Adapter(ctx.robot);
      assert.ok(adapter.responder instanceof BearyChatResponder);
    });

    it('should support hubot-hipchat', () => {
      ctx.robot.adapterName = 'hubot-hipchat';
      const adapter = new Adapter(ctx.robot);
      assert.ok(adapter.responder instanceof HipChatResponder);
    });

    it('should support unknown adapter with default responder', () => {
      ctx.robot.adapterName = 'my-amazing-fancy-super-unknown-thingy';
      const adapter = new Adapter(ctx.robot);
      assert.ok(adapter.responder instanceof Responder);
    });
  });
});
