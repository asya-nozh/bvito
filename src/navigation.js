import { ref } from 'vue'

export const path = ref(location.pathname.replace(/\/$/, '') || '/')

function updatePath() {
  path.value = location.pathname.replace(/\/$/, '') || '/'
  window.scrollTo(0, 0)
}

window.addEventListener('popstate', updatePath)

export function go(url, replace = false) {
  history[replace ? 'replaceState' : 'pushState'](null, '', url)
  updatePath()
}

export function handleLink(event) {
  const link = event.target.closest('a[data-nav]')
  if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
  event.preventDefault()
  go(link.getAttribute('href'))
}
