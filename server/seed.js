const mongoose = require('mongoose')
const { User, Listing } = require('./models')
const { hashPassword } = require('./accounts')

const accounts = [
  { name: 'Мария', login: 'maria', phone: '+7 (000) 000-01-01', telegram: '' },
  { name: 'Илья', login: 'ilya', phone: '+7 (000) 000-01-02', telegram: '' },
  { name: 'Лена', login: 'lena', phone: '+7 (000) 000-01-03', telegram: '' }
]

const examples = [
  ['camera', 0, 'Компактная цифровая камера', 'Серебристая камера для прогулок. Работает, на корпусе есть небольшие следы использования. В комплекте ремешок.', 6800, 'Техника', 'Фото и видео', 'used'],
  ['lamp', 1, 'Синяя настольная лампа', 'Металлическая лампа с регулируемым наклоном. Подойдёт для рабочего стола или чтения.', 2100, 'Для дома', 'Освещение', 'used'],
  ['headphones', 2, 'Беспроводные наушники', 'Серебристые полноразмерные наушники. Мягкие амбушюры, заряд держат хорошо.', 4900, 'Техника', 'Аудио', 'used'],
  ['tote', 0, 'Холщовая сумка', 'Плотная ткань, длинные ручки. Помещаются книги, ноутбук и покупки.', 850, 'Одежда', 'Аксессуары', 'new'],
  ['books', 1, 'Три книги в твёрдом переплёте', 'Подборка для неспешного чтения. Страницы чистые, отдам комплектом.', 1300, 'Хобби и спорт', 'Книги', 'used'],
  ['mug', 2, 'Керамическая кружка', 'Зелёная глазурь, удобная ручка, объём 320 мл. Без сколов.', 620, 'Для дома', 'Посуда', 'new'],
  ['jacket', 0, 'Стёганая куртка', 'Тёмно-синяя лёгкая куртка на весну. Размер M, застёжки работают.', 3500, 'Одежда', 'Верхняя одежда', 'used'],
  ['synth', 1, 'Компактная MIDI-клавиатура', 'Клавиатура с USB, удобно брать с собой. Все клавиши и ручки работают.', 7200, 'Хобби и спорт', 'Музыка', 'used']
]

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bvito_portfolio'
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  await Promise.all([User.init(), Listing.init()])
  const password = await hashPassword('demo2026')
  const users = []
  for (const account of accounts) {
    const user = await User.findOneAndUpdate({ login: account.login }, {
      $setOnInsert: { ...account, password }
    }, { upsert: true, new: true })
    users.push(user)
  }
  const items = {}
  for (const [demoKey, owner, title, description, price, category, subcategory, condition] of [...examples].reverse()) {
    items[demoKey] = await Listing.findOneAndUpdate({ demoKey }, {
      $setOnInsert: { demoKey, title, description, price, category, subcategory, condition,
        image: '/demo/' + demoKey + '.webp', seller: users[owner]._id }
    }, { upsert: true, new: true, timestamps: false, setDefaultsOnInsert: true })
    if (!items[demoKey].createdAt) {
      await Listing.updateOne({ _id: items[demoKey]._id, createdAt: { $exists: false } }, {
        $set: { createdAt: new Date(), updatedAt: new Date() }
      }, { timestamps: false })
    }
  }
  for (const [index, favorites] of [['lamp', 'headphones'], ['camera', 'mug'], ['tote', 'books']].entries()) {
    if (!users[index].favorites.length) {
      await User.updateOne({ _id: users[index]._id }, {
        $addToSet: { favorites: { $each: favorites.map(key => items[key]._id) } }
      })
    }
  }
  console.log('Демо-данные готовы. Логины: maria, ilya, lena. Пароль: demo2026.')
}

seed().catch(error => {
  console.error('Не удалось добавить демо-данные:', error.message)
  process.exitCode = 1
}).finally(() => mongoose.disconnect())

