import { reactive, computed } from 'vue'
import { api, errorText } from './api'

export const account = reactive({ user: null, loading: true, error: '' })

export async function loadAccount() {
  account.loading = true
  account.error = ''
  try { account.user = await api('/account/me') }
  catch (error) { account.error = errorText(error) }
  finally { account.loading = false }
}

export const currencies = { RUB: '₽', CNY: '¥', BYN: 'Br', KZT: '₸' }
export const currency = reactive({
  code: 'RUB', rates: null, date: '', loading: false, error: ''
})
const formatters = Object.fromEntries(Object.keys(currencies).map(code => [
  code, new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: code, currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: code === 'RUB' ? 0 : 2
  })
]))

export const favoriteIds = computed(() => new Set(account.user?.favorites || []))

export async function setCurrency(code) {
  currency.error = ''
  if (code !== 'RUB' && !currency.rates) {
    currency.loading = true
    try { Object.assign(currency, await api('/rates')) }
    catch (error) {
      currency.error = errorText(error)
      return
    } finally { currency.loading = false }
  }
  currency.code = code
}

export function priceLabel(price) {
  const { code, rates } = currency
  const amount = code === 'RUB' ? price : price / rates[code]
  return (code === 'RUB' ? '' : '≈ ') + formatters[code].format(amount)
}

export async function toggleFavorite(id) {
  const favorites = account.user.favorites
  const saved = favoriteIds.value.has(id)
  await api('/listings/' + id + '/favorite', { method: saved ? 'DELETE' : 'PUT' })
  account.user.favorites = saved ? account.user.favorites.filter(item => item !== id) : [...account.user.favorites, id]
}
