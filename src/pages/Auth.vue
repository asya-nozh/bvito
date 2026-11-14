<script setup>
import { reactive, ref } from 'vue'
import { api, errorText } from '../api'
import { account } from '../state'
import { go } from '../navigation'

const mode = ref('login')
const form = reactive({ name: '', login: '', password: '' })
const pending = ref(false)
const error = ref('')
const demos = [{ login: 'maria', name: 'Мария' }, { login: 'ilya', name: 'Илья' }, { login: 'lena', name: 'Лена' }]

async function submit(demo) {
  pending.value = true
  error.value = ''
  try {
    account.user = await api('/account/' + (demo ? 'login' : mode.value), {
      method: 'POST', body: demo ? { login: demo, password: 'demo2026' } : form
    })
    const next = new URLSearchParams(location.search).get('next')
    go(/^\/(?:favorites|mine|reservations|profile|new|listing\/[a-f\d]{24}(?:\/edit)?)$/i.test(next || '') ? next : '/profile', true)
  } catch (failure) { error.value = errorText(failure) }
  finally { pending.value = false }
}
</script>

<template>
  <section class="split-page">
    <div class="form-panel">
      <h1>{{ mode === 'login' ? 'Войти в Bvito' : 'Создать аккаунт' }}</h1>
      <form class="stack" @submit.prevent="submit()">
        <label v-if="mode === 'register'">Имя<input v-model="form.name" required maxlength="50" autocomplete="name"></label>
        <label>Логин<input v-model="form.login" required maxlength="24" autocomplete="username" autocapitalize="off"></label>
        <label>Пароль<input v-model="form.password" type="password" required maxlength="128"
          :minlength="mode === 'register' ? 6 : 1" :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"></label>
        <p v-if="error" class="notice error" role="alert">{{ error }}</p>
        <button class="primary" :disabled="pending">{{ mode === 'login' ? 'Войти' : 'Зарегистрироваться' }}</button>
      </form>
      <button class="quiet auth-toggle" @click="mode = mode === 'login' ? 'register' : 'login'; error = ''">
        {{ mode === 'login' ? 'Создать аккаунт' : 'Уже есть аккаунт? Войти' }}
      </button>
    </div>
    <aside class="demo-panel">
      <img src="/mascot.webp" alt="" width="260" height="185">
      <h2>Тестовые аккаунты</h2>
      <p>Выберите аккаунт, чтобы сразу войти. Общий пароль <strong>demo2026</strong>.</p>
      <div class="demo-buttons">
        <button v-for="demo in demos" :key="demo.login" class="secondary" :disabled="pending" @click="submit(demo.login)">
          {{ demo.name }} <small>{{ demo.login }}</small>
        </button>
      </div>
    </aside>
  </section>
</template>
