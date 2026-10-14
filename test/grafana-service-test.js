const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { createTestBot } = require('./common/TestBot');
/** @typedef {import('./common/TestBot').TestBotContext} TestBotContext */

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

    assert.notEqual(result, null);
    assert.equal(result.length, 2);

    assert.equal(result[0].grafanaChartLink,
      'https://play.grafana.org/d/AAy9r_bmk/?panelId=3&fullscreen&from=now-6h&to=now&var-server=ww3.example.com'
    );
    assert.equal(result[0].imageUrl,
      'https://play.grafana.org/render/d-solo/AAy9r_bmk/?panelId=3&width=1000&height=500&from=now-6h&to=now&var-server=ww3.example.com'
    );
    assert.equal(result[0].title, 'CPU');

    assert.equal(result[1].grafanaChartLink,
      'https://play.grafana.org/d/AAy9r_bmk/?panelId=7&fullscreen&from=now-6h&to=now&var-server=ww3.example.com'
    );
    assert.equal(result[1].imageUrl,
      'https://play.grafana.org/render/d-solo/AAy9r_bmk/?panelId=7&width=1000&height=500&from=now-6h&to=now&var-server=ww3.example.com'
    );
    assert.equal(result[1].title, 'CPU');
  });

  it('should resolve UID by slug', async () => {
    const service = ctx.bot.createService({ robot: ctx.robot });
    const result = await service.getUidBySlug("the-four-golden-signals");
    assert.equal(result, '000000109');
  });

  it('should log failed searches and return null', async () => {
    const error = new Error('Grafana unavailable');
    const loggedErrors = [];
    const service = ctx.bot.createService({ robot: ctx.robot });
    service.client.get = async () => { throw error; };
    service.logger = {
      debug: () => {},
      error: (...args) => loggedErrors.push(args),
    };

    assert.equal(await service.search('cpu'), null);
    assert.equal(loggedErrors[0][0], error);
    assert.match(loggedErrors[0][1], /Error while searching dashboards/);
  });


  
});
