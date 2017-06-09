'use strict';

var inherits = require('util').inherits;
var Protocol = require('./quasar');

/**
 * Returns a decorated kad.Node that implements the Quasar algorithm
 * @constructor
 * @param {kad.Node} Node
 */
function NodeDecorator(Node) {

  function QuasarNode(options) {
    if (!(this instanceof QuasarNode)) {
      return new QuasarNode(options);
    }

    Node.call(this, options);

    this._quasar = new Protocol(this._router);
  }

  inherits(QuasarNode, Node);

  /**
   * Publishes to the given topic and includes the supplied contents
   * @param {String} topic - The publication identifier
   * @param {Object} contents - Arbitrary publication contents
   */
  QuasarNode.prototype.publish = function(topic, contents) {
    return this._quasar.publish(topic, contents);
  };

  /**
   * Subscribes to the given topic and executes the handler when a matching
   * publication is received
   * @param {String} topic - The publication identifier
   * @param {Function} handler - Handler function
   */
  QuasarNode.prototype.subscribe = function(topic, handler) {
    return this._quasar.subscribe(topic, handler);
  };

  return QuasarNode;
}

module.exports = NodeDecorator;
