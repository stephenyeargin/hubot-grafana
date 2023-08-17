const { expect } = require('chai');
const { TestBotContext, createTestBot } = require('./common/TestBot');

describe('retrieve graphs by timezone', function () {
  /** @type {TestBotContext} */
  let ctx;

  beforeEach(async () => {
    ctx = await createTestBot();
    process.env.HUBOT_GRAFANA_DEFAULT_TIME_ZONE = 'America/Chicago';
    ctx
      .nock('https://play.grafana.org')
      .get('/api/dashboards/uid/000000091')
      .replyWithFile(200, `${__dirname}/fixtures/v8/dashboard-templating.json`);
  });

  afterEach(() => {
    delete process.env.HUBOT_GRAFANA_DEFAULT_TIME_ZONE;
    ctx?.shutdown();
  });

  it('should respond with default timezone set', async () => {
    let response = await ctx.sendAndWaitForResponse('hubot graf db 000000091:table server=backend_01 now-6h');
    expect(response).to.eql(
      'Table: https://play.grafana.org/render/d-solo/000000091/?panelId=2&width=1000&height=500&from=now-6h&to=now&var-server=backend_01&tz=America%2FChicago - https://play.grafana.org/d/000000091/?panelId=2&fullscreen&from=now-6h&to=now&var-server=backend_01'
    );
  });

  it('should respond with requested timezone set', async () => {
    let response = await ctx.sendAndWaitForResponse(
      'hubot graf db 000000091:table server=backend_01 now-6h tz=Europe/Amsterdam'
    );
    expect(response).to.eql(
      'Table: https://play.grafana.org/render/d-solo/000000091/?panelId=2&width=1000&height=500&from=now-6h&to=now&var-server=backend_01&tz=Europe%2FAmsterdam - https://play.grafana.org/d/000000091/?panelId=2&fullscreen&from=now-6h&to=now&var-server=backend_01'
    );
  });
});
