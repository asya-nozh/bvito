const { createHash, randomBytes, scrypt, timingSafeEqual } = require('node:crypto')
const { promisify } = require('node:util')
const { Router } = require('express')
const { User, Session, Listing } = require('./models')
const { HttpError, route, field, requireUser } = require('./http')

const derive = promisify(scrypt)
const week = 7 * 24 * 60 * 60 * 1000
const cookie = 'bvito_session'
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/'
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = await derive(password, salt, 64)
  return salt + ':' + hash.toString('hex')
}

async function passwordMatches(password, stored) {
  const [salt, hash] = stored.split(':')
  return timingSafeEqual(await derive(password, salt, 64), Buffer.from(hash, 'hex'))
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex')
}

const loadSession = route(async (req, res, next) => {
  const match = req.headers.cookie?.match(/(?:^|;\s*)bvito_session=([a-f0-9]{64})(?:;|$)/)
  if (match) {
    req.session = await Session.findOne({
      token: tokenHash(match[1]),
      expires: { $gt: new Date() }
    }).populate('user')
    req.user = req.session?.user
  }
  next()
})

function profile(user) {
  if (!user) return null
  const { _id, name, login, phone, telegram, favorites } = user
  return { id: _id, name, login, phone, telegram, favorites }
}

async function signIn(req, res, user, status = 200) {
  if (req.session) await req.session.deleteOne()
  const token = randomBytes(32).toString('hex')
  await Session.create({ token: tokenHash(token), user: user._id, expires: new Date(Date.now() + week) })
  res.cookie(cookie, token, { ...cookieOptions, maxAge: week })
  res.status(status).json(profile(user))
}

const accounts = Router()

accounts.get('/me', (req, res) => res.json(profile(req.user)))
accounts.post('/register', route(async (req, res) => {
  const name = field(req.body.name, 'Имя', 2, 50)
  const login = field(req.body.login, 'Логин', 3, 24).toLowerCase()
  const password = field(req.body.password, 'Пароль', 6, 128)
  if (!/^[a-z0-9_]+$/.test(login)) throw new HttpError(400, 'Для логина подойдут латинские буквы, цифры и подчёркивание.')
  const user = await User.create({ name, login, password: await hashPassword(password) })
  await signIn(req, res, user, 201)
}))

accounts.post('/login', route(async (req, res) => {
  const login = field(req.body.login, 'Логин', 3, 24).toLowerCase()
  const password = field(req.body.password, 'Пароль', 1, 128)
  const user = await User.findOne({ login }).select('+password')
  if (!user || !await passwordMatches(password, user.password)) {
    throw new HttpError(401, 'Проверьте логин и пароль.')
  }
  await signIn(req, res, user)
}))

accounts.post('/logout', route(async (req, res) => {
  if (req.session) await req.session.deleteOne()
  res.clearCookie(cookie, cookieOptions).sendStatus(204)
}))

accounts.patch('/me', requireUser, route(async (req, res) => {
  const name = field(req.body.name, 'Имя', 2, 50)
  const phone = field(req.body.phone, 'Телефон', 0, 24)
  const telegram = field(req.body.telegram, 'Telegram', 0, 33).replace(/^@/, '')
  if (phone && (!/^\+?[\d ()-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7)) {
    throw new HttpError(400, 'Введите корректный номер телефона.')
  }
  if (telegram && !/^[a-zA-Z0-9_]{5,32}$/.test(telegram)) {
    throw new HttpError(400, 'Укажите имя пользователя Telegram.')
  }
  // Сохраняем последний контакт продавца, пока у него есть объявления.
  if (!phone && !telegram) {
    const listings = await Listing.exists({ seller: req.user._id })
    if (listings) throw new HttpError(409, 'Оставьте хотя бы один контакт для ваших объявлений.')
  }
  const user = await User.findByIdAndUpdate(req.user._id, { name, phone, telegram }, { new: true })
  res.json(profile(user))
}))

module.exports = { accounts, loadSession, hashPassword }

