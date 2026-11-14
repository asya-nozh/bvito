const { Router } = require('express')
const { isObjectIdOrHexString } = require('mongoose')
const { User, Listing } = require('./models')
const { route, HttpError, requireUser, field } = require('./http')
const categories = require('../shared/categories.json')

const listings = Router()
const pageSize = 12
const sortOrders = {
  newest: { createdAt: -1, _id: -1 },
  low: { price: 1, _id: 1 },
  high: { price: -1, _id: -1 }
}

function publicListing(listing, user) {
  const { demoKey, __v, reservedBy, seller, ...data } = listing
  const sellerId = seller?._id ?? seller
  const isMine = Boolean(user && String(sellerId) === String(user._id))
  const reservedByMe = Boolean(user && String(reservedBy) === String(user._id))
  const result = {
    ...data,
    seller: { name: seller?.name || 'Продавец' },
    isMine, reservedByMe, reserved: Boolean(reservedBy)
  }
  if (reservedByMe && seller && Object.hasOwn(seller, 'phone')) {
    result.contact = { phone: seller?.phone || '', telegram: seller?.telegram || '' }
  }
  return result
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function priceFilter(value) {
  if (value === undefined || value === '') return undefined
  if (typeof value !== 'string' || !/^\d{1,9}$/.test(value)) {
    throw new HttpError(400, 'Укажите цену целым числом от 0 до 999 999 999 ₽.')
  }
  return Number(value)
}

listings.get('/', route(async (req, res) => {
  const { q, category, subcategory, condition, sort, view, page } = req.query
  const filter = {}
  const pageNumber = Number(page ?? 1)
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 10000) {
    throw new HttpError(400, 'Неверный номер страницы.')
  }
  if (view && !['mine', 'favorites', 'reservations'].includes(view)) throw new HttpError(400, 'Неизвестный раздел.')
  if (view && !req.user) throw new HttpError(401, 'Сначала войдите в аккаунт.')
  if (view === 'mine') filter.seller = req.user._id
  if (view === 'favorites') filter._id = { $in: req.user.favorites }
  if (view === 'reservations') filter.reservedBy = req.user._id
  if (category) {
    if (!Object.hasOwn(categories, category)) throw new HttpError(400, 'Неизвестная категория.')
    filter.category = category
  }
  if (subcategory) {
    if (!category || !categories[category].includes(subcategory)) throw new HttpError(400, 'Неизвестная подкатегория.')
    filter.subcategory = subcategory
  }
  if (condition) {
    if (!['new', 'used'].includes(condition)) throw new HttpError(400, 'Неизвестное состояние.')
    filter.condition = condition
  }
  const min = priceFilter(req.query.min)
  const max = priceFilter(req.query.max)
  if (min !== undefined && max !== undefined && min > max) {
    throw new HttpError(400, 'Минимальная цена выше максимальной.')
  }
  if (min !== undefined || max !== undefined) {
    filter.price = {}
    if (min !== undefined) filter.price.$gte = min
    if (max !== undefined) filter.price.$lte = max
  }
  if (q !== undefined && (typeof q !== 'string' || q.length > 100)) {
    throw new HttpError(400, 'Поисковый запрос должен быть короче 101 символа.')
  }
  const words = (q || '').trim().split(/\s+/).filter(Boolean).slice(0, 8)
  const patterns = words.map(word => new RegExp(escapeRegex(word), 'i'))
  const order = Object.hasOwn(sortOrders, sort) ? sortOrders[sort] : sortOrders.newest
  const skip = (pageNumber - 1) * pageSize
  let items
  if (patterns.length) {
    filter.$and = patterns.map(pattern => ({ $or: [{ title: pattern }, { description: pattern }] }))
    const titleScore = patterns.map(regex => ({
      $cond: [{ $regexMatch: { input: { $ifNull: ['$title', ''] }, regex } }, 1, 0]
    }))
    items = await Listing.aggregate([
      { $match: filter },
      { $addFields: { relevance: { $add: titleScore } } },
      { $sort: sort === 'low' || sort === 'high' ? order : { relevance: -1, ...order } },
      { $skip: skip }, { $limit: pageSize + 1 },
      { $project: { relevance: 0 } }
    ])
  } else {
    items = await Listing.find(filter).sort(order).skip(skip).limit(pageSize + 1).lean()
  }
  const results = await Listing.populate(items.slice(0, pageSize), { path: 'seller', select: 'name' })
  res.json({ items: results.map(item => publicListing(item, req.user)), hasMore: items.length > pageSize })
}))

listings.param('id', (req, res, next, id) => {
  if (!isObjectIdOrHexString(id)) return next(new HttpError(404, 'Объявление не найдено.'))
  next()
})

async function loadListing(id, user) {
  const listing = await Listing.findById(id).populate('seller', 'name phone telegram').lean()
  if (!listing) throw new HttpError(404, 'Объявление не найдено.')
  return publicListing(listing, user)
}

listings.get('/:id', route(async (req, res) => {
  res.json(await loadListing(req.params.id, req.user))
}))

function listingFields(body) {
  const title = field(body.title, 'Заголовок', 3, 90)
  const description = field(body.description, 'Описание', 5, 1500)
  const { category, subcategory, condition } = body
  if (!Object.hasOwn(categories, category) || !categories[category].includes(subcategory)) {
    throw new HttpError(400, 'Выберите категорию и подкатегорию.')
  }
  if (!['new', 'used'].includes(condition)) throw new HttpError(400, 'Выберите состояние вещи.')
  const price = body.price
  if (!Number.isInteger(price) || price < 0 || price > 999999999) {
    throw new HttpError(400, 'Цена должна быть целым числом от 0 до 999 999 999 ₽.')
  }
  const image = field(body.image, 'Ссылка на фото', 0, 1000)
  if (image && !/^\/demo\/[a-z0-9-]+\.webp$/.test(image)) {
    let url
    try { url = new URL(image) } catch {
      throw new HttpError(400, 'Укажите полную ссылку на фото.')
    }
    if (!['http:', 'https:'].includes(url.protocol)) throw new HttpError(400, 'Ссылка на фото должна начинаться с https:// или http://.')
  }
  return { title, description, price, category, subcategory, condition, image }
}

listings.post('/', requireUser, route(async (req, res) => {
  if (!req.user.phone && !req.user.telegram) throw new HttpError(409, 'Добавьте телефон или Telegram в профиле.')
  const listing = await Listing.create({ ...listingFields(req.body), seller: req.user._id })
  res.status(201).json(await loadListing(listing._id, req.user))
}))

listings.patch('/:id', requireUser, route(async (req, res) => {
  const updated = await Listing.findOneAndUpdate(
    { _id: req.params.id, seller: req.user._id }, listingFields(req.body)
  )
  if (!updated) throw new HttpError(404, 'Ваше объявление не найдено.')
  res.json(await loadListing(updated._id, req.user))
}))

listings.delete('/:id', requireUser, route(async (req, res) => {
  const removed = await Listing.findOneAndDelete({ _id: req.params.id, seller: req.user._id })
  if (!removed) throw new HttpError(404, 'Ваше объявление не найдено.')
  await User.updateMany({ favorites: removed._id }, { $pull: { favorites: removed._id } })
  res.sendStatus(204)
}))

listings.put('/:id/favorite', requireUser, route(async (req, res) => {
  if (!await Listing.exists({ _id: req.params.id })) throw new HttpError(404, 'Объявление не найдено.')
  await User.updateOne({ _id: req.user._id }, { $addToSet: { favorites: req.params.id } })
  res.sendStatus(204)
}))

listings.delete('/:id/favorite', requireUser, route(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $pull: { favorites: req.params.id } })
  res.sendStatus(204)
}))

listings.put('/:id/reservation', requireUser, route(async (req, res) => {
  const listing = await Listing.findById(req.params.id).populate('seller', 'phone telegram').lean()
  if (!listing) throw new HttpError(404, 'Объявление не найдено.')
  if (String(listing.seller?._id) === String(req.user._id)) throw new HttpError(409, 'Это ваше объявление.')
  if (!listing.seller?.phone && !listing.seller?.telegram) throw new HttpError(409, 'Продавец пока не указал контакты.')
  const reserved = await Listing.findOneAndUpdate({
    _id: listing._id, reservedBy: { $in: [null, req.user._id] }
  }, { reservedBy: req.user._id })
  if (!reserved) throw new HttpError(409, 'Объявление уже забронировано.')
  res.json(await loadListing(listing._id, req.user))
}))

listings.delete('/:id/reservation', requireUser, route(async (req, res) => {
  await Listing.updateOne({ _id: req.params.id, reservedBy: req.user._id }, { reservedBy: null })
  res.json(await loadListing(req.params.id, req.user))
}))

module.exports = listings

