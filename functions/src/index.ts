import * as functions from 'firebase-functions'
import { Storage } from '@google-cloud/storage'
import * as sharp from 'sharp'
import config from './config'

const storage = new Storage()

export const convert = functions
  .region(config.region as any)
  .https.onRequest((request, response) => {
    const bucket = storage.bucket(config.bucket)
    // https://sharp.pixelplumbing.com/en/stable/api-resize/
    const resizeOpt = (() => {
      if (config.allowedConfigs) {
        const name: keyof typeof config.allowedConfigs = request.query.n
        return config.allowedConfigs[name]
      } else {
        return {
          width: parseInt(request.query.width, 10),
          height: parseInt(request.query.height, 10),
          fit: request.query.fit,
        }
      }
    })()
    if (!resizeOpt) {
      response.send(400)
      return
    }

    const converter = sharp()
      .resize(null, null, resizeOpt)

    const file = bucket.file(request.path)

    file.getMetadata().then(metadata => {
      response.set('Content-Type', metadata[0].contentType)
      response.set('cache-control', `public, max-age=${config.cacheMaxAge}`)

      file
        .createReadStream()
        .pipe(converter)
        .pipe(response)
    }).catch(err => {
      console.error(err)
      response.send(500)
    })
  });
