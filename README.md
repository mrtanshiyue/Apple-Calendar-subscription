# 岁时 · Apple Calendar Subscription

一个面向中文用户的 Apple 日历订阅前端原型，用于管理农历生日、纪念日和中国节假日。

当前仓库已经包含 Cloudflare Worker API 和 Pages Advanced Mode 入口。前端仍然支持 `localStorage` 预览模式，部署后可以在同一个域名创建远程日历、保存日期并提供 `.ics` 订阅地址。

- `app.js` 中的 `state.events` 是前端事件模型；
- `worker/index.js` 提供日历创建、日期增删改和 `.ics` 输出接口；
- `_worker.js` 将 `/api/*` 请求交给日历 Worker，其余请求交给 Pages 静态资源；
- `wrangler.jsonc` 绑定了独立的 Cloudflare KV 命名空间；
- Worker 会把农历生日转换为未来 10 年的公历事件；法定节假日同步还需要接入下一步的官方数据源。

## 本地预览

直接打开 `index.html` 即可预览。也可以在仓库根目录运行：

```bash
npx serve .
```

## Cloudflare Worker

```bash
npm install
npx wrangler deploy --config wrangler.worker.jsonc
```

Worker 默认名称是 `suishi-calendar-api`，日历订阅接口为 `/api/calendar/{token}.ics`。

## GitHub Pages

在仓库的 **Settings → Pages** 中，将发布来源设置为 `main` 分支根目录即可。当前文件没有构建步骤，适合直接部署到 GitHub Pages。
