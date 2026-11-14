<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watchEffect } from 'vue'
import Icon from '../components/Icon.vue'
import ListingCard from '../components/ListingCard.vue'
import categories from '../../shared/categories.json'
import { api, errorText } from '../api'
import { account } from '../state'
import { go } from '../navigation'

const props = defineProps({ view: { type: String, default: '' } })
const titles = { mine: 'Мои объявления', favorites: 'Избранное', reservations: 'Мои брони' }
const emptyTexts = {
  mine: 'Здесь появятся опубликованные вами объявления.',
  favorites: 'Нажмите на сердечко на карточке, чтобы сохранить объявление.',
  reservations: 'Здесь появятся объявления, которые вы забронировали.'
}
const initials = { q: '', category: '', subcategory: '', min: '', max: '', condition: '', sort: 'newest' }
const filters = reactive({ ...initials })
const desktopFilters = !matchMedia('(max-width: 790px)').matches
const query = ref('')
const primaryCategories = ['', 'Техника', 'Для дома', 'Одежда', 'Хобби и спорт']
const otherCategories = Object.keys(categories).filter(category => !primaryCategories.includes(category))
const showOtherCategories = ref(false)
const otherButton = ref(null)

function chooseOtherCategory(category) {
  chooseCategory(category)
  showOtherCategories.value = false
  otherButton.value?.focus()
}

function closeOtherCategories() {
  showOtherCategories.value = false
  otherButton.value?.focus()
}
const applied = ref({ ...initials })
const alternatives = computed(() => categories[filters.category] || [])
const activeFilters = computed(() => Object.keys(initials).some(key => applied.value[key] !== initials[key]))
const items = ref([])
const hasMore = ref(false)
const loading = ref(false)
const error = ref('')
const page = ref(0)
let request

async function load(nextPage = 1) {
  request?.abort()
  const current = new AbortController()
  request = current
  loading.value = true
  error.value = ''
  if (nextPage === 1) items.value = []
  const params = new URLSearchParams({ page: nextPage })
  if (props.view) params.set('view', props.view)
  else Object.entries(applied.value).forEach(([key, value]) => {
    if (value !== '') params.set(key, value)
  })
  try {
    const data = await api('/listings?' + params, { signal: current.signal })
    if (current.signal.aborted) return
    page.value = nextPage
    items.value = nextPage === 1 ? data.items : [...items.value, ...data.items]
    hasMore.value = data.hasMore
  } catch (failure) {
    if (!current.signal.aborted) error.value = errorText(failure)
  } finally {
    if (request === current) loading.value = false
  }
}

function apply() {
  filters.q = query.value.trim()
  applied.value = { ...filters }
  load()
}

function reset() {
  Object.assign(filters, initials)
  query.value = ''
  apply()
}

function chooseCategory(category) {
  filters.category = category
  filters.subcategory = ''
  apply()
}

onMounted(() => { if (!props.view) load() })
watchEffect(() => {
  if (!props.view || account.loading || account.error) return
  if (account.user) load()
  else go('/login?next=' + encodeURIComponent(location.pathname), true)
})
onUnmounted(() => request?.abort())
</script>

<template>
  <section v-if="!view" class="hero">
    <div class="hero-copy">
      <h1>Хорошие вещи.<br><em>Новые истории.</em></h1>
      <form class="hero-search" role="search" @submit.prevent="apply">
        <Icon name="search" />
        <label class="visually-hidden" for="search">Поиск по объявлениям</label>
        <input id="search" v-model="query" maxlength="100" placeholder="Что вы ищете?">
        <button class="primary">Найти</button>
      </form>
    </div>
    <img class="hero-cat" src="/mascot.webp" alt="" width="420" height="300" fetchpriority="high">
  </section>

  <div v-if="!view" class="category-strip" aria-label="Категории">
    <button v-for="category in primaryCategories" :key="category" type="button"
      :aria-pressed="filters.category === category" @click="chooseCategory(category)">
      {{ category || 'Все категории' }}
    </button>
    <button ref="otherButton" type="button" class="other-categories-button"
      :aria-expanded="showOtherCategories" aria-controls="other-categories"
      :class="{ selected: otherCategories.includes(filters.category) }"
      @click="showOtherCategories = !showOtherCategories">
      Другие<span v-if="!showOtherCategories && otherCategories.includes(filters.category)"> · {{ filters.category }}</span>
      <span aria-hidden="true">{{ showOtherCategories ? '−' : '+' }}</span>
    </button>
    <div v-show="showOtherCategories" id="other-categories" class="other-categories" role="group"
      aria-label="Другие категории" @keydown.esc.prevent="closeOtherCategories">
      <button v-for="category in otherCategories" :key="category" type="button"
        :aria-pressed="filters.category === category" @click="chooseOtherCategory(category)">
        {{ category }}
      </button>
    </div>
  </div>

  <div v-if="!view" class="catalog-toolbar">
    <h2>{{ applied.q ? 'Результаты поиска' : 'Объявления' }}</h2>
    <label class="sort-control">Сортировка
      <select v-model="filters.sort" @change="apply">
        <option value="newest">{{ applied.q ? 'По совпадению' : 'Сначала новые' }}</option>
        <option value="low">Сначала дешевле</option>
        <option value="high">Сначала дороже</option>
      </select>
    </label>
  </div>
  <div v-else class="catalog-toolbar personal-toolbar">
    <h1>{{ titles[view] }}</h1>
    <a v-if="view === 'mine'" href="/new" data-nav class="primary button-link">Подать объявление</a>
  </div>

  <div :class="['catalog-layout', { personal: view }]">
    <details v-if="!view" class="filter-panel" :open="desktopFilters">
      <summary><Icon name="filter" /> Фильтры</summary>
      <form class="filters" @submit.prevent="apply">
        <label v-if="alternatives.length">Подкатегория
          <select v-model="filters.subcategory">
            <option value="">Все</option>
            <option v-for="item in alternatives" :key="item">{{ item }}</option>
          </select>
        </label>
        <fieldset>
          <legend>Цена, ₽</legend>
          <div class="price-range">
            <input v-model="filters.min" type="number" min="0" max="999999999" aria-label="Цена от" placeholder="От">
            <input v-model="filters.max" type="number" min="0" max="999999999" aria-label="Цена до" placeholder="До">
          </div>
        </fieldset>
        <label>Состояние
          <select v-model="filters.condition">
            <option value="">Любое</option><option value="new">Новое</option><option value="used">Б/у</option>
          </select>
        </label>
        <button class="primary">Показать</button>
        <button v-if="activeFilters" class="quiet" type="button" @click="reset">Сбросить</button>
      </form>
    </details>

    <section aria-label="Список объявлений" :aria-busy="loading || (view && account.loading)">
      <div v-if="items.length" class="listing-grid">
        <ListingCard v-for="(item, index) in items" :key="item._id" :item="item" :eager="index < 3"
          @favorite="view === 'favorites' && load()" />
      </div>
      <div v-if="error" class="empty-panel" role="alert">
        <p>{{ error }}</p>
        <button class="secondary" @click="load(items.length ? page + 1 : 1)">Повторить</button>
      </div>
      <p v-else-if="loading || (view && account.loading)" class="empty-panel" role="status">Загружаем объявления…</p>
      <div v-else-if="!items.length && (!view || account.user)" class="empty-panel">
        <Icon :name="view === 'favorites' ? 'heart' : 'box'" :size="34" />
        <h2>{{ view ? 'Пока пусто' : 'Ничего не нашлось' }}</h2>
        <p>{{ emptyTexts[view] || 'Попробуйте изменить запрос или настройки поиска.' }}</p>
        <button v-if="!view && activeFilters" class="secondary" @click="reset">Сбросить фильтры</button>
        <a v-if="view && view !== 'mine'" href="/" data-nav class="secondary button-link">В каталог</a>
      </div>
      <div v-else-if="hasMore" class="more"><button class="secondary" @click="load(page + 1)">Показать ещё</button></div>
    </section>
  </div>
</template>
