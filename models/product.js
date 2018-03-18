var mongoose = require('mongoose')

var Schema = mongoose.Schema

var productSchema = new Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image_uri: { type: String, required: true, unique: true },
  description: { type: String }
})

module.exports = mongoose.model('Product', productSchema)
