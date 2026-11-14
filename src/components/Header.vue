<script setup>
import Icon from './Icon.vue'
import { account, currency, currencies, setCurrency } from '../state'
import { path } from '../navigation'

const links = [
  { href: '/', label: 'Каталог', mobile: 'Каталог', icon: 'grid' },
  { href: '/favorites', label: 'Избранное', mobile: 'Избранное', icon: 'heart' },
  { href: '/reservations', label: 'Брони', mobile: 'Брони', icon: 'bookmark' },
  { href: '/profile', label: 'Профиль', mobile: 'Профиль', icon: 'user' },
  { href: '/new', label: 'Подать объявление', mobile: 'Подать', icon: 'plus' }
]

async function changeCurrency(event) {
  await setCurrency(event.target.value)
  event.target.value = currency.code
}
</script>

<template>
  <header class="site-header">
    <div class="wrap header-inner">
      <a href="/" data-nav class="wordmark"><img src="/brand.webp" alt="" width="40" height="40">Bvito<span>.</span></a>
      <nav class="main-nav" aria-label="Основное меню">
        <a v-for="link in links" :key="link.href" :href="link.href" data-nav
          :aria-current="path === link.href ? 'page' : undefined">
          <Icon :name="link.icon" />
          <span class="desktop-label">{{ link.href === '/profile' && !account.user ? 'Войти' : link.label }}</span>
          <span class="mobile-label">{{ link.mobile }}</span>
        </a>
      </nav>
      <div class="currency">
        <label class="visually-hidden" for="currency">Валюта</label>
        <select id="currency" :value="currency.code" :disabled="currency.loading" @change="changeCurrency">
          <option v-for="(symbol, code) in currencies" :key="code" :value="code">{{ symbol }} {{ code }}</option>
        </select>
      </div>
    </div>
  </header>
  <p v-if="currency.error || currency.loading || currency.code !== 'RUB'" class="wrap rate-status" role="status">
    {{ currency.error || (currency.loading ? 'Получаем курс Банка России…' : 'Цены приблизительные · курс Банка России от ' + currency.date) }}
  </p>
</template>
