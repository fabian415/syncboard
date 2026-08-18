import { search } from './search.service.js';

export async function searchHandler(req, res, next) {
  try {
    const results = await search(req.query.q);
    res.json({ results });
  } catch (err) {
    next(err);
  }
}
