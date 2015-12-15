Helper = require('hubot-test-helper')
chai = require 'chai'
sinon = require 'sinon'
chai.use require 'sinon-chai'
nock = require('nock')

helper = new Helper('./../src/grafana.coffee')

expect = chai.expect

room = null

before ->
  matchesBlanket = (path) -> path.match /node_modules\/blanket/
  runningTestCoverage = Object.keys(require.cache).filter(matchesBlanket).length > 0
  if runningTestCoverage
    require('require-dir')("#{__dirname}/../src", {recurse: true, duplicates: true})

setupRoomAndRequestGraph = (done) ->
  room = helper.createRoom()

  @robot =
    respond: sinon.spy()
    hear: sinon.spy()

  require('../src/grafana')(@robot)

  setTimeout done, 100
  room.user.say 'alice', 'hubot graf db monitoring-default:network server=ww3.example.com now-6h'

describe 's3 enabled', ->

  beforeEach ->
    process.env.HUBOT_GRAFANA_HOST = 'http://play.grafana.org'
    process.env.HUBOT_GRAFANA_S3_BUCKET='graf'
    process.env.HUBOT_GRAFANA_S3_ACCESS_KEY_ID='99999999999999999'
    process.env.HUBOT_GRAFANA_S3_SECRET_ACCESS_KEY='9999999999999999999999'
    process.env.HUBOT_GRAFANA_API_KEY='xxxxxxxxxxxxxxxxxxxxxxxxx'
    do nock.disableNetConnect

    nock('http://play.grafana.org')
      .get('/api/dashboards/db/monitoring-default')
      .replyWithFile(200, __dirname + '/fixtures/dashboard-monitoring-default.json')

    nock('http://play.grafana.org')
      .get('/render/dashboard-solo/db/monitoring-default/?panelId=7&width=1000&height=500&from=now-6h&to=now&var-server=ww3.example.com')
      .replyWithFile(200, __dirname + '/fixtures/dashboard-monitoring-default.png')

  afterEach ->    
    room.destroy()
    nock.cleanAll()
    delete process.env.HUBOT_GRAFANA_HOST
    delete process.env.HUBOT_GRAFANA_S3_BUCKET
    delete process.env.HUBOT_GRAFANA_S3_ACCESS_KEY_ID
    delete process.env.HUBOT_GRAFANA_S3_SECRET_ACCESS_KEY
    delete process.env.HUBOT_GRAFANA_API_KEY

  context 'no region provided', ->
    beforeEach (done) ->
      nock('https://graf.s3.amazonaws.com:443')
        .filteringPath(/[a-z0-9]+\.png/g, 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.png')
        .put('/grafana/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.png')
        .reply(200)

      setupRoomAndRequestGraph(done)

    it 'should respond with a png graph in the default s3 region', ->
      expect(room.messages[0]).to.eql( [ 'alice', 'hubot graf db monitoring-default:network server=ww3.example.com now-6h' ] )
      expect(room.messages[1][0]).to.eql( 'hubot' )
      expect(room.messages[1][1]).to.match( /ww3.example.com network: https:\/\/graf\.s3\.amazonaws\.com\/grafana\/[a-z0-9]+\.png - http:\/\/play\.grafana\.org\/dashboard\/db\/monitoring-default\/\?panelId=7\&fullscreen\&from=now-6h\&to=now\&var-server=ww3.example.com/ )

  context 'custom s3 endpoint provided', ->
    beforeEach (done) ->

      nock('https://graf.custom.s3.endpoint.com:443')
        .filteringPath(/[a-z0-9]+\.png/g, 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.png')
        .put('/grafana/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.png')
        .reply(200)

      process.env.HUBOT_GRAFANA_S3_ENDPOINT = 'custom.s3.endpoint.com'

      setupRoomAndRequestGraph(done)

    afterEach ->
      delete process.env.HUBOT_GRAFANA_S3_ENDPOINT

    it 'should respond with a png graph stored at a custom endpoint', ->
      expect(room.messages[0]).to.eql( [ 'alice', 'hubot graf db monitoring-default:network server=ww3.example.com now-6h' ] )
      expect(room.messages[1][0]).to.eql( 'hubot' )
      expect(room.messages[1][1]).to.match( /ww3.example.com network: https:\/\/graf\.custom\.s3\.endpoint\.com\/grafana\/[a-z0-9]+\.png - http:\/\/play\.grafana\.org\/dashboard\/db\/monitoring-default\/\?panelId=7\&fullscreen\&from=now-6h\&to=now\&var-server=ww3.example.com/ )

  context 'custom s3 endpoint and port provided', ->
    beforeEach (done) ->
      nock('http://graf.custom.s3.endpoint.com:4430')
        .filteringPath(/[a-z0-9]+\.png/g, 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.png')
        .put('/grafana/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.png')
        .reply(200)

      process.env.HUBOT_GRAFANA_S3_ENDPOINT = 'custom.s3.endpoint.com'
      process.env.HUBOT_GRAFANA_S3_PORT = 4430

      setupRoomAndRequestGraph(done)

    afterEach ->
      delete process.env.HUBOT_GRAFANA_S3_ENDPOINT
      delete process.env.HUBOT_GRAFANA_S3_PORT

    it 'should respond with a png graph stored at a custom endpoint', ->
      expect(room.messages[0]).to.eql( [ 'alice', 'hubot graf db monitoring-default:network server=ww3.example.com now-6h' ] )
      expect(room.messages[1][0]).to.eql( 'hubot' )
      expect(room.messages[1][1]).to.match( /ww3.example.com network: http:\/\/graf\.custom\.s3\.endpoint\.com:4430\/grafana\/[a-z0-9]+\.png - http:\/\/play\.grafana\.org\/dashboard\/db\/monitoring-default\/\?panelId=7\&fullscreen\&from=now-6h\&to=now\&var-server=ww3.example.com/ )

  context 's3 path style provided', ->
    beforeEach (done) ->
      nock('https://s3.amazonaws.com:443')
        .filteringPath(/[a-z0-9]+\.png/g, 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.png')
        .put('/graf/grafana/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.png')
        .reply(200)

      process.env.HUBOT_GRAFANA_S3_STYLE = 'path'

      setupRoomAndRequestGraph(done)

    afterEach ->
      delete process.env.HUBOT_GRAFANA_S3_STYLE

    it 'should respond with a png graph stored at a custom endpoint', ->
      expect(room.messages[0]).to.eql( [ 'alice', 'hubot graf db monitoring-default:network server=ww3.example.com now-6h' ] )
      expect(room.messages[1][0]).to.eql( 'hubot' )
      expect(room.messages[1][1]).to.match( /ww3.example.com network: https:\/\/s3\.amazonaws\.com\/graf\/grafana\/[a-z0-9]+\.png - http:\/\/play\.grafana\.org\/dashboard\/db\/monitoring-default\/\?panelId=7\&fullscreen\&from=now-6h\&to=now\&var-server=ww3.example.com/ )
