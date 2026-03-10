import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Device, Link } from '../types';

interface TopologyCanvasProps {
  devices: Device[];
  links: Link[];
  onDeviceClick: (device: Device) => void;
}

export const TopologyCanvas: React.FC<TopologyCanvasProps> = ({ devices, links, onDeviceClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const simulation = d3.forceSimulation<any>(devices)
      .force('link', d3.forceLink<any, any>(links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g')
      .attr('stroke', '#4b5563')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', 2);

    const node = svg.append('g')
      .selectAll('g')
      .data(devices)
      .join('g')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => onDeviceClick(d))
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    node.append('circle')
      .attr('r', 20)
      .attr('fill', d => d.type === 'controller' ? '#10b981' : d.type === 'router' ? '#3b82f6' : '#6b7280')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    node.append('text')
      .attr('dy', 35)
      .attr('text-anchor', 'middle')
      .attr('fill', '#374151')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
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
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [devices, links, onDeviceClick]);

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
      </div>
    </div>
  );
};
