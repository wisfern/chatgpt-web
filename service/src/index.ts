import express from 'express'
import type { ResponseType } from 'axios'
import axios from 'axios'
import type { RequestProps } from './types'
import type { ChatMessage } from './chatgpt'
import { chatConfig, chatReplyProcess, createProxyAgent, currentModel } from './chatgpt'
import { auth } from './middleware/auth'
import { limiter } from './middleware/limiter'
import { isNotEmptyString } from './utils/is'

const app = express()
const router = express.Router()

app.use(express.static('public'))
app.use(express.json())

app.all('*', (_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'authorization, Content-Type')
  res.header('Access-Control-Allow-Methods', '*')
  next()
})

router.post('/chat-process', [auth, limiter], async (req, res) => {
  res.setHeader('Content-type', 'application/octet-stream')

  try {
    const { prompt, options = {}, systemMessage, model } = req.body as RequestProps
    let firstChunk = true
    await chatReplyProcess({
      message: prompt,
      lastContext: options,
      process: (chat: ChatMessage) => {
        res.write(firstChunk ? JSON.stringify(chat) : `\n${JSON.stringify(chat)}`)
        firstChunk = false
      },
      systemMessage,
      model,
    })
  }
  catch (error) {
    res.write(JSON.stringify(error))
  }
  finally {
    res.end()
  }
})

router.post('/config', auth, async (req, res) => {
  try {
    const response = await chatConfig()
    res.send(response)
  }
  catch (error) {
    res.send(error)
  }
})

router.post('/session', async (req, res) => {
  try {
    const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY
    const hasAuth = isNotEmptyString(AUTH_SECRET_KEY)
    res.send({ status: 'Success', message: '', data: { auth: hasAuth, model: currentModel() } })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body as { token: string }
    if (!token)
      throw new Error('Secret key is empty')

    if (process.env.AUTH_SECRET_KEY !== token)
      throw new Error('密钥无效 | Secret key is invalid')

    res.send({ status: 'Success', message: 'Verify successfully', data: null })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

async function transforProxy(req, res, to_url) {
  const headers = req.headers
  // modify headers for private
  delete headers.host
  delete headers['x-forwarded-for']
  delete headers['x-forwarded-proto']
  delete headers['x-envoy-external-address']
  delete headers['x-real-ip']
  // for local proxy
  const proxy_agent = createProxyAgent()
  const responseType_: ResponseType = req.body.stream ? 'stream' : 'text'
  globalThis.console.log(`${new Date().toISOString()} ${req.method} ${responseType_} ${req.url} => ${to_url} request proxy whith ${JSON.stringify(headers)} ${JSON.stringify(req.body)}`)
  // request proxy
  axios.request({
    method: req.method,
    url: to_url,
    headers,
    data: req.body,
    responseType: responseType_,
    ...proxy_agent,
  }).then((response) => {
    res.status(response.status).set(response.headers)
    if (response.headers['content-length'])
      res.send(response.data) // no stream
    else
      response.data.pipe(res) // stream
  }).catch((error) => {
    if (res.headersSent) {
      res.end('close stream')
    }
    else {
      if (error.response) {
        globalThis.console.log(`catch request error ${error}`)
        res.status(error.response.status).set(error.response.headers).end(error.response.data)
      }
      else {
        globalThis.console.error(`catch system error ${error}`)
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end('500 Internal Server Error')
      }
    }
  })
}

router.all('/backend-api/conversation', async (req, res) => {
  const url = `https://chat.openai.com${req.url}`
  await transforProxy(req, res, url)
})

router.all('/v1/chat/completions', async (req, res) => {
  const url = `https://api.openai.com${req.url}`
  await transforProxy(req, res, url)
})

app.use('', router)
app.use('/api', router)
app.set('trust proxy', 1)

app.listen(3002, () => globalThis.console.log('Server is running on port 3002'))
