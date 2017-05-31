const util = require('util')
const config = require('dotenv').config().parsed
const request = require('request')
const moment = require('moment')
const numeral = require('numeral')
const readlineSync = require('readline-sync')

const domain = config.DOMAIN?config.DOMAIN:readlineSync.question('JIRA Domain? ')
const user = config.USER?config.USER:readlineSync.question('JIRA Username? ')
const username = user
const pass = config.PASS?config.PASS:readlineSync.question('JIRA Password? ', {hideEchoBack: true})
const rate = Number(config.RATE)

const api = request.defaults({
  baseUrl: `https://${domain}/rest`,
  json: true,
  auth: { user, pass, sendImmediately: true }
})

const report = (week = 0) => {
  return new Promise((resolve, reject) => {
    const qs = {
      dateFrom: moment().subtract(week, 'weeks').day(-1).format('YYYY-MM-DD'),
      dateTo: moment().subtract(week, 'weeks').day(+5).format('YYYY-MM-DD'),
      username
    }

    api.get('/tempo-timesheets/3/worklogs/', { qs }, (err, res, json) => {
      if (err) throw err
      const seconds = json.reduce((seconds, work) => {
        return seconds + work.billedSeconds
      }, 0)
      const hours = ((seconds/60)/60)
      const dolars = numeral(hours*rate).format('$0,0.00')
      const totals = { seconds, hours, dolars }
      resolve({
        from: qs.dateFrom,
        to: qs.dateTo,
        total: dolars
      })
    })
  })
}

Promise.all([
  report(3),
  report(2),
  report(1),
  report(0)
]).then(results => {
  results.sort((a,b) => {
    return new Date(a.from).getTime() - new Date(b.from).getTime()
  })
  console.dir(results, { colors: true, depth: null })
})
