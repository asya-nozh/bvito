class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function route(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

function requireUser(req, res, next) {
  if (!req.user) return next(new HttpError(401, 'Сначала войдите в аккаунт.'))
  next()
}

function field(value, label, min, max) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (text.length < min || text.length > max) {
    throw new HttpError(400, label + ' — от ' + min + ' до ' + max + ' символов.')
  }
  return text
}

module.exports = { HttpError, route, requireUser, field }

