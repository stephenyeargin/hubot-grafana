const { expect } = require('chai');
const { TypingIndicator } = require('../src/adapters/TypingIndicator');
const { SlackTypingIndicator } = require('../src/adapters/implementations/SlackTypingIndicator');

function fakeLogger() {
  const debugCalls = [];
  return {
    debugCalls,
    debug: (...args) => debugCalls.push(args),
  };
}

function fakeRobot(setStatus) {
  return {
    adapter: {
      client: {
        web: {
          assistant: {
            threads: {
              setStatus,
            },
          },
        },
      },
    },
  };
}

/**
 * @param {{ room?: string, ts?: string, channel?: string, thread_ts?: string }} opts
 */
function fakeContext(opts) {
  return {
    envelope: { room: opts.room },
    message: { rawMessage: { ts: opts.ts, channel: opts.channel, thread_ts: opts.thread_ts } },
  };
}

describe('typing indicator', () => {
  describe('base TypingIndicator', () => {
    it('start and stop no-op without throwing', async () => {
      const indicator = new TypingIndicator();
      await indicator.start(fakeContext({ room: 'C123', ts: '111.222' }), 'is thinking...');
      await indicator.stop(fakeContext({ room: 'C123', ts: '111.222' }));
    });
  });

  describe('SlackTypingIndicator', () => {
    it('calls assistant.threads.setStatus with channel_id, thread_ts, status on start', async () => {
      const calls = [];
      const indicator = new SlackTypingIndicator(
        fakeRobot(async (opts) => calls.push(opts)),
        fakeLogger()
      );
      const res = fakeContext({ room: 'C1', ts: '1.001' });

      await indicator.start(res, 'is fetching dashboard...');
      await indicator.stop(res);

      expect(calls).to.eql([
        { channel_id: 'C1', thread_ts: '1.001', status: 'is fetching dashboard...' },
        { channel_id: 'C1', thread_ts: '1.001', status: '' },
      ]);
    });

    it("prefers the raw Slack event's channel/thread_ts over envelope.room/ts", async () => {
      const calls = [];
      const indicator = new SlackTypingIndicator(
        fakeRobot(async (opts) => calls.push(opts)),
        fakeLogger()
      );
      // envelope.room/ts simulate a reply's own room/ts, which can be a room
      // name and is not the assistant thread's root -- rawMessage.channel/thread_ts
      // (present on a threaded reply) must win.
      const res = fakeContext({ room: '#general', ts: '2.002', channel: 'C2', thread_ts: '2.001' });

      await indicator.start(res, 'is fetching dashboard...');
      await indicator.stop(res);

      expect(calls).to.eql([
        { channel_id: 'C2', thread_ts: '2.001', status: 'is fetching dashboard...' },
        { channel_id: 'C2', thread_ts: '2.001', status: '' },
      ]);
    });

    it('no-ops when setStatus is not a function (adapter/feature unsupported)', async () => {
      const robot = { adapter: {} };
      const logger = fakeLogger();
      const indicator = new SlackTypingIndicator(robot, logger);

      await indicator.start(fakeContext({ room: 'C3', ts: '3.001' }), 'is fetching dashboard...');

      expect(logger.debugCalls).to.eql([]);
    });

    it('no-ops when there is no thread_ts to attach the status to', async () => {
      const calls = [];
      const indicator = new SlackTypingIndicator(
        fakeRobot(async (opts) => calls.push(opts)),
        fakeLogger()
      );

      await indicator.start(fakeContext({ room: 'C4' }), 'is fetching dashboard...');

      expect(calls).to.eql([]);
    });

    it('swallows a rejected setStatus call and logs at debug level', async () => {
      const indicator = new SlackTypingIndicator(
        fakeRobot(async () => {
          throw new Error('missing_scope');
        }),
        fakeLogger()
      );
      const logger = indicator.logger;

      await indicator.start(fakeContext({ room: 'C5', ts: '5.001' }), 'is fetching dashboard...');

      expect(logger.debugCalls).to.have.lengthOf(1);
      expect(logger.debugCalls[0][0].message).to.equal('missing_scope');
    });

    it('does not clear the status while another command is still working in the same thread', async () => {
      const calls = [];
      const indicator = new SlackTypingIndicator(
        fakeRobot(async (opts) => calls.push(opts)),
        fakeLogger()
      );
      const res = fakeContext({ room: 'C6', ts: '6.001' });

      // Two overlapping commands in the same thread...
      await indicator.start(res, 'is fetching dashboard...');
      await indicator.start(res, 'is searching dashboards...');

      // ...the first to finish must not clear the status the second still needs.
      await indicator.stop(res);
      expect(calls.map((c) => c.status)).to.eql(['is fetching dashboard...', 'is searching dashboards...']);

      // Only the last one clears it.
      await indicator.stop(res);
      expect(calls.map((c) => c.status)).to.eql(['is fetching dashboard...', 'is searching dashboards...', '']);
    });
  });
});
