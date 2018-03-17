var express = require('express')
var router = express.Router()
var jwt = require('jsonwebtoken')
var fs = require('fs')

var User = require('../models/user')

const publicKey = fs.readFileSync('./public.key')
const privateKey = fs.readFileSync('./private.key')

/* GET tables listing. */
router.get('/', function (req, res, next) {
  res.json({ tables: 'Hello from /tables' })
})

module.exports = router
