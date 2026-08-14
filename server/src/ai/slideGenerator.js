import { chatComplete } from './aiClient.js';
import { parseSlides, validateSlides, InvalidSlidesError } from './pageSplitter.js';
import { HttpError } from '../middleware/errorHandler.js';

/**
 * @param {(opts: { retry: boolean }) => Array<{role: string, content: string}>} buildMessages
 * @param {{ min?: number, max?: number }} [range]
 */
export async function generateValidatedSlides(buildMessages, range = {}) {
  const first = await chatComplete(buildMessages({ retry: false }));
  try {
    return validateSlides(parseSlides(first), range);
  } catch (err) {
    if (!(err instanceof InvalidSlidesError)) throw err;
  }

  const retry = await chatComplete(buildMessages({ retry: true }));
  try {
    return validateSlides(parseSlides(retry), range);
  } catch (err) {
    if (err instanceof InvalidSlidesError) {
      throw new HttpError(502, err.message, 'AI 回應格式錯誤，請重試');
    }
    throw err;
  }
}
