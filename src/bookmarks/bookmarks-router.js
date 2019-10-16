const express = require('express')
const { bookmarks } = require('../store')
const bookmarkRouter = express.Router()
const { isWebUri } = require('valid-url')
const uuid = require('uuid/v4')
const bodyParser = express.json()
const logger = require('../logger')
const BookmarksService = require('./bookmarks-service')


bookmarkRouter
  .route('/bookmarks')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res.json(bookmarks)
      })
      .catch(next)
  })
  .post(bodyParser, (req, res) => {
    const { title, url, description, rating } = req.body;

    if (!title) {
      logger.error('Title is required');
      return res
        .status(400)
        .send('Invalid data');
    }
    if (!isWebUri(url)) {
      logger.error('Invalid URL');
      return res
        .status(400)
        .send('Invalid data');
    }
    if (!description) {
      logger.error('Description is required');
      return res
        .status(400)
        .send('Invalid data');
    }
    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
      logger.error('Invalid rating');
      return res
        .status(400)
        .send('Rating must be a number between 0 and 5');
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
    console.log(bookmarks);
    bookmarks.push(bookmark);

    logger.info(`Bookmark with id ${id} created`);

    res
      .status(201)
      .location(`http://localhost:8000/bookmarks/${id}`)
      .json(bookmark)
  })

bookmarkRouter
  .route('/bookmarks/:id')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    const { id } = req.params;
    BookmarksService.getById(knexInstance, id)
      .then(bookmark => {
        if(!bookmark) {
          logger.error(`Bookmark with id ${id} not found.`)
          return res.status(404).json({
            error: { message: `Bookmark not found` }
          })
        }
        res.json(bookmark)
      })
      .catch(next)
    })
  .delete((req, res) => {
    const { id } = req.params;
    const bookmarkIndex = bookmarks.findIndex(bm => bm.id == id);

    if (bookmarkIndex === -1) {
      logger.error(`Bookmark with id ${id} not found.`);
      return res
        .status(404)
        .send('Not Found');
    }
    bookmarks.splice(bookmarkIndex, 1);

    logger.info(`Bookmark with id ${id} deleted.`);
    res
      .status(204)
      .end();
  })

  module.exports = bookmarkRouter