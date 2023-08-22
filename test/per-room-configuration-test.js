const { expect } = require('chai');
const { createTestBot, TestBotContext } = require('./common/TestBot');

describe('per room configuration', () => {
  /** @type {TestBotContext} */
  let ctx;

  beforeEach(async () => {
    process.env.HUBOT_GRAFANA_PER_ROOM = '1';
    ctx = await createTestBot();
  });

  afterEach(function () {
    delete process.env.HUBOT_GRAFANA_PER_ROOM;
    ctx?.shutdown();
  });

  describe('ensure configuration listener is registered', () =>
    it('register configuration listener', function () {
      let regexes = ctx.robot.listeners.map((x) => x.regex.toString());
      expect(regexes).includes('/^\\s*[@]?hubot[:,]?\\s*(?:(?:grafana|graph|graf) set (host|api_key) (.+))/i');
    })
  );

  describe('ask hubot to configure grafana host', () => {
    it('hubot should respond it has configured the host', async () => {
      let response = await ctx.sendAndWaitForResponse('hubot graf set host https://play.grafana.org');
      expect(response).to.eql('Value set for host');
    })
  });

  describe('ask hubot to configure grafana api_key', () => {
    it('hubot should respond it has configured the api_key', async () => {
      let response = await ctx.sendAndWaitForResponse('hubot graf set api_key AABBCC');
      expect(response).to.eql('Value set for api_key');
    })
  });

  describe('ask hubot to list dashboards filterd by tag', () => {
    it('hubot should respond that grafana endpoint is not configured', async () => {
      let response = await ctx.sendAndWaitForResponse('hubot graf list demo');
      expect(response).to.eql('No Grafana endpoint configured.');
    })
  })

  describe('ask hubot to configure host and then list dashboards filterd by tag', () => {
    beforeEach(() => {
      ctx.nock('https://play.grafana.org')
        .get('/api/search?type=dash-db&tag=demo')
        .replyWithFile(200, `${__dirname}/fixtures/v8/search-tag.json`);
    });

    it('hubot should respond that grafana is configured and then with a list of dashboards with tag', async () => {

      let response1 = await ctx.sendAndWaitForResponse('hubot graf set host https://play.grafana.org');
      expect(response1).to.eql('Value set for host')

      let response2 = await ctx.sendAndWaitForResponse('hubot graf list demo');
      expect(response2).to.eql('Dashboards tagged `demo`:\n- 000000016: 1 -  Time series graphs\n- Zb3f4veGk: 2 - Stats\n- OhR1ID6Mk: 3 - Table\n- KIhkVD6Gk: 4 -  Gauges\n- ktMs4D6Mk: 5 - Bar charts and pie charts\n- qD-rVv6Mz: 6 - State timeline and Status history\n- 000000074: Alerting\n- 000000010: Annotations\n- vmie2cmWz: Bar Gauge\n- 3SWXxreWk: Grafana Dashboard\n- 37Dq903mk: Graph Gradient Area Fills\n- iRY1K9VZk: Lazy Loading\n- 6NmftOxZz: Logs Panel\n- 000000100: Mixed Datasources\n- U_bZIMRMk: Table Panel Showcase\n- 000000056: Templated dynamic dashboard\n- 000000109: The Four Golden Signals\n- 000000167: Threshold example\n- 000000041: Time range override');

    });
  });
});

