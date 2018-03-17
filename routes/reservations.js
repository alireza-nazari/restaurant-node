var express = require('express')
var router = express.Router()
var jwt = require('jsonwebtoken')
var fs = require('fs')
var moment = require('moment')

var Reservation = require('../models/reservation')
var User = require('../models/user')

const publicKey = fs.readFileSync('./public.key')
const privateKey = fs.readFileSync('./private.key')

const openFrom = moment()
  .hour(8)
  .minute(0)
  .second(0)
  .millisecond(0)

const openUntil = moment()
  .hour(16)
  .minute(0)
  .second(0)
  .millisecond(0)

const consumptionTime = 25 // minutes
const cleanupTime = 5

function getAvailableReservations () {
  let availableHours = {
    // shift all in time by 5 minutes
    1: [openFrom.clone()],
    2: [openFrom.clone().add(5, 'minutes')],
    3: [openFrom.clone().add(10, 'minutes')],
    4: [openFrom.clone().add(15, 'minutes')],
    5: [openFrom.clone().add(20, 'minutes')],
    6: [openFrom.clone().add(25, 'minutes')]
  }

  Object.keys(availableHours).forEach(function (key) {
    var val = availableHours[key]

    while (
      val[val.length - 1]
        .clone()
        .add(consumptionTime, 'minutes')
        .isBefore(
          openUntil.clone().subtract(consumptionTime + cleanupTime, 'minutes')
        )
    ) {
      val.push(
        val[val.length - 1]
          .clone()
          .add(consumptionTime + cleanupTime, 'minutes')
      )
    }
  })
  console.log(availableHours)
}

getAvailableReservations()

/* GET reservations listing. */
router.get('/', function (req, res, next) {
  Reservation.find(function (err, res2) {
    if (err) res.json(err)
    else res.json(res2)
  })
  //   res.json({ reservations: 'Hello from /reservations' })
})

router.post('/', function (req, res, next) {
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
        } else if (!user) {
          res.status(400).json({ token: 'Token invalid.' })
        } else {
          //   res.json({ username: user.username, id: user._id })

          if ('time' in req.body && 'table' in req.body) {
            // Everything succeeded
            const reservation = new Reservation({
              user: user._id,
              time: req.body.time,
              table: req.body.table
            })

            reservation.save(function (err) {
              if (err) res.json(err)
              else res.json({ reservation })
            })
          } else {
            res.json('Please specify `time` and `table` fields.')
          }
        }
      })
    }
  })
})

module.exports = router
