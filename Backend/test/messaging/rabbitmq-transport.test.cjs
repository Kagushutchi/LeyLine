const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { test } = require('node:test');
const { RabbitMqTransport } = require('../../dist/common/messaging/rabbitmq-transport');
class Channel extends EventEmitter {
  calls = []; publications = [];
  async assertExchange() { this.calls.push('exchange'); }
  async assertQueue(name, options) { this.calls.push('queue'); (this.queues ??= []).push({name, options}); }
  async bindQueue() { this.calls.push('bind'); }
  async prefetch() { this.calls.push('prefetch'); }
  publish(_e, _k, body, options, callback) { this.publications.push({body, options, callback}); return true; }
  async consume(_q, callback, options) { assert.equal(options.noAck, false); this.receive = callback; return {consumerTag: 'consumer'}; }
  ack() { this.calls.push('ack'); }
  nack(_message, _all, requeue) { this.calls.push(`nack:${requeue}`); }
  async cancel() { this.calls.push('cancel'); }
  async close() { this.calls.push('close'); }
}
const envelope = {messageId: 'message-1', type: 'request', version: 1, requestId: 'r', tenantId: 't', correlationId: 'c', payload: {}};
function setup() {
  const publisher = new Channel(), consumer = new Channel();
  const transport = new RabbitMqTransport(publisher, consumer, {exchange:'requests', queue:'worker', routingKey:'new', prefetch:2});
  return {publisher, consumer, transport};
}
const tick = () => new Promise(resolve => setImmediate(resolve));
const delivery = body => ({content: Buffer.from(body), properties: {}});
test('persistent publication resolves only after broker confirmation', async () => {
  const {publisher, consumer, transport} = setup(); await transport.initialize();
  let resolved = false; const pending = transport.publish(envelope).then(() => {resolved = true;});
  const sent = publisher.publications[0];
  assert.equal(sent.options.persistent, true); assert.equal(sent.options.mandatory, true);
  assert.equal(sent.options.messageId, envelope.messageId); assert.deepEqual(JSON.parse(sent.body.toString()), envelope);
  await tick(); assert.equal(resolved, false); sent.callback(null); await pending;
  assert.deepEqual(publisher.calls, ['exchange','exchange']); assert.deepEqual(consumer.calls, ['queue','bind','queue','bind','prefetch']);
  assert.deepEqual(consumer.queues[0], {name:'worker.dlq', options:{durable:true}});
  assert.equal(consumer.queues[1].options.arguments['x-dead-letter-exchange'], 'requests.dlx');
  await transport.close();
});
test('unroutable publication is rejected even if broker confirms', async () => {
  const {publisher, transport} = setup(); const result = transport.publish(envelope); const sent = publisher.publications[0];
  publisher.emit('return', {properties:{correlationId:sent.options.correlationId}, fields:{replyCode:312, replyText:'NO_ROUTE'}});
  sent.callback(null); await assert.rejects(result, /unroutable/); await transport.close();
});
test('broker nack and channel closure do not confirm publication', async () => {
  const {publisher, transport} = setup(); const first = transport.publish(envelope);
  publisher.publications[0].callback(new Error('nack')); await assert.rejects(first, /nack/);
  const second = transport.publish(envelope); publisher.emit('close'); await assert.rejects(second, /closed/); await transport.close();
});
test('ack waits for handler; handler failure and invalid JSON go to dead letter queue', async () => {
  const {consumer, transport} = setup(); let release; const wait = new Promise(resolve => {release=resolve;});
  await transport.subscribe(async () => {await wait; return 'ack';}); consumer.receive(delivery(JSON.stringify(envelope)));
  await tick(); assert.deepEqual(consumer.calls, []); release(); await tick(); assert.deepEqual(consumer.calls, ['ack']);
  consumer.receive(delivery('{')); await tick(); assert.equal(consumer.calls.at(-1), 'nack:false'); await transport.close();
  const second = setup(); await second.transport.subscribe(async () => {throw new Error('temporary');});
  second.consumer.receive(delivery(JSON.stringify(envelope))); await tick(); assert.deepEqual(second.consumer.calls, ['nack:false']);
  await second.transport.close();
});
test('shutdown cancels, drains and rejects unconfirmed publication', async () => {
  const {consumer, transport} = setup(); let release; const wait = new Promise(resolve => {release=resolve;});
  await transport.subscribe(async () => {await wait; return 'ack';}); consumer.receive(delivery(JSON.stringify(envelope)));
  const pending = transport.publish(envelope), failure = assert.rejects(pending, /closed/), closing = transport.close();
  await tick(); assert.deepEqual(consumer.calls, ['cancel']); release(); await closing; await failure;
  assert.deepEqual(consumer.calls, ['cancel','ack','close']); await assert.rejects(async () => transport.publish(envelope), /closed/);
});
test('concurrent return affects only its own publication', async () => {
  const {publisher, transport} = setup();
  const first = transport.publish(envelope), second = transport.publish(envelope);
  const [a, b] = publisher.publications;
  assert.notEqual(a.options.correlationId, b.options.correlationId);
  publisher.emit('return', {properties:{correlationId:a.options.correlationId}, fields:{replyCode:312}});
  b.callback(null); a.callback(null);
  await second; await assert.rejects(first, /unroutable/); await transport.close();
});
test('broker consumer cancellation reports failure and prevents new work', async () => {
  const publisher = new Channel(), consumer = new Channel(), errors = [];
  const transport = new RabbitMqTransport(publisher, consumer, {exchange:'x', queue:'q', routingKey:'k', prefetch:1}, error => errors.push(error.message));
  await transport.subscribe(async () => 'ack'); consumer.receive(null);
  assert.match(errors[0], /cancelled/); await assert.rejects(async () => transport.publish(envelope), /cancelled/);
  await transport.close();
});
const {createRabbitMqTransport} = require('../../dist/common/messaging/rabbitmq-factory');
class Connection extends EventEmitter {
  publisher = new Channel(); consumer = new Channel(); closed = false;
  async createConfirmChannel() {return this.publisher;}
  async createChannel() {return this.consumer;}
  async close() {this.closed = true;}
}
const config = {url:'amqp://example', topology:{exchange:'requests', queue:'worker', routingKey:'new', prefetch:2}, maxConnectAttempts:3, reconnectDelayMs:0, onFailure:() => {}};
test('factory bounds connection attempts before surfacing failure', async () => {
  let attempts=0;
  await assert.rejects(createRabbitMqTransport(config, {connect: async () => {attempts++; throw new Error('down');}}), /3 attempt/);
  assert.equal(attempts,3);
});
test('connection loss rejects uncertain publish and reconnects consumer', async () => {
  const connections = [], failures = [];
  const transport = await createRabbitMqTransport({...config,onFailure:error=>failures.push(error.message)}, {connect: async () => {
    const connection = new Connection(); connections.push(connection); return connection;
  }});
  await transport.subscribe(async () => 'ack');
  const first = connections[0], pending = transport.publish(envelope);
  await tick(); const failure = assert.rejects(pending, /closed/); first.emit('close'); await failure;
  for (let i=0; i<10 && !connections[1]?.consumer.receive; i++) await tick();
  assert.equal(connections.length,2); assert.ok(connections[1].consumer.receive);
  assert.equal(connections[1].publisher.publications.length,0);
  assert.ok(failures.some(message => /connection closed/.test(message)));
  await transport.close();
});
