const BookmarksService =  {
  getAllBookmarks(knex) {
    return knex.select('*').from('bookmarks')
  },
  getById(knex, id) {
    return knex.from('bookmarks').select('*').where('id', id).first()
  },
  deleteBookmark(knex, id) {
    return knex('bookmarks')
      .where({ id })
      .delete()
  }
}

module.exports = BookmarksService