const { expect } = require('chai');
const { createTestBot, TestBotContext } = require('./common/TestBot');

describe('grafana service', () => {
  /** @type {TestBotContext} */
  let ctx;

  beforeEach(async () => {
    ctx = await createTestBot();
    ctx
      .nock('https://play.grafana.org')
      .get('/api/dashboards/uid/AAy9r_bmk')
      .replyWithFile(200, `${__dirname}/fixtures/v8/dashboard-monitoring-default.json`);

    ctx
      .nock('https://play.grafana.org')
      .get(/\/api\/search/)
      .replyWithFile(200, `${__dirname}/fixtures/v8/search-tag.json`);

    [3, 7, 8].map((i) =>
      ctx
        .nock('https://play.grafana.org')
        .defaultReplyHeaders({ 'Content-Type': 'image/png' })
        .get('/render/d-solo/AAy9r_bmk/')
        .query({
          panelId: i,
          width: 1000,
          height: 500,
          from: 'now-6h',
          to: 'now',
          'var-server': 'ww3.example.com',
        })
        .replyWithFile(200, `${__dirname}/fixtures/v8/dashboard-monitoring-default.png`)
    );
  });

  afterEach(function () {
    ctx?.shutdown();
  });

  it('should process response', async () => {
    const service = ctx.bot.createService({ robot: ctx.robot });
    const result = await service.process('AAy9r_bmk:cpu server=ww3.example.com now-6h', 2);

    expect(result).to.be.not.null;
    expect(result).to.be.of.length(2);

    expect(result[0].grafanaChartLink).to.eql(
      'https://play.grafana.org/d/AAy9r_bmk/?panelId=3&fullscreen&from=now-6h&to=now&var-server=ww3.example.com'
    );
    expect(result[0].imageUrl).to.eql(
      'https://play.grafana.org/render/d-solo/AAy9r_bmk/?panelId=3&width=1000&height=500&from=now-6h&to=now&var-server=ww3.example.com'
    );
    expect(result[0].title).to.eql('CPU');

    expect(result[1].grafanaChartLink).to.eql(
      'https://play.grafana.org/d/AAy9r_bmk/?panelId=7&fullscreen&from=now-6h&to=now&var-server=ww3.example.com'
    );
    expect(result[1].imageUrl).to.eql(
      'https://play.grafana.org/render/d-solo/AAy9r_bmk/?panelId=7&width=1000&height=500&from=now-6h&to=now&var-server=ww3.example.com'
    );
    expect(result[1].title).to.eql('CPU');
  });

  it('should resolve UID by slug', async () => {
    const service = ctx.bot.createService({ robot: ctx.robot });
    const result = await service.getUidBySlug("the-four-golden-signals");
    expect(result).to.eql('000000109');
  });


  
});
