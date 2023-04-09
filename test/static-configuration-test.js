/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Helper = require('hubot-test-helper');
const chai = require('chai');
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const nock = require('nock');

const helper = new Helper('./../src/grafana.js');

const {
  expect,
} = chai;

describe('static configuration', () => {
  let room = null;

  beforeEach(function () {
    process.env.HUBOT_GRAFANA_HOST = 'https://play.grafana.org';
    room = helper.createRoom();
    nock.disableNetConnect();

    this.robot = {
      respond: sinon.spy(),
      hear: sinon.spy(),
    };

    return require('../src/grafana')(this.robot);
  });

  afterEach(() => {
    room.destroy();
    nock.cleanAll();
    delete process.env.HUBOT_GRAFANA_HOST;
  });

  context('ensure configuration listener is registered', () => it('register configuration listener', function () {
    return expect(this.robot.respond).to.have.been.calledWith(/(?:grafana|graph|graf) set (host|api_key) (.+)/i);
  }));

  context('ask hubot to configure grafana host', () => {
    beforeEach((done) => {
      room.user.say('alice', 'hubot graf set host https://play.grafana.org');
      setTimeout(done, 100);
    });

    it('hubot should respond it cannot configure the host', () => expect(room.messages).to.eql([
      ['alice', 'hubot graf set host https://play.grafana.org'],
      ['hubot', 'Set HUBOT_GRAFANA_PER_ROOM=1 to use multiple configurations.'],
    ]));
  });

  context('ask hubot to configure grafana api_key', () => {
    beforeEach((done) => {
      room.user.say('alice', 'hubot graf set api_key AABBCC');
      setTimeout(done, 100);
    });

    it('hubot should respond it cannot configure the api_key', () => expect(room.messages).to.eql([
      ['alice', 'hubot graf set api_key AABBCC'],
      ['hubot', 'Set HUBOT_GRAFANA_PER_ROOM=1 to use multiple configurations.'],
    ]));
  });
});
