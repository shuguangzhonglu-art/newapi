# NewAPI Hybrid 部署文档

> 架构：主程序 + Redis 容器化，MySQL 外部独立部署  
> 访问地址：`http://服务器IP:3000`  
> 适用版本：NewAPI `latest`

---

## 一、架构说明

```
┌──────────────────────────┐         ┌──────────────────────┐
│      主程序机器 (宿主机)    │         │   数据库服务器 (外部)   │
│                          │         │                      │
│  ┌──────────┐  ┌────────┐│         │  ┌──────────────┐   │
│  │ NewAPI   │──│ Redis 7││         │  │ MySQL 8.2    │   │
│  │ :3000    │  │ :6379  ││  TCP    │  │ :3306        │   │
│  └──────────┘  └────────┘│ 3306    │  └──────────────┘   │
│        │            │     │────────→│                      │
│        └────────────┘     │         │                      │
│         Docker 内部网络    │         │                      │
└──────────────────────────┘         └──────────────────────┘
```

| 组件 | 镜像 | 部署位置 | 对外暴露 |
|---|---|---|---|
| new-api | `ghcr.io/shuguangzhonglu-art/newapi:latest` | 主程序机器（容器） | 是（3000） |
| redis | `redis:7-alpine` | 主程序机器（容器） | 否（仅内部） |
| mysql | MySQL ≥ 5.7.8 | 外部独立服务器 | 是（仅放行主程序 IP） |

---

## 二、环境要求

### 主程序机器

| 依赖 | 版本要求 | 说明 |
|---|---|---|
| Docker | ≥ 20.10 | 容器运行时 |
| Docker Compose | v2+ | 编排工具 |
| 开放端口 | 3000 | 应用对外访问 |
| 出站连通 | 3306 → 数据库服务器 | NewAPI 连外部 MySQL |

### 数据库服务器

| 依赖 | 版本要求 | 说明 |
|---|---|---|
| MySQL | ≥ 5.7.8（推荐 8.x） | 独立部署 |
| 开放端口 | 3306 | 仅放行主程序机器 IP（禁止 0.0.0.0/0） |

### 验证环境

```bash
# 主程序机器上执行
docker --version
docker compose version

# 主程序机器上测试能否连到数据库服务器
mysql -h 数据库IP -P 3306 -u newapi -p
```

---

## 三、前置准备（数据库服务器）

### 步骤 1：创建数据库和用户

登录数据库服务器，进入 MySQL：

```sql
-- 创建专用数据库
CREATE DATABASE newapi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建专用用户（% 表示允许远程连接）
CREATE USER 'newapi'@'%' IDENTIFIED BY '<请替换为高强度随机密码>';

-- 授权（仅授予必要权限，遵循最小权限原则）
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX ON newapi.* TO 'newapi'@'%';

-- 刷新权限
FLUSH PRIVILEGES;
```

### 步骤 2：放行防火墙

| 方向 | 协议 | 端口 | 来源 | 动作 |
|---|---|---|---|---|
| 入站 | TCP | 3306 | 主程序机器公网/内网 IP | 允许 |

> ⚠️ **禁止对全网开放 3306**。如果两台机器同地域，优先使用**内网 IP** 通信（延迟更低、不消耗公网流量）。

---

## 四、快速部署（主程序机器）

### 步骤 1：创建目录

```bash
mkdir -p /mengyu-docker/newapi-hybrid/{data,logs,redis_data}
```

### 步骤 2：写入 `.env`

```bash
nano /mengyu-docker/newapi-hybrid/.env
```

将附录 A 的完整内容粘贴进去，**修改 `MYSQL_HOST` 和 `MYSQL_PWD` 为实际值**，`Ctrl+O` 保存，`Ctrl+X` 退出。

### 步骤 3：写入 `docker-compose.yml`

```bash
nano /mengyu-docker/newapi-hybrid/docker-compose.yml
```

将附录 B 的完整内容粘贴进去，`Ctrl+O` 保存，`Ctrl+X` 退出。

### 步骤 4：启动

```bash
cd /mengyu-docker/newapi-hybrid
docker compose up -d
```

### 步骤 5：确认服务状态

```bash
docker compose ps
docker logs newapi-hybrid -f
```

看到 `database migration started` 表示 NewAPI 已成功连接外部 MySQL 并开始自动建表。

### 步骤 6：访问并初始化管理员

浏览器打开 `http://服务器IP:3000` → 点击注册 → **第一个注册的用户自动成为管理员**。

---

## 五、配置参数详解

### 5.1 `.env` 变量

| 变量 | 说明 | 是否可改 |
|---|---|---|
| `HOST_IP` | 监听地址，`0.0.0.0` 接受所有网卡 | 一般不动 |
| `WEB_HTTP_PORT` | 宿主机对外端口 | 可改（改后同步防火墙） |
| `SESSION_SECRET` | 用户登录态签名密钥，校验 Cookie 完整性 | **首次启动后禁止改** |
| `CRYPTO_SECRET` | API Token 存储加密密钥 | **首次启动后禁止改** |
| `MYSQL_HOST` | 外部 MySQL 服务器 IP（公网或内网） | 可改（数据库迁移时） |
| `MYSQL_PWD` | 外部 MySQL `newapi` 用户的密码 | **首次启动后禁止改** |
| `APP_PATH` | 数据卷根目录，所有挂载路径基于此解析 | 可改（需同步目录） |

> **密钥生成方法**：`openssl rand -hex 16` 生成 32 位十六进制随机串。  
> **从 single 版迁移时**：`SESSION_SECRET` 和 `CRYPTO_SECRET` 必须与 single 版完全相同，否则已有用户全部掉线、Token 全部失效。

### 5.2 `environment` 变量（yml 内）

| 变量 | 默认值 | 说明 |
|---|---|---|
| `SQL_DSN` | 无（必填） | 数据库连接串，通过 TCP 连外部 MySQL |
| `REDIS_CONN_STRING` | 无（必填） | Redis 连接串，本架构无密码，通过 Docker DNS 用服务名 `redis` 解析 |
| `BATCH_UPDATE_ENABLED` | `false` | 消费日志批量写入，开启后降低 MySQL 写压力约 90% |
| `ERROR_LOG_ENABLED` | `false` | 开启错误详情写入日志文件 |
| `TZ` | UTC | 时区，建议设为 `Asia/Shanghai` |
| `SQL_MAX_IDLE_CONNS` | 100 | 连接池空闲连接数（默认注释） |
| `SQL_MAX_OPEN_CONNS` | 1000 | 连接池最大连接数（默认注释） |

### 5.3 `SQL_DSN` 参数说明

```
newapi:${MYSQL_PWD}@tcp(${MYSQL_HOST}:3306)/newapi?charset=utf8mb4&parseTime=True&loc=Local&timeout=5s&readTimeout=30s&writeTimeout=10s
```

| 参数 | 作用 |
|---|---|
| `charset=utf8mb4` | 完整 Unicode 支持（含 emoji） |
| `parseTime=True` | 允许 Go 正确扫描 MySQL 的 DATETIME 类型 |
| `loc=Local` | 时区与容器 `TZ` 保持一致 |
| `timeout=5s` | 建连超时，防止网络抖动时连接无限等待 |
| `readTimeout=30s` | 读超时，防止慢查询拖死连接 |
| `writeTimeout=10s` | 写超时，防止批量写入卡死 |

### 5.4 连接池调优建议

| 并发量（RPM） | SQL_MAX_IDLE_CONNS | SQL_MAX_OPEN_CONNS |
|---|---|---|
| < 1000 | 10 | 50 |
| 1000 ~ 5000 | 20 | 100 |
| > 5000 | 50 | 200 |

取消 yml 中对应行的注释即可生效，无需重启整个 stack，只需 `docker compose up -d new-api`。

---

## 六、目录结构

部署完成后，目录结构如下：

```
/mengyu-docker/newapi-hybrid/
├── .env                    # 环境变量配置
├── docker-compose.yml      # 容器编排配置
├── data/                   # NewAPI 应用数据（配置、上传文件等）
├── logs/                   # NewAPI 运行日志（--log-dir /app/logs）
└── redis_data/             # Redis 持久化数据（AOF）
```

> 注意：MySQL 数据在外部数据库服务器上，不在本机目录中。

---

## 七、日常运维

### 启停服务

```bash
# 启动
docker compose up -d

# 停止
docker compose stop

# 重启
docker compose restart

# 停止并删除容器（数据保留，Redis 有卷挂载）
docker compose down

# 停止并删除容器 + 所有数据（危险！含 Redis 数据）
docker compose down -v
```

### 查看日志

```bash
# 实时查看 NewAPI 日志
docker logs newapi-hybrid -f

# 查看文件日志（--log-dir 写入的）
tail -f /mengyu-docker/newapi-hybrid/logs/*.log
```

### 备份数据

```bash
# 在数据库服务器上执行（推荐）
mysqldump -u root -p newapi > backup-$(date +%Y%m%d).sql

# 在主程序机器上通过容器执行（需数据库放行主程序 IP 的 3306）
docker exec newapi-hybrid-mysql mysqldump -h ${MYSQL_HOST} -u newapi -p${MYSQL_PWD} newapi > backup-$(date +%Y%m%d).sql

# 备份整个本地数据目录（不含 MySQL）
tar czf newapi-hybrid-backup-$(date +%Y%m%d).tar.gz /mengyu-docker/newapi-hybrid/
```

### 升级 NewAPI

```bash
cd /mengyu-docker/newapi-hybrid
docker compose pull new-api
docker compose up -d new-api
```

### 清理消费日志（数据库）

在数据库服务器上执行，或通过主程序机器连接执行：

```sql
-- 删除 30 天前的消费日志
DELETE FROM newapi.consumes WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

或加 cron 定时任务（数据库服务器上）：

```bash
# 每天凌晨 4 点清理
0 4 * * * mysql -u root -p'密码' newapi -e "DELETE FROM consumes WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);"
```

### 清理容器日志文件

```bash
# 删除 7 天前的日志文件
find /mengyu-docker/newapi-hybrid/logs/ -name "*.log" -mtime +7 -delete
```

---

## 八、Redis 相关说明

### 持久化

Redis 7 默认开启 AOF（Append-Only File），每次写操作都会刷盘。容器重启后数据从 AOF 文件自动恢复。

### Redis 重启/清空的影响

| 数据类型 | Redis 清空前 | Redis 清空后 |
|---|---|---|
| 消费日志 | 不存 Redis | 不受影响（直接写 MySQL） |
| 用户 Session | 在线 | 全部掉线，重新登录即可 |
| 渠道/模型缓存 | 命中缓存 | 回源查 MySQL，变慢但不丢 |
| 限流计数 | 正常 | 限流失效，可能被刷 |

> **结论**：Redis 炸了 = 体验变差（慢、掉线），**不会丢业务数据**。消费日志和余额全在 MySQL 里。

### Redis 内存限制（可选加固）

如需限制 Redis 最大内存并自动淘汰旧数据，修改 yml 的 redis 服务：

```yaml
redis:
  image: redis:7-alpine
  container_name: newapi-hybrid-redis
  restart: always
  command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
  volumes:
    - ${APP_PATH}/redis_data:/data
```

---

## 九、从 Single 版迁移到 Hybrid 版

### 前提

- Single 版正在运行，数据在本地 MySQL 容器中
- 外部 MySQL 已就绪（建好库 + 用户）

### 迁移步骤

```bash
# 1. 在数据库服务器上创建空库（已做过可跳过）
mysql -u root -p -e "CREATE DATABASE newapi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. 从 single 版导出数据（在主程序机器上执行）
docker exec newapi-single-mysql mysqldump -u root -p${MYSQL_PWD} newapi > migrate-$(date +%Y%m%d).sql

# 3. 将数据导入外部 MySQL（在主程序机器上执行）
mysql -h 外部数据库IP -u newapi -p newapi < migrate-$(date +%Y%m%d).sql

# 4. 停止 single 版
cd /mengyu-docker/newapi-single
docker compose down

# 5. 部署 hybrid 版（.env 中 SESSION_SECRET 和 CRYPTO_SECRET 与 single 版保持一致）
cd /mengyu-docker/newapi-hybrid
docker compose up -d

# 6. 验证
docker logs newapi-hybrid -f
# 看到 "database migration started" 且无误报错即成功
```

### 迁移注意事项

| 要点 | 说明 |
|---|---|
| 密钥一致 | `SESSION_SECRET` 和 `CRYPTO_SECRET` 必须与原 single 版完全相同 |
| 数据库字符集 | 外部 MySQL 库必须是 `utf8mb4`，否则导入可能报错 |
| 导入顺序 | 先建库 → 再导入 SQL → 最后启动 hybrid 容器 |
| 回滚方案 | 如果 hybrid 启动失败，single 版的 `mysql_data` 还在，随时可以 `docker compose up -d` 拉回来 |

---

## 十、常见问题

| 问题 | 排查方向 |
|---|---|
| 访问 `IP:3000` 连不上 | 检查防火墙是否放行 3000 端口；`docker compose ps` 确认容器在运行 |
| NewAPI 启动后反复重启 | `docker logs newapi-hybrid` 查看报错；多半是 `SQL_DSN` 连不上外部 MySQL |
| 连接 MySQL 超时 | 检查数据库服务器防火墙是否放行主程序 IP；`telnet IP 3306` 测试连通性 |
| 数据库授权正确但仍连不上 | 确认 MySQL 的 `bind-address` 不是 `127.0.0.1`（应改为 `0.0.0.0` 或具体 IP） |
| Redis 容器重启后数据丢失 | 检查 `redis_data` 目录是否挂载成功；确认 Redis 启动日志中有 `AOF enabled` |
| 修改 `.env` 后不生效 | `docker compose down && docker compose up -d` 重新加载 |
| 磁盘空间不足 | 检查 `consumes` 表行数；清理日志文件；考虑开启 `BATCH_UPDATE_ENABLED` |
| 忘记管理员密码 | 进 MySQL 删 `users` 表对应记录，重新注册即恢复管理员 |

---

## 十一、安全建议

1. **密钥**：`SESSION_SECRET` 和 `CRYPTO_SECRET` 使用 `openssl rand -hex 16` 生成，不要使用示例值
2. **数据库密码**：`MYSQL_PWD` 改为高强度随机密码，不要使用示例值
3. **防火墙**：仅放行 3000 端口（应用）和 3306 端口（仅放行主程序机器 IP）
4. **网络**：同地域优先使用内网 IP 通信，延迟低且不消耗公网流量
5. **备份**：定期在数据库服务器上 `mysqldump` 导出
6. **HTTPS**：生产环境前置 Nginx/Caddy 反代并配置 SSL 证书
7. **Redis**：当前无密码，依赖 Docker 网络隔离；如需跨机访问 Redis 请加密码

---

## 附录 A：`.env` 完整内容

> ⚠️ 本附录仅为 `.env` 模板示例，真实 `.env` 文件含密钥，**禁止提交到仓库**（应加入 .gitignore）。

```env
# ============================================================
# NewAPI Hybrid - 环境变量配置
# 架构：主程序 + Redis 容器化，MySQL 外部独立部署
# 用途：生产过渡 / 数据库独立 / Redis 本地加速
# 访问：http://服务器IP:3000
# ============================================================

# ---------- 镜像 ----------
# ---------- 网络 ----------
# 监听地址，0.0.0.0 表示接受所有网卡的请求
HOST_IP=0.0.0.0
# 宿主机对外端口，内外统一为 3000
WEB_HTTP_PORT=3000

# ---------- 安全密钥（首次启动后禁止修改） ----------
# SESSION_SECRET : 用户登录态签名密钥，用于校验 Cookie 完整性
# CRYPTO_SECRET  : API Token 存储加密密钥，修改后所有已有 Token 无法解密
# 两个值在所有节点间必须保持一致，否则跨节点 Session/Token 校验失败
# 从 single 版迁移时，这两个值必须与 single 版完全相同，否则已有用户全部掉线
SESSION_SECRET=<由 openssl rand -hex 16 生成，本地保存，切勿提交仓库>
CRYPTO_SECRET=<由 openssl rand -hex 16 生成，本地保存，切勿提交仓库>

# ---------- MySQL（外部部署） ----------
# 外部 MySQL 服务器 IP 或内网地址
# 安全组需放行 3306 端口，仅允许主程序机器 IP 访问
MYSQL_HOST=填写数据库IP
# 外部 MySQL 中 newapi 专用用户的密码（非 root）
# 首次部署需在外部 MySQL 上手动创建用户并授权：
#   CREATE USER 'newapi'@'%' IDENTIFIED BY '密码';
#   GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX ON newapi.* TO 'newapi'@'%';
#   FLUSH PRIVILEGES;
MYSQL_PWD=填写数据库密码

# ---------- 数据卷根目录 ----------
# 所有宿主机挂载路径均基于此目录解析
# 修改此路径后需同步修改下方 mkdir 命令中的路径
APP_PATH=/mengyu-docker/newapi-hybrid
```

---

## 附录 B：`docker-compose.yml` 完整内容

```yaml
# ============================================================
# NewAPI Hybrid - 容器编排配置
# 架构：主程序 + Redis 容器化，MySQL 外部独立部署
# 拓扑：单节点主程序 + 本地 Redis，远程 MySQL
# 访问：http://服务器IP:3000
# ============================================================

services:

  # ==========================================================
  # NewAPI 主应用
  # 容器内监听 3000 端口，映射到宿主机 3000，内外统一
  # ==========================================================
  new-api:
    image: ghcr.io/shuguangzhonglu-art/newapi:latest
    container_name: newapi-hybrid
    restart: always
    command: --log-dir /app/logs
    ports:
      - "${HOST_IP}:${WEB_HTTP_PORT}:3000"
    volumes:
      - ${APP_PATH}/data:/data
      - ${APP_PATH}/logs:/app/logs
    environment:
      # ---- 数据库连接（外部 MySQL） ----
      # MYSQL_HOST / MYSQL_PWD 从 .env 读取，指向外部数据库服务器
      # charset=utf8mb4：完整 Unicode 支持（含 emoji）
      # parseTime=True：允许 Go 正确扫描 MySQL 的 DATETIME 类型
      # loc=Local：时区与容器 TZ 保持一致
      # timeout=5s：建连超时，防止网络抖动时连接无限等待
      # readTimeout=30s：读超时，防止慢查询拖死连接
      # writeTimeout=10s：写超时，防止批量写入卡死
      - SQL_DSN=newapi:${MYSQL_PWD}@tcp(${MYSQL_HOST}:3306)/newapi?charset=utf8mb4&parseTime=True&loc=Local&timeout=5s&readTimeout=30s&writeTimeout=10s

      # ---- Redis 连接（本地容器） ----
      # 通过 Docker 内部网络连同机 Redis 容器，无密码
      # Redis 未映射宿主机端口，仅同网络内容器可访问
      - REDIS_CONN_STRING=redis://redis:6379/0

      # ---- 安全密钥 ----
      # 从 single 版迁移时必须与 single 版保持一致，否则已有用户全部掉线
      - SESSION_SECRET=${SESSION_SECRET}
      - CRYPTO_SECRET=${CRYPTO_SECRET}

      # ---- 性能优化 ----
      # 消费日志批量写入：请求完成后不立即 INSERT，攒批后一次性写入
      # 效果：将 MySQL 写 QPS 降低约 90%，高并发场景下避免写入瓶颈
      - BATCH_UPDATE_ENABLED=true

      # ---- 错误日志 ----
      # 开启后 NewAPI 会将错误详情写入日志文件，便于排查问题
      - ERROR_LOG_ENABLED=true

      # ---- 时区 ----
      - TZ=Asia/Shanghai

      # ---- 连接池（默认注释，量大时取消注释） ----
      # SQL_MAX_IDLE_CONNS : 连接池保持的空闲连接数，官方默认 100
      # SQL_MAX_OPEN_CONNS : 连接池最大打开连接数，官方默认 1000
      # - SQL_MAX_IDLE_CONNS=100
      # - SQL_MAX_OPEN_CONNS=1000

    depends_on:
      - redis

    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/api/status | grep -q success"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ==========================================================
  # Redis 7 (Alpine 轻量版) - 缓存 & 会话存储
  # 持久化：默认开启 AOF，重启后数据可恢复
  # 网络：未暴露宿主机端口，仅 Docker 内部网络可访问
  # ==========================================================
  redis:
    image: redis:7-alpine
    container_name: newapi-hybrid-redis
    restart: always
    volumes:
      - ${APP_PATH}/redis_data:/data
```
