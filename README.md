# 岁时 · Apple Calendar Subscription

一个面向中文用户的 Apple 日历订阅前端原型，用于管理农历生日、纪念日和中国节假日。

当前版本是纯静态前端，数据保存在浏览器的 `localStorage` 中，用于先验证录入和订阅引导体验。后续可以接入 Supabase Auth、数据库和日历生成接口：

- `app.js` 中的 `state.events` 是前端事件模型；
- `subscription-url` 是订阅接口的占位地址；
- 农历日期转公历、未来年份生成和 `.ics` 输出应放在后端完成。

## 本地预览

直接打开 `index.html` 即可预览。也可以在仓库根目录运行：

```bash
npx serve .
```

## GitHub Pages

在仓库的 **Settings → Pages** 中，将发布来源设置为 `main` 分支根目录即可。当前文件没有构建步骤，适合直接部署到 GitHub Pages。
