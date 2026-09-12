import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { NodeToolbar } from '@xyflow/react';
import { ChevronDown, ChevronUp, Layers, Edit2, Plus, Trash2 } from 'lucide-react';

export default function CustomNode({ data }) {
  const { name, image_url, permissions, isExpanded, onToggle, selected, onEdit, onAddChild, onDelete } = data;
  const permsCount = (permissions || []).length;

  return (
    <>
      <NodeToolbar isVisible={selected} position={Position.Top}>
        <div style={{ display: 'flex', gap: 6, background: 'var(--panel2)', padding: 6, borderRadius: 8, border: '1px solid var(--line)', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
          <button className="lm-btn lm-btn-outline" style={{ padding: '6px 10px', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Tahrirlash">
            <Edit2 size={14} />
          </button>
          <button className="lm-btn lm-btn-outline" style={{ padding: '6px 10px', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); onAddChild(); }} title="Quyi rol qo'shish">
            <Plus size={14} />
          </button>
          <button className="lm-btn lm-btn-danger" style={{ padding: '6px 10px', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); onDelete(); }} title="O'chirish">
            <Trash2 size={14} />
          </button>
        </div>
      </NodeToolbar>

      <div 
        className="lm-panel"
        style={{
          padding: '12px 16px',
          minWidth: 220,
          maxWidth: 260,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          border: selected ? '2px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: selected ? '0 0 15px rgba(230, 246, 123, 0.2)' : 'none',
          transition: 'all 0.2s',
          cursor: 'pointer'
        }}
      >
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ width: 8, height: 8, background: 'var(--accent)', border: 'none' }} 
      />
      
      {/* KARTA HEADER QISMI */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div 
          className="lm-avatar" 
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--panel2)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          {image_url ? (
            <img src={image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>?</span>
          )}
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {name}
          </h4>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {permsCount} ta vazifa
          </div>
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          style={{ 
            background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
            padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%', transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* KENGAYTIRILGAN VAZIFALAR QISMI */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12, marginTop: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "var(--accent)", display: "flex", alignItems: "center", gap: 4 }}>
            <Layers size={12} /> Bajaradigan ishlari:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {permsCount === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: 11, fontStyle: 'italic' }}>Vazifalar biriktirilmagan.</div>
            ) : (
              permissions.map((p, i) => (
                <div key={i} style={{ 
                  fontSize: 11, background: 'rgba(255,255,255,0.03)', padding: '6px 8px', 
                  borderRadius: 4, wordBreak: 'break-word', borderLeft: '2px solid var(--accent)'
                }}>
                  {p}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{ width: 8, height: 8, background: 'var(--accent)', border: 'none' }} 
      />
    </div>
    </>
  );
}
