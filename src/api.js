const j = async (r) => {
  if (r.status === 401) { sessionStorage.removeItem('appauth'); location.reload() }
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText)
  return r.json()
}

const auth = () => {
  const p = sessionStorage.getItem('appauth')
  return p ? { 'x-app-password': p } : {}
}
const jsonHeaders = () => ({ 'Content-Type': 'application/json', ...auth() })
const post = (b) => ({ method: 'POST', headers: jsonHeaders(), body: JSON.stringify(b) })
const put = (b) => ({ method: 'PUT', headers: jsonHeaders(), body: JSON.stringify(b) })
const del = () => ({ method: 'DELETE', headers: auth() })

export const api = {
  data: () => fetch('/api/data', { headers: auth() }).then(j),

  createBrand: (b) => fetch('/api/brands', post(b)).then(j),
  updateBrand: (id, b) => fetch(`/api/brands/${id}`, put(b)).then(j),
  deleteBrand: (id) => fetch(`/api/brands/${id}`, del()).then(j),

  createCollection: (c) => fetch('/api/collections', post(c)).then(j),
  updateCollection: (id, c) => fetch(`/api/collections/${id}`, put(c)).then(j),
  deleteCollection: (id) => fetch(`/api/collections/${id}`, del()).then(j),

  createWatch: (w) => fetch('/api/watches', post(w)).then(j),
  updateWatch: (id, w) => fetch(`/api/watches/${id}`, put(w)).then(j),
  deleteWatch: (id) => fetch(`/api/watches/${id}`, del()).then(j),

  uploadImages: (watchId, files) => {
    const fd = new FormData()
    ;[...files].forEach((f) => fd.append('images', f))
    return fetch(`/api/watches/${watchId}/images`, { method: 'POST', headers: auth(), body: fd }).then(j)
  },
  setPrimaryImage: (id) => fetch(`/api/images/${id}/primary`, { method: 'PUT', headers: auth() }).then(j),
  deleteImage: (id) => fetch(`/api/images/${id}`, del()).then(j),

  createField: (f) => fetch('/api/fields', post(f)).then(j),
  updateField: (id, f) => fetch(`/api/fields/${id}`, put(f)).then(j),
  deleteField: (id) => fetch(`/api/fields/${id}`, del()).then(j),
  reorderFields: (order) => fetch('/api/fields/reorder', put({ order })).then(j),
}
