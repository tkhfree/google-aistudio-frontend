import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Device, Link } from '../types';
import { Plus } from 'lucide-react';

interface TopologyCanvasProps {
  devices: Device[];
  links: Link[];
  onDeviceClick: (device: Device) => void;
  onNodeDragEnd: (device: Device) => void;
  onAddLinkClick: () => void;
  onAddDeviceClick: () => void;
}

export const TopologyCanvas: React.FC<TopologyCanvasProps> = ({ 
  devices, 
  links, 
  onDeviceClick, 
  onNodeDragEnd,
  onAddLinkClick,
  onAddDeviceClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const containerRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const simulationRef = useRef<d3.Simulation<any, undefined> | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Initialize zoom behavior once
    if (!zoomRef.current) {
      zoomRef.current = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          if (containerRef.current) {
            containerRef.current.attr('transform', event.transform.toString());
          }
        });
      svg.call(zoomRef.current);
    }

    // Initialize container once
    if (!containerRef.current) {
      containerRef.current = svg.append('g').attr('class', 'topology-container');
    }

    const container = containerRef.current;

    // Prepare data
    const nodes = devices.map(d => {
      // Try to find existing node to preserve its current simulation state
      const existingNode = simulationRef.current?.nodes().find(n => n.id === d.id);
      const x = d.x ?? existingNode?.x ?? (width / 2 + (Math.random() - 0.5) * 60);
      const y = d.y ?? existingNode?.y ?? (height / 2 + (Math.random() - 0.5) * 60);
      
      return {
        ...d,
        x,
        y,
        // Remove hard pinning to allow weak simulation
        fx: null,
        fy: null,
        vx: existingNode?.vx ?? 0,
        vy: existingNode?.vy ?? 0
      };
    });
    
    const nodeIds = new Set(nodes.map(n => n.id));
    const linksData = links
      .filter(l => {
        const sourceId = typeof l.source === 'string' ? l.source : (l.source as any).id;
        const targetId = typeof l.target === 'string' ? l.target : (l.target as any).id;
        return nodeIds.has(sourceId) && nodeIds.has(targetId);
      })
      .map(l => ({
        ...l,
        source: l.source,
        target: l.target
      }));

    // Initialize or update simulation
    if (!simulationRef.current) {
      simulationRef.current = d3.forceSimulation(nodes)
        .velocityDecay(0.7) // High friction - nodes stop quickly
        .force('link', d3.forceLink(linksData).id((d: any) => d.id).distance(150).strength(0.05)) // Very weak pull
        .force('charge', d3.forceManyBody().strength(-30)) // Very weak repulsion
        .force('x', d3.forceX(width / 2).strength(0.01)) // Minimal center gravity
        .force('y', d3.forceY(height / 2).strength(0.01))
        .alphaDecay(0.02);
    } else {
      simulationRef.current.nodes(nodes);
      (simulationRef.current.force('link') as d3.ForceLink<any, any>).links(linksData);
      simulationRef.current.alpha(0.1).restart();
    }

    const simulation = simulationRef.current;

    // Update Links
    const link = container.selectAll<SVGLineElement, any>('line.link')
      .data(linksData, (d: any) => d.id)
      .join(
        enter => enter.append('line')
          .attr('class', 'link')
          .attr('stroke', '#4b5563')
          .attr('stroke-opacity', 0.6)
          .attr('stroke-width', 2),
        update => update,
        exit => exit.remove()
      );

    // Update Nodes
    const node = container.selectAll<SVGGElement, any>('g.node')
      .data(nodes, (d: any) => d.id)
      .join(
        enter => {
          const g = enter.append('g')
            .attr('class', 'node')
            .attr('cursor', 'pointer')
            .on('click', (event, d) => onDeviceClick(d))
            .call(d3.drag<any, any>()
              .on('start', dragstarted)
              .on('drag', dragged)
              .on('end', dragended));

          g.append('circle')
            .attr('r', 24)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('class', 'node-circle shadow-sm');

          g.append('text')
            .attr('dy', 40)
            .attr('text-anchor', 'middle')
            .attr('fill', '#374151')
            .attr('font-size', '12px')
            .attr('font-weight', '500')
            .attr('class', 'node-label');

          return g;
        },
        update => update,
        exit => exit.remove()
      );

    // Update visual properties
    node.select<SVGCircleElement>('circle')
      .attr('fill', d => {
        if (d.type === 'controller') return '#10b981';
        if (d.type === 'router' || d.type === 'switch') return '#3b82f6';
        return '#64748b';
      });

    node.select<SVGTextElement>('text')
      .text(d => d.name);

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      
      const finalX = event.x;
      const finalY = event.y;
      
      // Keep fixed during state update to prevent jumping
      event.subject.fx = finalX;
      event.subject.fy = finalY;
      
      onNodeDragEnd({
        ...event.subject,
        x: finalX,
        y: finalY
      });
    }

    return () => {
      simulation.on('tick', null);
    };
  }, [devices, links, onDeviceClick, onNodeDragEnd]);

  const resetView = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    svg.transition()
      .duration(750)
      .call(
        d3.zoom<SVGSVGElement, unknown>().transform as any,
        d3.zoomIdentity.translate(0, 0).scale(1)
      );
  };

  return (
    <div className="w-full h-full bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative">
      <svg ref={svgRef} className="w-full h-full" />
      
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <div className="w-3 h-3 rounded-full bg-emerald-500" /> Controller
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <div className="w-3 h-3 rounded-full bg-blue-500" /> Router/Switch
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <div className="w-3 h-3 rounded-full bg-slate-500" /> Host
        </div>
        <button
          onClick={resetView}
          className="mt-2 px-3 py-1 bg-white border border-slate-200 text-slate-500 rounded-lg text-[10px] font-bold hover:bg-slate-50 transition-all shadow-sm uppercase tracking-wider"
        >
          Reset View
        </button>
      </div>

      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={onAddDeviceClick}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm"
        >
          <Plus size={16} />
          Add Device
        </button>
        <button
          onClick={onAddLinkClick}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
        >
          <Plus size={16} />
          Add Link
        </button>
      </div>
    </div>
  );
};
