const { expect } = require('chai');
const { TestBotContext, createTestBot } = require('./common/TestBot');

describe('retrieve dashboard graphs', function () {
  /** @type {TestBotContext} */
  let ctx;

  beforeEach(async () => {
    ctx = await createTestBot();
    ctx
      .nock('https://play.grafana.org')
      .get('/api/dashboards/uid/000000091')
      .replyWithFile(200, `${__dirname}/fixtures/v8/dashboard-templating.json`);
  });

  afterEach(() => {
    ctx?.shutdown();
  });

  it('should respond with a single graph in kiosk mode', async () => {
    let response = await ctx.sendAndWaitForResponse('hubot graf db 000000091 kiosk');
    expect(response).to.eql(
      'Templating showcase: https://play.grafana.org/render/d/000000091/?kiosk&autofitpanels&width=1000&height=500&from=now-6h&to=now - https://play.grafana.org/d/000000091/?from=now-6h&to=now'
    );
  });

  it('should respond with multiple graphs without kiosk mode', async () => {
    await ctx.sendAndWaitForResponse('hubot graf db 000000091');
    expect(ctx.sends).to.eql([
      'Graph for All: https://play.grafana.org/render/d-solo/000000091/?panelId=1&width=1000&height=500&from=now-6h&to=now - https://play.grafana.org/d/000000091/?panelId=1&fullscreen&from=now-6h&to=now',
      'Table: https://play.grafana.org/render/d-solo/000000091/?panelId=2&width=1000&height=500&from=now-6h&to=now - https://play.grafana.org/d/000000091/?panelId=2&fullscreen&from=now-6h&to=now',
      'Stat: https://play.grafana.org/render/d-solo/000000091/?panelId=3&width=1000&height=500&from=now-6h&to=now - https://play.grafana.org/d/000000091/?panelId=3&fullscreen&from=now-6h&to=now',
    ]);
  });
});
