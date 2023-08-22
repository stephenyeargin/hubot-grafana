const { expect } = require('chai');
const { TestBotContext, createTestBot } = require('./common/TestBot');

describe('static configuration', () => {
  /** @type {TestBotContext} */
  let ctx;

  beforeEach(async () => {
    ctx = await createTestBot();
  });

  afterEach(() => {
    ctx.shutdown();
  });

  describe('ensure configuration listener is registered', () =>
    it('register configuration listener', function () {
      let regexes = ctx.robot.listeners.map((x) => x.regex.toString());
      expect(regexes).includes('/^\\s*[@]?hubot[:,]?\\s*(?:(?:grafana|graph|graf) set (host|api_key) (.+))/i');
    }));

  describe('ask hubot to configure grafana host', () => {
    it('hubot should respond it cannot configure the host', async () => {
      let response = await ctx.sendAndWaitForResponse('hubot graf set host https://play.grafana.org');
      expect(response).to.eql('Set HUBOT_GRAFANA_PER_ROOM=1 to use multiple configurations.');
    });
  });

  describe('ask hubot to configure grafana api_key', () => {
    it('hubot should respond it cannot configure the api_key', async () => {
      let response = await ctx.sendAndWaitForResponse('hubot graf set api_key AABBCC');
      expect(response).to.eql('Set HUBOT_GRAFANA_PER_ROOM=1 to use multiple configurations.');
    });
  });
});
