var express = require('express')
var router = express.Router()
var jwt = require('jsonwebtoken')
var fs = require('fs')

var User = require('../models/user')

const publicKey = fs.readFileSync('./public.key')
const privateKey = fs.readFileSync('./private.key')

/* GET users listing. */
router.get('/', function (req, res, next) {
  User.find({}, function (err, users) {
    if (err) res.status(500).json(err)
    else res.json(users)
  })
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
    res.status(400).json('Provide at least 6 characters for the password.')
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
      if (err.code === 11000) {
        res.status(400).json('This username is taken!')
        return
      }
      res.status(500).json(err)
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
    res.status(400).json('Provide the username field')
    return
  }
  if (!('password' in req.body)) {
    res.status(400).json('Provide the password field')
    return
  }

  User.findOne({ username: req.body.username }, function (err, user) {
    if (err) {
      res.status(500).json(err)
      return
    }
    if (!user) {
      res.status(404).json('User with a given username was not found.')
      return
    }

    user.comparePassword(req.body.password, function (err, isMatch) {
      if (err) {
        res.status(400).json(err)
      } else {
        if (isMatch) {
          var token = getNewToken()
          user.update({ token }, function (err, raw) {
            if (err) res.status(500).json(err)
            else res.json({ token, id: user._id, username: user.username })
          })
        } else {
          res.status(400).json('Password incorrect.')
        }
      }
    })
  })
})
// </login route>

module.exports = router
