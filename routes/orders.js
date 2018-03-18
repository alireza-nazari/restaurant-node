var express = require('express')
var router = express.Router()
var jwt = require('jsonwebtoken')
var fs = require('fs')

var Order = require('../models/order')

const publicKey = fs.readFileSync('./public.key')
const privateKey = fs.readFileSync('./private.key')

/* GET orders listing. */
router.get('/', function (req, res, next) {
  res.json({ users: 'Hello from /orders' })
})

module.exports = router
