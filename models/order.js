var mongoose = require('mongoose')

var Schema = mongoose.Schema

var orderSchema = new Schema({
  user: { type: Schema.Types.ObjectId, required: true },
  reservation: { type: Schema.Types.ObjectId, required: true }
})

module.exports = mongoose.model('Order', orderSchema)
