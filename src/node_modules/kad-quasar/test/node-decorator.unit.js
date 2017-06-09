'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var kad = require('kad');
var NodeDecorator = require('../lib/node-decorator');

describe('NodeDecorator', function() {

  describe('@decorator', function() {

    it('should return a QuasarNode constructor', function() {
      var QuasarNode = NodeDecorator(kad.Node);
      expect(typeof QuasarNode).to.equal('function');
      expect(typeof QuasarNode.prototype.publish).to.equal('function');
      expect(typeof QuasarNode.prototype.subscribe).to.equal('function');
    });

  });

  describe('#publish', function() {

    it('should call the underlying quasar protocol\'s method', function() {
      var QuasarNode = NodeDecorator(kad.Node);
      var node = new QuasarNode({
        transport: kad.transports.UDP(kad.contacts.AddressPortContact({
          address: '127.0.0.1',
          port: 0
        })),
        storage: kad.storage.MemStore(),
        logger: kad.Logger(0)
      });
      var _publish = sinon.stub(node._quasar, 'publish');
      node.publish();
      expect(_publish.called).to.equal(true);
      _publish.restore();
    });

  });

  describe('#subscribe', function() {

    it('should call the underlying quasar protocol\'s method', function() {
      var QuasarNode = NodeDecorator(kad.Node);
      var node = new QuasarNode({
        transport: kad.transports.UDP(kad.contacts.AddressPortContact({
          address: '127.0.0.1',
          port: 0
        })),
        storage: kad.storage.MemStore(),
        logger: kad.Logger(0)
      });
      var _subscribe = sinon.stub(node._quasar, 'subscribe');
      node.subscribe();
      expect(_subscribe.called).to.equal(true);
      _subscribe.restore();
    });

  });

});
