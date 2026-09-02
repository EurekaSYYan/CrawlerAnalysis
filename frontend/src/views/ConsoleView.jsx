import {
  Database,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import HouseFormModal from "../components/HouseFormModal.jsx";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHero,
  Select,
  Spinner,
} from "../components/ui.jsx";
import { formatDate, formatWan } from "../utils/format.js";
import ProfileView from "./ProfileView.jsx";

const statusTone = {
  success: "green",
  running: "blue",
  partial: "orange",
  failed: "orange",
};

const statusLabel = {
  success: "成功",
  running: "运行中",
  partial: "部分成功",
  failed: "失败",
};

export default function ConsoleView() {
  const { user } = useAuth();
  return user.role === "admin" ? (
    <AdminConsole />
  ) : (
    <ProfileView />
  );
}

function AdminConsole() {
  const [users, setUsers] = useState(null);
  const [houses, setHouses] = useState(null);
  const [runs, setRuns] = useState(null);
  const [userQuery, setUserQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [runCount, setRunCount] = useState(50);
  const [houseModal, setHouseModal] = useState(false);
  const [editingHouse, setEditingHouse] = useState(null);
  const [error, setError] = useState("");

  const loadUsers = useCallback(() => {
    api
      .get("/admin/users", { q: userQuery, role: roleFilter })
      .then((data) => setUsers(data.items))
      .catch((err) => setError(err.message));
  }, [userQuery, roleFilter]);

  const loadHouses = useCallback(() => {
    api
      .get("/houses", { per_page: 50 })
      .then((data) => setHouses(data.items))
      .catch((err) => setError(err.message));
  }, []);

  const loadRuns = useCallback(() => {
    api
      .get("/admin/crawl-runs")
      .then((data) => setRuns(data.items))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadUsers();
    loadHouses();
    loadRuns();
  }, [loadUsers, loadHouses, loadRuns]);

  const updateUser = async (id, payload) => {
    await api.patch(`/admin/users/${id}`, payload);
    loadUsers();
  };

  const deleteUser = async (id) => {
    if (!window.confirm("确定删除该用户吗？")) return;
    await api.delete(`/admin/users/${id}`);
    loadUsers();
  };

  const deleteHouse = async (house) => {
    if (!window.confirm(`确定删除房源「${house.title}」吗？`)) return;
    await api.delete(`/houses/${house.id}`);
    loadHouses();
  };

  const openCreate = () => {
    setEditingHouse(null);
    setHouseModal(true);
  };

  const openEdit = (house) => {
    setEditingHouse(house);
    setHouseModal(true);
  };

  const triggerCrawl = async () => {
    setError("");
    await api.post("/admin/crawl-runs", { count: runCount });
    await Promise.all([loadRuns(), loadHouses()]);
  };

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="综合控制台"
        title="用户、房源与采集管理"
        description="管理账号状态、维护房源数据并查看采集运行情况。"
        action={
          <Button icon={Plus} onClick={openCreate}>
            新增房源
          </Button>
        }
      />

      {error ? (
        <p className="rounded-lg border border-tangerine/30 bg-tangerine/10 px-3 py-2 text-sm text-tangerine">
          {error}
        </p>
      ) : null}

      <Card
        title="用户管理"
        description="调整角色、启用状态或删除账号"
        action={<Users size={22} className="text-electric-blue" />}
      >
        <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_180px]">
          <Input
            placeholder="搜索用户名…"
            value={userQuery}
            onChange={(event) => setUserQuery(event.target.value)}
          />
          <Select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <option value="">全部角色</option>
            <option value="user">普通用户</option>
            <option value="admin">管理员</option>
          </Select>
        </div>
        {users === null ? (
          <Spinner />
        ) : users.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-left text-base">
              <thead>
                <tr className="border-b border-white/10 text-sm text-slate">
                  <th className="py-2 pr-3 font-medium">用户名</th>
                  <th className="py-2 pr-3 font-medium">昵称</th>
                  <th className="py-2 pr-3 font-medium">角色</th>
                  <th className="py-2 pr-3 font-medium">状态</th>
                  <th className="py-2 pr-3 font-medium">注册时间</th>
                  <th className="py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-white/10 last:border-0">
                    <td className="py-2.5 pr-3 font-medium text-charcoal">
                      {user.username}
                    </td>
                    <td className="py-2.5 pr-3 text-slate">{user.nickname}</td>
                    <td className="py-2.5 pr-3">
                      <Select
                        value={user.role}
                        onChange={(event) =>
                          updateUser(user.id, { role: event.target.value })
                        }
                        className="min-h-9 !py-1"
                      >
                        <option value="user">普通用户</option>
                        <option value="admin">管理员</option>
                      </Select>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge tone={user.is_active ? "green" : "orange"}>
                        {user.is_active ? "正常" : "停用"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-3 text-sm text-slate">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="py-2.5">
                      <div className="flex gap-1.5">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            updateUser(user.id, { is_active: !user.is_active })
                          }
                        >
                          {user.is_active ? "停用" : "启用"}
                        </Button>
                        <Button
                          variant="danger"
                          icon={Trash2}
                          onClick={() => deleteUser(user.id)}
                        >
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="暂无用户" />
        )}
      </Card>

      <Card
        title="房源管理"
        description="对库内房源进行增删改查"
        action={<Database size={22} className="text-electric-blue" />}
      >
        {houses === null ? (
          <Spinner />
        ) : houses.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 text-left text-base">
              <thead>
                <tr className="border-b border-white/10 text-sm text-slate">
                  <th className="py-2 pr-3 font-medium">标题</th>
                  <th className="py-2 pr-3 font-medium">区域</th>
                  <th className="py-2 pr-3 font-medium">面积</th>
                  <th className="py-2 pr-3 font-medium">总价</th>
                  <th className="py-2 pr-3 font-medium">关注</th>
                  <th className="py-2 pr-3 font-medium">挂牌天数</th>
                  <th className="py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {houses.map((house) => (
                  <tr key={house.id} className="border-b border-white/10 last:border-0">
                    <td className="max-w-80 truncate py-2.5 pr-3 font-medium text-charcoal">
                      {house.title}
                    </td>
                    <td className="py-2.5 pr-3 text-slate">
                      {house.district} · {house.community}
                    </td>
                    <td className="tabular py-2.5 pr-3">{house.area} ㎡</td>
                    <td className="tabular py-2.5 pr-3 font-semibold text-electric-blue">
                      {formatWan(house.price_total)}
                    </td>
                    <td className="tabular py-2.5 pr-3 text-slate">
                      {house.followers_count ?? "—"}
                    </td>
                    <td className="tabular py-2.5 pr-3 text-slate">
                      {house.listing_days ?? "—"}
                    </td>
                    <td className="py-2.5">
                      <div className="flex gap-1.5">
                        <Button variant="secondary" onClick={() => openEdit(house)}>
                          编辑
                        </Button>
                        <Button
                          variant="danger"
                          icon={Trash2}
                          onClick={() => deleteHouse(house)}
                        >
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="暂无房源" />
        )}
      </Card>

      <Card
        title="采集记录"
        description="触发一次链家采集，向库内追加房源。"
        action={<RefreshCw size={16} className="text-slate" />}
      >
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <Input
              label="本次采集条数"
              type="number"
              min={1}
              max={100}
              value={runCount}
              onChange={(event) => setRunCount(event.target.value)}
              className="w-32"
            />
            <Button icon={Play} onClick={triggerCrawl}>
              开始链家采集
            </Button>
          </div>
          {runs === null ? (
            <Spinner />
          ) : runs.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-140 text-left text-sm">
                <thead>
                <tr className="border-b border-white/10 text-sm text-slate">
                  <th className="py-2 pr-3 font-medium">来源</th>
                    <th className="py-2 pr-3 font-medium">状态</th>
                    <th className="py-2 pr-3 font-medium">发现</th>
                    <th className="py-2 pr-3 font-medium">入库</th>
                    <th className="py-2 font-medium">开始时间</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} className="border-b border-white/10 last:border-0">
                      <td className="py-2.5 pr-3 font-mono text-xs">{run.source}</td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={statusTone[run.status]}>
                          {statusLabel[run.status]}
                        </Badge>
                      </td>
                      <td className="tabular py-2.5 pr-3">{run.total_found}</td>
                      <td className="tabular py-2.5 pr-3">{run.total_imported}</td>
                      <td className="py-2.5 text-xs text-slate">
                        {formatDate(run.started_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="暂无采集记录" />
          )}
      </Card>

      <HouseFormModal
        open={houseModal}
        house={editingHouse}
        onClose={() => setHouseModal(false)}
        onSaved={loadHouses}
      />
    </div>
  );
}
