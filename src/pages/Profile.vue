<script setup>
import { reactive, ref, watchEffect } from 'vue'
import { api, errorText } from '../api'
import { account } from '../state'
import { go } from '../navigation'

const form = reactive({ name: '', phone: '', telegram: '' })
const pending = ref(false)
const error = ref('')
const saved = ref(false)
watchEffect(() => {
  if (account.loading || account.error) return
  if (!account.user) return go('/login?next=/profile', true)
  const { name, phone, telegram } = account.user
  Object.assign(form, { name, phone, telegram })
})

async function save() {
  pending.value = true
  saved.value = false
  error.value = ''
  try {
    account.user = await api('/account/me', { method: 'PATCH', body: form })
    saved.value = true
  } catch (failure) { error.value = errorText(failure) }
  finally { pending.value = false }
}

async function logout() {
  pending.value = true
  error.value = ''
  try {
    await api('/account/logout', { method: 'POST' })
    go('/')
    account.user = null
  } catch (failure) { error.value = errorText(failure) }
  finally { pending.value = false }
}
</script>

<template>
  <section v-if="account.user" class="split-page">
    <div class="form-panel">
      <h1>Профиль</h1>
      <form class="stack" @submit.prevent="save" @input="saved = false">
        <label>Имя<input v-model="form.name" required maxlength="50" autocomplete="name"></label>
        <label>Телефон для связи<input v-model="form.phone" type="tel" maxlength="24" autocomplete="tel"></label>
        <label>Имя пользователя Telegram<input v-model="form.telegram" maxlength="33" placeholder="@имя_пользователя"></label>
        <p class="muted">Укажите хотя бы один контакт, чтобы подать объявление. Покупатель увидит контакты после бронирования.</p>
        <p v-if="error" class="notice error" role="alert">{{ error }}</p>
        <p v-if="saved" class="notice" role="status">Профиль сохранён.</p>
        <button class="primary" :disabled="pending">Сохранить</button>
      </form>
    </div>
    <aside class="profile-aside">
      <h2>{{ account.user.name }}</h2>
      <p class="muted">@{{ account.user.login }}</p>
      <a href="/mine" data-nav class="secondary button-link">Мои объявления</a>
      <a href="/favorites" data-nav class="secondary button-link">Избранное</a>
      <a href="/reservations" data-nav class="secondary button-link">Мои брони</a>
      <button class="quiet" :disabled="pending" @click="logout">Выйти</button>
    </aside>
  </section>
  <p v-else-if="account.loading" class="empty-panel">Загружаем профиль…</p>
</template>
