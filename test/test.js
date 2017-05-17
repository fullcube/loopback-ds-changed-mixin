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
var app = require('./fixtures/simple-app/server/server.js');

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

  beforeEach(function() {
    // Set up some spies so we can check whether our callbacks have been called.
    this.spyAge = this.sinon.spy(app.models.Person, 'changeAge');
    this.spyStatus = this.sinon.spy(app.models.Person, 'changeStatus');
    this.spyName = this.sinon.spy(app.models.Person, 'changeName');
    this.spyFlag = this.sinon.spy(app.models.Person, 'changeFlag');
  });

  lt.beforeEach.withApp(app);

  describe('when called internally', function() {
    lt.beforeEach.givenModel('Person',
      {title: 'Mr', name:'Joe Blogs', nickname: 'joe', age: 21, status: 'active', flag: true}, 'joe');
    lt.beforeEach.givenModel('Person',
      {title: 'Mr', name:'Bilbo Baggins', nickname: 'bilbo', age: 99, status: 'active', flag: true}, 'bilbo');
    lt.beforeEach.givenModel('Person',
      {title: 'Miss', name:'Tina Turner', nickname: 'tina', age: 80, status: 'pending', flag: false}, 'tina');

    describe('Model.create', function() {
      it('should not run callback when creating new instances.', function(done) {
        var self = this;
        expect(self.spyAge).not.to.have.been.called;
        expect(self.spyStatus).not.to.have.been.called;
        expect(self.spyName).not.to.have.been.called;
        expect(self.spyFlag).not.to.have.been.called;
        done();
      });
    });

    describe('Model.updateAttribute', function() {
      it('should not run callback if no watched properties are updated', function(done) {
        var self = this;
        this.joe.updateAttribute('title', 'Newtitle')
        .then(function(res) {
          expect(self.spyAge).not.to.have.been.called;
          expect(self.spyStatus).not.to.have.been.called;
          expect(self.spyName).not.to.have.been.called;
          expect(self.spyFlag).not.to.have.been.called;
          done();
        })
        .catch(done);
      });

      it('should not run any callbacks if no the skipChanged option was set to true', function(done) {
        var self = this;
        this.joe.updateAttribute('name', 'NewName', {skipChanged: true})
        .then(function(res) {
          expect(self.spyAge).not.to.have.been.called;
          expect(self.spyStatus).not.to.have.been.called;
          expect(self.spyName).not.to.have.been.called;
          expect(self.spyFlag).not.to.have.been.called;
          done();
        })
        .catch(done);
      });

      it('should not run specific callbacks that are marked to be skipped in skipChanged', function(done) {
        var self = this;
        this.joe.updateAttribute('name', 'NewName', {skipChanged: ['name']})
        .then(function(res) {
          expect(self.spyAge).not.to.have.been.called;
          expect(self.spyStatus).not.to.have.been.called;
          expect(self.spyName).not.to.have.been.called;
          expect(self.spyFlag).not.to.have.been.called;
          done();
        })
        .catch(done);
      });

      it('should run the callback after updating a watched property', function(done) {
        var self = this;
        this.joe.updateAttribute('age', 22)
        .then(function(res) {
          expect(res.age).to.equal(22);
          expect(self.spyAge).to.have.been.called;
          expect(self.spyStatus).not.to.have.been.called;
          expect(self.spyName).not.to.have.been.called;
          expect(self.spyFlag).not.to.have.been.called;
          done();
        })
        .catch(done);
      });

      it('should run the callback after updating a watched property', function(done) {
        var self = this;
        this.joe.updateAttribute('flag', false)
                .then(function(res) {
                  expect(res.flag).to.equal(false);
                  expect(self.spyAge).not.to.have.been.called;
                  expect(self.spyStatus).not.to.have.been.called;
                  expect(self.spyName).not.to.have.been.called;
                  expect(self.spyFlag).to.have.been.called;
                  done();
                })
                .catch(done);
      });
      it('should run the callback after updating a watched property', function(done) {
        var self = this;
        this.tina.updateAttribute('flag', true)
                .then(function(res) {
                  expect(res.flag).to.equal(true);
                  expect(self.spyAge).not.to.have.been.called;
                  expect(self.spyStatus).not.to.have.been.called;
                  expect(self.spyName).not.to.have.been.called;
                  expect(self.spyFlag).to.have.been.called;
                  done();
                })
                .catch(done);
      });
    });

    describe('Model.updateAttributes', function() {
      it('should not run callback if no watched properties are updated', function(done) {
        var self = this;
        this.joe.updateAttributes({'title': 'Newtitle'})
        .then(function(res) {
          expect(self.spyAge).not.to.have.been.called;
          expect(self.spyStatus).not.to.have.been.called;
          expect(self.spyName).not.to.have.been.called;
          expect(self.spyFlag).not.to.have.been.called;
          done();
        })
        .catch(done);
      });

      it('should not run any callbacks if no the skipChanged option was set to true', function(done) {
        var self = this;
        this.joe.updateAttributes({'name': 'NewName'}, {skipChanged: true})
        .then(function(res) {
          expect(self.spyAge).not.to.have.been.called;
          expect(self.spyStatus).not.to.have.been.called;
          expect(self.spyName).not.to.have.been.called;
          done();
        })
        .catch(done);
      });

      it('should not run specific callbacks that are marked to be skipped in skipChanged', function(done) {
        var self = this;
        this.joe.updateAttributes({'name': 'NewName', 'status': 'test'}, {skipChanged: 'name'})
        .then(function(res) {
          expect(self.spyAge).not.to.have.been.called;
          expect(self.spyStatus).to.have.been.called;
          expect(self.spyName).not.to.have.been.called;
          done();
        })
        .catch(done);
      });

      it('should execute the callback after updating watched properties', function(done) {
        var self = this;
        this.joe.updateAttributes({'age': 22, nickname: 'somename'})
        .then(function(res) {
          expect(res.age).to.equal(22);
          expect(res.nickname).to.equal('somename');
          expect(self.spyAge).to.have.been.called;
          expect(self.spyStatus).not.to.have.been.called;
          expect(self.spyName).to.have.been.called;
          done();
        })
        .catch(done);
      });
    });

    describe('Model.save', function() {
      it('should not run callback if no watched properties are updated', function(done) {
        var self = this;
        this.joe.title = 'Newtitle';
        this.joe.save()
        .then(function(res) {
          expect(self.spyAge).not.to.have.been.called;
          expect(self.spyStatus).not.to.have.been.called;
          expect(self.spyName).not.to.have.been.called;
          done();
        })
        .catch(done);
      });

      it('should not run any callbacks if no the skipChanged option was set to true', function(done) {
        var self = this;
        this.joe.name = 'NewName';
        this.joe.save({skipChanged: true})
        .then(function(res) {
          expect(self.spyAge).not.to.have.been.called;
          expect(self.spyStatus).not.to.have.been.called;
          expect(self.spyName).not.to.have.been.called;
          done();
        })
        .catch(done);
      });

      it('should not run specific callbacks that are marked to be skipped in skipChanged', function(done) {
        var self = this;
        this.joe.name = 'NewName';
        this.joe.status = 'test';
        this.joe.save({skipChanged: 'name'})
        .then(function(res) {
          expect(self.spyAge).not.to.have.been.called;
          expect(self.spyName).not.to.have.been.called;
          expect(self.spyStatus).to.have.been.called;
          done();
        })
        .catch(done);
      });

      it('should execute 1 callback after updating 1 watched property', function(done) {
        var self = this;
        this.joe.age = 22;
        this.joe.save()
          .then(function(res) {
            expect(self.spyAge).to.have.been.called;
            expect(self.spyStatus).not.to.have.been.called;
            expect(self.spyName).not.to.have.been.called;
            done();
          })
          .catch(done);
      });

      it('should execute 2 callbacks after updating 2 watched properties', function(done) {
        var self = this;
        this.joe.age = 22;
        this.joe.nickname = 'somename';
        this.joe.save()
          .then(function(res) {
            expect(self.spyAge).to.have.been.called;
            expect(self.spyStatus).not.to.have.been.called;
            expect(self.spyName).to.have.been.called;
            done();
          })
          .catch(done);
      });
    });

    describe('Model.upsert', function() {
      it('should not run callback if no watched properties are updated', function(done) {
        var self = this;
        this.joe.title = 'Newtitle';
        app.models.Person.upsert(this.joe)
        .then(function(res) {
          expect(self.spyAge).not.to.have.been.called;
          expect(self.spyStatus).not.to.have.been.called;
          expect(self.spyName).not.to.have.been.called;
          done();
        })
        .catch(done);
      });

      it('should not run any callbacks if no the skipChanged option was set to true', function(done) {
        var self = this;
        this.joe.name = 'NewName';
        app.models.Person.upsert(this.joe, {skipChanged: true})
        .then(function(res) {
          expect(self.spyAge).not.to.have.been.called;
          expect(self.spyStatus).not.to.have.been.called;
          expect(self.spyName).not.to.have.been.called;
          done();
        })
        .catch(done);
      });

      it('should not run specific callbacks that are marked to be skipped in skipChanged', function(done) {
        var self = this;
        this.joe.name = 'NewName';
        this.joe.status = 'test';
        app.models.Person.upsert(this.joe, {skipChanged: 'name'})
        .then(function(res) {
          expect(self.spyAge).not.to.have.been.called;
          expect(self.spyName).not.to.have.been.called;
          expect(self.spyStatus).to.have.been.called;
          done();
        })
        .catch(done);
      });

      it('should execute 1 callback after updating 1 watched property', function(done) {
        var self = this;
        this.joe.status = 'pending';
        app.models.Person.upsert(this.joe)
          .then(function(res) {
            expect(self.spyAge).not.to.have.been.called;
            expect(self.spyStatus).to.have.been.called;
            expect(self.spyName).not.to.have.been.called;
            done();
          })
          .catch(done);
      });

      it('should execute 2 callbacks after updating 2 watched properties', function(done) {
        var self = this;
        this.joe.status = 'pending';
        this.joe.age = '23';
        app.models.Person.upsert(this.joe)
          .then(function(res) {
            expect(self.spyAge).to.have.been.called;
            expect(self.spyStatus).to.have.been.called;
            expect(self.spyName).not.to.have.been.called;
            done();
          })
          .catch(done);
      });
    });

    describe('Model.updateAll', function() {
      it('should not run callback if no watched properties are updated', function(done) {
        var self = this;
        app.models.Person.updateAll(null, {title: 'Newtitle'})
        .then(function(res) {
          expect(self.spyAge).not.to.have.been.called;
          expect(self.spyStatus).not.to.have.been.called;
          expect(self.spyName).not.to.have.been.called;
          done();
        })
        .catch(done);
      });

      it('should not run any callbacks if no the skipChanged option was set to true', function(done) {
        var self = this;
        app.models.Person.updateAll(null, {name: 'NewName'}, {skipChanged: true})
        .then(function(res) {
          expect(self.spyAge).not.to.have.been.called;
          expect(self.spyStatus).not.to.have.been.called;
          expect(self.spyName).not.to.have.been.called;
          done();
        })
        .catch(done);
      });

      it('should not run specific callbacks that are marked to be skipped in skipChanged', function(done) {
        var self = this;
        app.models.Person.updateAll(null, {name: 'NewName', status: 'test'}, {skipChanged: 'name'})
          .then(function(res) {
            expect(self.spyAge).not.to.have.been.called;
            expect(self.spyName).not.to.have.been.called;
            expect(self.spyStatus).to.have.been.called;
            done();
          })
        .catch(done);
      });

      it('should execute 1 callback after updating 1 watched propertie on multiple models', function(done) {
        var self = this;
        app.models.Person.updateAll(null, {status: 'pending', title: 'Newtitle'})
          .then(function(res) {
            expect(self.spyAge).not.to.have.been.called;
            expect(self.spyStatus).to.have.been.called;
            expect(self.spyName).not.to.have.been.called;
            done();
          })
          .catch(done);
      });

      it('should execute 2 callbacks after updating 2 watched properties on multiple models', function(done) {
        var self = this;
        app.models.Person.updateAll(null, {status: 'pending', age: '23'})
          .then(function(res) {
            expect(self.spyAge).to.have.been.called;
            expect(self.spyStatus).to.have.been.called;
            expect(self.spyName).not.to.have.been.called;
            done();
          })
          .catch(done);
      });
    });

  });
});
