<template>
  <div style="display: flex; justify-content: space-between">
    <Input id="file" type="file" @change="onChange" style="width: 300px" />
    <Button @click="handleUpload" type="primary">点击上传</Button>
  </div>
  <a-progress v-if="hashProgress > 0" :percent="hashProgress" />
  <a-progress v-if="fileChunkData.length > 0" :percent="totalProgress" />
  <a-table :dataSource="dataSource" :columns="columns">
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'progress'">
        <a-progress :percent="record.progress"
      /></template>
    </template>
  </a-table>
</template>

<script setup>
import { message, Button, Input } from "ant-design-vue";
import { ref } from "vue";
import axios from "axios";
import { getHash } from "./utils/getHash";

// 切片大小
const SIZE = 10 * 1024 * 1024;
const columns = [
  {
    title: "分片名",
    dataIndex: "hash",
    key: "hash",
  },
  {
    title: "进度",
    dataIndex: "progress",
    key: "progress",
  },
];

const currentFile = ref();
const fileChunkData = ref([]);
const dataSource = ref([]);
const uploadFinishedNumber = ref(0);
const totalProgress = ref(0);
const hashProgress = ref(0);

const onChange = (e) => {
  const [file] = e.target.files;
  currentFile.value = file;
};

const getHashProgress = (progress) => {
  hashProgress.value = progress;
};

// 点击上传按钮
const handleUpload = async () => {
  if (!currentFile.value) return;

  // 校验文件hash值
  const hashRes = await getHash(currentFile.value, SIZE, getHashProgress);
  if (hashRes.code) {
    let res = await axios({
      url: "/api/checkFileIsUploaded",
      method: "get",
      params: {
        hash: hashRes.hash,
      },
    });
    if (res.data.code === 1) {
      message.success("上传成功，该文件已经上传过");
      return;
    }
  } else {
    message.error(hashRes.message);
    return;
  }

  dataSource.value = [];
  const fileChunkList = createFileChunk(currentFile.value, SIZE);
  fileChunkData.value = fileChunkList.map((fileChunk, index) => {
    const { file } = fileChunk;
    return {
      chunk: file,
      hash: hashRes.hash + "-" + index,
    };
  });

  uploadChunk(fileChunkData.value, hashRes.hash, currentFile.value.name);
};

// 文件分片
const createFileChunk = (file, size) => {
  const fileChunkList = [];
  let current = 0;
  while (current < file.size) {
    fileChunkList.push({ file: file.slice(current, current + size) });
    current += size;
  }
  return fileChunkList;
};

// 上传文件
const uploadChunk = async (fileChunkList, hash, filename) => {
  let res;
  let flag = true;
  for (let i = 0; i < fileChunkList.length; i++) {
    let { chunk, hash } = fileChunkList[i];
    const formData = new FormData();
    formData.append("chunk", chunk);
    formData.append("hash", hash);
    formData.append("filename", currentFile.value.name);
    dataSource.value.push({ hash: hash, progress: 0, key: i, finished: false });
    res = await axios.post("/api/upload", formData, {
      onUploadProgress: function (progressEvent) {
        // 处理原生进度事件
        let progress = ((progressEvent.loaded / progressEvent.total) * 100) | 0;
        dataSource.value[i].progress = progress;
        totalProgress.value =
          ((uploadFinishedNumber.value +
            progressEvent.loaded / progressEvent.total) /
            fileChunkData.value.length) *
            100 || 0;

        if (progress === 100) {
          dataSource.value[i].finished = true;
          uploadFinishedNumber.value += 1;
        }
      },
    });
    if (res.data.code === 0) {
      message.error(`${res.data.hash} 上传失败`);
      flag = false;
      return;
    }
  }
  if (flag) {
    const mergeRes = await axios.post("/api/merge", {
      hash,
      filename,
    });
    console.log(mergeRes);
    if (res.data.code === 1) {
      message.success(res.data.message);
    } else {
      message.error(res.data.message);
    }
  }
};
</script>

<style scoped></style>
