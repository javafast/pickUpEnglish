# ELLLO

ELLLO 是本仓库目前实现最完整的平台。

```text
learning-hub/   A1/A2 课程分类导航、iframe 学习台和油猴脚本
reader/         A1/A2 逐句点读页面、主题切换和课程 JSON
tools/          抓取文本、语音对齐、媒体清单及下载工具
deploy/         独立域名的 Caddy 配置
```

逐句点读支持课程类型和课次切换、播放进度、倍速、单句循环、自动跟随、点击句子播放，以及日间/夜间模式。

## 数据生成

```bash
python3 tools/build_a1_reader.py --help
python3 tools/build_a2_reader.py --help
python3 tools/export_a1_media.py
python3 tools/export_a2_media.py
```

构建脚本基础依赖为 `requests` 和 `beautifulsoup4`。需要语音识别对齐时另装 `faster-whisper`；能量停顿对齐依赖本机 `ffmpeg`。

生成的媒体位于 `media/`，缓存位于 `.cache/`，两者均被 Git 忽略。
