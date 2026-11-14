<script setup>
import { ref } from 'vue'
import Icon from './Icon.vue'
import { account, favoriteIds, priceLabel, toggleFavorite } from '../state'
import { errorText } from '../api'
import { go } from '../navigation'

const props = defineProps({ item: Object, eager: Boolean })
const emit = defineEmits(['favorite'])
const pending = ref(false)
const broken = ref(false)
const error = ref('')

async function favorite() {
  if (!account.user) return go('/login?next=' + encodeURIComponent('/listing/' + props.item._id))
  pending.value = true
  error.value = ''
  try {
    await toggleFavorite(props.item._id)
    emit('favorite')
  } catch (failure) { error.value = errorText(failure) }
  finally { pending.value = false }
}
</script>

<template>
  <article class="listing-card">
    <div class="listing-media">
      <a :href="'/listing/' + item._id" data-nav class="photo-link" tabindex="-1" aria-hidden="true">
        <img v-if="item.image && !broken" :src="item.image" alt="" width="384" height="276"
          :loading="eager ? 'eager' : 'lazy'" decoding="async" @error="broken = true">
        <Icon v-else name="box" :size="42" />
      </a>
      <button class="favorite-button" type="button" :disabled="pending" :aria-pressed="favoriteIds.has(item._id)"
        :aria-label="favoriteIds.has(item._id) ? 'Убрать из избранного' : 'В избранное'" @click="favorite">
        <Icon name="heart" :size="19" />
      </button>
      <span v-if="item.reserved" class="reserved-badge">Забронировано</span>
    </div>
    <div class="listing-copy">
      <p class="listing-price">{{ priceLabel(item.price) }}</p>
      <h3><a :href="'/listing/' + item._id" data-nav>{{ item.title }}</a></h3>
      <p class="listing-meta">{{ item.subcategory }} <span>·</span> {{ item.condition === 'new' ? 'Новое' : 'Б/у' }}</p>
      <p v-if="error" class="notice error" role="alert">{{ error }}</p>
    </div>
  </article>
</template>
