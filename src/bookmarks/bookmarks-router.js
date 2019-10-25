const express = require('express')
const xss = require('xss')
const path = require('path')
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
  .route('/')
  
  .get((req, res, next) => {
    BookmarksService.getAllBookmarks(req.app.get('db'))
      .then(bookmarks => {
        res.json(bookmarks.map(serializeBookmark))
      })
      .catch(next)
  })

  .post(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body
    const newBookmark = { title, url, description, rating }

    for( const field of ['title', 'url', 'rating']) {
      if(!newBookmark[field]) {
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

    BookmarksService.insertBookmark(
      req.app.get('db'),
      newBookmark
    )
    .then(bookmark => {
      logger.info(`Bookmark with id ${bookmark.id} created`)
      res
      .status(201)
      .location(path.posix.join(req.originalUrl, `/${bookmark.id}`))
      .json(serializeBookmark(bookmark))
    })
    .catch(next)
})

bookmarkRouter
  .route('/:bookmark_id')
  .all((req, res, next) => {
    const knexInstance = req.app.get('db')
    const { bookmark_id } = req.params;
    BookmarksService.getById(knexInstance, bookmark_id)
      .then(bookmark => {
        if(!bookmark) {
          logger.error(`Bookmark with id ${bookmark_id} not found.`)
          return res.status(404).json({
            error: { message: `Bookmark doesn't exist` }
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

  .patch(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body
    const bookmarkToUpdate = { title, url, description, rating }
    
    const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean).length
    console.log('number of  valules: ', numberOfValues)
      if(numberOfValues === 0) {
        return res.status(400).json({
          error: {
            message: `Request body must contain either 'title', 'url', 'description', or 'rating'`
          }
        })
      }
    
    BookmarksService.updateBookmark(
      req.app.get('db'),
      req.params.bookmark_id,
      bookmarkToUpdate
    )
    .then(numRowsAffected => {
      res.status(204).end()
    })
    .catch(next)
  })

  module.exports = bookmarkRouter