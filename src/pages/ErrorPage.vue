<script setup>
defineProps({ code: { type: Number, default: 404 }, retry: Function })
</script>

<template>
  <section class="error-page">
    <img src="/mascot.webp" alt="" width="360" height="290">
    <div>
      <p class="error-code">{{ code }}</p>
      <h1>{{ code === 404 ? 'Страница потерялась' : 'Что-то пошло не так' }}</h1>
      <p>{{ code === 404 ? 'В этой коробке пусто. Возможно, ссылка устарела.' : 'Попробуйте ещё раз через минуту.' }}</p>
      <div class="actions">
        <button v-if="retry" class="primary" @click="retry">Повторить</button>
        <a href="/" data-nav class="secondary button-link">Вернуться в каталог</a>
      </div>
    </div>
  </section>
</template>
