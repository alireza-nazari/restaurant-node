var mongoose = require('mongoose')

var Schema = mongoose.Schema

var productSchema = new Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  description: { type: String }
})

module.exports = mongoose.model('Product', productSchema)
