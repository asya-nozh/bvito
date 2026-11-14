const express = require('express')
const mongoose = require('mongoose')
const path = require('node:path')
const { existsSync } = require('node:fs')
const { accounts, loadSession } = require('./server/accounts')
const listings = require('./server/listings')
const currency = require('./server/currency')
const { User, Listing, Session } = require('./server/models')

const app = express()
const dist = path.join(__dirname, 'dist')
const port = Number(process.env.PORT || 3000)
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bvito_portfolio'
app.disable('x-powered-by')

app.use('/api', express.json({ limit: '16kb' }), (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  if (req.get('Sec-Fetch-Site') === 'cross-site' && !['GET', 'HEAD'].includes(req.method)) {
    return res.status(403).json({ message: 'Запрос отклонён.' })
  }
  req.body ??= {}
  next()
})
app.use('/api/rates', currency)
app.use('/api', loadSession)
app.use('/api/account', accounts)
app.use('/api/listings', listings)
app.use('/api', (req, res) => res.status(404).json({ message: 'Запрос не найден.' }))
app.use('/assets', express.static(path.join(dist, 'assets'), { maxAge: '1y', immutable: true, fallthrough: false }))
app.use(express.static(dist, { maxAge: '1h', index: false }))
app.get('*', (req, res, next) => {
  const index = path.join(dist, 'index.html')
  if (!existsSync(index)) return res.status(503).send('Сначала соберите приложение: npm run build')
  if (!/^\/(?:catalog|favorites|mine|reservations|profile|login|new|listing\/[a-f\d]{24}(?:\/edit)?|500)?\/?$/i.test(req.path)) {
    res.status(404)
  }
  res.set('Cache-Control', 'no-cache')
  res.sendFile(index, error => { if (error) next(error) })
})

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error)
  if (error.code === 11000) return res.status(409).json({ message: 'Этот логин уже занят.' })
  if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Проверьте формат данных.' })
  const status = error.status || 500
  if (status >= 500 && !error.status) console.error(error)
  res.status(status).json({
    message: status === 500 ? 'На сервере произошла ошибка. Попробуйте ещё раз.' : error.message
  })
})

async function start() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  await Promise.all([User.init(), Listing.init(), Session.init()])
  const host = process.env.HOST || '127.0.0.1'
  app.listen(port, host, () => console.log('Bvito: http://' + host + ':' + port))
}

start().catch(error => {
  console.error('Не удалось запустить Bvito:', error.message)
  process.exitCode = 1
  mongoose.disconnect()
})

