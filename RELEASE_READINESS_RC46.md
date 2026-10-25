# rc.46 上线前验收标准

适用分支：`upgrade/hema-rc46`

当前候选提交：`HEAD`（包含 rc.46 合并提交 `b8be968c3`）
上游 rc.46 提交：`7d8b91268`
HEMA UI 基线：`7cf75bb8d`

这份标准用于判断候选版本能否进入灰度或生产。候选分支、生产容器、生产数据库和线上 Nginx 必须分开验证。任何一项阻断项未通过，都不能称为可上线。

## 当前结论

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| rc.46 合并 | 已通过 | 无合并冲突，合并提交为 `b8be968c3` |
| HEMA UI 保留 | 已通过 | `web/public/hema-home/` 未被 rc.46 覆盖 |
| Go 版本与镜像基线 | 已通过 | `go.mod` 和 `Dockerfile` 使用 Go `1.26.10` |
| `git diff --check` | 已通过 | 当前候选无空白错误 |
| relaykit 独立构建 | 环境阻塞 | 代码路径已检查；本次重跑因 DNS 无法访问 `proxy.golang.org` |
| 完整 Go 测试 | 环境阻塞 | 本次重跑因 DNS 无法访问 `proxy.golang.org` |
| 前端依赖、类型检查、构建 | 待执行 | 当前环境缺少 Bun 和 `web/node_modules` |
| 三数据库迁移矩阵 | 待执行 | 必须覆盖 SQLite、MySQL、PostgreSQL |
| API/流式/错误日志验收 | 待执行 | 必须使用隔离测试环境和临时 key |
| Docker 镜像与健康检查 | 待执行 | 必须在候选提交上构建并启动 |
| 生产切换 | 未执行 | 本次不修改生产 |

## 阻断门禁

以下项目全部通过后，候选版才允许进入灰度：

1. **版本与源码**
   - 分支为 `upgrade/hema-rc46`，提交和上游 tag 可追溯。
   - `git diff --check` 通过，工作树干净。
   - `go.mod`、Dockerfile、CI 使用预期 Go 版本。
   - 本地或 CI 运行时 Go 必须为 `1.26.10`，前端 Bun 必须为 `1.4.0`。
   - `web/public/hema-home/` 的 HEMA 定制首页、静态资源和路由文件仍存在，且与 `7cf75bb8d` 基线一致。

2. **后端构建与测试**
   - 根模块执行 `go test ./...`。
   - `relaykit/` 和 `tokenkit/` 分别执行 `GOWORK=off go build ./...`，涉及测试时再执行 `GOWORK=off go test ./...`。
   - 测试使用候选目录内可写的 `GOMODCACHE`、`GOCACHE`，不得因宿主缓存权限绕过测试。

3. **前端构建与静态检查**
   - 使用锁文件执行 `bun install --frozen-lockfile`。
   - `bun run typecheck`、`bun run lint`、`bun run test`、`bun run build:check` 全部通过。
   - 构建产物包含 HEMA 首页；不能用旧的 `web/dist` 冒充本次构建结果。

4. **数据库与缓存兼容性**
   - 在 SQLite、MySQL 5.7.8+、PostgreSQL 9.6+ 各启动一次全新库。
   - 用上一稳定版本创建代表性数据，再升级到 rc.46；启动至少两次，确认迁移幂等。
   - 检查用户、渠道、模型、额度、请求日志、错误日志、请求 ID、计费记录和索引仍可读写。
   - 如启用独立日志库，还要重复验证日志库。
   - Redis 限流恢复、重启恢复和连接丢失恢复要有实际记录。

5. **API 合同与网关行为**
   - `/v1/models`：鉴权、模型列表和权限过滤正确。
   - `/v1/chat/completions`：非流 JSON、流式 SSE、`[DONE]`、工具调用、上游错误和客户端取消均有结果。
   - `/v1/messages`：非流与流式响应、错误响应和请求 ID 可查。
   - `/v1/responses`：非流与流式响应、错误响应和请求 ID 可查。
   - 对每个接口分别记录 HTTP 状态、响应体是否为空、`finish_reason`、usage、上游请求 ID、HEMA `X-Oneapi-Request-Id`、首 token 和总耗时。
   - 错误请求必须在 HEMA 请求日志中留下记录，即使未消费；日志中的错误原因不能只存在上游。
   - 流式请求必须验证代理缓冲、连接保持和长间隔 token；不得把 HTTP 200 当作语义成功。

6. **镜像与运行时**
   - 以候选提交构建镜像，记录本地 image ID；推送到 registry 后再记录不可变 digest。
   - 使用独立 compose 项目启动，不得复用生产容器名、网络、卷或数据库。
   - 健康检查、`/v1/models`、登录页、HEMA 首页和核心 API 均通过后才可进入灰度。
   - 容器重启后配置、数据库、Redis、静态资源和日志仍可用。

## 生产发布门禁

灰度前必须准备以下证据：

- 当前生产镜像 digest、Git 提交、配置快照和环境变量清单（值脱敏）。
- 主数据库和日志数据库备份，并完成一次可读性抽查。
- Redis 持久化/恢复策略和回滚命令。
- 候选镜像 digest、健康检查结果、API smoke 报告和前端构建产物校验和。
- 明确维护窗口、客户通知、观察人和回滚负责人。
- 回滚目标必须是当前稳定镜像，而不是重新构建的 `latest`。

建议切换顺序：

```text
候选验证 -> 构建并固定 digest -> 备份 -> 独立容器启动 -> 小流量灰度
-> 观察错误率/延迟/流式完成率/计费 -> 扩大流量 -> 全量
```

## 回滚条件

出现以下任一项，立即停止扩大流量并回滚到上一稳定镜像：

- 核心接口 5xx、鉴权失败或请求 ID 丢失明显上升。
- 流式请求出现提前断流、无 `[DONE]`、重复扣费或错误日志缺失。
- 额度、计费、请求日志与上游结果不一致。
- 数据库迁移重复执行、索引丢失、启动失败或旧数据不可读。
- HEMA 定制首页、登录、控制台或客户既有 API 路径回归。

回滚后必须再次执行 `/v1/models`、一个非流请求、一个流式请求、日志查询和计费核对，并保存结果。

## 执行入口

在候选目录执行：

```bash
./scripts/rc46-release-gate.sh
```

API smoke 需要显式传入隔离环境地址和临时 key：

```bash
BASE_URL=https://staging.example.com \
API_KEY='temporary-test-key' \
MODEL='test-model' \
./scripts/rc46-release-gate.sh
```

脚本不会读取或保存生产密钥；报告默认写入系统临时目录 `newapi-rc46-release-gate/<timestamp>/`。

## 当前上线判定

当前只能判定为**候选已合并，尚未达到上线标准**。本机门禁实跑结果为 9 项通过、8 项失败、1 项警告：Bun 和 Docker 未安装，Go 依赖下载因 DNS 失败，API smoke 未执行。前端构建、完整 Go 测试、三数据库迁移、API/日志/计费验收、镜像健康检查和回滚演练完成并留存证据后，才能批准灰度；生产容器目前没有改动。
