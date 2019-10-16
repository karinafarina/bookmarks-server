const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { makeBookmarksArray } = require('./bookmarks.fixtures')

describe('Bookmarks Enpoints', function() {
  let db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('clean the table', () => db('bookmarks').truncate())

  afterEach('cleanup', () => db('bookmarks').truncate())

  describe(`Unauthorized requests`, () => {
    const testBookmarks = fixtures.makeBookmarksArray()

    beforeEach('insert bookmarks', () => {
    return db
      .into('bookmarks')
      .insert(testBookmarks)
  })

  it(`responds with 401 Unauthorized for GET /bookmarks`, () => {
    return supertest(app)
      .get('/bookmarks')
      .expect(401, { error: 'Unauthorized request' })
  })
  

  context('Given there are bookmarks in the database', () => {
    const testBookmarks = makeBookmarksArray()

    beforeEach('inser articles', () => {
      return db
        .into('bookmarks')
        .insert(testBookmarks)
    })
  })
})