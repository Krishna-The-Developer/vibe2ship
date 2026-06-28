import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDisaster } from '../context/DisasterContext';
import { useAuth } from '../context/AuthContext';
import { 
  createChatSession, 
  updateChatSessionMessages, 
  subscribeToChatSessions, 
  deleteChatSession 
} from '../services/firestoreService';
import AppLayout from '../components/Layout/AppLayout';
import ContextPanel from '../components/AI/ContextPanel';
import MessageBubble from '../components/AI/MessageBubble';
import { 
  Send, 
  Trash2, 
  Sparkles, 
  MessageSquare, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

const STARTER_PROMPTS = [
  "Draft an immediate public evacuation announcement for this event.",
  "Analyze current critical infrastructure damage and list immediate risk levels.",
  "Develop a tactical resource mobilization plan to resolve critical shortages.",
  "Assess potential cascading hazards like secondary flooding or weather issues.",
  "Provide an optimized evacuation routing plan using available safe havens.",
  "Suggest priority actions for the first 12 hours of Incident Command.",
  "Generate a situation brief suited for public media dissemination.",
  "Outline health and safety instructions for citizens trapped in the hazard zone.",
  "Verify logistical supply chain dependencies for emergency shelter setups.",
  "Estimate population vulnerability profiles based on disaster magnitude."
];

export default function CommandCenter() {
  const { disasters, loading: disastersLoading, error: disastersError } = useDisaster();
  const { currentUser } = useAuth();
  
  const [activeDisaster, setActiveDisaster] = useState(null);
  const [chatSession, setChatSession] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('chat'); // chat vs starter

  const messagesEndRef = useRef(null);

  // Auto-select first active disaster if none is selected
  useEffect(() => {
    if (disasters.length > 0 && !activeDisaster) {
      setActiveDisaster(disasters[0]);
    }
  }, [disasters, activeDisaster]);

  // Subscribe to chat session when activeDisaster or currentUser changes
  useEffect(() => {
    if (!activeDisaster?.id) {
      setChatSession(null);
      setSuggestedQuestions([]);
      return;
    }

    setErrorMessage(null);
    const unsubscribe = subscribeToChatSessions(activeDisaster.id, async (sessions) => {
      if (sessions.length > 0) {
        // Use existing session
        setChatSession(sessions[0]);
      } else {
        // Create new session
        try {
          const newSession = await createChatSession(activeDisaster.id);
          setChatSession(newSession);
        } catch (err) {
          console.error("Failed to create chat session:", err);
          setErrorMessage("Failed to initialize safe conversation session with Firestore.");
        }
      }
    }, (error) => {
      console.error("Chat session subscription error:", error);
      setChatSession({
        id: 'local-session',
        disasterId: activeDisaster.id,
        userId: 'local',
        messages: []
      });
      setSuggestedQuestions([]);
      setErrorMessage(null);
    });

    return () => unsubscribe();
  }, [activeDisaster, currentUser]);

  // Scroll to bottom on message updates or typing state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatSession?.messages, isTyping]);

  const handleSendMessage = async (textToSend) => {
    if (!textToSend.trim() || !chatSession || !activeDisaster || isTyping) return;

    setErrorMessage(null);
    const userMsg = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...(chatSession.messages || []), userMsg];
    
    // Optimistic local update
    setChatSession(prev => ({ ...prev, messages: updatedMessages }));
    setInputMessage('');
    setIsTyping(true);

    try {
      // 1. Sync user message to Firestore non-blocking (does not await connection)
      if (chatSession.id && chatSession.id !== 'local-session') {
        updateChatSessionMessages(chatSession.id, updatedMessages).catch((firestoreErr) => {
          console.warn("Falling back to local chat mode for user message sync:", firestoreErr);
        });
      }

      // 2. Fetch response from backend /api/ai/chat with Authorization header
      const token = localStorage.getItem('token') || 'mock-auth-token-123';
      const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          disaster_id: activeDisaster.id,
          disaster_context: {
            title: activeDisaster.title,
            type: activeDisaster.type,
            magnitude: activeDisaster.magnitude || 0.0,
            risk_score: activeDisaster.total_score || 50.0,
            affected_population: activeDisaster.population_affected || 0,
            damaged_critical: activeDisaster.damaged_critical || 0,
            total_critical: activeDisaster.total_critical || 0,
            resources: [],
            evacuation_routes: [],
            alerts: []
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      const fallbackReply = "🛠️ Local tactical assistance is active. I can still support incident triage, task prioritization, and next-step planning while the cloud model is unavailable.";
      
      const assistantMsg = {
        role: 'assistant',
        content: data?.response || fallbackReply,
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, assistantMsg];

      // 3. Sync assistant message and suggested follow-up questions non-blocking
      if (chatSession.id && chatSession.id !== 'local-session') {
        updateChatSessionMessages(chatSession.id, finalMessages).catch((firestoreErr) => {
          console.warn("Cloud sync unavailable; keeping local chat state:", firestoreErr);
        });
      }
      
      // Update local state so it renders immediately even if offline or sync is delayed
      setChatSession(prev => ({ ...prev, messages: finalMessages }));
      setSuggestedQuestions(data?.suggested_questions || []);

    } catch (err) {
      console.error("AI command dispatch failed:", err);
      setErrorMessage("AI Command Console encountered an error. Local tactical backup is active.");
      
      // Revert optimistic update slightly if failed to save
      const failedMsg = {
        role: 'assistant',
        content: "🛠️ Local assistance is active. I can still support incident triage, task prioritization, and next-step planning while the cloud model is unavailable.",
        timestamp: new Date().toISOString()
      };
      setChatSession(prev => ({ ...prev, messages: [...updatedMessages, failedMsg] }));
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearConversation = async () => {
    if (!chatSession) return;

    try {
      if (chatSession.id && chatSession.id !== 'local-session') {
        await updateChatSessionMessages(chatSession.id, []);
      }

      setChatSession(prev => ({ ...prev, messages: [] }));
      setSuggestedQuestions([]);
      setErrorMessage(null);
    } catch (err) {
      console.error("Failed to clear conversation:", err);
      setChatSession(prev => ({ ...prev, messages: [] }));
      setSuggestedQuestions([]);
      setErrorMessage(null);
    }
  };

  return (
    <AppLayout>
      <div id="command-center-root" className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[calc(100vh-220px)] text-slate-100">
        
        {/* Left Column: Context Profile Selector Panel (Span 1) */}
        <div className="lg:col-span-1 flex flex-col h-full min-h-[400px]">
          <ContextPanel 
            activeDisaster={activeDisaster}
            disasters={disasters}
            onSelectDisaster={setActiveDisaster}
          />
        </div>

        {/* Right Columns: Core Chat Command Console Panel (Span 3) */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-full shadow-2xl relative overflow-hidden">
          
          {/* Header Bar */}
          <div className="border-b border-slate-800/80 px-6 py-4 bg-slate-950/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                  AI Tactical Command Console
                </h2>
                <p className="text-xs text-slate-400">
                  {activeDisaster ? `Live secure session synced for: ${activeDisaster.title}` : "Ready to synchronize with active Incident Command context."}
                </p>
              </div>
            </div>

            {/* Clear conversation button */}
            {chatSession?.messages?.length > 0 && (
              <button
                id="clear-chat-btn"
                onClick={handleClearConversation}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500/10 text-xs font-semibold tracking-wide uppercase transition-colors"
                title="Clear current thread"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>

          {/* Sub-Header Tabs for Chat vs Starter Prompts */}
          <div className="flex border-b border-slate-800/60 bg-slate-950/20 px-6 py-2 gap-4">
            <button
              id="tab-chat"
              onClick={() => setActiveTab('chat')}
              className={`text-xs font-bold tracking-wide uppercase py-1 px-3 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'chat' 
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
              Live Feed
            </button>
            <button
              id="tab-starters"
              onClick={() => setActiveTab('starter')}
              className={`text-xs font-bold tracking-wide uppercase py-1 px-3 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'starter' 
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
              Incident Starters
            </button>
          </div>

          {/* Main Body */}
          <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-2 min-h-[350px] max-h-[550px] bg-slate-950/10">
            {errorMessage && (
              <div id="chat-error" className="flex items-center gap-2.5 bg-red-950/40 border border-red-800/40 text-red-400 p-3 rounded-lg text-xs mb-4">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {activeTab === 'starter' ? (
              <div id="starters-grid" className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
                <div className="col-span-1 md:col-span-2 text-xs font-medium text-slate-400 mb-2">
                  Select an emergency-management starter command to feed immediately to the central platform model:
                </div>
                {STARTER_PROMPTS.map((promptText, idx) => (
                  <button
                    key={idx}
                    id={`starter-chip-${idx}`}
                    onClick={() => {
                      setActiveTab('chat');
                      handleSendMessage(promptText);
                    }}
                    className="text-left bg-slate-950 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900/50 p-3.5 rounded-lg text-xs text-slate-300 hover:text-white transition-all shadow-sm flex flex-col gap-1 cursor-pointer"
                  >
                    <span className="font-semibold text-emerald-400">Tactical Query #{idx + 1}</span>
                    <span className="line-clamp-2">{promptText}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div id="chat-feed" className="flex-grow flex flex-col">
                {chatSession?.messages?.length > 0 ? (
                  chatSession.messages.map((msg, index) => (
                    <MessageBubble 
                      key={index}
                      role={msg.role}
                      content={msg.content}
                      timestamp={msg.timestamp}
                    />
                  ))
                ) : (
                  <div id="chat-placeholder" className="flex-grow flex flex-col items-center justify-center text-center p-8 my-auto">
                    <div className="p-4 rounded-full bg-slate-950 border border-slate-800 text-slate-500 mb-4">
                      <MessageSquare className="h-10 w-10 text-slate-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-300">Tactical Intelligence Sync Room</h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
                      Send a message to consult the DIEP-AI central assistant model regarding incident summaries, resource allocation, public announcements, and evacuations.
                    </p>
                  </div>
                )}

                {/* Bouncing typing indicator */}
                {isTyping && (
                  <div id="typing-indicator" className="flex items-center gap-2.5 my-3 text-slate-400 text-xs px-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 border border-emerald-500/20 text-emerald-400">
                      <Sparkles className="h-3 w-3 animate-spin" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-slate-400 text-[11px]">DIEP-AI Command Assistant</span>
                      <div className="flex items-center gap-1.5 mt-1 bg-slate-900/50 border border-slate-800 rounded-xl px-3.5 py-1.5">
                        <span className="text-[11px] text-emerald-400">Running disaster intelligence assessment</span>
                        <div className="flex gap-1">
                          <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-bounce delay-75" />
                          <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-bounce delay-150" />
                          <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-bounce delay-300" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Suggested follow-up questions / action chips */}
          {activeTab === 'chat' && suggestedQuestions.length > 0 && (
            <div id="suggested-questions-row" className="px-6 py-2.5 border-t border-slate-800 bg-slate-950/20 flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 mr-1 shrink-0 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Suggested Follow-ups:
              </span>
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  id={`suggested-chip-${idx}`}
                  onClick={() => handleSendMessage(q)}
                  className="bg-slate-900 hover:bg-slate-800 border border-emerald-500/20 hover:border-emerald-500/40 text-slate-300 hover:text-white rounded-full px-3.5 py-1 text-[11px] font-medium transition-all cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Footer Input Bar */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/60">
            <form
              id="message-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputMessage);
              }}
              className="flex items-center gap-3"
            >
              <input
                id="message-input"
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  activeTab === 'starter' 
                    ? "Select an incident starter below or click Live Feed tab..."
                    : "Query active incident status, logistical gaps, evacuation routes..."
                }
                disabled={activeTab === 'starter' || isTyping || !chatSession}
                className="flex-1 bg-slate-950 border border-slate-800 text-sm text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 disabled:opacity-50 transition-colors"
                autoComplete="off"
              />
              <button
                id="send-message-btn"
                type="submit"
                disabled={!inputMessage.trim() || isTyping || activeTab === 'starter' || !chatSession}
                className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
                title="Send Message"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </form>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
