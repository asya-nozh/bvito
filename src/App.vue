<script setup>
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref } from 'vue'
import Header from './components/Header.vue'
import Icon from './components/Icon.vue'
import Catalog from './pages/Catalog.vue'
import ErrorPage from './pages/ErrorPage.vue'
import { handleLink, path } from './navigation'
import { account, loadAccount } from './state'

const Listing = defineAsyncComponent(() => import('./pages/Listing.vue'))
const EditListing = defineAsyncComponent(() => import('./pages/EditListing.vue'))
const Auth = defineAsyncComponent(() => import('./pages/Auth.vue'))
const Profile = defineAsyncComponent(() => import('./pages/Profile.vue'))
const personal = { '/mine': 'mine', '/favorites': 'favorites', '/reservations': 'reservations' }
const showTop = ref(false)
const listingRoute = computed(() => path.value.match(/^\/listing\/([a-f\d]{24})(\/edit)?$/i))
const isCatalog = computed(() => path.value === '/' || path.value === '/catalog')
const needsAccount = computed(() => Boolean(personal[path.value] || listingRoute.value || ['/new', '/profile'].includes(path.value)))

function trackScroll() { showTop.value = window.scrollY > 420 }
function scrollUp() {
  const motion = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
  window.scrollTo({ top: 0, behavior: motion })
}

onMounted(() => {
  loadAccount()
  trackScroll()
  window.addEventListener('scroll', trackScroll, { passive: true })
})
onUnmounted(() => window.removeEventListener('scroll', trackScroll))
</script>

<template>
  <div class="app-shell" @click="handleLink">
    <a href="#main" class="skip-link">К содержимому</a>
    <Header />
    <main id="main" class="wrap content" :key="path">
      <ErrorPage v-if="needsAccount && account.error" :code="500" :retry="loadAccount" />
      <Catalog v-else-if="isCatalog || personal[path]" :view="personal[path]" />
      <Auth v-else-if="path === '/login'" />
      <Profile v-else-if="path === '/profile'" />
      <template v-else-if="listingRoute || path === '/new'">
        <p v-if="account.loading" class="empty-panel">Загрузка…</p>
        <EditListing v-else-if="path === '/new' || listingRoute?.[2]" :id="listingRoute?.[1]" />
        <Listing v-else :id="listingRoute[1]" />
      </template>
      <ErrorPage v-else-if="path === '/500'" :code="500" />
      <ErrorPage v-else />
    </main>
    <footer class="wrap site-footer"><a href="/" data-nav>Bvito</a><span>Учебная доска объявлений</span></footer>
    <button v-if="showTop" class="to-top" aria-label="Прокрутить вверх" @click="scrollUp">
      <Icon name="up" /> <span>Наверх</span>
    </button>
  </div>
</template>
