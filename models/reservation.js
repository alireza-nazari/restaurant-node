var mongoose = require('mongoose')

var Schema = mongoose.Schema

var reservationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, required: true },
  time: { type: Date, required: true },
  table: { type: Number, min: 1, max: 6, required: true }
})

module.exports = mongoose.model('Reservation', reservationSchema)
