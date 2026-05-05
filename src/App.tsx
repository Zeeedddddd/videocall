/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, MoreHorizontal, MessageSquare, UserPlus, Shield, Sparkles } from 'lucide-react';
import { useCamera } from './hooks/useCamera';
import { analyzeBehavior } from './services/geminiService';

type CallState = 'IDLE' | 'RINGING' | 'ACTIVE';

export default function App() {
  const [callState, setCallState] = useState<CallState>('IDLE');
  const [aiData, setAiData] = useState<{ emotion: string; intensity: string; action: string } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { stream, videoRef, startCamera, stopCamera } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const analysisInterval = useRef<number | null>(null);

  // AI Reflection Logic
  useEffect(() => {
    if (callState === 'ACTIVE' && stream) {
      const processFrame = async () => {
        if (!videoRef.current || !canvasRef.current || isVideoOff) return;

        const context = canvasRef.current.getContext('2d');
        if (context) {
          context.drawImage(videoRef.current, 0, 0, 320, 180);
          canvasRef.current.toBlob(async (blob) => {
            if (blob) {
              const data = await analyzeBehavior(blob);
              if (data?.error === 'quota' || data?.status === 429) {
                setApiError("Rate Limit: Cooling down (60s)...");
                if (analysisInterval.current) clearInterval(analysisInterval.current);
                setTimeout(() => {
                  if (callState === 'ACTIVE') {
                    setApiError(null);
                    analysisInterval.current = window.setInterval(processFrame, 15000);
                  }
                }, 60000);
                return;
              }
              if (data && !data.error) {
                setAiData(data);
                setApiError(null);
              }
            }
          }, 'image/jpeg');
        }
      };

      analysisInterval.current = window.setInterval(processFrame, 15000); 
    }
    return () => {
      if (analysisInterval.current) clearInterval(analysisInterval.current);
    };
  }, [callState, stream, isVideoOff]);

  const handleStartCall = async () => {
    setCallState('RINGING');
    const mediaStream = await startCamera();
    if (!mediaStream) {
      setApiError("Camera access failed");
      setCallState('IDLE');
      return;
    }
    setTimeout(() => setCallState('ACTIVE'), 2000);
  };

  const handleEndCall = () => {
    stopCamera();
    setCallState('IDLE');
  };

  return (
    <div id="app-container" className="h-screen w-screen bg-black flex items-center justify-center font-sans">
      <AnimatePresence mode="wait">
        {callState === 'IDLE' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="text-center"
          >
            <div className="mb-8 relative inline-block">
              <div className="absolute inset-0 bg-white/10 blur-3xl rounded-full" />
              <div className="relative glass-morphism rounded-3xl p-12 video-glow">
                <Sparkles className="w-12 h-12 mb-4 text-white/50 mx-auto" />
                <h1 className="text-4xl font-display font-medium tracking-tight mb-2">DeepFocus AI</h1>
                <p className="text-white/40 mb-8 max-w-xs mx-auto">Connecting you with your AI digital twin for high-fidelity reflection.</p>
                <button
                  id="start-call-btn"
                  onClick={handleStartCall}
                  className="group relative flex items-center gap-3 bg-white text-black px-10 py-4 rounded-full font-medium hover:bg-opacity-90 transition-all active:scale-95"
                >
                  <Phone className="w-5 h-5 fill-current" />
                  Initiate Link
                  <div className="absolute -inset-0.5 bg-white/20 blur opacity-0 group-hover:opacity-100 transition-opacity rounded-full -z-10" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {callState === 'RINGING' && (
          <motion.div
            key="ringing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-12"
          >
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-white/20 rounded-full blur-2xl"
              />
              <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-white/20 relative z-10">
                <img 
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400" 
                  className="w-full h-full object-cover grayscale"
                  alt="AI Avatar"
                />
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-display font-medium mb-2">Linking to AI Persona...</h2>
              <p className="text-white/40 animate-pulse">Establishing neural bridge</p>
            </div>
            <button 
              onClick={handleEndCall}
              className="bg-red-500 p-4 rounded-full hover:bg-red-600 transition-colors"
            >
              <PhoneOff className="w-8 h-8 text-white" />
            </button>
          </motion.div>
        )}

        {callState === 'ACTIVE' && (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1,
              x: aiData?.intensity === 'High' ? [0, -2, 2, -2, 2, 0] : 0,
              filter: aiData?.intensity === 'High' ? 'contrast(1.2) brightness(1.1)' : 'none'
            }}
            transition={{ 
              x: { duration: 0.1, repeat: 2 },
              filter: { duration: 0.5 }
            }}
            className="fixed inset-0 bg-black overflow-hidden"
          >
            {/* Main AI Video (Placeholder Background) */}
            <div className="absolute inset-0 z-0 overflow-hidden">
              <div 
                className="absolute inset-0 z-20 pointer-events-none transition-colors duration-1000"
                style={{ 
                  backgroundColor: 
                    aiData?.emotion?.toLowerCase().includes('angr') ? 'rgba(255,0,0,0.1)' :
                    aiData?.emotion?.toLowerCase().includes('happ') ? 'rgba(255,165,0,0.05)' :
                    aiData?.emotion?.toLowerCase().includes('sad') ? 'rgba(0,0,255,0.05)' :
                    'transparent'
                }} 
              />
              <div className="absolute inset-0 bg-linear-to-b from-black/60 via-transparent to-black/90 z-20" />
              
              {/* Noise & Grain Layer */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-30" style={{ backgroundImage: `url('https://grainy-gradients.vercel.app/noise.svg')` }} />
              
              {/* Scanline Effect */}
              <div className="absolute inset-0 pointer-events-none z-30 opacity-[0.05]" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }} />

              <motion.img 
                initial={{ scale: 1.1 }}
                animate={{ 
                  scale: aiData?.intensity === 'High' ? 1.05 : 1,
                  opacity: 0.7 
                }}
                transition={{ duration: 1 }}
                src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=1920" 
                className={`w-full h-screen object-cover grayscale-[0.2] sepia-[0.1] ${aiData?.intensity === 'High' ? 'blur-[1px]' : ''}`}
                alt="AI Counterpart"
              />
            </div>

            {/* Top Info Bar */}
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute top-0 left-0 right-0 p-8 flex justify-between items-start z-40 pointer-events-none"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-4">
                  <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-xs font-medium tracking-widest uppercase opacity-80">Link Active</span>
                  </div>
                  {apiError && (
                    <div className="bg-red-500/20 backdrop-blur-md px-4 py-2 rounded-full border border-red-500/50 flex items-center gap-2">
                      <span className="text-[10px] text-red-300 font-bold uppercase tracking-tight">{apiError}</span>
                    </div>
                  )}
                </div>
                {aiData && (
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] uppercase tracking-tighter text-white/40">Intensity:</span>
                    <div className="flex gap-1">
                      {['Low', 'Medium', 'High'].map((lvl) => (
                        <div 
                          key={lvl}
                          className={`h-1 w-4 rounded-full transition-colors ${
                            aiData.intensity === lvl || (lvl === 'Low' && aiData.intensity !== 'Low') || (lvl === 'Medium' && aiData.intensity === 'High')
                              ? 'bg-white' : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* AI Reflection Insight */}
              <div className="max-w-xs text-right">
                <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Mirroring Persona</p>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={JSON.stringify(aiData)}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-1"
                  >
                    <p className="text-lg font-display font-medium text-white/100 capitalize">
                      {aiData?.emotion || 'Calibrating...'}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                      {aiData?.action ? `Detecting: ${aiData.action}` : 'Observing presence'}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            {/* PIP Camera Feed (User) */}
            <motion.div
              id="pip-feed"
              drag
              dragConstraints={{ left: 0, right: window.innerWidth - 320, top: 0, bottom: window.innerHeight - 180 }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-24 right-8 w-64 aspect-video rounded-2xl overflow-hidden glass-morphism z-30 cursor-move border border-white/20 video-glow"
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-tighter">
                Preview
              </div>
              <canvas ref={canvasRef} width="320" height="180" className="hidden" />
            </motion.div>

            {/* Bottom Controls */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20"
            >
              <div className="flex items-center gap-4 p-4 glass-morphism rounded-full">
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-4 rounded-full transition-all ${isMuted ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <button 
                  onClick={() => setIsVideoOff(!isVideoOff)}
                  className={`p-4 rounded-full transition-all ${isVideoOff ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>
                <button className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-all">
                  <MessageSquare className="w-6 h-6" />
                </button>
                <button className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-all">
                  <UserPlus className="w-6 h-6" />
                </button>
                <div className="w-[1px] h-8 bg-white/20 mx-2" />
                <button 
                  onClick={handleEndCall}
                  className="bg-red-500 p-4 rounded-full hover:bg-red-600 transition-colors shadow-2xl shadow-red-500/20"
                >
                  <PhoneOff className="w-8 h-8 text-white" />
                </button>
              </div>
              
              <button className="p-4 rounded-full glass-morphism text-white/60 hover:text-white transition-colors">
                <MoreHorizontal className="w-6 h-6" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

