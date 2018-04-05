Helper = require('hubot-test-helper')
chai = require 'chai'
sinon = require 'sinon'
chai.use require 'sinon-chai'
nock = require('nock')

helper = new Helper('./../src/grafana.coffee')

expect = chai.expect

describe 's3', ->
  beforeEach ->
    process.env.HUBOT_GRAFANA_HOST = 'http://play.grafana.org'
    process.env.HUBOT_GRAFANA_S3_BUCKET='graf'
    process.env.HUBOT_GRAFANA_S3_ACCESS_KEY_ID='99999999999999999'
    process.env.HUBOT_GRAFANA_S3_SECRET_ACCESS_KEY='9999999999999999999999'
    process.env.HUBOT_GRAFANA_API_KEY='xxxxxxxxxxxxxxxxxxxxxxxxx'
    nock.disableNetConnect()
    @room = helper.createRoom()

    nock('http://play.grafana.org')
      .get('/api/dashboards/db/monitoring-default')
      .replyWithFile(200, __dirname + '/fixtures/v4/dashboard-monitoring-default.json')
    nock('http://play.grafana.org')
      .defaultReplyHeaders({
        'Content-Type': 'image/png'
      })
      .get('/render/dashboard-solo/db/monitoring-default/')
      .query(
        panelId: 7,
        width: 1000,
        height: 500,
        from: 'now-6h',
        to: 'now',
        "var-server": 'ww3.example.com'
      )
      .replyWithFile(200, __dirname + '/fixtures/v4/dashboard-monitoring-default.png')

  afterEach ->
    @room.destroy()
    nock.cleanAll()
    delete process.env.HUBOT_GRAFANA_HOST
    delete process.env.HUBOT_GRAFANA_S3_BUCKET
    delete process.env.HUBOT_GRAFANA_S3_ACCESS_KEY_ID
    delete process.env.HUBOT_GRAFANA_S3_SECRET_ACCESS_KEY
    delete process.env.HUBOT_GRAFANA_API_KEY

  context 'no region provided', ->
    beforeEach ->
      nock('https://graf.s3.amazonaws.com')
        .filteringPath(/[a-z0-9]+\.png/g, 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.png')
        .put('/grafana/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.png')
        .reply(200)

    it 'should respond with a png graph in the default s3 region', (done) ->
      selfRoom = @room
      selfRoom.user.say('alice', '@hubot graf db monitoring-default:network server=ww3.example.com now-6h')
      setTimeout(() ->
        try
          expect(selfRoom.messages[0]).to.eql [
            'alice',
            '@hubot graf db monitoring-default:network server=ww3.example.com now-6h'
          ]
          expect(selfRoom.messages[1][1]).to.match(
            /ww3.example.com network: https:\/\/graf\.s3\.amazonaws\.com\/grafana\/[a-z0-9]+\.png - http:\/\/play\.grafana\.org\/dashboard\/db\/monitoring-default\/\?panelId=7\&fullscreen\&from=now-6h\&to=now\&var-server=ww3.example.com/
          )
          expect(nock.activeMocks()).to.be.empty
          done()
        catch err
          done err
        return
      , 1000)

  context 'custom s3 endpoint provided', ->
    before ->
      process.env.HUBOT_GRAFANA_S3_ENDPOINT = 'custom.s3.endpoint.com'
      nock('https://graf.custom.s3.endpoint.com')
        .filteringPath(/[a-z0-9]+\.png/g, 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.png')
        .put('/grafana/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.png')
        .reply(200)

    after ->
      delete process.env.HUBOT_GRAFANA_S3_ENDPOINT

    it 'should respond with a png graph stored at a custom endpoint', (done) ->
      selfRoom = @room
      selfRoom.user.say('alice', '@hubot graf db monitoring-default:network server=ww3.example.com now-6h')
      setTimeout(() ->
        try
          expect(selfRoom.messages[0]).to.eql [
            'alice',
            '@hubot graf db monitoring-default:network server=ww3.example.com now-6h'
          ]
          expect(selfRoom.messages[1][1]).to.match(
            /ww3.example.com network: https:\/\/graf\.custom\.s3\.endpoint\.com\/grafana\/[a-z0-9]+\.png - http:\/\/play\.grafana\.org\/dashboard\/db\/monitoring-default\/\?panelId=7\&fullscreen\&from=now-6h\&to=now\&var-server=ww3.example.com/
          )
          expect(nock.activeMocks()).to.be.empty
          done()
        catch err
          done err
        return
      , 1000)

  context 'custom s3 endpoint and port provided', ->
    before ->
      process.env.HUBOT_GRAFANA_S3_STYLE = 'path'
      nock('https://s3.amazonaws.com')
        .filteringPath(/[a-z0-9]+\.png/g, 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.png')
        .put('/graf/grafana/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.png')
        .reply(200)

    after ->
      delete process.env.HUBOT_GRAFANA_S3_STYLE

    it 'should respond with a png graph stored at a custom endpoint and port', (done) ->
      selfRoom = @room
      selfRoom.user.say('alice', '@hubot graf db monitoring-default:network server=ww3.example.com now-6h')
      setTimeout(() ->
        try
          expect(selfRoom.messages[0]).to.eql [
            'alice',
            '@hubot graf db monitoring-default:network server=ww3.example.com now-6h'
          ]
          expect(selfRoom.messages[1][1]).to.match(
            /ww3.example.com network: https:\/\/s3\.amazonaws\.com\/graf\/grafana\/[a-z0-9]+\.png - http:\/\/play\.grafana\.org\/dashboard\/db\/monitoring-default\/\?panelId=7\&fullscreen\&from=now-6h\&to=now\&var-server=ww3.example.com/
          )
          expect(nock.activeMocks()).to.be.empty
          done()
        catch err
          done err
        return
      , 1000)
