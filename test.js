/* jshint mocha: true */

var debug = require('debug')('loopback-ds-changed-mixin');
var utils = require('loopback-datasource-juggler/lib/utils');

var loopback = require('loopback');
var lt = require('loopback-testing');

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
chai.use(require('sinon-chai'));
require('mocha-sinon');

// Create a new loopback app.
var app = loopback();

// Set up promise support for loopback in non-ES6 runtime environment.
global.Promise = require('bluebird');

// import our Changed mixin.
require('./')(app);

describe('loopback datasource changed property', function() {

  beforeEach(function(done) {

    // Define a function that should be called when a change is detected.
    this.basicCallback = function(args, cb) {
      cb = cb || utils.createPromiseCallback();
      debug('this.basicCallback() called with %o', args);
      process.nextTick(function() {
        cb(null);
      });
      return cb.promise;
    };
    
    // Set up a spy so we can check wether our callback has been called.
    this.spy = sinon.spy(this, 'basicCallback');

    // A model with 2 Changed properties.
    var Person = this.Person = loopback.PersistedModel.extend('person', {
      name: String,
      nickname: String,
      age: Number,
      status: String,
    }, {
      mixins: {
        Changed: {
          callback: this.basicCallback,
          properties: {
            nickname: true,
            age: true,
            status: true
          }
        }
      }
    });

    Person.attachTo(loopback.memory());
    app.model(Person);

    app.use(loopback.rest());
    app.set('legacyExplorer', false);
    done();
  });

  lt.beforeEach.withApp(app);

  describe('when called internally', function() {
    lt.beforeEach.givenModel('person', {name:'Joe Blogs', nickname: 'joe', age: 21, status: 'active'}, 'joe');
    lt.beforeEach.givenModel('person', {name:'Bilbo Baggins', nickname: 'bilbo', age: 99, status: 'active'}, 'bilbo');
    lt.beforeEach.givenModel('person', {name:'Tina Turner', nickname: 'tina', age: 80, status: 'active'}, 'tina');

    describe('Model.create', function() {
      it('should not run callback when creating new instances.', function(done) {
        var self = this;
        expect(self.spy).not.to.have.been.called;
        done();
      });
    });

    describe('Model.updateAttribute', function() {
      it('should run the callback after updating a watched property on a single model.', function(done) {
        var self = this;
        this.joe.updateAttribute('age', 22)
        .then(function(res) {
          expect(res.age).to.equal(22);
          expect(self.spy).to.have.been.called;
          done();
        })
        .catch(done);
      });
    });

    describe('Model.updateAttributes', function() {
      it('should execute the callback after updating multiple watched properties on a single model.', function(done) {
        var self = this;
        this.joe.updateAttributes({'age': 22, nickname: 'somename'})
        .then(function(res) {
          expect(res.age).to.equal(22);
          expect(res.nickname).to.equal('somename');
          expect(self.spy).to.have.been.called;
          done();
        })
        .catch(done);
      });
    });

    describe('Model.save', function() {
      it('should execute the callback after updating multiple watched properties on a single model.', function(done) {
        var self = this;
        this.joe.age = 22;
        this.joe.nickname = 'somename';
        this.joe.save()
        .then(function(res) {
          expect(res.age).to.equal(22);
          expect(res.nickname).to.equal('somename');
          expect(self.spy).to.have.been.called;
          done();
        })
        .catch(done);
      });
    });
    
    describe('Model.updateAll', function() {
      it('should execute the callback after updating multiple watched properties on multiple models.', function(done) {
        var self = this;
        this.Person.updateAll(null, {status: 'cancelled'})
        .then(function(res) {
          expect(self.spy).to.have.been.called;
          done();
        })
        .catch(done);
      });
    });

  });
});
