const express = require('express')
const bodyParser = require('body-parser')
const multiparty = require('multiparty')
const path = require('path')
const fs = require('fs-extra')

const streamMerge = require('./streamMerge')

const app = express()
const port = 3000

app.use(bodyParser())
app.use(express.static('./file'))

app.get('/index', (req, res, next) => {
  res.send({
    status: 1,
  })
})

/**
 * 上传切片
 */
app.post('/upload', (req, res) => {
  const form = new multiparty.Form({
    uploadDir: path.resolve(__dirname, './file'),
  })
  form.parse(req, (err, fields, files) => {
    if (err) {
      return
    }
    const [chunk] = files.chunk
    const [hash] = fields.hash
    const [filename] = fields.filename

    // 临时路径
    const { path: oldPath } = chunk
    // chunk临时存储路径
    const chunkDir = path.resolve(__dirname, `./file/chunk-${filename}`)
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir)
    }

    fs.renameSync(
      oldPath,
      path.resolve(__dirname, `./file/chunk-${filename}/` + hash)
    )

    res.send({
      hash,
      code: 1,
      message: '上传成功',
    })
  })
})

/**
 * 合并切片
 */
app.post('/merge', async (req, res) => {
  const hash = req.body.hash
  if (!hash) {
    res.send({
      code: 0,
      message: '请传入最后一个切片的hash值',
    })
    return
  }
  const [fileName, chunkIndex] = hash.split('-')
  // 创建一个可写流
  const fileWriteStream = fs.createWriteStream(
    path.resolve(__dirname, `./file/${fileName}`)
  )
  // 获取切片目录下的所有切片文件名
  const script = fs.readdirSync(
    path.resolve(__dirname, `./file/chunk-${fileName}`)
  )
  // 目标文件夹
  const targetFile = path.resolve(__dirname, `./file/chunk-${fileName}`)

  const mergeRes = await streamMerge(script, fileWriteStream, targetFile)
  res.send(mergeRes)
})

app.listen(port, () => {
  console.log(`服务在端口${port}起飞！！！`)
})
