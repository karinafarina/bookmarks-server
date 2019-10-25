require('dotenv').config()
const express = require('express')
const { API_TOKEN, NODE_ENV } = require('./config')
const logger = require('./logger')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const bookmarkRouter = require('./bookmarks/bookmarks-router')

const app = express()

app.use(function validateBearerToken(req, res, next) {
  const authToken = req.get('Authorization')

  if (!authToken || authToken.split(' ')[1] !== API_TOKEN) {
    logger.error(`Unauthorized request to path: ${req.path}`);
    return res.status(401).json({ error: 'Unauthorized request' })
  }
  // move to the next middleware
  next()
})

app.use(morgan((NODE_ENV === 'production') ? 'tiny' : 'common', {
  skip: () => NODE_ENV === 'test'
}))
app.use(helmet())
app.use(cors())
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello Express.')
})
app.use('/api/bookmarks', bookmarkRouter)       

app.use(function errorHandler(error, req, res, next) {
  let response 
  if(NODE_ENV === 'production') {
    response = { error: { message: 'server error ' } }
  } else {
    console.error(error)
    response = { message: error.message, error }
  }
  res.status(500).json(response)
})

module.exports = app
