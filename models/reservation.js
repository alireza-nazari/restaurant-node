var mongoose = require('mongoose')

var Schema = mongoose.Schema

var reservationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, required: true },
  guest1: { type: Schema.Types.ObjectId },
  guest2: { type: Schema.Types.ObjectId },
  guest3: { type: Schema.Types.ObjectId },
  // unique because the are only 6 tables that are shifted in time by 5 minutes
  time: { type: Date, required: true, unique: true },
  table: { type: Number, min: 1, max: 6, required: true }
})

module.exports = mongoose.model('Reservation', reservationSchema)
