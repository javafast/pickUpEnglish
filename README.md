# pickUpEnglish

拾光英语导航及各英语学习平台的配套代码。代码按平台分目录，平台之间互不混放。

## 目录

```text
apps/
  navigation/                 英语资源导航与少儿学习路线
platforms/
  elllo/                      ELLLO 学习台、逐句点读、油猴脚本和数据工具
  esl-lab/                    Randall's ESL-Lab 平台说明
  voa-learning-english/       VOA Learning English 平台说明
  bbc-learning-english/       BBC Learning English 平台说明
  talkenglish/                TalkEnglish 平台说明
  youglish/                   YouGlish 平台说明
  rachels-english/            Rachel's English 平台说明
  forvo/                      Forvo 平台说明
  new-concept-english/        新概念英语平台说明
docs/                         项目交接和部署说明
```

`platforms/elllo/` 是目前包含完整本地实现的平台。其他平台当前由导航页跳转到其官方网站，因此只保留入口和用途说明。

## 快速预览

```bash
python3 -m http.server 8000 --directory apps/navigation
python3 -m http.server 8001 --directory platforms/elllo/reader
```

打开 `http://localhost:8000` 查看英语导航，打开 `http://localhost:8001` 查看 ELLLO 逐句点读。

音频、LRC、构建缓存、日志和发布压缩包不会提交到 Git；服务器媒体地址遵循：

```text
${bookPath}/${filename}.mp3
${bookPath}/${filename}.lrc
```

详细说明见 [`platforms/elllo/README.md`](platforms/elllo/README.md) 和 [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)。
