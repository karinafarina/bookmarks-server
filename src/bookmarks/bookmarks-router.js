const express = require('express')
const xss = require('xss')
const { bookmarks } = require('../store')
const bookmarkRouter = express.Router()
const { isWebUri } = require('valid-url')
const uuid = require('uuid/v4')
const bodyParser = express.json()
const logger = require('../logger')
const BookmarksService = require('./bookmarks-service')

const serializeBookmark = bookmark => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  url: bookmark.url,
  description: xss(bookmark.description),
  rating: Number(bookmark.rating),
})

bookmarkRouter
  .route('/bookmarks')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res.json(serializeBookmark(bookmarks))
      })
      .catch(next)
  })
  .post(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body;

    for( const field of ['title', 'url', 'rating']) {
      if(!req.body[field]) {
        logger.error(`${field} is required`)
        return res.status(400).send({
          error: { message: `'${field}' is required` }
        })
      }
    }

    if (!isWebUri(url)) {
      logger.error('Invalid URL');
      return res
        .status(400)
        .send('Invalid data');
    }
    
    const ratingNum = Number(rating)
    if (!Number.isInteger(ratingNum) || ratingNum < 0 || rating > 5) {
      logger.error(`Invalid rating '${rating}' suplied`);
      return res.status(400).send({
          error: { message: `'rating' must be a number between 0 and 5` }
      })
    }
    //get an id
    const id = uuid();
    const bookmark = {
      id,
      title,
      url,
      description,
      rating
    };
    bookmarks.push(bookmark);

    logger.info(`Bookmark with id ${id} created`);

    res
      .status(201)
      .location(`http://localhost:8000/bookmarks/${id}`)
      .json(serializeBookmark(bookmark))
  })

bookmarkRouter
  .route('/bookmarks/:bookmark_id')
  .all((req, res, next) => {
    console.log('params', req.params)
    const knexInstance = req.app.get('db')
    const { bookmark_id } = req.params;
    BookmarksService.getById(knexInstance, bookmark_id)
      .then(bookmark => {
        if(!bookmark) {
          logger.error(`Bookmark with id ${bookmark_id} not found.`)
          return res.status(404).json({
            error: { message: `Bookmark not found` }
          })
        }
        res.bookmark = bookmark
        next()
      })
      .catch(next)
    })
    .get((req, res) => {
      res.json(serializeBookmark(res.bookmark))
    })
  .delete((req, res, next) => {
    const { bookmark_id } = req.params
    BookmarksService.deleteBookmark(
      req.app.get('db'),
      bookmark_id
    )
      .then(numRowsAffected => {
        logger.info(`Bookmark with id ${bookmark_id} deleted.`)
        res.status(204).end()
      })
      .catch(next)
  })

  module.exports = bookmarkRouter