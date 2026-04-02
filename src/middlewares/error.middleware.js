export default (err, req, res, next) => {
  if (process.env.NODE_ENV !== 'test') console.error(err.message || err)

  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'

  res.status(statusCode).json({
    success: false,
    message,
  })
}
