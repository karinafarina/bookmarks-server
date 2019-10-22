const knex = require('knex')
const app = require('../src/app')
// const jsonParser = express.json()
const { makeBookmarksArray, makeMaliciousBookmark } = require('./bookmarks.fixtures')

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
    const testBookmarks = makeBookmarksArray()

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

    it(`responds with 401 Unauthorized for GET /bookmarks/:id`, () => {
      const secondBookmark = testBookmarks[1]
      return supertest(app)
        .get(`/bookmarks/${secondBookmark.id}`)
        .expect(401, { error: 'Unauthorized request' })
    })
  })

  describe('GET /bookmarks', () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, [])
      })
    })
    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('inser bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it('gets the bookmarks from the store', () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testBookmarks)
      })
    })
  })
  describe('GET /bookmarks/:bookmark_id', () => {
    context(`Given no bookmarks`, () => {
      it(`responds 404 when bookmark doesn't exist`, () => {
        const bookmarkId = 12345
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, {
            error: { message: `Bookmark not found` }
          })
      })
    })

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it('responds with 200 and the specified bookmark', () => {
        bookmarkId = 2
        const expectedBookmark = testBookmarks[bookmarkId -1]
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedBookmark)
      })
    })
    context(`Given an XSS attack bookmark`, () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()
      beforeEach('insert malicious article', () => {
        return db
          .into('bookmarks')
          .insert([ maliciousBookmark ])
      })
      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/bookmarks/${maliciousBookmark.id}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200)
          .expect(res => {
            expect(res.body.title).to.eql(expectedBookmark.title)
            expect(res.body.description).to.eql(expectedBookmark.description)
          })
      })
    })
  })
  describe(`POST /bookmarks`, () => {
    it(`responds with 400 and an error message when the 'title' is missing`, () => {
      return supertest(app)
        .post('/bookmarks')
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .send({
          url: 'https://test.com',
          description: 'test description',
          rating: 2,
        })
        .expect(400, {
          error: { message: `'title' is required` }
        })
    })
    it(`responds with 400 and an error messaage when the 'url' is missing`, () => {
      return supertest(app)
        .post('/bookmarks')
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .send({
          title: 'Test new bookmark',
          description: 'test description',
          rating: 2,
        })
        .expect(400, {
          error: { message: `'url' is required` }
        })
    })
    it(`responds with 400 and an error message when the 'rating' is missing`, () => {
      return supertest(app)
        .post('/bookmarks')
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .send({
          title: 'Test new bookmark',
          url: 'https://test.com',
          description: 'test description',
        })
        .expect(400, {
          error: { message: `'rating' is required`}
        })
    })
    it(`responds with 400 invalid 'rating ' if not between 0 and 5`, () => {
      const newBookmarkInvalidRating = {
        title: 'test-title',
        url: 'https://test.com',
        rating: 'invalid',
      }
      return supertest(app)
        .post('/bookmarks')
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .send(newBookmarkInvalidRating)
        .expect(400, {
          error: { message: `'rating' must be a number between 0 and 5`}
        })

    })
    it(`creates an bookmark, responding with 201 and the new bookmark`, function() {
      const newBookmark = {
        title: 'Test new bookmark',
        url: 'https://test.com',
        description: 'test description',
        rating: 2,
      }
      return supertest(app)
        .post('/bookmarks')
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .send(newBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newBookmark.title)
          expect(res.body.url).to.eql(newBookmark.url)
          expect(res.body.description).to.eql(newBookmark.description)
          expect(res.body).to.have.property('id')
        })
    })

    it('removes XSS attack content from response', () => {
      const { maliciousBookmark, expectedBookmark} = makeMaliciousBookmark()
      return supertest(app)
        .post(`/bookmarks`)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .send(maliciousBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(expectedBookmark.title)
          expect(res.body.description).to.eql(expectedBookmark.description)
        })
    })
    describe.only(`DELETE /bookmarks/:bookmark_id`, () => {
      context('Given there are bookmarks in the database', () => {
        const testBookmarks = makeBookmarksArray()

        beforeEach('insert bookmarks', () => {
          return db
            .into('bookmarks')
            .insert(testBookmarks)
        })

        it('responds with 204 and removes the bookmark', () => {
          const idToRemove = 2
          const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove)
          return supertest(app)
            .delete(`/bookmarks/${idToRemove}`)
            .expect(204)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .then(() =>
              supertest(app)
              .get(`/bookmarks`)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedBookmarks)
            )
        })
      })
    })
  })
})
