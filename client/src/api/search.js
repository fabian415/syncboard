import { http } from './http.js';

export function search(query, { signal } = {}) {
  return http.get('/search', { params: { q: query }, signal }).then((res) => res.data.results);
}
