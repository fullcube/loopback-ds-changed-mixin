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

// Configure datasource
var dbConnector = null;

var MONGODB_URL = process.env.MONGODB_URL || null;
if (MONGODB_URL) {
  debug('Using mongodb datasource %s', MONGODB_URL);
  var DataSource = require('loopback-datasource-juggler').DataSource;
  dbConnector = new DataSource({
    connector: require('loopback-connector-mongodb'),
    url: MONGODB_URL
  });
} else {
  debug('Using memory datasource');
  dbConnector = loopback.memory();
}

describe('loopback datasource changed property', function() {

  beforeEach(function(done) {

    // A model with 2 Changed properties.
    var Person = this.Person = loopback.PersistedModel.extend('person', {
      name: String,
      nickname: String,
      age: Number,
      status: String,
    }, {
      mixins: {
        Changed: {
          callback: 'basicCallback',
          properties: {
            nickname: 'changeNickname',
            age: 'changeAge',
            status: 'changeStatus'
          }
        }
      }
    });

    // Define a function that should be called when a change is detected.
    Person.basicCallback = function(args, cb) {
      cb = cb || utils.createPromiseCallback();
      debug('this.basicCallback() called with %o', args);
      process.nextTick(function() {
        cb(null);
      });
      return cb.promise;
    };

    // Define a function that should be called when a change is detected.
    Person.changeNickname = function(args, cb) {
      cb = cb || utils.createPromiseCallback();
      debug('this.changeNickname() called with %o', args);
      process.nextTick(function() {
        cb(null);
      });
      return cb.promise;
    };

    // Define a function that should be called when a change is detected.
    Person.changeStatus = function(args, cb) {
      cb = cb || utils.createPromiseCallback();
      debug('this.changeStatus() called with %o', args);
      process.nextTick(function() {
        cb(null);
      });
      return cb.promise;
    };

    // Define a function that should be called when a change is detected.
    Person.changeAge = function(args, cb) {
      cb = cb || utils.createPromiseCallback();
      debug('this.changeAge() called with %o', args);
      process.nextTick(function() {
        cb(null);
      });
      return cb.promise;
    };

    // Set up some spies so we can check whether our callbacks have been called.
    this.spy = sinon.spy(Person, 'basicCallback');
    this.spyAge = sinon.spy(Person, 'changeAge');
    this.spyStatus = sinon.spy(Person, 'changeStatus');
    this.spyNickname = sinon.spy(Person, 'changeNickname');

    Person.attachTo(dbConnector);
    app.model(Person);

    app.use(loopback.rest());
    app.set('legacyExplorer', false);
    done();
  });

  lt.beforeEach.withApp(app);

  describe('when called internally', function() {
    lt.beforeEach.givenModel('person', {name:'Joe Blogs', nickname: 'joe', age: 21, status: 'active'}, 'joe');
    lt.beforeEach.givenModel('person', {name:'Bilbo Baggins', nickname: 'bilbo', age: 99, status: 'active'}, 'bilbo');
    lt.beforeEach.givenModel('person', {name:'Tina Turner', nickname: 'tina', age: 80, status: 'pending'}, 'tina');

    describe('Model.create', function() {
      it('should not run callback when creating new instances.', function(done) {
        var self = this;
        expect(self.spy).not.to.have.been.called;
        expect(self.spyAge).not.to.have.been.called;
        expect(self.spyStatus).not.to.have.been.called;
        expect(self.spyNickname).not.to.have.been.called;
        done();
      });
    });

    describe('Model.updateAttribute', function() {
      it('should not run callback if no watched properties are updated', function(done) {
        var self = this;
        this.joe.updateAttribute('name', 'Newname')
        .then(function(res) {
          expect(self.spy).not.to.have.been.called;
          expect(self.spyAge).not.to.have.been.called;
          expect(self.spyStatus).not.to.have.been.called;
          expect(self.spyNickname).not.to.have.been.called;
          done();
        })
        .catch(done);
      });

      it('should run the callback after updating a watched property', function(done) {
        var self = this;
        var expectedParams = {};
        expectedParams[this.joe.id] = { age: 22 };
        this.joe.updateAttribute('age', 22)
        .then(function(res) {
          expect(res.age).to.equal(22);
          expect(self.spy).to.have.been.called;
          expect(self.spy).to.have.been.calledWith(expectedParams);
          expect(self.spyAge).to.have.been.called;
          expect(self.spyStatus).not.to.have.been.called;
          expect(self.spyNickname).not.to.have.been.called;
          done();
        })
        .catch(done);
      });
    });

    describe('Model.updateAttributes', function() {
      it('should not run callback if no watched properties are updated', function(done) {
        var self = this;
        this.joe.updateAttributes({'name': 'Newname'})
        .then(function(res) {
          expect(self.spy).not.to.have.been.called;
          expect(self.spyAge).not.to.have.been.called;
          expect(self.spyStatus).not.to.have.been.called;
          expect(self.spyNickname).not.to.have.been.called;
          done();
        })
        .catch(done);
      });

      it('should execute the callback after updating watched properties', function(done) {
        var self = this;
        var expectedParams = {};
        expectedParams[this.joe.id] = { age: 22, nickname: "somename" };
        this.joe.updateAttributes({'age': 22, nickname: 'somename'})
        .then(function(res) {
          expect(res.age).to.equal(22);
          expect(res.nickname).to.equal('somename');
          expect(self.spy).to.have.been.called;
          expect(self.spy).to.have.been.calledWith(expectedParams);
          expect(self.spyAge).to.have.been.called;
          expect(self.spyStatus).not.to.have.been.called;
          expect(self.spyNickname).to.have.been.called;
          done();
        })
        .catch(done);
      });
    });

    describe('Model.save', function() {
      it('should not run callback if no watched properties are updated', function(done) {
        var self = this;
        this.joe.name = 'Newname';
        this.joe.save()
        .then(function(res) {
          expect(self.spy).not.to.have.been.called;
          expect(self.spyAge).not.to.have.been.called;
          expect(self.spyStatus).not.to.have.been.called;
          expect(self.spyNickname).not.to.have.been.called;
          done();
        })
        .catch(done);
      });

      it('should execute the callback after updating watched properties', function(done) {
        var self = this;
        var expectedParams = {};
        expectedParams[this.joe.id] = { age: 22, nickname: "somename" };
        this.joe.age = 22;
        this.joe.nickname = 'somename';
        this.joe.save()
        .then(function(res) {
          expect(self.spy).to.have.been.called;
          expect(self.spy).to.have.been.calledWith(expectedParams);
          expect(self.spyAge).to.have.been.called;
          expect(self.spyStatus).not.to.have.been.called;
          expect(self.spyNickname).to.have.been.called;
          done();
        })
        .catch(done);
      });
    });

    describe('Model.upsert', function() {
      it('should not run callback if no watched properties are updated', function(done) {
        var self = this;
        this.joe.name = 'Newname';
        this.Person.upsert(this.joe)
        .then(function(res) {
          expect(self.spy).not.to.have.been.called;
          expect(self.spyAge).not.to.have.been.called;
          expect(self.spyStatus).not.to.have.been.called;
          expect(self.spyNickname).not.to.have.been.called;
          done();
        })
        .catch(done);
      });

      it('should execute the callback after updating watched properties', function(done) {
        var self = this;
        var expectedParams = {};
        expectedParams[this.joe.id] = { status: 'pending' };
        this.joe.status = 'pending';
        this.Person.upsert(this.joe)
        .then(function(res) {
          expect(self.spy).to.have.been.called;
          expect(self.spy).to.have.been.calledWith(expectedParams);
          expect(self.spyAge).not.to.have.been.called;
          expect(self.spyStatus).to.have.been.called;
          expect(self.spyNickname).not.to.have.been.called;
          done();
        })
        .catch(done);
      });
    });

    describe('Model.updateAll', function() {
      it('should not run callback if no watched properties are updated', function(done) {
        var self = this;
        this.Person.updateAll(null, {name: 'Newname'})
        .then(function(res) {
          expect(self.spy).not.to.have.been.called;
          expect(self.spyAge).not.to.have.been.called;
          expect(self.spyStatus).not.to.have.been.called;
          expect(self.spyNickname).not.to.have.been.called;
          done();
        })
        .catch(done);
      });

      it('should execute the callback after updating watched properties on multiple models', function(done) {
        var self = this;
        var expectedParams = {};
        expectedParams[this.joe.id] = { status: 'pending' };
        expectedParams[this.bilbo.id] = { status: 'pending' };
        this.Person.updateAll(null, {status: 'pending', name: 'pending'})
        .then(function(res) {
          expect(self.spy).to.have.been.called;
          expect(self.spy).to.have.been.calledWith(expectedParams);
          expect(self.spyAge).not.to.have.been.called;
          expect(self.spyStatus).to.have.been.called;
          expect(self.spyNickname).not.to.have.been.called;
          done();
        })
        .catch(done);
      });
    });

  });
});
