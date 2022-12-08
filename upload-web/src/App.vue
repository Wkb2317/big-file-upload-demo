<template>
  <div style="display: flex; justify-content: space-between">
    <Input type="file" @change="onChange" style="width: 300px" />
    <Button @click="handleUpload" type="primary">点击上传</Button>
  </div>

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
const fileChunkData = ref();
const dataSource = ref([]);

const onChange = (e) => {
  const [file] = e.target.files;
  console.log(file);
  currentFile.value = file;
};

// 点击上传按钮
const handleUpload = () => {
  if (!currentFile.value) return;
  dataSource.value = [];
  const fileChunkList = createFileChunk(currentFile.value, SIZE);
  fileChunkData.value = fileChunkList.map((fileChunk, index) => {
    const { file } = fileChunk;
    return {
      chunk: file,
      hash: currentFile.value.name + "-" + index,
    };
  });

  uploadChunk(fileChunkData.value);
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
const uploadChunk = async (fileChunkList) => {
  console.log("uploadChunk");

  let res;
  let flag = true;
  for (let i = 0; i < fileChunkList.length; i++) {
    let { chunk, hash } = fileChunkList[i];
    const formData = new FormData();
    formData.append("chunk", chunk);
    formData.append("hash", hash);
    formData.append("filename", currentFile.value.name);
    dataSource.value.push({ hash: hash, progress: 0, key: i });
    res = await axios.post("/api/upload", formData, {
      onUploadProgress: function (progressEvent) {
        // 处理原生进度事件
        let progress = ((progressEvent.loaded / progressEvent.total) * 100) | 0;
        dataSource.value[i].progress = progress;
      },
    });
    if (res.data.code === 0) {
      message.error(`${res.data.hash} 上传失败`);
      flag = false;
      break;
    }
  }
  if (flag) {
    const mergeRes = await axios.post("/api/merge", {
      hash: res.data.hash,
    });
    console.log(mergeRes);
    if (res.data.code === 1) {
      message.success(res.data.message);
    } else {
      message.error(res.data.message);
    }
  }
  // const res = await Promise.all(requestList);
  // 如果传过程报错
  // const failInfo = res.filter((item) => item.data.code === 0);
  // console.log(failInfo);
  // if (failInfo.length > 0) {
  //   message.error(`${failInfo.hash} 上传失败`);
  //   return;
  // }
  // 没有报错，上传完成，提交请求合并
};
</script>

<style scoped></style>
