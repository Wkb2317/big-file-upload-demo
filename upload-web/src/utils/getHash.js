import SparkMD5 from "spark-md5";
import { createMD5 } from "hash-wasm";

// 计算文件hash值
export const getHash = (file, SIZE, cb) => {
  SIZE = 1024 * 1024 * 100;
  const blobSlice =
    File.prototype.slice ||
    File.prototype.mozSlice ||
    File.prototype.webkitSlice;
  const chunkSize = SIZE;
  const chunks = Math.ceil(file.size / chunkSize);
  let currentChunk = 0;
  const spark = new SparkMD5.ArrayBuffer();
  const fileReader = new FileReader();

  function loadNext() {
    let start = currentChunk * chunkSize,
      end = start + chunkSize >= file.size ? file.size : start + chunkSize;
    fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
  }

  const promise = new Promise((resolve) => {
    fileReader.onload = function (e) {
      const progress = ((currentChunk + 1) / chunks) * 100;
      console.log(progress);
      cb(progress);
      spark.append(e.target.result); // Append array buffer
      currentChunk++;

      if (currentChunk < chunks) {
        loadNext();
      } else {
        console.log("finished loading");
        const hash = spark.end();
        console.info("computed hash", hash); // Compute hash
        resolve({ code: 1, hash });
      }
    };

    fileReader.onerror = function () {
      console.warn("oops, something went wrong.");
      resolve({ code: 0, message: "oops, something went wrong." });
    };
  });

  loadNext();
  return promise;
};

// 使用wasm计算hash值
export const getHashByWasm = async (file, cb) => {
  const md5 = await createMD5();
  md5.init();
  const chunkSize = 1024 * 1024 * 500; // 分片大小 100mb
  const chunkNumber = Math.ceil(file.size / chunkSize);
  let currentChunk = 0;
  const fileReader = new FileReader();
  const startDate = new Date();

  function loadNext() {
    let start = currentChunk * chunkSize,
      end = start + chunkSize >= file.size ? file.size : start + chunkSize;
    fileReader.readAsArrayBuffer(file.slice(start, end));
  }

  const promise = new Promise((resolve) => {
    fileReader.onload = function (e) {
      const progress = ((currentChunk + 1) / chunkNumber).toFixed(2) * 100;
      cb(progress);

      md5.update(new Uint8Array(e.target.result)); // Append array buffer
      currentChunk++;

      if (currentChunk < chunkNumber) {
        loadNext();
      } else {
        console.log("finished loading");
        const hash = md5.digest();
        const endDate = new Date();
        console.log("date:", endDate - startDate);
        console.info("computed hash", hash); // Compute hash
        resolve({ code: 1, hash });
      }
    };

    fileReader.onerror = function () {
      console.warn("oops, something went wrong.");
      resolve({ code: 0, message: "oops, something went wrong." });
    };
  });

  loadNext();
  return promise;
};
