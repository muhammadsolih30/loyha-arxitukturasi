import React, { useState, useRef } from "react";
import { Plus, Trash2, Camera, Download, X, Check, ChevronDown, Layers, Info } from "lucide-react";

// ---------- Shablonlar ----------
const TEMPLATES = {
  delivery: {
    label: "Yetkazib berish platformasi",
    projectName: "Yetkazib berish platformasi",
    roles: [
      { id: "r1", parentId: null, name: "Super Admin", description: "Butun tizimning yagona egasi. Barcha sozlamalar va foydalanuvchilar ustidan to'liq nazorat.", permissions: ["Adminlarni qo'shish va o'chirish", "To'lov tizimini sozlash", "Komissiya va tariflarni belgilash", "Butun tizim statistikasini ko'rish", "Server va xavfsizlik sozlamalari"], image: null },
      { id: "r2", parentId: "r1", name: "Admin", description: "Kundalik operatsiyalarni boshqaradi: restoranlar, kuryerlar va shikoyatlar bilan ishlaydi.", permissions: ["Restoranlarni tasdiqlash yoki bloklash", "Kuryerlarni ro'yxatdan o'tkazish", "Shikoyat va bahslarni ko'rib chiqish", "Buyurtmalar monitoringi", "Kunlik hisobotlarni ko'rish"], image: null },
      { id: "r3", parentId: "r2", name: "Oshpaz / Restoran", description: "Restoran tomonidan menyu va buyurtmalarni boshqaradi.", permissions: ["Menyuga taom qo'shish/tahrirlash", "Kelgan buyurtmani qabul qilish yoki rad etish", "Taom tayyor bo'lganini belgilash", "Ish vaqtini sozlash", "Restoran daromadini ko'rish"], image: null },
      { id: "r4", parentId: "r2", name: "Kuryer", description: "Tayyor buyurtmalarni mijozga yetkazib beradi.", permissions: ["Yaqin buyurtmalarni ko'rish", "Buyurtmani yetkazishga olish", "Yetkazish holatini yangilash", "Marshrutni ko'rish", "Kunlik daromadni kuzatish"], image: null },
      { id: "r5", parentId: "r2", name: "Foydalanuvchi", description: "Ilovadan taom buyurtma qiladigan mijoz.", permissions: ["Ro'yxatdan o'tish / kirish", "Restoran va taomlarni qidirish", "Buyurtma berish va to'lov qilish", "Kuryerni real vaqtda kuzatish", "Sharh va baho qoldirish"], image: null },
    ],
  },
  shop: {
    label: "Onlayn do'kon",
    projectName: "Onlayn do'kon platformasi",
    roles: [
      { id: "s1", parentId: null, name: "Super Admin", description: "Platformaning bosh egasi, barcha sozlamalarni boshqaradi.", permissions: ["Adminlarni tayinlash", "Komissiya foizini belgilash", "To'lov tizimlarini ulash", "Umumiy statistika", "Xavfsizlik va huquqlar"], image: null },
      { id: "s2", parentId: "s1", name: "Admin", description: "Do'konlar va buyurtmalarni nazorat qiladi.", permissions: ["Sotuvchilarni tasdiqlash", "Mahsulotlarni moderatsiya qilish", "Shikoyatlarni hal qilish", "Hisobotlarni ko'rish"], image: null },
      { id: "s3", parentId: "s2", name: "Sotuvchi", description: "O'z do'konini va mahsulotlarini boshqaradi.", permissions: ["Mahsulot qo'shish/tahrirlash", "Buyurtmalarni qayta ishlash", "Ombordagi sonini yangilash", "Sotuv statistikasi"], image: null },
      { id: "s4", parentId: "s2", name: "Yetkazib beruvchi", description: "Buyurtmalarni xaridorga yetkazadi.", permissions: ["Buyurtmani olish", "Yetkazish holatini yangilash", "Marshrutni ko'rish"], image: null },
      { id: "s5", parentId: "s2", name: "Xaridor", description: "Mahsulot xarid qiluvchi foydalanuvchi.", permissions: ["Ro'yxatdan o'tish", "Mahsulot qidirish va xarid qilish", "To'lov qilish", "Buyurtmani kuzatish", "Sharh qoldirish"], image: null },
    ],
  },
  blank: {
    label: "Bo'sh loyiha",
    projectName: "Yangi loyiha",
    roles: [
      { id: "b1", parentId: null, name: "Super Admin", description: "Tizimning bosh boshqaruvchisi. Tavsifni o'zgartiring va yangi rollar qo'shing.", permissions: ["Birinchi vazifani shu yerga yozing"], image: null },
    ],
  },
};

function initials(name) {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function genId() {
  return "role-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getDescendantIds(id, roles) {
  const out = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of roles) {
      if (r.parentId && out.has(r.parentId) && !out.has(r.id)) {
        out.add(r.id);
        changed = true;
      }
    }
  }
  return out;
}

function TreeNode({ role, roles, selectedId, onSelect }) {
  const children = roles.filter((r) => r.parentId === role.id);
  const isRoot = role.parentId === null;
  const isSelected = selectedId === role.id;
  return (
    <li>
      <div
        onClick={() => onSelect(role.id)}
        className={"lm-node" + (isSelected ? " selected" : "") + (isRoot ? " root" : "")}
      >
        <div className="lm-avatar">
          {role.image ? (
            <img src={role.image} alt={role.name} />
          ) : (
            <span className="lm-mono">{initials(role.name || "?")}</span>
          )}
        </div>
        <div className="lm-node-text">
          <div className="lm-node-name">{role.name}</div>
          <div className="lm-node-meta lm-mono">{role.permissions.length} vazifa</div>
        </div>
      </div>
      {children.length > 0 && (
        <ul>
          {children.map((c) => (
            <TreeNode key={c.id} role={c} roles={roles} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function LoyihaArxitektor() {
  const [templateKey, setTemplateKey] = useState("delivery");
  const [projectName, setProjectName] = useState(TEMPLATES.delivery.projectName);
  const [roles, setRoles] = useState(TEMPLATES.delivery.roles);
  const [selectedId, setSelectedId] = useState(TEMPLATES.delivery.roles[0].id);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleParent, setNewRoleParent] = useState(TEMPLATES.delivery.roles[0].id);
  const [newPermission, setNewPermission] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const fileInputRef = useRef(null);

  const selected = roles.find((r) => r.id === selectedId) || null;
  const root = roles.find((r) => r.parentId === null);

  function applyTemplate(key) {
    const t = TEMPLATES[key];
    setTemplateKey(key);
    setProjectName(t.projectName);
    setRoles(t.roles.map((r) => ({ ...r, permissions: [...r.permissions] })));
    setSelectedId(t.roles[0].id);
    setConfirmDeleteId(null);
    setShowAddForm(false);
  }

  function updateRole(id, updates) {
    setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }

  function addPermission(id, text) {
    if (!text.trim()) return;
    setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, permissions: [...r.permissions, text.trim()] } : r)));
    setNewPermission("");
  }

  function removePermission(id, index) {
    setRoles((prev) =>
      prev.map((r) => (r.id === id ? { ...r, permissions: r.permissions.filter((_, i) => i !== index) } : r))
    );
  }

  function handleImageUpload(id, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateRole(id, { image: reader.result });
    reader.readAsDataURL(file);
  }

  function addRole() {
    if (!newRoleName.trim()) return;
    const id = genId();
    const role = { id, parentId: newRoleParent || root.id, name: newRoleName.trim(), description: "", permissions: [], image: null };
    setRoles((prev) => [...prev, role]);
    setSelectedId(id);
    setNewRoleName("");
    setShowAddForm(false);
  }

  function deleteRole(id) {
    const toRemove = getDescendantIds(id, roles);
    setRoles((prev) => prev.filter((r) => !toRemove.has(r.id)));
    if (toRemove.has(selectedId)) setSelectedId(root.id === id ? (roles.find((r) => !toRemove.has(r.id))?.id ?? null) : root.id);
    setConfirmDeleteId(null);
  }

  function moveRole(id, newParentId) {
    const forbidden = getDescendantIds(id, roles);
    if (forbidden.has(newParentId)) return;
    updateRole(id, { parentId: newParentId });
  }

  function exportMarkdown() {
    let out = `# ${projectName} — loyiha tuzilmasi\n\n`;
    function walk(role, depth) {
      out += `${"#".repeat(Math.min(depth + 2, 6))} ${role.name}\n`;
      if (role.description) out += `${role.description}\n\n`;
      if (role.permissions.length) {
        out += "Vazifalar:\n";
        role.permissions.forEach((p) => (out += `- ${p}\n`));
        out += "\n";
      }
      roles.filter((r) => r.parentId === role.id).forEach((c) => walk(c, depth + 1));
    }
    if (root) walk(root, 0);
    const blob = new Blob([out], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(projectName || "loyiha").replace(/\s+/g, "-").toLowerCase()}-reja.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const availableParents = roles.filter((r) => !selected || !getDescendantIds(selected.id, roles).has(r.id));

  return (
    <div className="lm-root lm-grid-bg" style={{ padding: "28px 18px 60px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap');
        .lm-root {
          --bg:#0E2436; --panel:#12314C; --panel2:#173D60; --line:#3E6E92; --accent:#6FD0EC;
          --accent-warm:#E7A855; --text:#EAF3FA; --text-muted:#8FB0C9; --danger:#E2735A;
          font-family:'Inter', system-ui, sans-serif; background:var(--bg); color:var(--text);
          border-radius:16px; max-width:1100px; margin:0 auto; box-sizing:border-box;
        }
        .lm-root * { box-sizing:border-box; }
        .lm-heading { font-family:'Space Grotesk', system-ui, sans-serif; }
        .lm-mono { font-family:'JetBrains Mono', monospace; }
        .lm-grid-bg { background-image:
            linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px);
          background-size:26px 26px; }
        .lm-tree, .lm-tree ul { display:flex; justify-content:center; padding-top:0; }
        .lm-tree ul { padding-top:32px; }
        .lm-tree li { list-style:none; position:relative; padding:32px 14px 0 14px; display:flex; flex-direction:column; align-items:center; }
        .lm-tree li::before, .lm-tree li::after { content:''; position:absolute; top:0; right:50%; border-top:2px solid var(--line); width:50%; height:32px; }
        .lm-tree li::after { right:auto; left:50%; border-left:2px solid var(--line); }
        .lm-tree li:only-child::after, .lm-tree li:only-child::before { display:none; }
        .lm-tree li:only-child { padding-top:0; }
        .lm-tree li:first-child::before, .lm-tree li:last-child::after { border:0 none; }
        .lm-tree li:last-child::before { border-right:2px solid var(--line); border-radius:0 6px 0 0; }
        .lm-tree li:first-child::after { border-radius:6px 0 0 0; }
        .lm-tree ul ul::before { content:''; position:absolute; top:0; left:50%; border-left:2px solid var(--line); width:0; height:32px; }
        .lm-tree > ul > li::before, .lm-tree > ul > li::after { display:none !important; }
        .lm-node { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:10px 14px;
          min-width:150px; max-width:190px; cursor:pointer; display:flex; align-items:center; gap:9px;
          transition:border-color .15s ease, transform .15s ease; }
        .lm-node:hover { border-color:var(--accent); transform:translateY(-2px); }
        .lm-node.selected { border-color:var(--accent); box-shadow:0 0 0 3px rgba(111,208,236,0.16); }
        .lm-node.root { border-color:var(--accent-warm); }
        .lm-avatar { width:34px; height:34px; min-width:34px; border-radius:50%; background:var(--panel2);
          display:flex; align-items:center; justify-content:center; overflow:hidden; font-size:12px; color:var(--text-muted); }
        .lm-avatar img { width:100%; height:100%; object-fit:cover; }
        .lm-node-text { overflow:hidden; }
        .lm-node-name { font-size:13.5px; font-weight:600; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .lm-node-meta { font-size:10.5px; color:var(--text-muted); margin-top:2px; }
        .lm-input { background:var(--panel2); border:1px solid var(--line); color:var(--text); border-radius:8px;
          padding:8px 10px; font-size:13.5px; width:100%; outline:none; }
        .lm-input:focus { border-color:var(--accent); }
        .lm-btn { border-radius:8px; padding:8px 13px; font-size:13px; font-weight:600; cursor:pointer;
          display:inline-flex; align-items:center; gap:6px; border:1px solid transparent; transition:opacity .15s; }
        .lm-btn:hover { opacity:.88; }
        .lm-btn-accent { background:var(--accent-warm); color:#1a1206; }
        .lm-btn-outline { background:transparent; border-color:var(--line); color:var(--text); }
        .lm-btn-danger { background:transparent; border-color:var(--danger); color:var(--danger); }
        .lm-tag { background:var(--panel2); border:1px solid var(--line); border-radius:7px; padding:7px 10px;
          font-size:13px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
        .lm-panel { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:20px; }
        .lm-avatar-lg { width:58px; height:58px; border-radius:50%; background:var(--panel2); border:1px dashed var(--line);
          display:flex; align-items:center; justify-content:center; overflow:hidden; cursor:pointer; position:relative; flex:none; }
        .lm-avatar-lg img { width:100%; height:100%; object-fit:cover; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div className="lm-mono" style={{ color: "var(--accent)", fontSize: 12, letterSpacing: 1 }}>LOYIHA MEʼMORI</div>
        <h1 className="lm-heading" style={{ fontSize: 26, margin: "4px 0 6px", fontWeight: 700 }}>
          Rollar va tuzilmani chizib chiqing
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, maxWidth: 640, lineHeight: 1.5 }}>
          Loyihangizni 0 dan boshlab qatlamlarga bo'ling: kim nimani boshqaradi, kim nimani ko'radi.
          Har bir rolga bosing, vazifalarini yozing, xohlasangiz belgi rasm yuklang.
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", marginBottom: 22 }}>
        <div style={{ flex: "1 1 220px" }}>
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Loyiha nomi</label>
          <input className="lm-input" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Shablon</label>
          <select className="lm-input" value={templateKey} onChange={(e) => applyTemplate(e.target.value)}>
            {Object.entries(TEMPLATES).map(([k, t]) => (
              <option key={k} value={k}>{t.label}</option>
            ))}
          </select>
        </div>
        <button className="lm-btn lm-btn-outline" onClick={() => { setShowAddForm((s) => !s); setNewRoleParent(selectedId || root.id); }}>
          <Plus size={15} /> Yangi rol
        </button>
        <button className="lm-btn lm-btn-accent" onClick={exportMarkdown}>
          <Download size={15} /> Rejani yuklab olish
        </button>
      </div>

      {showAddForm && (
        <div className="lm-panel" style={{ marginBottom: 22, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Rol nomi</label>
            <input className="lm-input" placeholder="masalan: Menejer" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Kimning ostida turadi</label>
            <select className="lm-input" value={newRoleParent} onChange={(e) => setNewRoleParent(e.target.value)}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <button className="lm-btn lm-btn-accent" onClick={addRole}><Check size={15} /> Qo'shish</button>
          <button className="lm-btn lm-btn-outline" onClick={() => setShowAddForm(false)}><X size={15} /> Bekor qilish</button>
        </div>
      )}

      {/* Tree */}
      <div className="lm-panel" style={{ marginBottom: 22, overflowX: "auto" }}>
        {root ? (
          <div className="lm-tree">
            <ul>
              <TreeNode role={root} roles={roles} selectedId={selectedId} onSelect={setSelectedId} />
            </ul>
          </div>
        ) : (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 30 }}>
            Hali birorta rol yo'q. "Yangi rol" tugmasini bosing.
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected ? (
        <div className="lm-panel">
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div
              className="lm-avatar-lg"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              title="Rol uchun belgi rasm yuklash"
            >
              {selected.image ? <img src={selected.image} alt="" /> : <Camera size={20} color="var(--text-muted)" />}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleImageUpload(selected.id, e.target.files?.[0])}
              />
            </div>
            <div style={{ flex: "1 1 260px", minWidth: 220 }}>
              <input
                className="lm-input lm-heading"
                style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}
                value={selected.name}
                onChange={(e) => updateRole(selected.id, { name: e.target.value })}
              />
              <textarea
                className="lm-input"
                placeholder="Bu rol nima uchun kerak, qisqacha yozing..."
                rows={2}
                value={selected.description}
                onChange={(e) => updateRole(selected.id, { description: e.target.value })}
              />
            </div>
            <div style={{ flex: "0 0 200px" }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Rolni ko'chirish</label>
              <select
                className="lm-input"
                value={selected.parentId ?? ""}
                disabled={selected.parentId === null}
                onChange={(e) => moveRole(selected.id, e.target.value)}
              >
                {selected.parentId === null && <option value="">— Bosh rol —</option>}
                {availableParents.filter((r) => r.id !== selected.id).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>

              {selected.parentId !== null && (
                confirmDeleteId === selected.id ? (
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <button className="lm-btn lm-btn-danger" style={{ flex: 1, justifyContent: "center" }} onClick={() => deleteRole(selected.id)}>O'chirilsinmi?</button>
                    <button className="lm-btn lm-btn-outline" onClick={() => setConfirmDeleteId(null)}><X size={14} /></button>
                  </div>
                ) : (
                  <button className="lm-btn lm-btn-danger" style={{ marginTop: 10, width: "100%", justifyContent: "center" }} onClick={() => setConfirmDeleteId(selected.id)}>
                    <Trash2 size={14} /> Rolni o'chirish
                  </button>
                )
              )}
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Layers size={14} color="var(--accent)" /> Bu rol nimalar qila oladi
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 }}>
              {selected.permissions.length === 0 && (
                <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Hali vazifa qo'shilmagan.</div>
              )}
              {selected.permissions.map((p, i) => (
                <div className="lm-tag" key={i}>
                  <span>{p}</span>
                  <X size={14} style={{ cursor: "pointer", color: "var(--text-muted)" }} onClick={() => removePermission(selected.id, i)} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="lm-input"
                placeholder="Yangi vazifa yozing va Enter bosing..."
                value={newPermission}
                onChange={(e) => setNewPermission(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addPermission(selected.id, newPermission); }}
              />
              <button className="lm-btn lm-btn-outline" onClick={() => addPermission(selected.id, newPermission)}><Plus size={15} /></button>
            </div>
          </div>
        </div>
      ) : (
        <div className="lm-panel" style={{ textAlign: "center", color: "var(--text-muted)" }}>
          Tafsilotlarni ko'rish uchun yuqoridagi bir rolni bosing.
        </div>
      )}

      <div style={{ marginTop: 20, display: "flex", gap: 8, alignItems: "flex-start", color: "var(--text-muted)", fontSize: 12.5, lineHeight: 1.5 }}>
        <Info size={14} style={{ marginTop: 2, flexShrink: 0 }} />
        <span>
          Bu — offline reja tuzuvchi prototip: hamma narsa faqat shu sahifada, xotirada saqlanadi (sahifani yopsangiz o'chadi).
          Tayyor bo'lgach, "Rejani yuklab olish" orqali strukturani .md fayl qilib oling va shu asosda haqiqiy saytni (login, baza, rollar tizimi bilan) qurishni buyurishingiz mumkin.
        </span>
      </div>
    </div>
  );
}
