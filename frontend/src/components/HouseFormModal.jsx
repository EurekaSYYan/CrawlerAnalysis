import { useEffect, useState } from "react";

import { api } from "../api/client.js";
import { Button, Input, Modal, Select, Textarea } from "./ui.jsx";

const emptyHouse = {
  title: "",
  district: "红谷滩区",
  community: "",
  price_total: "",
  area: "",
  rooms: 2,
  halls: 1,
  bathrooms: 1,
  orientation: "南北",
  floor: "中楼层(共18层)",
  building_type: "板楼",
  decoration: "精装修",
  followers_count: "",
  listing_days: "",
  tags: "",
};

export default function HouseFormModal({ open, house, onClose, onSaved }) {
  const [form, setForm] = useState(emptyHouse);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (house) {
      setForm({
        title: house.title || "",
        district: house.district || "红谷滩区",
        community: house.community || "",
        price_total: house.price_total || "",
        area: house.area || "",
        rooms: house.rooms || 2,
        halls: house.halls || 1,
        bathrooms: house.bathrooms || 1,
        orientation: house.orientation || "南北",
        floor: house.floor || "",
        building_type: house.building_type || "板楼",
        decoration: house.decoration || "精装修",
        followers_count: house.followers_count ?? "",
        listing_days: house.listing_days ?? "",
        tags: (house.tags || []).join(", "),
      });
    } else {
      setForm(emptyHouse);
    }
    setError("");
  }, [open, house]);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const numOrNull = (value) =>
        value === "" || value == null ? null : Number(value);
      const payload = {
        ...form,
        price_total: Number(form.price_total),
        area: Number(form.area),
        rooms: Number(form.rooms),
        halls: Number(form.halls),
        bathrooms: Number(form.bathrooms),
        followers_count: numOrNull(form.followers_count),
        listing_days: numOrNull(form.listing_days),
        tags: form.tags
          .split(/[,，]/)
          .map((item) => item.trim())
          .filter(Boolean),
      };
      if (house) {
        await api.put(`/houses/${house.id}`, payload);
      } else {
        await api.post("/houses", payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={house ? "编辑房源" : "新增房源"}
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={submit}>
        <Input
          label="标题"
          value={form.title}
          onChange={(event) => setField("title", event.target.value)}
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="区域"
            value={form.district}
            onChange={(event) => setField("district", event.target.value)}
          >
            {["东湖区", "西湖区", "青云谱区", "青山湖区", "红谷滩区", "湾里区", "新建区", "南昌县", "进贤县", "安义县", "高新区", "经开区"].map(
              (item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              )
            )}
          </Select>
          <Input
            label="小区"
            value={form.community}
            onChange={(event) => setField("community", event.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="总价（元）"
            type="number"
            min={100000}
            value={form.price_total}
            onChange={(event) => setField("price_total", event.target.value)}
            required
          />
          <Input
            label="面积（㎡）"
            type="number"
            min={20}
            value={form.area}
            onChange={(event) => setField("area", event.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="室"
            type="number"
            min={1}
            max={8}
            value={form.rooms}
            onChange={(event) => setField("rooms", event.target.value)}
          />
          <Input
            label="厅"
            type="number"
            min={0}
            max={5}
            value={form.halls}
            onChange={(event) => setField("halls", event.target.value)}
          />
          <Input
            label="卫"
            type="number"
            min={1}
            max={6}
            value={form.bathrooms}
            onChange={(event) => setField("bathrooms", event.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="建筑类型"
            value={form.building_type}
            onChange={(event) => setField("building_type", event.target.value)}
          >
            {["板楼", "塔楼", "板塔结合", "暂无数据"].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Select
            label="朝向"
            value={form.orientation}
            onChange={(event) => setField("orientation", event.target.value)}
          >
            {["南北", "南", "东南", "东西", "西南", "北"].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="装修情况"
            value={form.decoration}
            onChange={(event) => setField("decoration", event.target.value)}
          >
            {["精装修", "简装修", "毛坯"].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Input
            label="楼层"
            value={form.floor}
            onChange={(event) => setField("floor", event.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="关注人数"
            type="number"
            min={0}
            value={form.followers_count}
            onChange={(event) =>
              setField("followers_count", event.target.value)
            }
          />
          <Input
            label="挂牌天数"
            type="number"
            min={0}
            value={form.listing_days}
            onChange={(event) => setField("listing_days", event.target.value)}
          />
        </div>
        <Input
          label="标签（逗号分隔）"
          value={form.tags}
          onChange={(event) => setField("tags", event.target.value)}
          placeholder="满五唯一, 近地铁, 精装修"
        />
        {error ? (
          <p className="rounded-lg border border-tangerine/30 bg-tangerine/10 px-3 py-2 text-sm text-tangerine">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button disabled={saving}>{saving ? "保存中…" : "保存"}</Button>
        </div>
      </form>
    </Modal>
  );
}
