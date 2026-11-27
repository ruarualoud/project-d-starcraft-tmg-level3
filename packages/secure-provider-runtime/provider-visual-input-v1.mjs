import { createHash } from 'node:crypto';

// Host-captured PNGs only. No model-selected URL or filesystem access.
export function normalizeProviderVisualInputsV1(inputs) {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new TypeError('visualInputs must contain images');
  }
  return inputs.map(input => {
    if (!input || Object.keys(input).some(k => !['mimeType','data','sha256','detail'].includes(k))
      || input.mimeType !== 'image/png' || typeof input.data !== 'string'
      || !/^[A-Za-z0-9+/]+={0,2}$/.test(input.data)) {
      throw new TypeError('visual input must be a Host PNG');
    }
    const bytes = Buffer.from(input.data, 'base64');
    if (bytes.length < 24 || bytes.toString('base64') !== input.data
      || !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      || createHash('sha256').update(bytes).digest('hex') !== input.sha256) {
      throw new TypeError('visual input bytes differ from captured frame');
    }
    const detail = input.detail ?? 'high';
    if (!['auto','low','high'].includes(detail)) throw new TypeError('invalid image detail');
    return { mimeType: input.mimeType, data: input.data, sha256: input.sha256, detail };
  });
}

export function providerVisualContentV1(text, inputs) {
  if (inputs === undefined) return text;
  return [{type:'text',text}, ...normalizeProviderVisualInputsV1(inputs).map(image => ({
    type:'image_url', image_url:{url:`data:${image.mimeType};base64,${image.data}`,detail:image.detail},
  }))];
}
