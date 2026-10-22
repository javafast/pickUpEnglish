# 部署说明

## ELLLO 逐句点读

- 线上地址：<https://elllo.191929.xyz/>
- 页面源目录：`platforms/elllo/reader/`
- 服务器页面目录：`/var/www/elllo191929/`
- 服务器媒体目录：`/var/www/elllo191929-media/`
- Caddy 配置：`platforms/elllo/deploy/Caddyfile`

同步静态页面：

```bash
rsync -az --delete platforms/elllo/reader/ root@138.2.69.30:/var/www/elllo191929/
```

媒体文件不提交到 GitHub。音频和字幕在服务器按下面的规则配对：

```text
${bookPath}/${filename}.mp3
${bookPath}/${filename}.lrc
```

## 拾光导航

- Sites 项目 ID：`appgprj_6acdc9145bb881919ec603d10c8dc23c`
- 线上地址：<https://shiguang-nav.superfern2.chatgpt.site/>
- 导航页面源目录：`apps/navigation/`

Sites 的实际发布仍在原 Sites 项目中进行；本仓库用于代码归档、协作和版本管理。
