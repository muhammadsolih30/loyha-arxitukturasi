import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Trash2, Camera, X, Check, Layers, Share2, ArrowLeft } from "lucide-react";
import { ReactFlow, Background, Controls, applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from "../api";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import CustomNode from "../components/CustomNode";
import { getLayoutedElements } from "../utils/layout";

export default function ProjectEditor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [roles, setRoles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Flow states
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set()); // Yangi state

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleParent, setNewRoleParent] = useState("");
  const [newPermission, setNewPermission] = useState("");
  const fileInputRef = useRef(null);

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  async function fetchProjectData() {
    try {
      const pData = await api.projects.getOne(projectId);
      setProject(pData);
      const rData = await api.roles.getAllByProject(projectId);
      setRoles(rData || []);
    } catch (error) {
      toast.error("Loyiha yuklanmadi!");
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  const toggleNodeExpansion = useCallback((id) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, []);

  // Update layout whenever roles or expandedNodes change
  useEffect(() => {
    if (!roles) return;
    
    let needsLayout = false;

    const initialNodes = roles.map(r => {
      // Agar bazada koordinatalar bo'lmasa, avto-layout kerak bo'ladi
      if (r.position_x == null || r.position_y == null) {
        needsLayout = true;
      }
      return {
        id: r.id,
        type: 'custom',
        data: {
          name: r.name,
          image_url: r.image_url,
          permissions: r.permissions || [],
          isExpanded: expandedNodes.has(r.id),
          onToggle: () => toggleNodeExpansion(r.id),
          selected: selectedId === r.id,
          onEdit: () => setSelectedId(r.id),
          onAddChild: () => { setShowAddForm(true); setNewRoleParent(r.id); },
          onDelete: () => deleteRole(r.id)
        },
        position: { x: r.position_x || 0, y: r.position_y || 0 }
      };
    });

    const initialEdges = roles
      .filter(r => r.parent_id)
      .map(r => ({
        id: `e-${r.parent_id}-${r.id}`,
        source: r.parent_id,
        target: r.id,
        type: 'smoothstep',
        animated: true,
        style: { stroke: 'var(--accent)', strokeWidth: 2 }
      }));

    if (needsLayout && initialNodes.length > 0) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      
      // Yangi hisoblangan koordinatalarni bazaga saqlab qo'yamiz (orqa fonda)
      layoutedNodes.forEach(n => {
        api.roles.update(n.id, { position_x: n.position.x, position_y: n.position.y }).catch(() => {});
      });
    } else {
      setNodes(initialNodes);
      setEdges(initialEdges);
    }

  }, [roles, expandedNodes, selectedId]);

  async function runAutoLayout() {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    toast.success("Avto taxlandi!");
    for (const n of layoutedNodes) {
      await api.roles.update(n.id, { position_x: n.position.x, position_y: n.position.y });
    }
  }

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onNodeDragStop = useCallback((event, node) => {
    // Mahalliy holatni yangilaymiz, aks holda boshqa joy bosilganda eski joyiga qaytib qoladi
    setRoles(prev => prev.map(r => 
      r.id === node.id 
        ? { ...r, position_x: Math.round(node.position.x), position_y: Math.round(node.position.y) } 
        : r
    ));
    
    // Karta surib bo'linganda uning yangi koordinatalarini bazaga saqlaymiz
    api.roles.update(node.id, { position_x: node.position.x, position_y: node.position.y }).catch(console.error);
  }, []);

  const onNodeClick = useCallback((event, node) => {
    setSelectedId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedId(null);
  }, []);

  // API Call Helpers
  async function updateProjectName(name) {
    setProject((prev) => ({ ...prev, name }));
    await api.projects.update(projectId, { name });
  }

  async function updateRole(id, updates) {
    setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    await api.roles.update(id, updates);
  }

  async function addPermission(id, text) {
    if (!text.trim()) return;
    const role = roles.find(r => r.id === id);
    const newPerms = [...(role.permissions || []), text.trim()];
    await updateRole(id, { permissions: newPerms });
    setNewPermission("");
  }

  async function removePermission(id, index) {
    const role = roles.find(r => r.id === id);
    const newPerms = role.permissions.filter((_, i) => i !== index);
    await updateRole(id, { permissions: newPerms });
  }

  async function handleImageUpload(id, file) {
    if (!file) return;
    const toastId = toast.loading("Rasm tayyorlanmoqda...");
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result;
        await updateRole(id, { image_url: base64Data });
        toast.success("Rasm yuklandi!", { id: toastId });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Rasm yuklashda xatolik!", { id: toastId });
    }
  }

  async function addRole() {
    if (!newRoleName.trim()) {
      toast.error("Rol nomini kiriting!"); 
      return;
    }
    const root = roles.find((r) => r.parent_id === null);
    
    const newRole = {
      id: uuidv4(),
      project_id: projectId,
      parent_id: newRoleParent || (root ? root.id : null),
      name: newRoleName.trim(),
      description: "",
      permissions: [],
      image_url: null
    };

    setRoles((prev) => [...prev, newRole]);
    setSelectedId(newRole.id);
    setNewRoleName("");
    setShowAddForm(false);
    
    await api.roles.create(newRole);
  }

  async function deleteRole(id) {
    if (!window.confirm("Bu rolni va uning pastidagi barcha rollarni o'chirasizmi?")) return;

    // Helper to get all descendants
    function getDescendantIds(targetId, allRoles) {
      const out = new Set([targetId]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const r of allRoles) {
          if (r.parent_id && out.has(r.parent_id) && !out.has(r.id)) {
            out.add(r.id);
            changed = true;
          }
        }
      }
      return out;
    }

    const toRemove = getDescendantIds(id, roles);
    const toRemoveArr = Array.from(toRemove);
    
    setRoles((prev) => prev.filter((r) => !toRemove.has(r.id)));
    setSelectedId(null);

    await api.roles.delete(toRemoveArr);
    toast.success("O'chirildi!");
  }

  async function generateShareLink() {
    try {
      let token = project.share_token;
      if (!token) {
        token = uuidv4();
        await api.projects.update(projectId, { share_token: token });
        setProject(prev => ({ ...prev, share_token: token }));
      }
      const link = `${window.location.origin}/share/${token}`;
      await navigator.clipboard.writeText(link);
      toast.success("Ulashish havolasi nusxalandi!");
    } catch (error) {
      toast.error("Xatolik yuz berdi");
    }
  }

  if (loading) return <div style={{ padding: 40, color: 'white' }}>Yuklanmoqda...</div>;

  const selected = roles.find((r) => r.id === selectedId) || null;
  const root = roles.find((r) => r.parent_id === null);
  const availableParents = roles.filter((r) => !selected || r.id !== selected.id); // Simple filter to prevent circular logic for now

  return (
    <div className="lm-root" style={{ padding: 0, height: '100vh', display: 'flex', flexDirection: 'column', maxWidth: 'none', margin: 0 }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', background: 'var(--panel)', borderBottom: '1px solid rgba(255,255,255,0.05)', zIndex: 10 }}>
        <button className="lm-btn lm-btn-outline" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Ortga
        </button>
        <div style={{ flex: 1 }}>
          <input 
            className="lm-input lm-heading" 
            style={{ fontSize: 20, fontWeight: 700, background: 'transparent', border: 'none', padding: 0, margin: 0 }}
            value={project?.name || ""} 
            onChange={(e) => updateProjectName(e.target.value)} 
          />
        </div>
        <button className="lm-btn lm-btn-outline" onClick={runAutoLayout} title="Barchasini avtomatik piramida qilib taxlash">
          Avto Taxlash
        </button>
        <button className="lm-btn lm-btn-outline" onClick={() => { setShowAddForm(true); setNewRoleParent(selectedId || root?.id || ""); }}>
          <Plus size={15} /> Yangi rol qo'shish
        </button>
        <button className="lm-btn lm-btn-accent" onClick={generateShareLink}>
          <Share2 size={16} /> Ulashish
        </button>
      </div>

      {/* MODAL / NEW ROLE */}
      {showAddForm && (
        <div style={{
          position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', 
          background: 'var(--panel)', padding: 24, borderRadius: 12, border: '1px solid var(--accent)',
          zIndex: 100, boxShadow: '0 10px 40px rgba(0,0,0,0.5)', width: 400
        }}>
          <h3 style={{ margin: '0 0 16px 0' }}>Yangi rol qo'shish</h3>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Rol nomi</label>
            <input className="lm-input" autoFocus placeholder="masalan: Menejer" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Kimning bo'ysinuvida?</label>
            <select className="lm-input" value={newRoleParent} onChange={(e) => setNewRoleParent(e.target.value)}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
              {roles.length === 0 && <option value="">(Asosiy rol)</option>}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="lm-btn lm-btn-outline" style={{ flex: 1 }} onClick={() => setShowAddForm(false)}>Bekor qilish</button>
            <button className="lm-btn lm-btn-accent" style={{ flex: 1 }} onClick={addRole}>Saqlash</button>
          </div>
        </div>
      )}

      {/* CANVAS & SIDEBAR */}
      <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
        
        {/* REACT FLOW CANVAS */}
        <div style={{ flex: 1, background: 'var(--bg)' }}>
          {roles.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 60 }}>
              Hali birorta rol yo'q. "Yangi rol qo'shish" tugmasini bosing.
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              onNodeDragStop={onNodeDragStop}
              onPaneClick={onPaneClick}
              fitView
              attributionPosition="bottom-left"
            >
              <Background color="#ccc" gap={16} />
              <Controls />
            </ReactFlow>
          )}
        </div>

        {/* PROPERTIES SIDEBAR */}
        {selected && (
          <div style={{
            width: 380, background: 'var(--panel)', borderLeft: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', flexDirection: 'column', overflowY: 'auto'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Sozlamalar</h3>
              <button className="lm-btn lm-btn-outline" style={{ padding: 6, border: 'none' }} onClick={() => setSelectedId(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 24, flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
                <div
                  className="lm-avatar-lg"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  title="Rasmni o'zgartirish"
                  style={{ cursor: 'pointer', marginBottom: 16, border: '2px dashed var(--accent)' }}
                >
                  {selected.image_url ? <img src={selected.image_url} alt="" /> : <Camera size={24} color="var(--accent)" />}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleImageUpload(selected.id, e.target.files?.[0])}
                  />
                </div>
                
                <input
                  className="lm-input lm-heading"
                  style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', background: 'transparent', border: '1px dashed transparent', padding: '4px 8px' }}
                  value={selected.name}
                  onChange={(e) => updateRole(selected.id, { name: e.target.value })}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'transparent'}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Tavsif</label>
                <textarea
                  className="lm-input"
                  placeholder="Bu rol nima uchun kerak?"
                  rows={3}
                  value={selected.description || ""}
                  onChange={(e) => updateRole(selected.id, { description: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                  Kimning bo'ysinuvida?
                </label>
                <select
                  className="lm-input"
                  value={selected.parent_id || ""}
                  disabled={selected.parent_id === null}
                  onChange={(e) => updateRole(selected.id, { parent_id: e.target.value || null })}
                >
                  {selected.parent_id === null && <option value="">(Asosiy rol)</option>}
                  {availableParents.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <Layers size={14} color="var(--accent)" /> Bajaradigan vazifalari
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                  {(selected.permissions || []).length === 0 && (
                    <div style={{ color: "var(--text-muted)", fontSize: 13, fontStyle: 'italic' }}>Hali vazifa qo'shilmagan.</div>
                  )}
                  {(selected.permissions || []).map((p, i) => (
                    <div className="lm-tag" key={i} style={{ justifyContent: 'space-between', padding: '8px 12px' }}>
                      <span>{p}</span>
                      <X size={14} style={{ cursor: "pointer", color: "var(--text-muted)" }} onClick={() => removePermission(selected.id, i)} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="lm-input"
                    placeholder="Yangi vazifa yozing..."
                    value={newPermission}
                    onChange={(e) => setNewPermission(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addPermission(selected.id, newPermission); }}
                  />
                  <button className="lm-btn lm-btn-outline" style={{ padding: '0 16px' }} onClick={() => addPermission(selected.id, newPermission)}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              
              <div style={{ marginTop: 40 }}>
                <button className="lm-btn lm-btn-danger" style={{ width: "100%", justifyContent: "center" }} onClick={() => deleteRole(selected.id)}>
                  <Trash2 size={16} /> Bu rolni o'chirish
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
