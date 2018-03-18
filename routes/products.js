var express = require('express')
var router = express.Router()
var jwt = require('jsonwebtoken')
var fs = require('fs')

var Product = require('../models/product')
var User = require('../models/user')

const ROLES = require('../roles')

const publicKey = fs.readFileSync('./public.key')
// const privateKey = fs.readFileSync('./private.key')

/* GET products listing. */
router.get('/', function (req, res, next) {
  Product.find({}, function (err, products) {
    if (err) {
      res.status(400).json(err)
      return
    }
    res.json(products)
  })
})

router.post('/', function (req, res, next) {
  // create a new product
  var token = req.headers['x-access-token']

  if (!token) {
    return res.status(401).json({ auth: false, message: 'No token provided.' })
  }

  jwt.verify(token, publicKey, { algorithms: ['RS256'] }, function (
    err,
    decoded
  ) {
    if (err) {
      // checks if expired, etc.
      res.status(400).json(err)
    } else {
      // token valid
      User.findOne({ token }, function (err, user) {
        if (err) {
          res.status(400).json(err)
          // return
        }
        if (!user) {
          res.status(401).json({ token: 'Token invalid.' })
          // return
        }
        // check user's role
        if (user.role === ROLES.CUSTOMER) {
          res
            .status(401)
            .json({ role: 'You are not permitted to do add new products.' })
        }
        // authorized
        if (!('name' in req.body)) {
          res.status(400).json({ name: 'Provide `name` for the product' })
          return
        }
        if (!('price' in req.body)) {
          res.status(400).json({ name: 'Provide `price` for the product' })
          return
        }
        if (!('image_uri' in req.body)) {
          res.status(400).json({ name: 'Provide `image_uri` for the product' })
          // return
        }

        const { name, price, image_uri, description } = req.body

        const product = new Product({
          name,
          price,
          image_uri,
          description: description || undefined
        })

        product.save(function (err, product) {
          if (err) {
            res.status(400).json(err)
          }

          res.json({ product })
        })
      })
    }
  })
})

module.exports = router
