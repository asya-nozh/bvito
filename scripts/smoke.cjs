const assert = require('node:assert/strict')
const base = process.env.BVITO_TEST_URL || 'http://127.0.0.1:4180'

async function request(path, { status = 200, method = 'GET', cookie, body } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(cookie && { Cookie: cookie }),
      ...(body && { 'Content-Type': 'application/json' })
    },
    body: body && JSON.stringify(body)
  })
  const text = await response.text()
  assert.equal(response.status, status, method + ' ' + path + ': ' + text.slice(0, 400))
  return {
    data: response.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text,
    cookie: response.headers.get('set-cookie')?.split(';')[0]
  }
}

const login = name => request('/api/account/login', { method: 'POST', body: { login: name, password: 'demo2026' } })

async function main() {
  await request('/')
  await request('/несуществующая-страница', { status: 404 })
  await request('/500', { status: 500 })
  await request('/api/unknown', { status: 404 })
  await request('/api/listings/invalid', { status: 404 })
  const all = (await request('/api/listings')).data.items
  assert.ok(all.length >= 8)
  const low = (await request('/api/listings?sort=low&min=700&max=7000&condition=used')).data.items
  assert.ok(low.length >= 2)
  for (const [index, item] of low.entries()) {
    assert.ok(item.price >= 700 && item.price <= 7000 && item.condition === 'used')
    if (index) assert.ok(item.price >= low[index - 1].price)
  }
  const query = new URLSearchParams({ q: 'СЕРЕБРИСТ камера', category: 'Техника', subcategory: 'Фото и видео' })
  const matches = (await request('/api/listings?' + query)).data.items
  assert.equal(matches[0].title, 'Компактная цифровая камера')
  const punctuation = new URLSearchParams({ q: '[' })
  assert.deepEqual((await request('/api/listings?' + punctuation)).data.items, [])
  const { rates, date } = (await request('/api/rates')).data
  assert.match(date, /^\d{2}\.\d{2}\.\d{4}$/)
  for (const code of ['CNY', 'BYN', 'KZT']) assert.ok(rates[code] > 0)
  console.log('Каталог, поиск, фильтры, сортировка, 404 и курсы валют: OK')

  const maria = (await login('maria')).cookie
  const ilya = (await login('ilya')).cookie
  const lena = (await login('lena')).cookie
  const registered = await request('/api/account/register', {
    method: 'POST', status: 201,
    body: { name: 'Проверка', login: 'smoke_' + Date.now(), password: 'smoke2026' }
  })
  assert.ok(registered.cookie)
  await request('/api/account/me', { method: 'PATCH', cookie: registered.cookie,
    body: { name: 'Проверка профиля', phone: '+7 (000) 000-01-10', telegram: '' } })
  assert.equal((await request('/api/account/me', { cookie: registered.cookie })).data.name, 'Проверка профиля')
  await request('/api/account/logout', { method: 'POST', status: 204, cookie: registered.cookie })
  assert.equal((await request('/api/account/me', { cookie: registered.cookie })).data, null)

  const fixture = {
    title: 'Лампа для проверки', description: 'Проверка публикации объявления.', price: 960,
    category: 'Для дома', subcategory: 'Освещение', condition: 'used', image: ''
  }
  const created = await request('/api/listings', { method: 'POST', status: 201, cookie: maria, body: fixture })
  const id = created.data._id
  const path = '/api/listings/' + id
  try {
    const edited = await request(path, { method: 'PATCH', cookie: maria, body: { ...fixture, price: 1000 } })
    assert.equal(edited.data.price, 1000)
    await request(path, { method: 'PATCH', cookie: ilya, body: fixture, status: 404 })
    await request(path, { method: 'DELETE', cookie: ilya, status: 404 })
    await request(path + '/favorite', { method: 'PUT', status: 401 })
    await request(path + '/favorite', { method: 'PUT', cookie: ilya, status: 204 })
    await request(path + '/favorite', { method: 'PUT', cookie: ilya, status: 204 })
    assert.equal((await request('/api/account/me', { cookie: ilya })).data.favorites.filter(saved => saved === id).length, 1)
    assert.ok((await request('/api/listings?view=favorites', { cookie: ilya })).data.items.some(item => item._id === id))
    assert.equal((await request(path)).data.contact, undefined)
    const attempts = await Promise.all([ilya, lena].map(cookie => fetch(base + path + '/reservation', {
      method: 'PUT', headers: { Cookie: cookie }
    })))
    assert.deepEqual(attempts.map(response => response.status).sort(), [200, 409])
    const winner = attempts[0].ok ? ilya : lena
    const loser = attempts[0].ok ? lena : ilya
    assert.ok((await request(path, { cookie: winner })).data.contact.phone)
    assert.equal((await request(path, { cookie: loser })).data.contact, undefined)
    assert.ok((await request('/api/listings?view=reservations', { cookie: winner })).data.items.some(item => item._id === id))
    await request(path + '/reservation', { method: 'DELETE', cookie: loser })
    assert.equal((await request(path)).data.reserved, true)
    const canceled = await request(path + '/reservation', { method: 'DELETE', cookie: winner })
    assert.equal(canceled.data.reserved, false)
    assert.equal(canceled.data.contact, undefined)
  } finally {
    await request(path, { method: 'DELETE', status: 204, cookie: maria })
  }
  assert.equal((await request('/api/account/me', { cookie: ilya })).data.favorites.includes(id), false)
  await request(path, { status: 404 })
  for (const cookie of [maria, ilya, lena]) await request('/api/account/logout', { method: 'POST', status: 204, cookie })
  console.log('Регистрация, профиль, публикация, редактирование, права, избранное и бронирование: OK')
}

main().catch(error => { console.error(error); process.exitCode = 1 })

