var express = require('express')
var router = express.Router()
var jwt = require('jsonwebtoken')
var fs = require('fs')
var moment = require('moment')

var Reservation = require('../models/reservation')
var User = require('../models/user')

const publicKey = fs.readFileSync('./public.key')
const privateKey = fs.readFileSync('./private.key')

const openFrom = moment
  .utc()
  .hour(8)
  .minute(0)
  .second(0)
  .millisecond(0)

const openUntil = moment
  .utc()
  .hour(16)
  .minute(0)
  .second(0)
  .millisecond(0)

const consumptionTime = 25 // minutes
const cleanupTime = 5

function getPossibleReservations () {
  let availableHours = {
    // shift all tables in time by 5 minutes
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

  return availableHours
}

// console.log(getPossibleReservations())

/* GET reservations listing. */
router.get('/', function (req, res, next) {
  // get a list of all possible reservations and turn it
  // into a list of available reservations
  // based on current reservations
  let possibleReservations = getPossibleReservations()

  Reservation.find({ time: { $gte: openFrom, $lte: openUntil } }, function (
    err,
    reservations
  ) {
    if (err) res.status(400).json(err)
    else {
      let toRemove = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }

      reservations.forEach(function (reservation) {
        const reservationTime = moment.utc(reservation.time)

        possibleReservations[reservation.table].forEach(function (
          possibleReservation,
          idx
        ) {
          if (possibleReservation.isSame(reservationTime)) {
            toRemove[reservation.table].push(idx)
          }
        })
      })

      // remove unavailable times for each table
      Object.keys(toRemove).forEach(function (key) {
        const indicesToRemove = toRemove[key].sort(function (a, b) {
          return b - a
        })
        indicesToRemove.forEach(idxToRemove => {
          possibleReservations[key].splice(idxToRemove, 1)
        })
      })

      res.json(possibleReservations)
    }
  })
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
          if ('time' in req.body && 'table' in req.body) {
            // Everything succeeded
            // console.log(req.body.time)
            const reservation = new Reservation({
              user: user._id,
              //   time: new Date(req.body.time),
              time: moment.utc(req.body.time),
              table: req.body.table
            })

            reservation.save(function (err) {
              if (err) {
                if (err.code === 11000) {
                  res.status(400).json({
                    table: 'This table is already taken for this hour.'
                  })
                } else res.status(400).json(err)
              } else {
                res.json({ reservation })
              }
            })
          } else {
            res.json('Please specify `time` and `table` fields.')
          }
        }
      })
    }
  })
})

router.get('/table:id', function (req, res, next) {
  // get table details
})

router.get('reservation/:id', function (req, res, next) {
  // get reservation details:
  // who is going (could be many people)
})

module.exports = router
