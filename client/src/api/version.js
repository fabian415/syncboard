import { http } from './http.js';

export function getVersionInfo() {
  return http.get('/version').then((res) => res.data);
}
