var express = require('express')
var router = express.Router()
var jwt = require('jsonwebtoken')
var fs = require('fs')

var User = require('../models/user')

const publicKey = fs.readFileSync('./public.key')
const privateKey = fs.readFileSync('./private.key')

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.json({ users: 'Hello from /users' })
})

function getNewToken () {
  return jwt.sign({}, privateKey, {
    algorithm: 'RS256',
    expiresIn: '18h'
  })
}

// create a new user
router.post('/', function (req, res, next) {
  if (req.body.password && req.body.password.length < 6) {
    res.status(400).json({ password: 'Provide at least 6 characters' })
    return
  }
  var token = getNewToken()
  const user = new User({
    username: req.body.username,
    password: req.body.password,
    token
  })
  user.save(function (err) {
    if (err) {
      res.status(400).json({ message: err.message })
    } else {
      res.json({ id: user._id, username: user.username, token })
    }
  })
})
// </create a new user>

// <login route>
router.post('/login', function (req, res, next) {
  // validation
  if (!('username' in req.body)) {
    res.status(400).json({ username: 'Provide an `username` field' })
    return
  }
  if (!('password' in req.body)) {
    res.status(400).json({ username: 'Provide a `password` field' })
    return
  }

  User.findOne({ username: req.body.username }, function (err, user) {
    if (err) {
      res.json(err)
      return
    }
    if (!user) {
      res.json({ username: 'User with a given `username` was not found.' })
      return
    }

    user.comparePassword(req.body.password, function (err, isMatch) {
      if (err) {
        res.status(400).json(err)
      } else {
        if (isMatch) {
          var token = getNewToken()
          user.update({ token }, function (err, raw) {
            console.log(raw)
            if (err) res.json(err)
            else res.json({ token, id: user._id, username: user.username })
          })
        } else {
          res.status(400).json({ password: 'Password incorrect.' })
        }
      }
    })
  })
})
// </login route>

module.exports = router
