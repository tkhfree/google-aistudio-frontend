import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Send, Loader2, Code, Download, Play } from 'lucide-react';
import Markdown from 'react-markdown';

interface FlowOrchestratorProps {
  onFlowGenerated: (flow: any) => void;
}

export const FlowOrchestrator: React.FC<FlowOrchestratorProps> = ({ onFlowGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  const generateFlow = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a network programming expert. Based on the following description, generate a programmable network configuration (P4 or OpenFlow JSON format). 
        Description: ${prompt}
        
        Output only the code block and a brief explanation.`,
      });

      const text = response.text || '';
      setGeneratedCode(text);
      
      // Mock flow object for the UI
      onFlowGenerated({
        id: Math.random().toString(36).substr(2, 9),
        name: 'New Flow',
        description: prompt,
        code: text,
        status: 'active'
      });
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'network_config.p4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-bottom border-slate-100 bg-slate-50 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Code size={18} className="text-indigo-600" />
          Flow Orchestrator
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {generatedCode ? (
          <div className="prose prose-sm max-w-none">
            <Markdown>{generatedCode}</Markdown>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center px-6">
            <Play size={48} className="mb-4 opacity-20" />
            <p className="text-sm">Describe your network data flow logic to generate programmable configurations.</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Forward all HTTP traffic from Host A to Host B via Router 1 with priority 10..."
            className="w-full p-3 pr-12 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none h-24 text-sm"
          />
          <button
            onClick={generateFlow}
            disabled={loading || !prompt.trim()}
            className="absolute bottom-3 right-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </div>
        
        {generatedCode && (
          <button
            onClick={handleDownload}
            className="mt-3 w-full flex items-center justify-center gap-2 p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            <Download size={16} />
            Download to Device
          </button>
        )}
      </div>
    </div>
  );
};
