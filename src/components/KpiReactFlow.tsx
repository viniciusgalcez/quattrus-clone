"use client";

import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { KpiTreeNode } from "@/lib/kpi-tree";
import { STATUS_COLOR } from "@/lib/kpi";
import { useRouter } from "next/navigation";

// Custom node to render a KPI card
function KpiNode({ data }: { data: any }) {
  const color = STATUS_COLOR[data.status as keyof typeof STATUS_COLOR] || "var(--color-ink-400)";
  return (
    <div
      className="group relative flex flex-col justify-between cursor-pointer bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-[var(--color-brand-500)]"
      style={{
        width: 260,
        height: 110,
      }}
      onClick={() => data.onClick(data.id)}
    >
      {/* Indicador de cor (Status) */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 group-hover:w-2"
        style={{ backgroundColor: color }}
      />
      
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      <div className="p-3 pl-5">
        <div className="font-display text-[13.5px] font-bold text-[var(--color-ink-900)] line-clamp-1" title={data.name}>
          {data.name}
        </div>
        <div className="text-[11px] font-medium text-[var(--color-ink-500)] mt-0.5 line-clamp-1 flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-[var(--color-neutral-100)] flex items-center justify-center text-[8px] font-bold text-[var(--color-ink-700)]">
            {data.ownerName ? data.ownerName.charAt(0).toUpperCase() : "?"}
          </div>
          {data.ownerName}
        </div>
      </div>
      
      <div className="bg-[var(--color-brand-50)] border-t border-[var(--color-border)] px-4 py-2 flex justify-between items-center text-[11px]">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--color-ink-400)]">Realizado</span>
          <span className="font-mono-num font-semibold text-[13px] text-[var(--color-ink-900)]">{data.actual !== null ? data.actual : "-"}</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--color-ink-400)]">Meta</span>
          <span className="font-mono-num font-semibold text-[13px] text-[var(--color-ink-700)]">{data.goal !== null ? data.goal : "-"}</span>
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

const nodeTypes = {
  kpiNode: KpiNode,
};

// Very basic layout algorithm
function layoutTree(
  nodes: KpiTreeNode[],
  xOffset = 0,
  yOffset = 0,
  onNodeClick: (id: string) => void
): { elements: any[]; totalWidth: number } {
  const NODE_WIDTH = 260;
  const NODE_HEIGHT = 110;
  const GAP_X = 50;
  const GAP_Y = 80;

  const elements: any[] = [];
  let currentX = xOffset;

  for (const node of nodes) {
    const startX = currentX;

    // Layout children first
    let childrenWidth = 0;
    if (node.children && node.children.length > 0) {
      const childLayout = layoutTree(node.children, currentX, yOffset + NODE_HEIGHT + GAP_Y, onNodeClick);
      elements.push(...childLayout.elements);
      childrenWidth = childLayout.totalWidth;
    }

    // Center this node above its children
    const myWidth = Math.max(NODE_WIDTH, childrenWidth);
    const nodeX = startX + (myWidth - NODE_WIDTH) / 2;
    const nodeY = yOffset;

    elements.push({
      id: node.id,
      type: "kpiNode",
      position: { x: nodeX, y: nodeY },
      data: {
        id: node.id,
        name: node.name,
        ownerName: node.ownerName,
        actual: node.actual,
        goal: node.goal,
        status: node.status,
        onClick: onNodeClick,
      },
    });

    // Add edges to children
    if (node.children) {
      const nodeColor = STATUS_COLOR[node.status as keyof typeof STATUS_COLOR] || "var(--color-border-strong)";
      for (const child of node.children) {
        elements.push({
          id: `e-${node.id}-${child.id}`,
          source: node.id,
          target: child.id,
          type: "smoothstep",
          animated: true,
          style: { stroke: nodeColor, strokeWidth: 2, strokeOpacity: 0.7 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: nodeColor,
          },
        });
      }
    }

    currentX += myWidth + GAP_X;
  }

  return { elements, totalWidth: currentX - xOffset - GAP_X };
}

export function KpiReactFlow({ tree }: { tree: KpiTreeNode[] }) {
  const router = useRouter();

  const handleNodeClick = useCallback(
    (id: string) => {
      router.push(`/metas/${id}`);
    },
    [router]
  );

  const { initialNodes, initialEdges } = useMemo(() => {
    const layout = layoutTree(tree, 0, 0, handleNodeClick);
    const flowNodes = layout.elements.filter((el) => !el.source);
    const flowEdges = layout.elements.filter((el) => el.source);
    return { initialNodes: flowNodes, initialEdges: flowEdges };
  }, [tree, handleNodeClick]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div style={{ height: "70vh", width: "100%", background: "#f9fafb" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Background color="#e5e7eb" gap={16} />
        <Controls />
        <MiniMap zoomable pannable nodeColor={(n) => "#cbd5e1"} />
      </ReactFlow>
    </div>
  );
}
