var express = require('express')
var router = express.Router()

var User = require('../models/user')

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.json({ users: 'Hello from /users' })
  next()
})

// create a new user
router.post('/', function (req, res, next) {
  if (req.body.password && req.body.password.length < 6) {
    res.status(400).json({ password: 'Provide at least 6 characters' })
    return
  }
  const user = new User({
    username: req.body.username,
    password: req.body.password
  })
  user.save(function (err) {
    if (err) {
      res.status(400).json({ message: err.message })
    } else {
      res.json({ id: user._id, username: user.username, token: '' })
    }
  })
})

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
      next()
    }
    if (!user) {
      res.json({ username: 'User with a given `username` was not found.' })
      next()
    }

    user.comparePassword(req.body.password, function (err, isMatch) {
      if (err) {
        res.status(400).json(err)
      } else {
        if (isMatch) {
          res.json({ token: 'get your token here' })
        } else {
          res.status(400).json({ password: 'Password incorrect.' })
        }
      }
    })
  })
})

module.exports = router
