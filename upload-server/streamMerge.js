const path = require('path')
const fs = require('fs')

module.exports = function streamMerge(
  scripts = [],
  fileWriteStream,
  sourceFileDirectory
) {
  // 递归到尾部情况判断
  if (!scripts.length) {
    fileWriteStream.end("console.log('Stream 合并完成')") // 最后关闭可写流，防止内存泄漏
    return true
  }

  const currentFile = path.resolve(
    __dirname,
    sourceFileDirectory,
    scripts.shift()
  )
  const currentReadStream = fs.createReadStream(currentFile) // 获取当前的可读流

  currentReadStream.pipe(fileWriteStream, { end: false })
  currentReadStream.on('end', function () {
    streamMerge(scripts, fileWriteStream, sourceFileDirectory)
  })

  currentReadStream.on('error', function (error) {
    // 监听错误事件，关闭可写流，防止内存泄漏
    console.error(error)
    fileWriteStream.close()
    return false
  })
}
