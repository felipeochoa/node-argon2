const crypto = require('crypto')
const bindings = require('bindings')('argon2')
const Promise = require('any-promise')

const defaults = Object.freeze({
  timeCost: 3,
  memoryCost: 12,
  parallelism: 1,
  argon2d: false
})

const limits = Object.freeze(bindings.limits)

const validate = (salt, options) => new Promise((resolve, reject) => {
  if (!Buffer.isBuffer(salt) || salt.length < 8) {
    reject(new Error('Invalid salt, must be a buffer with 8 or more bytes.'))
  }

  for (const key of Object.keys(limits)) {
    const {max, min} = limits[key]
    const value = options[key]
    if (!Number.isInteger(value) || value > max || value < min) {
      reject(new Error(`Invalid ${key}, must be an integer between ${min} and ${max}.`))
    }
  }

  resolve()
})

module.exports = {
  defaults,
  limits,

  hash(plain, salt, options) {
    options = Object.assign({}, defaults, options)

    return validate(salt, options).then(() => new Promise((resolve, reject) => {
      bindings.hash(new Buffer(plain), salt, options, resolve, reject)
    }))
  },

  generateSalt(length) {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(length || 16, (err, salt) => {
        /* istanbul ignore if */
        if (err) {
          reject(err)
        }
        resolve(salt)
      })
    })
  },

  verify(hash, plain) {
    if (!/^\$argon2[di](\$v=\d+)?\$m=\d+,t=\d+,p=\d+(?:\$[\w+\/]+){2}$/.test(hash)) {
      return Promise.reject(new Error('Invalid hash, must be generated by Argon2.'))
    }

    return new Promise((resolve, reject) => {
      bindings.verify(hash, new Buffer(plain), resolve, reject)
    })
  }
}
