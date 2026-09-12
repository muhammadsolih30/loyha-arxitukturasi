import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layers, ArrowLeft, X } from "lucide-react";
import { ReactFlow, Background, Controls, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from "../api";
import CustomNode from "../components/CustomNode";
import { getLayoutedElements } from "../utils/layout";

export default function SharedProject() {
  const { shareToken } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [roles, setRoles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  useEffect(() => {
    fetchSharedData();
  }, [shareToken]);

  async function fetchSharedData() {
    try {
      const pData = await api.projects.getByShareToken(shareToken);
      setProject(pData);
      const rData = await api.roles.getAllByProject(pData.id);
      setRoles(rData || []);
    } catch (error) {
      console.error(error);
      alert("Bu havola yaroqsiz yoki loyiha o'chirilgan.");
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

  useEffect(() => {
    if (!roles) return;
    
    let needsLayout = false;
    const initialNodes = roles.map(r => {
      if (r.position_x == null || r.position_y == null) needsLayout = true;
      return {
        id: r.id,
        type: 'custom',
        data: {
          name: r.name,
          image_url: r.image_url,
          permissions: r.permissions || [],
          isExpanded: expandedNodes.has(r.id),
          onToggle: () => toggleNodeExpansion(r.id),
          selected: selectedId === r.id
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
    } else {
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [roles, expandedNodes, selectedId]);

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onNodeClick = useCallback((event, node) => setSelectedId(node.id), []);
  const onPaneClick = useCallback(() => setSelectedId(null), []);

  if (loading) return <div style={{ padding: 40, color: 'white' }}>Yuklanmoqda...</div>;

  const selected = roles.find((r) => r.id === selectedId) || null;

  return (
    <div className="lm-root" style={{ padding: 0, height: '100vh', display: 'flex', flexDirection: 'column', maxWidth: 'none', margin: 0 }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', background: 'var(--panel)', borderBottom: '1px solid rgba(255,255,255,0.05)', zIndex: 10 }}>
        <button className="lm-btn lm-btn-outline" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Bosh sahifa
        </button>
        <div>
          <h1 className="lm-heading" style={{ fontSize: 20, margin: 0 }}>
            {project?.name || "Loyiha"}
          </h1>
          <span style={{ fontSize: 12, color: 'var(--accent)' }}>O'qish rejimida ko'ryapsiz</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
        {/* REACT FLOW CANVAS */}
        <div style={{ flex: 1, background: 'var(--bg)' }}>
          {roles.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 60 }}>
              Bu loyihada rollar yo'q.
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              fitView
              attributionPosition="bottom-left"
              nodesDraggable={false} // Cannot drag in read-only
              nodesConnectable={false}
              elementsSelectable={true}
            >
              <Background color="#ccc" gap={16} />
              <Controls />
            </ReactFlow>
          )}
        </div>

        {/* SIDEBAR */}
        {selected && (
          <div style={{
            width: 380, background: 'var(--panel)', borderLeft: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', flexDirection: 'column', overflowY: 'auto'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Rol haqida</h3>
              <button className="lm-btn lm-btn-outline" style={{ padding: 6, border: 'none' }} onClick={() => setSelectedId(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 24, flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
                <div className="lm-avatar-lg" style={{ marginBottom: 16 }}>
                  {selected.image_url ? <img src={selected.image_url} alt="" /> : <span style={{ color: 'var(--text-muted)' }}>?</span>}
                </div>
                <h2 className="lm-heading" style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', margin: 0 }}>
                  {selected.name}
                </h2>
                {selected.description && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', marginTop: 8 }}>
                    {selected.description}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <Layers size={14} color="var(--accent)" /> Bajaradigan vazifalari
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(selected.permissions || []).length === 0 && (
                    <div style={{ color: "var(--text-muted)", fontSize: 13, fontStyle: 'italic' }}>Vazifa qo'shilmagan.</div>
                  )}
                  {(selected.permissions || []).map((p, i) => (
                    <div className="lm-tag" key={i} style={{ justifyContent: 'flex-start', padding: '8px 12px' }}>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
