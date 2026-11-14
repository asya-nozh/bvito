const { Router } = require('express')
const { route, HttpError } = require('./http')

const currency = Router()
const source = 'https://www.cbr.ru/scripts/XML_daily.asp'
const lifetime = 60 * 60 * 1000
const codes = ['CNY', 'BYN', 'KZT']
let cached
let refreshAfter = 0
let pending

async function loadRates() {
  const response = await fetch(source, { signal: AbortSignal.timeout(4500) })
  if (!response.ok) throw new Error('CBR status ' + response.status)
  const xml = new TextDecoder('windows-1251').decode(await response.arrayBuffer())
  const date = xml.match(/<ValCurs\b[^>]*\bDate="(\d{2}\.\d{2}\.\d{4})"/)?.[1]
  const rates = {}
  for (const row of xml.matchAll(/<Valute\b[^>]*>([\s\S]*?)<\/Valute>/g)) {
    const code = row[1].match(/<CharCode>([A-Z]{3})<\/CharCode>/)?.[1]
    if (!codes.includes(code)) continue
    const nominal = Number(row[1].match(/<Nominal>(\d+)<\/Nominal>/)?.[1])
    const value = Number(row[1].match(/<Value>([0-9,]+)<\/Value>/)?.[1].replace(',', '.'))
    if (nominal > 0 && value > 0) rates[code] = value / nominal
  }
  if (!date || codes.some(code => !rates[code])) throw new Error('CBR response is incomplete')
  return { date, rates }
}

async function getRates() {
  if (Date.now() < refreshAfter) return cached
  if (!pending) {
    pending = loadRates().then(data => {
      cached = data
      refreshAfter = Date.now() + lifetime
      return cached
    }).catch(error => {
      console.warn('Курсы ЦБ:', error.message, error.cause?.code || '')
      if (!cached) throw new HttpError(503, 'Курс временно недоступен. Цены показаны в рублях.')
      refreshAfter = Date.now() + 60 * 1000
      return cached
    }).finally(() => { pending = undefined })
  }
  return pending
}

currency.get('/', route(async (req, res) => res.json(await getRates())))
module.exports = currency

