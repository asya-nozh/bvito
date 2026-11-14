<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { api, errorText } from '../api'
import { account, favoriteIds, priceLabel, toggleFavorite } from '../state'
import { go } from '../navigation'
import Icon from '../components/Icon.vue'
import ErrorPage from './ErrorPage.vue'

const props = defineProps({ id: String })
const item = ref(null)
const error = ref('')
const status = ref(0)
const broken = ref(false)
const busy = ref(false)
const controller = new AbortController()

async function load() {
  status.value = 0
  try { item.value = await api('/listings/' + props.id, { signal: controller.signal }) }
  catch (failure) {
    if (controller.signal.aborted) return
    status.value = failure.status === 404 ? 404 : 500
  }
}

async function act(action) {
  if (!account.user) return go('/login?next=' + encodeURIComponent(location.pathname))
  busy.value = true
  error.value = ''
  try {
    if (action === 'favorite') await toggleFavorite(props.id)
    if (action === 'reserve' || action === 'cancel') {
      item.value = await api('/listings/' + props.id + '/reservation', { method: action === 'reserve' ? 'PUT' : 'DELETE' })
    }
    if (action === 'delete' && window.confirm('Удалить это объявление?')) {
      await api('/listings/' + props.id, { method: 'DELETE' })
      account.user.favorites = account.user.favorites.filter(id => id !== props.id)
      go('/mine')
    }
  } catch (failure) {
    error.value = errorText(failure)
    if (failure.status === 409) await load()
  } finally { busy.value = false }
}

onMounted(load)
onUnmounted(() => controller.abort())
</script>

<template>
  <ErrorPage v-if="status" :code="status" :retry="status === 500 ? load : undefined" />
  <p v-else-if="!item" class="empty-panel" role="status">Загружаем объявление…</p>
  <template v-else>
    <a href="/" data-nav class="back-link"><Icon name="left" /> В каталог</a>
    <section class="detail-grid">
      <div class="detail-photo">
        <img v-if="item.image && !broken" :src="item.image" :alt="item.title" @error="broken = true">
        <Icon v-else name="box" :size="64" />
      </div>
      <div class="detail-copy">
        <p class="muted">{{ item.category }} · {{ item.subcategory }}</p>
        <h1>{{ item.title }}</h1>
        <p class="detail-price">{{ priceLabel(item.price) }}</p>
        <p class="condition">{{ item.condition === 'new' ? 'Новое' : 'Б/у' }}</p>
        <p class="description">{{ item.description }}</p>
        <div class="seller-panel">
          <p class="muted">Продавец</p>
          <h2>{{ item.seller.name }}</h2>
          <p v-if="item.reservedByMe">Бронь оформлена. Свяжитесь с продавцом, чтобы договориться о встрече.</p>
          <div v-if="item.contact" class="contacts">
            <a v-if="item.contact.phone" :href="'tel:' + item.contact.phone.replace(/[^0-9+]/g, '')">{{ item.contact.phone }}</a>
            <a v-if="item.contact.telegram" :href="'https://t.me/' + item.contact.telegram" target="_blank" rel="noopener noreferrer">@{{ item.contact.telegram }}</a>
          </div>
        </div>
        <p v-if="error" class="notice error" role="alert">{{ error }}</p>
        <div class="actions">
          <template v-if="item.isMine">
            <a data-nav :href="'/listing/' + id + '/edit'" class="primary button-link">Редактировать</a>
            <button class="secondary" :disabled="busy" @click="act('delete')">Удалить</button>
          </template>
          <template v-else>
            <button v-if="item.reservedByMe" class="secondary" :disabled="busy" @click="act('cancel')">Отменить бронь</button>
            <button v-else class="primary" :disabled="busy || item.reserved" @click="act('reserve')">
              {{ item.reserved ? 'Забронировано' : 'Забронировать' }}
            </button>
            <button class="secondary" :disabled="busy" :aria-pressed="favoriteIds.has(id)" @click="act('favorite')">
              <Icon name="heart" /> {{ favoriteIds.has(id) ? 'В избранном' : 'В избранное' }}
            </button>
          </template>
        </div>
      </div>
    </section>
  </template>
</template>
