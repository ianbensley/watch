const j = async (r) => {
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText)
  return r.json()
}

export const api = {
  data: () => fetch('/api/data').then(j),

  createBrand: (b) => fetch('/api/brands', post(b)).then(j),
  updateBrand: (id, b) => fetch(`/api/brands/${id}`, put(b)).then(j),
  deleteBrand: (id) => fetch(`/api/brands/${id}`, { method: 'DELETE' }).then(j),

  createCollection: (c) => fetch('/api/collections', post(c)).then(j),
  updateCollection: (id, c) => fetch(`/api/collections/${id}`, put(c)).then(j),
  deleteCollection: (id) => fetch(`/api/collections/${id}`, { method: 'DELETE' }).then(j),

  createWatch: (w) => fetch('/api/watches', post(w)).then(j),
  updateWatch: (id, w) => fetch(`/api/watches/${id}`, put(w)).then(j),
  deleteWatch: (id) => fetch(`/api/watches/${id}`, { method: 'DELETE' }).then(j),

  uploadImages: (watchId, files) => {
    const fd = new FormData()
    ;[...files].forEach((f) => fd.append('images', f))
    return fetch(`/api/watches/${watchId}/images`, { method: 'POST', body: fd }).then(j)
  },
  setPrimaryImage: (id) => fetch(`/api/images/${id}/primary`, { method: 'PUT' }).then(j),
  deleteImage: (id) => fetch(`/api/images/${id}`, { method: 'DELETE' }).then(j),

  createField: (f) => fetch('/api/fields', post(f)).then(j),
  updateField: (id, f) => fetch(`/api/fields/${id}`, put(f)).then(j),
  deleteField: (id) => fetch(`/api/fields/${id}`, { method: 'DELETE' }).then(j),
}

const headers = { 'Content-Type': 'application/json' }
const post = (b) => ({ method: 'POST', headers, body: JSON.stringify(b) })
const put = (b) => ({ method: 'PUT', headers, body: JSON.stringify(b) })
