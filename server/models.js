const { Schema, model } = require('mongoose')
const objectId = Schema.Types.ObjectId

const userSchema = new Schema({
  name: { type: String, required: true },
  login: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  phone: { type: String, default: '' },
  telegram: { type: String, default: '' },
  favorites: [{ type: objectId, ref: 'Listing' }]
})

const listingSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  subcategory: { type: String, required: true },
  condition: { type: String, enum: ['used', 'new'], required: true },
  image: { type: String, default: '' },
  seller: { type: objectId, ref: 'User', required: true },
  reservedBy: { type: objectId, ref: 'User', default: null },
  demoKey: { type: String, unique: true, sparse: true }
}, { timestamps: true })

listingSchema.index({ createdAt: -1, _id: -1 })
listingSchema.index({ price: 1, _id: 1 })
listingSchema.index({ seller: 1, createdAt: -1 })
listingSchema.index({ reservedBy: 1, updatedAt: -1 })

const sessionSchema = new Schema({
  token: { type: String, required: true, unique: true },
  user: { type: objectId, ref: 'User', required: true },
  expires: { type: Date, required: true, index: { expires: 0 } }
})

module.exports = {
  User: model('User', userSchema),
  Listing: model('Listing', listingSchema),
  Session: model('Session', sessionSchema)
}

