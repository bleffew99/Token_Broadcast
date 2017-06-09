'use strict';

var async = require('async');
var expect = require('chai').expect;
var kad = require('kad');
var Quasar = require('../lib/quasar');

describe('Quasar', function() {

  var PORT = 65535;
  var NUM_NODES = 12;
  var NODES = [];
  var Q_NODES = [];
  var NODE_IDS = [
    '0b7a30c6740127809eaa3d411faf1e4e04b54492',
    'cfa797207cbd70c41fcb0e136a354acb83c36e63',
    '1cda46ddc7ed1b8b96e84f112fd5755f288fd87c',
    '028ae22779d9c4718ce50af73c58b4d0b6bcd660',
    'ebec2b5cb0d05947c53acc52b38ee4d3201fa22e',
    '2b98c3cf59e0e73091bc615a143a6c618aad0fc2',
    '98fc2a4e5c8b48d661f5cb71f034e2bc538a6efb',
    '04a2b1e927795e80e1673d8b5bcbc3d63ad6ca7f',
    '2bf3916d3595780f9a9ea0ead72aa35cc5ce30ec',
    '90c640335b604d52cc7a4edb667fb9f65686299b',
    '169bd6265d1a4957376d36a4534badab23009991',
    '64b5e3b875a36775d21a9644fba550637514c862'
  ];

  function createTestNodeOnPort(port) {
    var logger = new kad.Logger(0);
    var contact = new kad.contacts.AddressPortContact({
      address: '127.0.0.1',
      port: port,
      nodeID: NODE_IDS.pop()
    });
    var transport = new kad.transports.UDP(contact, {
      logger: logger
    });
    var router = new kad.Router({
      transport: transport,
      logger: logger
    });
    var node = new kad.Node({
      transport: transport,
      router: router,
      logger: logger,
      storage: new kad.storage.MemStore()
    });
    return node;
  }

  function getQuasarNode() {
    return Q_NODES.pop();
  }

  while (NUM_NODES > 0) {
    NODES.push(createTestNodeOnPort(PORT--));
    NUM_NODES--;
  }

  before(function(done) {
    async.eachOfSeries(NODES, function(node, i, next) {
      if (i) {
        node.connect(NODES[i - 1]._self, next);
        Q_NODES[i] = Quasar(NODES[i]._router);
      } else {
        Q_NODES[i] = Quasar(NODES[i]._router);
        next();
      }
    }, done);
  });

  describe('Integration', function() {

    it('all subscribers should receive a publication', function(done) {
      var count = 0;

      var publishers = [
        getQuasarNode(),
        getQuasarNode(),
        getQuasarNode()
      ];

      var subscribers = [
        getQuasarNode(),
        getQuasarNode(),
        getQuasarNode()
      ];

      function test() {
        if (count === (subscribers.length - 1)) {
          done();
        }
      }

      subscribers[0].subscribe('test', function(data) {
        expect(data.test).to.equal('Hello world!');
        count++;
        test();
      });

      subscribers[1].subscribe('test', function(data) {
        expect(data.test).to.equal('Hello world!');
        count++;
        test();
      });

      subscribers[2].subscribe('test', function(data) {
        expect(data.test).to.equal('Hello world!');
        count++;
        test();
      });

      publishers[0].publish('test', {
        test: 'Hello world!'
      });
    });

    it('subscribers should receive multiple publication', function(done) {
      var count = 0;

      var publishers = [
        getQuasarNode(),
        getQuasarNode(),
        getQuasarNode()
      ];

      var subscribers = [
        getQuasarNode(),
        getQuasarNode(),
        getQuasarNode()
      ];

      function test() {
        if (count === (subscribers.length - 1)) {
          done();
        }
      }

      subscribers[0].subscribe('foo', function(data) {
        expect(data.test).to.equal('baz');
        count++;
        test();
      });

      subscribers[0].subscribe('bar', function(data) {
        expect(data.test).to.equal('baz');
        count++;
        test();
      });

      subscribers[0].subscribe('baz', function(data) {
        expect(data.test).to.equal('foo');
        count++;
        test();
      });

      publishers[0].publish('bar', {
        test: 'baz'
      });

      publishers[1].publish('foo', {
        test: 'baz'
      });

      publishers[2].publish('baz', {
        test: 'foo'
      });
    });

  });

});
