var mongoose = require('mongoose')
var bcrypt = require('bcrypt')

var Schema = mongoose.Schema

var userSchema = new Schema({
  username: { type: String, required: true, unique: true, max: 20 },
  password: { type: String, required: true },
  token: { type: String, required: true }
})

userSchema.pre('save', function (next) {
  const user = this

  if (!user.isModified('password')) return next()

  bcrypt.genSalt(10, (err, salt) => {
    if (err) return next(err)

    bcrypt.hash(user.password, salt, (err, hash) => {
      if (err) {
        console.log(err)
        return next(err)
      }
      user.password = hash
      next()
    })
  })
})

userSchema.methods.comparePassword = function (candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
    if (err) return cb(err)
    cb(null, isMatch)
  })
}

module.exports = mongoose.model('User', userSchema)
