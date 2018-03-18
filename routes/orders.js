var express = require('express')
var router = express.Router()
var jwt = require('jsonwebtoken')
var fs = require('fs')

var Order = require('../models/order')
var User = require('../models/user')

const Reservation = require('../models/reservation')
const Product = require('../models/product')

const moment = require('moment')

const publicKey = fs.readFileSync('./public.key')
const privateKey = fs.readFileSync('./private.key')

/* GET orders listing. */
router.get('/', function (req, res, next) {
  Order.find({}, function (err, orders) {
    if (err) res.status(400).json(err)
    else res.json(orders)
  })
})

router.get('/:reservationId', function (req, res, next) {
  const { reservationId } = req.params

  Reservation.findById(reservationId, function (err, reservation) {
    if (err) res.status(500).json(err)
    else if (!reservation) {
      // check if the given reservation exists
      res.status(404).json({
        reservationId: `Specified reservation ${reservationId} does not exist.`
      })
      return
    }

    // get all orders for this reservation
    Order.find({ reservation: reservationId }, function (err, orders) {
      if (err) res.status(500).json(err)
      else res.json(orders)
    })
  })
})

router.post('/:reservationId', function (req, res, next) {
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
      User.findOne({ token }, function (err, user) {
        if (err) {
          res.status(400).json(err)
          return
        }
        if (!user) {
          res.status(401).json({ token: 'Token invalid.' })
          return
        }

        if (!('product' in req.body)) {
          res.status(400).json({ productId: '`product` not specified' })
          return
        }

        Product.findById(req.body.product, function (err, product) {
          if (err) {
            res.status(500).json(err)
            return
          }
          if (!product) {
            console.log('PRODUCT NOT FOUND!!')
            res.status(404).json({
              product: `Specified product ${req.body.product} does not exist.`
            })
            return
          }

          if (!('reservation' in req.body)) {
            res.status(400).json({ reservation: '`reservation` not specified' })
            return
          }

          if (!('amount' in req.body)) {
            res.status(400).json({ amount: '`amount` not specified' })
            return
          }

          const { amount } = req.body
          const reservationId = req.body.reservation

          Reservation.findById(reservationId, function (err, reservation) {
            if (err) {
              console.log(err)
              res.status(500).json({ error: 'Internal server error.' })
              return
            }

            if (!reservation) {
              res.status(404).json({
                reservationId: `Reservation ${reservationId} was not found`
              })
              return
            }

            // check if this user is on the guest list
            let userIsPartOfTheReservation = false

            reservation.guests.forEach(guest => {
              if (guest.equals(user._id)) {
                userIsPartOfTheReservation = true
                console.log('User is on the guest list.')
              }
            })

            // check if this user is the creator of the reservation
            if (reservation.user.equals(user._id)) {
              userIsPartOfTheReservation = true
              console.log('User is the creator of the event.')
            }

            if (!userIsPartOfTheReservation) {
              res
                .status(401)
                .json({ attendee: 'You are not a part of this event.' })
              return
            }

            const reservationTime = moment.utc(reservation.time)
            if (reservationTime.isBefore(moment.utc())) {
              res.status(400).json({
                time:
                  'You cannot order products for a reservation that already took place!'
              })
              return
            }

            const order = new Order({
              user: user._id,
              product: product._id,
              reservation,
              amount
            })

            order.save(function (err) {
              if (err) res.status(400).json(err)
              else res.json(order)
            })
          })
        })
      })
    }
  })
})

module.exports = router
