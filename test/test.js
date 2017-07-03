const lt = require('loopback-testing')
const chai = require('chai')
const { expect } = chai

chai.use(require('dirty-chai'))
chai.use(require('sinon-chai'))
require('mocha-sinon')

// Create a new loopback app.
const app = require('./fixtures/simple-app/server/server.js')

describe('loopback datasource changed property', function() {
  beforeEach(function() {
    // Set up some spies so we can check whether our callbacks have been called.
    this.spyAge = this.sinon.spy(app.models.Person, 'changeAge')
    this.spyStatus = this.sinon.spy(app.models.Person, 'changeStatus')
    this.spyName = this.sinon.spy(app.models.Person, 'changeName')
  })

  lt.beforeEach.withApp(app)

  describe('when called internally', function() {
    lt.beforeEach.givenModel('Person',
      { title: 'Mr', name: 'Joe Blogs', nickname: 'joe', age: 21, status: 'active' }, 'joe')
    lt.beforeEach.givenModel('Person',
      { title: 'Mr', name: 'Bilbo Baggins', nickname: 'bilbo', age: 99, status: 'active' }, 'bilbo')
    lt.beforeEach.givenModel('Person',
      { title: 'Miss', name: 'Tina Turner', nickname: 'tina', age: 80, status: 'pending' }, 'tina')

    describe('Model.create', function() {
      it('should not run callback when creating new instances.', function(done) {
        const self = this

        expect(self.spyAge).not.to.have.been.called()
        expect(self.spyStatus).not.to.have.been.called()
        expect(self.spyName).not.to.have.been.called()
        done()
      })
    })

    describe('Model.updateAttribute', function() {
      it('should not run callback if no watched properties are updated', function() {
        return this.joe.updateAttribute('title', 'Newtitle')
          .then(() => {
            expect(this.spyAge).not.to.have.been.called()
            expect(this.spyStatus).not.to.have.been.called()
            expect(this.spyName).not.to.have.been.called()
          })
      })

      it('should not run any callbacks if no the skipChanged option was set to true', function() {
        return this.joe.updateAttribute('name', 'NewName', { skipChanged: true })
          .then(() => {
            expect(this.spyAge).not.to.have.been.called()
            expect(this.spyStatus).not.to.have.been.called()
            expect(this.spyName).not.to.have.been.called()
          })
      })

      it('should not run specific callbacks that are marked to be skipped in skipChanged', function() {
        this.joe.updateAttribute('name', 'NewName', { skipChanged: [ 'name' ] })
          .then(() => {
            expect(this.spyAge).not.to.have.been.called()
            expect(this.spyStatus).not.to.have.been.called()
            expect(this.spyName).not.to.have.been.called()
          })
      })

      it('should run the callback after updating a watched property', function() {
        this.joe.updateAttribute('age', 22)
        .then(res => {
          expect(res.age).to.equal(22)
          expect(this.spyAge).to.have.been.called()
          expect(this.spyStatus).not.to.have.been.called()
          expect(this.spyName).not.to.have.been.called()
        })
      })
    })

    describe('Model.updateAttributes', function() {
      it('should not run callback if no watched properties are updated', function() {
        return this.joe.updateAttributes({ 'title': 'Newtitle' })
          .then(() => {
            expect(this.spyAge).not.to.have.been.called()
            expect(this.spyStatus).not.to.have.been.called()
            expect(this.spyName).not.to.have.been.called()
          })
      })

      it('should not run any callbacks if no the skipChanged option was set to true', function() {
        return this.joe.updateAttributes({ 'name': 'NewName' }, { skipChanged: true })
          .then(() => {
            expect(this.spyAge).not.to.have.been.called()
            expect(this.spyStatus).not.to.have.been.called()
            expect(this.spyName).not.to.have.been.called()
          })
      })

      it('should not run specific callbacks that are marked to be skipped in skipChanged', function() {
        return this.joe.updateAttributes({ 'name': 'NewName', 'status': 'test' }, { skipChanged: 'name' })
          .then(() => {
            expect(this.spyAge).not.to.have.been.called()
            expect(this.spyStatus).to.have.been.called()
            expect(this.spyName).not.to.have.been.called()
          })
      })

      it('should execute the callback after updating watched properties', function() {
        return this.joe.updateAttributes({ 'age': 22, nickname: 'somename' })
        .then(res => {
          expect(res.age).to.equal(22)
          expect(res.nickname).to.equal('somename')
          expect(this.spyAge).to.have.been.called()
          expect(this.spyStatus).not.to.have.been.called()
          expect(this.spyName).to.have.been.called()
        })
      })
    })

    describe('Model.save', function() {
      it('should not run callback if no watched properties are updated', function() {
        this.joe.title = 'Newtitle'
        return this.joe.save()
          .then(() => {
            expect(this.spyAge).not.to.have.been.called()
            expect(this.spyStatus).not.to.have.been.called()
            expect(this.spyName).not.to.have.been.called()
          })
      })

      it('should not run any callbacks if no the skipChanged option was set to true', function() {
        this.joe.name = 'NewName'
        return this.joe.save({ skipChanged: true })
          .then(() => {
            expect(this.spyAge).not.to.have.been.called()
            expect(this.spyStatus).not.to.have.been.called()
            expect(this.spyName).not.to.have.been.called()
          })
      })

      it('should not run specific callbacks that are marked to be skipped in skipChanged', function() {
        this.joe.name = 'NewName'
        this.joe.status = 'test'
        return this.joe.save({ skipChanged: 'name' })
          .then(() => {
            expect(this.spyAge).not.to.have.been.called()
            expect(this.spyName).not.to.have.been.called()
            expect(this.spyStatus).to.have.been.called()
          })
      })

      it('should execute 1 callback after updating 1 watched property', function() {
        this.joe.age = 22
        return this.joe.save()
          .then(() => {
            expect(this.spyAge).to.have.been.called()
            expect(this.spyStatus).not.to.have.been.called()
            expect(this.spyName).not.to.have.been.called()
          })
      })

      it('should execute 2 callbacks after updating 2 watched properties', function() {
        this.joe.age = 22
        this.joe.nickname = 'somename'
        this.joe.save()
          .then(() => {
            expect(this.spyAge).to.have.been.called()
            expect(this.spyStatus).not.to.have.been.called()
            expect(this.spyName).to.have.been.called()
          })
      })
    })

    describe('Model.upsert', function() {
      it('should not run callback if no watched properties are updated', function() {
        this.joe.title = 'Newtitle'
        return app.models.Person.upsert(this.joe)
          .then(() => {
            expect(this.spyAge).not.to.have.been.called()
            expect(this.spyStatus).not.to.have.been.called()
            expect(this.spyName).not.to.have.been.called()
          })
      })

      it('should not run any callbacks if no the skipChanged option was set to true', function() {
        this.joe.name = 'NewName'
        return app.models.Person.upsert(this.joe, { skipChanged: true })
          .then(() => {
            expect(this.spyAge).not.to.have.been.called()
            expect(this.spyStatus).not.to.have.been.called()
            expect(this.spyName).not.to.have.been.called()
          })
      })

      it('should not run specific callbacks that are marked to be skipped in skipChanged', function() {
        this.joe.name = 'NewName'
        this.joe.status = 'test'
        return app.models.Person.upsert(this.joe, { skipChanged: 'name' })
          .then(() => {
            expect(this.spyAge).not.to.have.been.called()
            expect(this.spyName).not.to.have.been.called()
            expect(this.spyStatus).to.have.been.called()
          })
      })

      it('should execute 1 callback after updating 1 watched property', function() {
        this.joe.status = 'pending'
        return app.models.Person.upsert(this.joe)
          .then(() => {
            expect(this.spyAge).not.to.have.been.called()
            expect(this.spyStatus).to.have.been.called()
            expect(this.spyName).not.to.have.been.called()
          })
      })

      it('should execute 2 callbacks after updating 2 watched properties', function() {
        this.joe.status = 'pending'
        this.joe.age = '23'
        return app.models.Person.upsert(this.joe)
          .then(() => {
            expect(this.spyAge).to.have.been.called()
            expect(this.spyStatus).to.have.been.called()
            expect(this.spyName).not.to.have.been.called()
          })
      })
    })

    describe('Model.updateAll', function() {
      it('should not run callback if no watched properties are updated', function() {
        return app.models.Person.updateAll(null, { title: 'Newtitle' })
          .then(() => {
            expect(this.spyAge).not.to.have.been.called()
            expect(this.spyStatus).not.to.have.been.called()
            expect(this.spyName).not.to.have.been.called()
          })
      })

      it('should not run any callbacks if no the skipChanged option was set to true', function() {
        return app.models.Person.updateAll(null, { name: 'NewName' }, { skipChanged: true })
          .then(() => {
            expect(this.spyAge).not.to.have.been.called()
            expect(this.spyStatus).not.to.have.been.called()
            expect(this.spyName).not.to.have.been.called()
          })
      })

      it('should not run specific callbacks that are marked to be skipped in skipChanged', function() {
        return app.models.Person.updateAll(null, { name: 'NewName', status: 'test' }, { skipChanged: 'name' })
          .then(() => {
            expect(this.spyAge).not.to.have.been.called()
            expect(this.spyName).not.to.have.been.called()
            expect(this.spyStatus).to.have.been.called()
          })
      })

      it('should execute 1 callback after updating 1 watched propertie on multiple models', function() {
        return app.models.Person.updateAll(null, { status: 'pending', title: 'Newtitle' })
          .then(() => {
            expect(this.spyAge).not.to.have.been.called()
            expect(this.spyStatus).to.have.been.called()
            expect(this.spyName).not.to.have.been.called()
          })
      })

      it('should execute 2 callbacks after updating 2 watched properties on multiple models', function() {
        return app.models.Person.updateAll(null, { status: 'pending', age: '23' })
          .then(() => {
            expect(this.spyAge).to.have.been.called()
            expect(this.spyStatus).to.have.been.called()
            expect(this.spyName).not.to.have.been.called()
          })
      })
    })

  })
})
