export async function api(path, options = {}) {
  const { body, ...request } = options
  const response = await fetch('/api' + path, {
    ...request,
    ...(body && { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
  })
  if (response.status === 204) return null
  const data = await response.json()
  if (!response.ok) throw Object.assign(new Error(data.message), { status: response.status })
  return data
}

export function errorText(error) {
  return error.status ? error.message : 'Не удалось подключиться. Попробуйте ещё раз.'
}
