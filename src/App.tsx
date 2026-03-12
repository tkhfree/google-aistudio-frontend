import React, { useState, useEffect } from 'react';
import { TopologyCanvas } from './components/TopologyCanvas';
import { FlowOrchestrator } from './components/FlowOrchestrator';
import { FlowHistory } from './components/FlowHistory';
import { DeviceInventory } from './components/DeviceInventory';
import { DeviceModal } from './components/DeviceModal';
import { LinkModal } from './components/LinkModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Device, Link, Flow } from './types';
import { Activity, Layout, Server, Settings, Shield, Zap, LogIn, LogOut, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, query, where, orderBy, getDocFromServer, deleteDoc } from 'firebase/firestore';

const INITIAL_DEVICES: Device[] = [
  { id: 'c1', name: 'Global Controller', type: 'controller', x: 400, y: 100, status: 'online' },
  { id: 'r1', name: 'Edge Router A', type: 'router', x: 200, y: 300, status: 'online' },
  { id: 'r2', name: 'Edge Router B', type: 'router', x: 600, y: 300, status: 'online' },
  { id: 'h1', name: 'Endpoint Alpha', type: 'host', x: 100, y: 500, status: 'online' },
  { id: 'h2', name: 'Endpoint Beta', type: 'host', x: 700, y: 500, status: 'online' },
];

const INITIAL_LINKS: Link[] = [
  { id: 'l1', source: 'c1', target: 'r1', bandwidth: '10Gbps', latency: '2ms' },
  { id: 'l2', source: 'c1', target: 'r2', bandwidth: '10Gbps', latency: '2ms' },
  { id: 'l3', source: 'r1', target: 'h1', bandwidth: '1Gbps', latency: '5ms' },
  { id: 'l4', source: 'r2', target: 'h2', bandwidth: '1Gbps', latency: '5ms' },
  { id: 'l5', source: 'r1', target: 'r2', bandwidth: '40Gbps', latency: '1ms' },
];

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES);
  const [links, setLinks] = useState<Link[]>(INITIAL_LINKS);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [activeTab, setActiveTab] = useState<'topology' | 'flows' | 'devices'>('topology');
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Test Connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Bootstrap initial data if needed
  useEffect(() => {
    if (!isAuthReady) return;
    
    const bootstrap = async () => {
      // Check if devices collection is empty
      const devicesSnap = await getDocFromServer(doc(db, 'devices', INITIAL_DEVICES[0].id));
      if (!devicesSnap.exists()) {
        for (const d of INITIAL_DEVICES) {
          await setDoc(doc(db, 'devices', d.id), d);
        }
      }
      
      // Check if links collection is empty
      const linksSnap = await getDocFromServer(doc(db, 'links', INITIAL_LINKS[0].id));
      if (!linksSnap.exists()) {
        for (const l of INITIAL_LINKS) {
          await setDoc(doc(db, 'links', l.id), l);
        }
      }
    };
    
    bootstrap().catch(console.error);
  }, [isAuthReady]);

  // Sync Devices
  useEffect(() => {
    if (!isAuthReady) return;
    const path = 'devices';
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs.map(doc => doc.data() as Device);
        setDevices(data);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, path));
    return () => unsubscribe();
  }, [isAuthReady]);

  // Sync Links
  useEffect(() => {
    if (!isAuthReady) return;
    const path = 'links';
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs.map(doc => doc.data() as Link);
        setLinks(data);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, path));
    return () => unsubscribe();
  }, [isAuthReady]);

  // Sync Flows
  useEffect(() => {
    if (!isAuthReady) return;
    const path = 'flows';
    const uid = user?.uid || 'guest-user';
    const q = query(collection(db, path), where('uid', '==', uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Flow);
      setFlows(data);
    }, (error) => {
      // Silently handle guest errors if rules don't allow
      if (user) handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, [isAuthReady, user]);

  const handleFlowGenerated = async (newFlow: Flow) => {
    const uid = user?.uid || 'guest-user';
    const path = 'flows';
    const flowWithUid = { 
      ...newFlow, 
      uid: uid, 
      createdAt: new Date().toISOString() 
    };
    try {
      await setDoc(doc(db, path, flowWithUid.id), flowWithUid);
    } catch (error) {
      if (user) handleFirestoreError(error, OperationType.CREATE, `${path}/${flowWithUid.id}`);
    }
  };

  const handleSaveDevice = async (device: Device) => {
    const path = 'devices';
    try {
      // Remove undefined fields for Firestore
      const data = JSON.parse(JSON.stringify(device));
      await setDoc(doc(db, path, device.id), data);
      setIsDeviceModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${device.id}`);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    const path = 'devices';
    try {
      await deleteDoc(doc(db, path, id));
      // Also delete associated links
      const linksToDelete = links.filter(l => l.source === id || l.target === id);
      for (const l of linksToDelete) {
        await deleteDoc(doc(db, 'links', l.id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
    }
  };

  const handleSaveLink = async (link: Link) => {
    const path = 'links';
    try {
      await setDoc(doc(db, path, link.id), link);
      setIsLinkModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${link.id}`);
    }
  };

  const handleNodeDragEnd = async (device: Device) => {
    const path = 'devices';
    try {
      // Create a clean object for Firestore (D3 adds extra props we don't want)
      const { id, name, type, x, y, status, config } = device;
      const data: any = { id, name, type, x, y, status };
      if (config !== undefined) data.config = config;
      
      await setDoc(doc(db, path, id), data);
    } catch (error) {
      console.error('Error saving node position:', error);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Zap className="animate-pulse text-indigo-600" size={48} />
      </div>
    );
  }

  const displayUser = user || {
    displayName: 'Guest User',
    email: 'guest@netprogrammable.local',
    photoURL: null
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
        {/* Sidebar Navigation */}
        <nav className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-8 gap-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Zap size={24} />
          </div>
          
          <div className="flex flex-col gap-4">
            <NavButton active={activeTab === 'topology'} onClick={() => setActiveTab('topology')} icon={<Layout size={22} />} label="Topology" />
            <NavButton active={activeTab === 'flows'} onClick={() => setActiveTab('flows')} icon={<Activity size={22} />} label="Flows" />
            <NavButton active={activeTab === 'devices'} onClick={() => setActiveTab('devices')} icon={<Server size={22} />} label="Devices" />
          </div>

          <div className="mt-auto flex flex-col gap-4">
            <NavButton active={false} onClick={() => {}} icon={<Shield size={22} />} label="Security" />
            <NavButton active={false} onClick={() => {}} icon={<Settings size={22} />} label="Settings" />
            {user ? (
              <button 
                onClick={handleLogout}
                className="p-3 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all group relative"
              >
                <LogOut size={22} />
                <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Logout
                </span>
              </button>
            ) : (
              <button 
                onClick={handleLogin}
                className="p-3 rounded-xl text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all group relative"
              >
                <LogIn size={22} />
                <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Login
                </span>
              </button>
            )}
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold tracking-tight">NetProgrammable</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Global Network Orchestrator</p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-100">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                SDN Controller Active
              </div>
              
              <div className="flex items-center gap-3 pl-6 border-l border-slate-100">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900">{displayUser.displayName}</p>
                  <p className="text-[10px] text-slate-500">{displayUser.email}</p>
                </div>
                {displayUser.photoURL ? (
                  <img src={displayUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <User size={16} />
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Content Grid */}
          <div className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-hidden">
            {/* Left Panel: Dynamic View */}
            <div className="col-span-8 flex flex-col gap-6 overflow-hidden">
              <div className="flex-1 min-h-0">
                <AnimatePresence mode="wait">
                  {activeTab === 'topology' && (
                    <motion.div key="topology" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                      <TopologyCanvas 
                        devices={devices} 
                        links={links} 
                        onDeviceClick={setSelectedDevice} 
                        onNodeDragEnd={handleNodeDragEnd}
                        onAddLinkClick={() => setIsLinkModalOpen(true)}
                        onAddDeviceClick={() => setIsDeviceModalOpen(true)}
                      />
                    </motion.div>
                  )}
                  {activeTab === 'flows' && (
                    <motion.div key="flows" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                      <FlowHistory flows={flows} />
                    </motion.div>
                  )}
                  {activeTab === 'devices' && (
                    <motion.div key="devices" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                      <DeviceInventory 
                        devices={devices} 
                        onAddClick={() => setIsDeviceModalOpen(true)}
                        onDeleteClick={handleDeleteDevice}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Stats Bar */}
              <div className="grid grid-cols-4 gap-4">
                <StatCard label="Total Nodes" value={devices.length.toString()} />
                <StatCard label="Active Links" value={links.length.toString()} />
                <StatCard label="Flow Rules" value={flows.length.toString()} />
                <StatCard label="Network Load" value="12.4%" />
              </div>
            </div>

            {/* Right Panel: Orchestrator & Details */}
            <div className="col-span-4 flex flex-col gap-6 overflow-hidden">
              <FlowOrchestrator onFlowGenerated={handleFlowGenerated} />
              
              <AnimatePresence mode="wait">
                {selectedDevice ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-slate-800">{selectedDevice.name}</h4>
                      <button onClick={() => setSelectedDevice(null)} className="text-slate-400 hover:text-slate-600">×</button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Type</span>
                        <span className="font-medium capitalize">{selectedDevice.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Status</span>
                        <span className="text-emerald-600 font-medium">{selectedDevice.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">ID</span>
                        <span className="font-mono text-xs">{selectedDevice.id}</span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex-1 overflow-hidden">
                    <FlowHistory flows={flows.slice(0, 5)} />
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>

      <DeviceModal 
        isOpen={isDeviceModalOpen} 
        onClose={() => setIsDeviceModalOpen(false)} 
        onSave={handleSaveDevice} 
      />

      <LinkModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onSave={handleSaveLink}
        devices={devices}
      />
    </ErrorBoundary>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-xl transition-all relative group ${
        active ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
      }`}
    >
      {icon}
      <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
        {label}
      </span>
      {active && <motion.div layoutId="activeNav" className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-r-full" />}
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-800">{value}</p>
    </div>
  );
}
