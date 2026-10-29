const { expect } = require('chai');
const { createTestBot, TestBotContext } = require('./common/TestBot');

// Regression tests for GHSA-j5fr-jm8f-m549: a chat user must not be able to
// override operator-only query keys (apiEndpoint, orgId). apiEndpoint is
// interpolated into the render URL path, so an override enables path traversal.
describe('security: query override injection', () => {
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
  });

  afterEach(() => {
    ctx?.shutdown();
  });

  it('ignores a chat-supplied apiEndpoint and keeps the render path', async () => {
    const service = ctx.bot.createService({ robot: ctx.robot });
    const result = await service.process('AAy9r_bmk apiEndpoint=../../../api/admin/users#', 2);

    expect(result).to.be.not.null;
    for (const chart of result) {
      // The injected value must not escape /render/d-solo/<uid>/ into the path.
      expect(new URL(chart.imageUrl).pathname).to.eql('/render/d-solo/AAy9r_bmk/');
    }
  });

  it('ignores a chat-supplied orgId', async () => {
    const service = ctx.bot.createService({ robot: ctx.robot });
    const result = await service.process('AAy9r_bmk orgId=2', 2);

    expect(result).to.be.not.null;
    for (const chart of result) {
      // orgId is operator-only; chat input must not set the real query param.
      expect(new URL(chart.imageUrl).searchParams.get('orgId')).to.be.null;
    }
  });

  it('still honors width and height overrides', async () => {
    const service = ctx.bot.createService({ robot: ctx.robot });
    const result = await service.process('AAy9r_bmk width=2500 height=700', 2);

    expect(result).to.be.not.null;
    expect(result.length).to.be.above(0);
    for (const chart of result) {
      expect(chart.imageUrl).to.contain('width=2500');
      expect(chart.imageUrl).to.contain('height=700');
    }
  });
});
