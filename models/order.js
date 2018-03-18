var mongoose = require('mongoose')

var Schema = mongoose.Schema

var orderSchema = new Schema({
  user: { type: Schema.Types.ObjectId, required: true },
  reservation: { type: Schema.Types.ObjectId, required: true },
  product: { type: Schema.Types.ObjectId, required: true },
  amount: { type: Number, required: true, min: 1 }
})

module.exports = mongoose.model('Order', orderSchema)
