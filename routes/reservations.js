var express = require('express')
var router = express.Router()
var jwt = require('jsonwebtoken')
var fs = require('fs')
var moment = require('moment')

var Reservation = require('../models/reservation')
var User = require('../models/user')

const publicKey = fs.readFileSync('./public.key')
// const privateKey = fs.readFileSync('./private.key')

const OPEN_FROM_HOUR = 8
const OPEN_FROM_MINUTE = 0

const OPEN_UNTIL_HOUR = 16
const OPEN_UNTIL_MINUTE = 0

const openFrom = moment
  .utc()
  .hour(OPEN_FROM_HOUR)
  .minute(OPEN_FROM_MINUTE)
  .second(0)
  .millisecond(0)

const openUntil = moment
  .utc()
  .hour(OPEN_UNTIL_HOUR)
  .minute(OPEN_UNTIL_MINUTE)
  .second(0)
  .millisecond(0)

// in minutes
const consumptionTime = 25
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

// GET all reservations
router.get('/', function (req, res, next) {
  Reservation.find({ time: { $gte: openFrom, $lte: openUntil } }, function (
    err,
    reservations
  ) {
    if (err) res.status(400).json(err)
    else res.json(reservations)
  })
})

/* GET available tables and times listing. */
router.get('/available', function (req, res, next) {
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

// create a new reservation
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
      return
    }
    // get the user by token
    User.findOne({ token }, function (err, user) {
      if (err) {
        res.status(400).json(err)
      } else if (!user) {
        res.status(401).json({ token: 'Token invalid.' })
      } else {
        if ('time' in req.body && 'table' in req.body) {
          const timePicked = moment.utc(req.body.time)

          const reservationToSave = new Reservation({
            user: user._id,
            time: timePicked,
            table: req.body.table
          })

          // v check if time is allowed v //
          const possibleReservations = getPossibleReservations()

          if (req.body.table in Object.keys(possibleReservations)) {
            let timePossible = false
            possibleReservations[req.body.table].forEach(
              possibleReservation => {
                if (possibleReservation.isSame(timePicked)) {
                  // this time is allowed!
                  timePossible = true
                }
              }
            )
            if (!timePossible) {
              res.status(400).json({ time: 'This time is not available!' })
              return
            }
          } else {
            res.status(400).json({ table: 'This table does not exist.' })
            return
          }
          // ^ check if time is allowed ^ //

          // check if this user is already invited somewhere
          Reservation.findOne(
            {
              time: {
                $gte: openFrom,
                $lte: openUntil
              },
              user: user._id
            },
            function (err, reservation) {
              if (err) {
                res.status(500).json(err)
                return
              }

              if (reservation) {
                res.status(400).json('You have already made a reservation!')
                return
              }

              Reservation.findOne(
                {
                  time: {
                    $gte: openFrom,
                    $lte: openUntil
                  },
                  guests: user._id
                },
                function (err, reservation) {
                  if (err) {
                    res.status(500).json(err)
                    return
                  }
                  if (reservation) {
                    res.status(400).json('You are already invited somewhere!')
                    return
                  }

                  reservationToSave.save(function (err) {
                    if (err) {
                      if (err.code === 11000) {
                        res
                          .status(400)
                          .json('This table is already taken for this hour.')
                      } else {
                        res.status(500).json(err)
                      }
                    } else {
                      res.json(reservationToSave)
                    }
                  })
                }
              )
            }
          )
        } else {
          res.status(400).json('Please specify `time` and `table` fields.')
        }
      }
    })
  })
})

router.get('/mine', function (req, res, next) {
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
      return
    }
    // get the user by token
    User.findOne({ token }, function (err, user) {
      if (err) {
        res.status(400).json(err)
      } else if (!user) {
        res.status(401).json({ token: 'Token invalid.' })
      } else {
        Reservation.findOne({ user }, function (err, reservation) {
          if (err) res.status(500).json(err)
          else if (!reservation) {
            Reservation.findOne({ guests: user._id }, function (
              err,
              reservation
            ) {
              if (err) res.status(500).json(err)
              else if (!reservation) {
                res.status(404).json('No reservations.')
              } else {
                res.json(reservation)
              }
            })
          } else {
            res.json(reservation)
          }
        })
      }
    })
  })
})

router.post('/:id/invite', function (req, res, next) {
  var token = req.headers['x-access-token']

  if (!token) {
    return res.status(401).json({ auth: false, message: 'No token provided.' })
  }

  if (!req.body.guest) {
    res.status(400).json({ guest: 'Provide `guest` field.' })
    return
  }

  jwt.verify(token, publicKey, { algorithms: ['RS256'] }, function (
    err,
    decoded
  ) {
    if (err) {
      // checks if expired, etc.
      res.status(500).json(err)
      return
    }
    // get the user by token
    User.findOne({ token }, function (err, user) {
      if (err) {
        res.status(500).json(err)
        return
      } else if (!user) {
        res.status(401).json({ token: 'Token invalid.' })
        return
      }
      Reservation.findById(req.params.id, function (err, reservation) {
        if (err) {
          res.status(500).json(err)
          return
        }
        if (reservation.user.equals(user._id)) {
          // when tokens match
          // get guest ID
          User.findOne({ username: req.body.guest }, function (err, guestUser) {
            if (err) {
              res.status(500).json(err)
              return
            }
            if (!guestUser) {
              res
                .status(404)
                .json('Guest with the specified username not found.')
              return
            }

            // check if this user is trying to invite himself
            if (guestUser._id.equals(user._id)) {
              res.status(400).json('You cannot invite yourself!')
              return
            }

            // check if the maximum number of guests has been reached
            if (reservation.guests.length >= 3) {
              res
                .status(400)
                .json('The maximum number of guests has been reached.')
              return
            }

            // check whether this user has already been invited
            if (reservation.guests.indexOf(guestUser._id) > -1) {
              res.status(400).json('This guest has already been invited!')
              return
            }

            // check if this user is already invited somewhere
            Reservation.findOne({ guests: guestUser._id }, function (
              err,
              reservationAsGuest
            ) {
              if (err) {
                res.status(500).json(err)
                return
              }
              if (!reservationAsGuest) {
                // is not invited anywhere

                Reservation.findOne({ user: req.body.guest._id }, function (
                  err,
                  reservationAsHost
                ) {
                  if (err) {
                    res.status(500).json(err)
                    return
                  }
                  if (!reservationAsHost) {
                    const guestListUpdated = [...reservation.guests, guestUser]

                    // add this guest to the table
                    reservation.update({ guests: guestListUpdated }, function (
                      err,
                      raw
                    ) {
                      if (err) res.status(500).json(err)
                      else {
                        Reservation.findById(req.params.id, function (
                          err,
                          reservation
                        ) {
                          if (err) {
                            res.status(500).json(err)
                            return
                          }
                          // successful invitation. Return the object
                          res.json(reservation)
                        })
                      }
                    })
                  } else {
                    res
                      .status(400)
                      .json('This user has already made a reservation.')
                  }
                })
              } else {
                res.status(400).json('This user is invited somewhere else.')
              }
            })
          })
        } else {
          res.status(401).json('Invalid token.')
        }
      })
    })
  })
})

router.post('/:id/kick', function (req, res, next) {
  var token = req.headers['x-access-token']

  if (!token) {
    return res.status(401).json({ auth: false, message: 'No token provided.' })
  }

  if (!req.body.guestId) {
    res.status(400).json({ guestId: 'Provide `guestId` field.' })
    return
  }

  jwt.verify(token, publicKey, { algorithms: ['RS256'] }, function (
    err,
    decoded
  ) {
    if (err) {
      // checks if expired, etc.
      res.status(400).json(err)
      return
    }
    // get the user by token
    User.findOne({ token }, function (err, user) {
      if (err) {
        res.status(400).json(err)
        return
      } else if (!user) {
        res.status(401).json({ token: 'Token invalid.' })
        return
      }
      Reservation.findById(req.params.id, function (err, reservation) {
        if (err) {
          res.status(400).json(err)
          return
        }
        if (reservation.user.equals(user._id)) {
          // when tokens match
          // kick this guest from the table
          // TODO remove their orders

          const guestIndexOnTheList = reservation.guests.indexOf(
            req.body.guestId
          )

          if (guestIndexOnTheList < 0) {
            res.status(400).json({ guestId: 'This guest is not on the list.' })
            return
          }

          let guestList = reservation.guests
          guestList.splice(guestIndexOnTheList, 1)

          reservation.update({ guests: guestList }, function (err, raw) {
            if (err) res.status(400).json(err)
            else {
              Reservation.findById(req.params.id, function (err, reservation) {
                if (err) {
                  res.status(400).json(err)
                  return
                }
                // successful kick. Return the object.
                res.json(reservation)
              })
            }
          })
        } else {
          res.status(401).json({ token: 'Invalid token.' })
        }
      })
    })
  })
})

module.exports = router
