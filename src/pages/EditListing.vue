<script setup>
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { api, errorText } from '../api'
import { account } from '../state'
import { go } from '../navigation'
import categories from '../../shared/categories.json'
import Icon from '../components/Icon.vue'
import ErrorPage from './ErrorPage.vue'

const props = defineProps({ id: String })
const form = reactive({
  title: '', description: '', price: '', category: '', subcategory: '', condition: 'used', image: ''
})
const alternatives = computed(() => categories[form.category] || [])
const pending = ref(false)
const loading = ref(Boolean(props.id))
const error = ref('')
const status = ref(0)
const controller = new AbortController()

async function load() {
  status.value = 0
  loading.value = true
  try {
    const item = await api('/listings/' + props.id, { signal: controller.signal })
    if (!item.isMine) { status.value = 404; return }
    for (const key of Object.keys(form)) form[key] = item[key]
  } catch (failure) {
    if (!controller.signal.aborted) status.value = failure.status === 404 ? 404 : 500
  } finally { loading.value = false }
}

watch([() => account.loading, () => account.user?.id, () => account.error], () => {
  if (account.loading || account.error) return
  if (!account.user) return go('/login?next=' + encodeURIComponent(location.pathname), true)
  if (props.id) load()
}, { immediate: true })
onUnmounted(() => controller.abort())

async function save() {
  pending.value = true
  error.value = ''
  try {
    const item = await api('/listings' + (props.id ? '/' + props.id : ''), {
      method: props.id ? 'PATCH' : 'POST',
      body: { ...form, price: Number(form.price) }
    })
    go('/listing/' + item._id)
  } catch (failure) { error.value = errorText(failure) }
  finally { pending.value = false }
}
</script>

<template>
  <ErrorPage v-if="status" :code="status" :retry="status === 500 ? load : undefined" />
  <p v-else-if="loading || account.loading" class="empty-panel" role="status">Загружаем форму…</p>
  <section v-else-if="account.user" class="form-panel single-panel">
    <a :href="id ? '/listing/' + id : '/mine'" data-nav class="back-link"><Icon name="left" /> Назад</a>
    <h1>{{ id ? 'Редактировать объявление' : 'Новое объявление' }}</h1>
    <p v-if="!account.user.phone && !account.user.telegram" class="notice">
      Перед публикацией добавьте способ связи. <a href="/profile" data-nav>Открыть профиль</a>
    </p>
    <form class="stack" @submit.prevent="save">
      <label>Заголовок<input v-model="form.title" required minlength="3" maxlength="90" placeholder="Например, настольная лампа"></label>
      <div class="two-fields">
        <label>Категория<select v-model="form.category" required @change="form.subcategory = ''">
          <option disabled value="">Выберите категорию</option>
          <option v-for="category in Object.keys(categories)" :key="category">{{ category }}</option>
        </select></label>
        <label>Подкатегория<select v-model="form.subcategory" required :disabled="!alternatives.length">
          <option disabled value="">Выберите подкатегорию</option>
          <option v-for="value in alternatives" :key="value">{{ value }}</option>
        </select></label>
      </div>
      <div class="two-fields">
        <label>Цена, ₽<input v-model="form.price" type="number" required min="0" max="999999999" step="1"></label>
        <label>Состояние<select v-model="form.condition"><option value="used">Б/у</option><option value="new">Новое</option></select></label>
      </div>
      <label>Описание<textarea v-model="form.description" required minlength="5" maxlength="1500" rows="5"></textarea></label>
      <label>Ссылка на фото <small>необязательно</small>
        <input v-model="form.image" type="text" inputmode="url" maxlength="1000" placeholder="https://…">
      </label>
      <p v-if="error" class="notice error" role="alert">{{ error }}</p>
      <button class="primary" :disabled="pending || (!account.user.phone && !account.user.telegram)">
        {{ id ? 'Сохранить изменения' : 'Опубликовать' }}
      </button>
    </form>
  </section>
</template>
