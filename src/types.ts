export interface Device {
  id: string;
  name: string;
  type: 'switch' | 'router' | 'controller' | 'host';
  x: number;
  y: number;
  status: 'online' | 'offline' | 'programming';
  config?: string;
}

export interface Link {
  id: string;
  source: string;
  target: string;
  bandwidth: string;
  latency: string;
}

export interface Flow {
  id: string;
  name: string;
  description: string;
  path: string[]; // Array of device IDs
  code: string;
  status: 'active' | 'inactive';
}
