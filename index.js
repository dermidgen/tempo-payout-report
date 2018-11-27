const util = require('util')
const config = require('dotenv').config().parsed
const request = require('request')
const moment = require('moment')
const numeral = require('numeral')
const readlineSync = require('readline-sync')
const columnify = require('columnify')

const domain = config.DOMAIN?config.DOMAIN:readlineSync.question('JIRA Domain? ')
const user = config.USER?config.USER:readlineSync.question('JIRA Username? ')
const username = user
const pass = config.PASS?config.PASS:readlineSync.question('JIRA Password? ', {hideEchoBack: true})
const rate = Number(config.RATE?config.RATE:readlineSync.question('Hourly rate? '))
const weeks = Number(readlineSync.question('How many weeks back? '))

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
      // console.dir(json, { colors: true, depth: null })
      const seconds = json.reduce((seconds, work) => {
        return seconds + work.billedSeconds
      }, 0)
      const hours = ((seconds/60)/60)
      const dolars = hours*rate
      const totals = { seconds, hours, dolars }
      resolve({
        week: moment(qs.dateFrom).week(),
        from: qs.dateFrom,
        to: qs.dateTo,
        total: dolars
      })
    })
  })
}

const fetches = []
for(var i = 0; i < weeks; i++) {
  fetches.push(report(i));
}

Promise.all(fetches).then(results => {
  results.sort((a,b) => {
    return new Date(a.from).getTime() - new Date(b.from).getTime()
  })
  const total = results.reduce((total, week) => {
    return total + week.total
  }, 0)
  results.push({
    week: '',
    from: '',
    to: '',
    total
  })
  const columns = columnify(results, {
    columnSplitter: '     ',
    config: {
      total: {
        align: 'right',
        dataTransform: total => {
          return numeral(total).format('$0,0.00')
        }
      }
    }
  })
  console.log('')
  console.log(columns)
  console.log('')

})
