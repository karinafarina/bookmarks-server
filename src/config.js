module.exports = {
  PORT: process.env.PORT || 8000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_TOKEN: process.env.API_TOKEN || "AIzaSyC1TGvhblAE8MHZ_cmk4FDEiTJruZXxs_Q",
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://dunder_mifflin@localhost/bookmarks',
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL || "postgresql://dunder_mifflin@localhost/bookmarks-test"
}