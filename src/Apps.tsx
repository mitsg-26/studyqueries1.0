import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BrainCircuit,
  Check,
  Plus,
  Trash2,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  LayoutDashboard,
  FileText,
  ExternalLink,
  Search,
  Database,
  UploadCloud,
  Calendar,
  X,
  Undo,
  RefreshCw,
  Sun,
  Moon,
  SearchCode,
  ChevronRight,
  Info,
  Layers,
  ArrowRight,
  CheckCircle2,
  MilestoneIcon,
  Send
} from 'lucide-react';
import { Document, ChatMessage, MindmapNode, Milestone, ToastMessage } from './types';

// Web Audio API custom synthesizer chime
const playAudioChime = (frequency = 880, type: OscillatorType = 'sine') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  } catch (e) {
    console.warn("Audio chime skipped:", e);
  }
};

export default function App() {
  // Navigation
  const [activePage, setActivePage] = useState<'dashboard' | 'workspace' | 'roadmap'>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
  });

  // Theme effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Toast System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (message: string, type: 'success' | 'info' | 'milestone' = 'info') => {
    const newToast: ToastMessage = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      type
    };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newToast.id));
    }, 4500);
  };

  // API Key Handling
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('cosmos-api-key') || '';
  });
  useEffect(() => {
    localStorage.setItem('cosmos-api-key', apiKey);
  }, [apiKey]);

  const isLiveAPI = useMemo(() => apiKey.trim().length > 15, [apiKey]);

  // Documents / Active Workspace
  const [activeWorkspace, setActiveWorkspace] = useState<Document[]>(() => {
    const saved = localStorage.getItem('sq-documents');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('sq-documents', JSON.stringify(activeWorkspace));
  }, [activeWorkspace]);

  const [activeDocument, setActiveDocument] = useState<Document | null>(() => {
    return activeWorkspace[0] || null;
  });

  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processIncomingFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processIncomingFiles(e.target.files);
    }
  };

  const processIncomingFiles = async (fileList: FileList) => {
    const loadedDocs: Document[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const text = await file.text();
      const id = `local-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      
      const newDoc: Document = {
        id,
        title: file.name.replace(/\.[^/.]+$/, ""),
        authors: "Local Upload",
        abstract: text.substring(0, 300) + "...",
        fullText: text,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        url: "#",
        date: new Date().toISOString().split('T')[0]
      };
      loadedDocs.push(newDoc);
    }
    
    if (loadedDocs.length > 0) {
      setActiveWorkspace(prev => [...loadedDocs, ...prev]);
      setActiveDocument(loadedDocs[0]);
      showToast(`Ingested ${loadedDocs.length} local files as context!`, 'success');
      playAudioChime(660, 'triangle');
    }
  };

  const removeFromWorkspace = (id: string) => {
    setActiveWorkspace(prev => prev.filter(d => d.id !== id));
    if (activeDocument?.id === id) {
      const remaining = activeWorkspace.filter(d => d.id !== id);
      setActiveDocument(remaining[0] || null);
    }
    showToast("Document removed from workspace", "info");
  };

  // Search Online Sources
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Document[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('sq-search-history');
    return saved ? JSON.parse(saved) : ["Self-Attention Transformers", "Low-Rank Adaptation"];
  });

  useEffect(() => {
    localStorage.setItem('sq-search-history', JSON.stringify(searchHistory));
  }, [searchHistory]);

  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
        setShowHistoryDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const performSearch = async (queryToSearch: string) => {
    const finalQuery = queryToSearch.trim();
    if (!finalQuery) return;

    setSearchHistory(prev => {
      const filtered = prev.filter(h => h.toLowerCase() !== finalQuery.toLowerCase());
      return [finalQuery, ...filtered].slice(0, 8);
    });

    setSearchQuery(finalQuery);
    setIsSearching(true);
    setShowHistoryDropdown(false);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(finalQuery)}`);
      if (!res.ok) throw new Error("Proxy response failed");
      const data = await res.json();
      
      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
        showToast(`Found ${data.results.length} academic sources!`, 'success');
      } else {
        setSearchResults([]);
        showToast("No matches found.", "info");
      }
    } catch (e: any) {
      console.error(e);
      setSearchResults([
        {
          id: `fb-1-${Date.now()}`,
          title: `Grounded Research: ${finalQuery}`,
          authors: "Academic Community",
          abstract: `Research paper discussing ${finalQuery}`,
          size: "Online source",
          url: "https://arxiv.org",
          date: new Date().toISOString().split('T')[0]
        }
      ]);
      showToast("Using fallback results", "info");
    } finally {
      setIsSearching(false);
    }
  };

  const removeHistoryItem = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    setSearchHistory(prev => prev.filter(h => h !== item));
  };

  const clearAllHistory = () => {
    setSearchHistory([]);
    showToast("Search history cleared", "info");
  };

  const injectIntoWorkspace = (doc: Document) => {
    if (activeWorkspace.some(d => d.id === doc.id)) {
      showToast("Document already in workspace", "info");
      return;
    }
    setActiveWorkspace(prev => [doc, ...prev]);
    setActiveDocument(doc);
    showToast("Added to workspace", "success");
    playAudioChime(740, 'sine');
  };

  // AI Synthesis Chatbot
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'initial',
        role: 'bot',
        text: "Welcome to **StudyQueries** synthesis chat. Ask me questions about your uploaded documents or query online academic resources in real-time."
      }
    ];
  });
  const [userMessage, setUserMessage] = useState('');
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [chatContextMode, setChatContextMode] = useState<'all' | string>('all');
  const [useWebSearch, setUseWebSearch] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isBotThinking]);

  const sendChatMessage = async () => {
    const text = userMessage.trim();
    if (!text) return;

    setUserMessage('');
    const userMsgObj: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      text
    };
    
    setChatMessages(prev => [...prev, userMsgObj]);
    setIsBotThinking(true);

    try {
      let docsToInclude: Document[] = [];
      if (chatContextMode === 'all') {
        docsToInclude = activeWorkspace;
      } else {
        const found = activeWorkspace.find(d => d.id === chatContextMode);
        if (found) docsToInclude = [found];
      }

      const payload = {
        message: text,
        history: chatMessages.slice(1).map(m => ({ role: m.role, text: m.text })),
        contextDocs: docsToInclude.map(d => ({
          id: d.id,
          title: d.title,
          authors: d.authors,
          abstract: d.abstract,
          fullText: d.fullText
        })),
        useWebSearch: useWebSearch,
        customApiKey: apiKey
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`API returned status ${res.status}`);
      const responseData = await res.json();

      const webBadges: Array<{ label: string; url: string }> = [];
      if (responseData.groundingMetadata?.groundingChunks) {
        responseData.groundingMetadata.groundingChunks.forEach((chunk: any, i: number) => {
          if (chunk.web) {
            webBadges.push({
              label: chunk.web.title || `Web Source ${i + 1}`,
              url: chunk.web.uri
            });
          }
        });
      }

      const citations: Array<{ ref: string; title: string }> = [];
      activeWorkspace.forEach(doc => {
        if (responseData.text.toLowerCase().includes(doc.title.split(' ')[0].toLowerCase())) {
          citations.push({ ref: doc.id, title: doc.title });
        }
      });

      const botMsgObj: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        role: 'bot',
        text: responseData.text,
        citations: citations.length > 0 ? citations : undefined,
        webBadges: webBadges.length > 0 ? webBadges : undefined,
        groundingMetadata: responseData.groundingMetadata
      };

      setChatMessages(prev => [...prev, botMsgObj]);
      playAudioChime(520, 'sine');

    } catch (err: any) {
      console.error(err);
      const errorMsgObj: ChatMessage = {
        id: `msg-${Date.now()}-bot-err`,
        role: 'bot',
        text: `Connection error: ${err.message}. Check your API key and server connection.`
      };
      setChatMessages(prev => [...prev, errorMsgObj]);
    } finally {
      setIsBotThinking(false);
    }
  };

  const renderMessageContent = (text: string) => {
    return <p className="whitespace-pre-wrap leading-relaxed">{text}</p>;
  };

  const clearChat = () => {
    setChatMessages([
      {
        id: 'initial',
        role: 'bot',
        text: "Conversation cleared. Workspace context preserved."
      }
    ]);
    showToast("Chat cleared", "info");
  };

  // Hierarchy Map (simplified terminology)
  const [mainTopic, setMainTopic] = useState('Research Topic');
  const [hierarchyItems, setHierarchyItems] = useState<MindmapNode[]>(() => {
    const saved = localStorage.getItem('sq-hierarchy-items');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('sq-hierarchy-items', JSON.stringify(hierarchyItems));
  }, [hierarchyItems]);

  const [newItemLabel, setNewItemLabel] = useState('');
  const [selectedItem, setSelectedItem] = useState<MindmapNode | null>(null);
  
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const hierarchyContainerRef = useRef<HTMLDivElement>(null);

  const spawnHierarchyItem = () => {
    const label = newItemLabel.trim();
    if (!label) return;

    const id = `item-${Date.now()}`;
    const newX = Math.random() * 250 + 100;
    const newY = Math.random() * 150 + 80;

    const newItem: MindmapNode = {
      id,
      label,
      description: "Click settings to edit details and assign parent relationships.",
      x: newX,
      y: newY,
      theme: Math.random() > 0.6 ? 'peach' : Math.random() > 0.3 ? 'lavender' : 'mist',
      expanded: false,
      parents: []
    };

    setHierarchyItems(prev => [...prev, newItem]);
    setNewItemLabel('');
    showToast(`Created: "${label}"`, 'success');
    playAudioChime(620, 'triangle');
  };

  const removeHierarchyItem = (id: string) => {
    setHierarchyItems(prev => prev.filter(n => n.id !== id).map(n => ({
      ...n,
      parents: n.parents.filter(p => p !== id)
    })));
    if (selectedItem?.id === id) {
      setSelectedItem(null);
    }
  };

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    setDraggingId(id);
    const rect = hierarchyContainerRef.current?.getBoundingClientRect();
    if (rect) {
      const item = hierarchyItems.find(n => n.id === id);
      if (item) {
        setDragOffset({
          x: e.clientX - rect.left - item.x,
          y: e.clientY - rect.top - item.y
        });
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !hierarchyContainerRef.current) return;
    const rect = hierarchyContainerRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragOffset.x;
    const newY = e.clientY - rect.top - dragOffset.y;

    const boundedX = Math.max(25, Math.min(rect.width - 25, newX));
    const boundedY = Math.max(25, Math.min(rect.height - 25, newY));

    setHierarchyItems(prev => prev.map(n => n.id === draggingId ? { ...n, x: boundedX, y: boundedY } : n));
  };

  const handlePointerUp = () => {
    setDraggingId(null);
  };

  const toggleParentConnection = (itemId: string, parentId: string) => {
    setHierarchyItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const hasParent = item.parents.includes(parentId);
        return {
          ...item,
          parents: hasParent 
            ? item.parents.filter(p => p !== parentId)
            : [...item.parents, parentId]
        };
      }
      return item;
    }));
  };

  // Focus Time
  const [timerMode, setTimerMode] = useState<'pomodoro' | 'custom'>('pomodoro');
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [customInputMinutes, setCustomInputMinutes] = useState(45);
  const [customInputSeconds, setCustomInputSeconds] = useState(0);

  const totalSecondsInitial = useMemo(() => {
    if (timerMode === 'pomodoro') return 25 * 60;
    return (customInputMinutes * 60) + customInputSeconds;
  }, [timerMode, customInputMinutes, customInputSeconds]);

  const currentSecondsLeft = (timerMinutes * 60) + timerSeconds;
  const timerDashoffset = useMemo(() => {
    const ratio = currentSecondsLeft / (totalSecondsInitial || 1);
    return 402 * (1 - ratio);
  }, [currentSecondsLeft, totalSecondsInitial]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive) {
      interval = setInterval(() => {
        if (timerSeconds === 0) {
          if (timerMinutes === 0) {
            setTimerActive(false);
            playAudioChime(880, 'sine');
            setTimeout(() => playAudioChime(1100, 'triangle'), 150);
            showToast("Focus session completed!", "success");
            
            if (timerMode === 'pomodoro') {
              setTimerMinutes(25);
            } else {
              setTimerMinutes(customInputMinutes);
              setTimerSeconds(customInputSeconds);
            }
          } else {
            setTimerMinutes(prev => prev - 1);
            setTimerSeconds(59);
          }
        } else {
          setTimerSeconds(prev => prev - 1);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timerMinutes, timerSeconds]);

  const setTimerPreset = (mode: 'pomodoro' | 'custom') => {
    setTimerActive(false);
    setTimerMode(mode);
    if (mode === 'pomodoro') {
      setTimerMinutes(25);
      setTimerSeconds(0);
    } else {
      setTimerMinutes(customInputMinutes);
      setTimerSeconds(customInputSeconds);
    }
  };

  const applyCustomTimerConfig = () => {
    setTimerActive(false);
    setTimerMinutes(customInputMinutes);
    setTimerSeconds(customInputSeconds);
    showToast(`Timer set: ${customInputMinutes}m ${customInputSeconds}s`, 'info');
  };

  const resetTimer = () => {
    setTimerActive(false);
    if (timerMode === 'pomodoro') {
      setTimerMinutes(25);
      setTimerSeconds(0);
    } else {
      setTimerMinutes(customInputMinutes);
      setTimerSeconds(customInputSeconds);
    }
  };

  // Milestone Roadmap
  const [milestones, setMilestones] = useState<Milestone[]>(() => {
    const saved = localStorage.getItem('sq-milestones');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('sq-milestones', JSON.stringify(milestones));
  }, [milestones]);

  const [newMilestoneLabel, setNewMilestoneLabel] = useState('');
  const [newMilestoneDeadline, setNewMilestoneDeadline] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date.toISOString().split('T')[0];
  });

  const addMilestone = () => {
    const label = newMilestoneLabel.trim();
    if (!label) return;

    const newMs: Milestone = {
      id: `ms-${Date.now()}`,
      label,
      completed: false,
      dueDate: newMilestoneDeadline
    };

    setMilestones(prev => [newMs, ...prev]);
    setNewMilestoneLabel('');
    showToast(`Milestone added: "${label}"`, 'success');
    playAudioChime(700, 'sine');
  };

  const toggleMilestoneComplete = (id: string) => {
    setMilestones(prev => prev.map(m => {
      if (m.id === id) {
        const completed = !m.completed;
        if (completed) {
          playAudioChime(950, 'sine');
          setTimeout(() => playAudioChime(1300, 'triangle'), 100);
          showToast(`Completed: "${m.label}" 🎉`, 'milestone');
        }
        return {
          ...m,
          completed,
          completedDate: completed ? new Date().toISOString().split('T')[0] : undefined
        };
      }
      return m;
    }));
  };

  const removeMilestone = (id: string) => {
    setMilestones(prev => prev.filter(m => m.id !== id));
    showToast("Milestone removed", "info");
  };

  return (
    <div className="h-screen flex flex-col bg-[#fdfdfd] text-slate-800 dark:bg-[#121214] dark:text-gray-200 transition-colors duration-200 font-sans antialiased overflow-hidden">
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3 sm:p-4 rounded-2xl shadow-xl flex items-start gap-3 border transition-all duration-300 transform translate-x-0 animate-in fade-in slide-in-from-top-4 text-sm sm:text-base ${
              toast.type === 'milestone'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                : toast.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                : 'bg-cyan-50/80 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-800 text-cyan-900 dark:text-cyan-200'
            }`}
          >
            <div className="mt-0.5">
              {toast.type === 'milestone' ? (
                <MilestoneIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              ) : toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              ) : (
                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600 dark:text-sky-400 flex-shrink-0" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">
                {toast.type === 'milestone' ? 'Done' : toast.type === 'success' ? 'Success' : 'Alert'}
              </span>
              <p className="text-xs font-semibold leading-normal break-words">{toast.message}</p>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-gray-400 hover:text-slate-700 dark:hover:text-white flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="border-b border-gray-200 dark:border-neutral-800 bg-[#fdfdfd] dark:bg-[#1a1a1f] px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4 shrink-0 select-none z-20 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#eadce4] dark:bg-purple-950/40 flex items-center justify-center text-purple-950 dark:text-purple-300 flex-shrink-0">
            <BrainCircuit className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h1 className="font-cinzel text-base sm:text-xl tracking-[0.10em] sm:tracking-[0.15em] font-extrabold text-slate-900 dark:text-white truncate">
              STUDYQUERIES
            </h1>
            <p className="text-[8px] sm:text-[9px] tracking-widest text-slate-400 dark:text-slate-500 font-extrabold uppercase hidden sm:block">
              RESEARCH HUB
            </p>
          </div>
        </div>

        {/* Nav Tabs - responsive */}
        <nav className="hidden sm:flex items-center bg-gray-100 dark:bg-[#121214] p-1 rounded-2xl border border-gray-200/50 dark:border-neutral-800/80 gap-1">
          <button
            onClick={() => setActivePage('dashboard')}
            className={`flex items-center gap-2 px-3 sm:px-5 py-1.5 sm:py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              activePage === 'dashboard'
                ? 'bg-white dark:bg-[#1a1a1f] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActivePage('workspace')}
            className={`flex items-center gap-2 px-3 sm:px-5 py-1.5 sm:py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              activePage === 'workspace'
                ? 'bg-white dark:bg-[#1a1a1f] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <SearchCode className="w-4 h-4" />
            <span className="hidden md:inline">Workspace</span>
          </button>
          <button
            onClick={() => setActivePage('roadmap')}
            className={`flex items-center gap-2 px-3 sm:px-5 py-1.5 sm:py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              activePage === 'roadmap'
                ? 'bg-white dark:bg-[#1a1a1f] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <MilestoneIcon className="w-4 h-4" />
            <span className="hidden md:inline">Roadmap</span>
          </button>
        </nav>

        {/* Mobile nav tabs */}
        <div className="flex sm:hidden gap-1">
          <button
            onClick={() => setActivePage('dashboard')}
            className={`p-2 rounded-lg transition-all ${
              activePage === 'dashboard'
                ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300'
                : 'text-gray-400 hover:text-slate-700 dark:hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActivePage('workspace')}
            className={`p-2 rounded-lg transition-all ${
              activePage === 'workspace'
                ? 'bg-cyan-100 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-300'
                : 'text-gray-400 hover:text-slate-700 dark:hover:text-white'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActivePage('roadmap')}
            className={`p-2 rounded-lg transition-all ${
              activePage === 'roadmap'
                ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300'
                : 'text-gray-400 hover:text-slate-700 dark:hover:text-white'
            }`}
          >
            <MilestoneIcon className="w-4 h-4" />
          </button>
        </div>

        {/* API Key and Theme */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <input
            type="password"
            placeholder="API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="hidden sm:block w-32 lg:w-44 pl-3 pr-8 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 focus:outline-none focus:ring-1 focus:ring-purple-400 text-slate-800 dark:text-gray-100 placeholder:text-gray-400"
          />
          <div className={`hidden sm:block w-2 h-2 rounded-full flex-shrink-0 ${isLiveAPI ? 'bg-emerald-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
          
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg border border-gray-200 dark:border-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 dark:text-gray-400 transition-colors flex-shrink-0"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">

        {/* DASHBOARD */}
        {activePage === 'dashboard' && (
          <div className="h-full flex flex-col lg:flex-row animate-in fade-in duration-200">
            {/* Sidebar */}
            <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-neutral-800 p-3 sm:p-6 flex flex-col gap-4 sm:gap-6 shrink-0 bg-white/40 dark:bg-[#1a1a1f]/30 overflow-y-auto">
              
              {/* Upload */}
              <div>
                <h3 className="font-cinzel text-xs tracking-wider text-slate-400 dark:text-gray-500 mb-2 sm:mb-3 font-extrabold uppercase">
                  Upload Files
                </h3>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 sm:p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group ${
                    dragOver
                      ? 'border-purple-400 bg-purple-50/20 dark:bg-purple-950/10'
                      : 'border-gray-200 dark:border-neutral-800 hover:border-purple-300'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    className="hidden"
                    accept=".pdf,.txt"
                  />
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#eadce4] dark:bg-purple-950/30 flex items-center justify-center text-purple-900 dark:text-purple-300 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-gray-300">Upload documents</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500">PDF, TXT</p>
                </div>
              </div>

              {/* Documents */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="font-cinzel text-xs tracking-wider text-slate-400 dark:text-gray-500 font-extrabold uppercase">
                    Context
                  </h3>
                  <span className="text-[8px] sm:text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#badbe5] text-[#1a1a1f] dark:bg-cyan-950 dark:text-cyan-300">
                    {activeWorkspace.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {activeWorkspace.length === 0 ? (
                    <div className="h-40 border border-dashed border-gray-100 dark:border-neutral-800/80 rounded-2xl flex flex-col items-center justify-center text-center p-4">
                      <FileText className="w-8 h-8 text-gray-300 dark:text-neutral-700 mb-2" />
                      <p className="text-xs font-bold text-gray-400">No documents</p>
                      <p className="text-[9px] text-gray-500 mt-1">Upload or search to add</p>
                    </div>
                  ) : (
                    activeWorkspace.map(doc => (
                      <div
                        key={doc.id}
                        onClick={() => setActiveDocument(doc)}
                        className={`group p-3 rounded-xl border transition-all flex items-start gap-2 sm:gap-3 cursor-pointer ${
                          activeDocument?.id === doc.id
                            ? 'border-purple-300 bg-purple-50/30 dark:bg-purple-950/20'
                            : 'border-gray-100 dark:border-neutral-800 bg-white dark:bg-[#1a1a1f] hover:border-purple-200'
                        }`}
                      >
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-gray-200 truncate" title={doc.title}>
                            {doc.title}
                          </p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                            {doc.authors}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFromWorkspace(doc.id); }}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-all p-1 rounded-md flex-shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </aside>

            {/* Viewer */}
            <section className="flex-1 p-3 sm:p-6 flex flex-col gap-3 sm:gap-4 overflow-hidden bg-gray-50/50 dark:bg-black/10">
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <h2 className="font-cinzel text-base sm:text-lg tracking-widest font-extrabold text-slate-900 dark:text-white">
                    DOCUMENT VIEWER
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Extracted content</p>
                </div>
              </div>

              {!activeDocument ? (
                <div className="flex-1 border border-dashed border-gray-200 dark:border-neutral-800 rounded-3xl flex flex-col items-center justify-center p-6 sm:p-8 text-center bg-white/20">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#fddcc5] dark:bg-amber-950/20 flex items-center justify-center text-amber-700 dark:text-amber-400 mb-4">
                    <Layers className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-gray-200">No document selected</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mt-1">
                    Upload files or search to load documents.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col border border-gray-200 dark:border-neutral-800 rounded-3xl bg-white dark:bg-[#1a1a1f] overflow-hidden">
                  
                  {/* Toolbar */}
                  <div className="p-3 sm:p-4 bg-gray-50/60 dark:bg-neutral-900/60 border-b border-gray-100 dark:border-neutral-800/80 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#badbe5]/40 dark:bg-cyan-950/40 flex items-center justify-center text-cyan-900 dark:text-cyan-300 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-cinzel text-xs font-bold text-slate-900 dark:text-white truncate">
                          {activeDocument.title}
                        </h4>
                        <p className="text-[9px] text-slate-400 truncate">{activeDocument.authors}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {activeDocument.url && activeDocument.url !== '#' && (
                        <a
                          href={activeDocument.pdfUrl || activeDocument.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[9px] sm:text-[10px] font-bold hover:opacity-95 transition-all whitespace-nowrap"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="hidden sm:inline">View PDF</span>
                        </a>
                      )}
                      <span className="text-[9px] font-bold px-2 py-1 rounded bg-[#eadce4] text-purple-950 dark:bg-purple-950/40 dark:text-purple-300">
                        {activeDocument.size}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
                    <div>
                      <h5 className="text-[9px] sm:text-[10px] font-extrabold tracking-widest text-purple-600 dark:text-purple-400 uppercase mb-2">
                        Summary
                      </h5>
                      <div className="p-3 sm:p-4 rounded-2xl bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800">
                        <p className="text-xs font-semibold leading-relaxed text-slate-700 dark:text-gray-300 whitespace-pre-wrap">
                          {activeDocument.abstract}
                        </p>
                      </div>
                    </div>

                    {activeDocument.fullText && (
                      <div>
                        <h5 className="text-[9px] sm:text-[10px] font-extrabold tracking-widest text-cyan-600 dark:text-cyan-400 uppercase mb-2">
                          Full Content
                        </h5>
                        <p className="text-xs leading-relaxed text-slate-600 dark:text-gray-400 whitespace-pre-wrap line-clamp-[20]">
                          {activeDocument.fullText}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* WORKSPACE */}
        {activePage === 'workspace' && (
          <div className="h-full flex flex-col lg:flex-row animate-in fade-in duration-200">
            
            {/* Left Panel */}
            <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-neutral-800 p-3 sm:p-6 flex flex-col gap-4 sm:gap-6 shrink-0 bg-white/40 dark:bg-[#1a1a1f]/30 overflow-y-auto">
              
              {/* Search */}
              <div className="relative" ref={historyRef}>
                <h3 className="font-cinzel text-xs tracking-wider text-slate-400 dark:text-gray-500 mb-2 sm:mb-3 font-extrabold uppercase">
                  Research Online
                </h3>
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Search papers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setShowHistoryDropdown(true)}
                      onKeyDown={(e) => e.key === 'Enter' && performSearch(searchQuery)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-neutral-800 focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                  </div>

                  {showHistoryDropdown && searchHistory.length > 0 && (
                    <div className="absolute top-[70px] left-0 right-0 bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-xl z-30 p-2 overflow-hidden animate-in fade-in max-h-48 overflow-y-auto">
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 dark:border-neutral-800/80 mb-1">
                        <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">Recent</span>
                        <button
                          onClick={clearAllHistory}
                          className="text-[9px] font-bold text-red-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                      {searchHistory.map((hist, i) => (
                        <div
                          key={i}
                          onClick={() => performSearch(hist)}
                          className="flex items-center justify-between px-3 py-2 text-xs rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer text-slate-700 dark:text-gray-300"
                        >
                          <span className="truncate">{hist}</span>
                          <button
                            onClick={(e) => removeHistoryItem(e, hist)}
                            className="text-gray-400 hover:text-red-500 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => performSearch(searchQuery)}
                    className="w-full mt-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold py-2 rounded-xl text-xs hover:opacity-90 transition-all cursor-pointer"
                  >
                    Search
                  </button>
                </div>
              </div>

              {/* Results */}
              <div className="flex-1 flex flex-col min-h-0">
                <h3 className="font-cinzel text-xs tracking-wider text-slate-400 dark:text-gray-500 mb-3 font-extrabold uppercase">
                  Results
                </h3>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {isSearching ? (
                    <div className="h-40 flex flex-col items-center justify-center text-center">
                      <RefreshCw className="w-6 h-6 text-purple-600 animate-spin mb-2" />
                      <p className="text-xs text-slate-400 font-bold">Searching...</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="h-40 border border-dashed border-gray-100 dark:border-neutral-800/80 rounded-2xl flex flex-col items-center justify-center text-center p-4">
                      <Database className="w-8 h-8 text-gray-300 dark:text-neutral-700 mb-2" />
                      <p className="text-xs font-bold text-gray-400">No results yet</p>
                      <p className="text-[9px] text-slate-500 mt-1">Search to discover papers</p>
                    </div>
                  ) : (
                    searchResults.map(result => (
                      <div
                        key={result.id}
                        className="p-3 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1f] flex flex-col gap-2 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[8px] font-extrabold px-2 py-0.5 rounded bg-[#badbe5] text-[#1a1a1f] dark:bg-cyan-950 dark:text-cyan-300 uppercase shrink-0">
                            Paper
                          </span>
                          <span className="text-[9px] text-slate-400 shrink-0">{result.date}</span>
                        </div>
                        <div>
                          <h4 className="font-cinzel text-xs tracking-wide font-bold text-slate-900 dark:text-white leading-normal">
                            {result.title}
                          </h4>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 line-clamp-2">
                            {result.authors}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-gray-100 dark:border-neutral-800/80 flex items-center justify-between gap-2 flex-wrap">
                          {activeWorkspace.some(d => d.id === result.id) ? (
                            <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Added
                            </span>
                          ) : (
                            <button
                              onClick={() => injectIntoWorkspace(result)}
                              className="flex items-center gap-1 text-[9px] font-bold text-purple-700 dark:text-purple-400 hover:underline cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              Add
                            </button>
                          )}
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] text-slate-400 hover:text-slate-700 dark:hover:text-white inline-flex items-center gap-1"
                          >
                            <span className="hidden sm:inline">Link</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Chat */}
            <section className="flex-1 flex flex-col min-w-0 bg-[#fdfdfd] dark:bg-[#1a1a1f]/20">
              
              {/* Header */}
              <div className="p-3 sm:p-5 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between flex-wrap gap-2 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#badbe5] dark:bg-cyan-950 flex items-center justify-center text-cyan-950 dark:text-cyan-300 shrink-0">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-cinzel text-xs sm:text-sm tracking-wider font-extrabold text-slate-900 dark:text-white truncate">
                      AI ASSISTANT
                    </h3>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 hidden sm:block">
                      Powered by Gemini
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  <label className="inline-flex items-center gap-1 cursor-pointer select-none text-[9px] sm:text-[10px]">
                    <span className="font-bold text-slate-500 uppercase hidden sm:inline">RT Search</span>
                    <input
                      type="checkbox"
                      checked={useWebSearch}
                      onChange={(e) => setUseWebSearch(e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-400"
                    />
                  </label>

                  <button
                    onClick={clearChat}
                    className="p-2 rounded-lg border border-gray-200 dark:border-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                    title="Clear chat"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-5">
                {chatMessages.length === 1 && (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-10">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#eadce4] dark:bg-purple-950/20 flex items-center justify-center text-purple-800 dark:text-purple-400 mb-4">
                      <BrainCircuit className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-gray-200">AI Research Assistant</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      Ask questions about your documents or search academic topics.
                    </p>
                  </div>
                )}

                {chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role !== 'user' && (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#badbe5] dark:bg-cyan-950 flex items-center justify-center text-cyan-900 dark:text-cyan-300 shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    )}
                    
                    <div
                      className={`max-w-xs sm:max-w-md rounded-2xl p-3 sm:p-4 text-xs leading-relaxed flex flex-col gap-2 ${
                        msg.role === 'user'
                          ? 'bg-[#eadce4] dark:bg-purple-950 text-purple-950 dark:text-purple-100 rounded-tr-none'
                          : 'bg-gray-50 dark:bg-neutral-900 text-slate-800 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-neutral-800/80 shadow-sm'
                      }`}
                    >
                      {renderMessageContent(msg.text)}
                    </div>
                  </div>
                ))}

                {isBotThinking && (
                  <div className="flex gap-3 justify-start items-center">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#badbe5]/40 dark:bg-cyan-950/40 flex items-center justify-center text-cyan-900 dark:text-cyan-300 animate-spin">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-[9px] text-slate-400 tracking-wider font-bold uppercase animate-pulse">
                      Thinking...
                    </p>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-neutral-800 bg-[#fdfdfd] dark:bg-[#1a1a1f] z-10">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Ask a question..."
                    value={userMessage}
                    onChange={(e) => setUserMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                    className="flex-1 px-3 sm:px-4 py-2 text-xs rounded-xl bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 focus:outline-none focus:ring-1 focus:ring-purple-400"
                  />
                  <button
                    onClick={sendChatMessage}
                    className="p-2 sm:p-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-all cursor-pointer flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ROADMAP */}
        {activePage === 'roadmap' && (
          <div className="h-full flex flex-col lg:flex-row overflow-hidden animate-in fade-in duration-200">
            
            {/* Hierarchy Map */}
            <div className="flex-1 p-3 sm:p-6 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-neutral-800 flex flex-col gap-3 sm:gap-4 min-w-0">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="font-cinzel text-base sm:text-lg tracking-widest font-extrabold text-slate-900 dark:text-white">
                    HIERARCHY MAP
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Drag to organize. Build your structure.</p>
                </div>
                <span className="text-[8px] sm:text-[9px] font-bold px-2 py-1 rounded bg-[#eadce4] text-purple-950 dark:bg-purple-950/40">
                  {hierarchyItems.length} ITEMS
                </span>
              </div>

              {/* Canvas */}
              <div
                ref={hierarchyContainerRef}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="flex-1 relative border border-gray-200 dark:border-neutral-800 rounded-3xl bg-white dark:bg-[#1a1a1f]/30 overflow-hidden min-h-[300px] sm:min-h-[350px] select-none"
              >
                {/* Connection Lines SVG */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  {hierarchyItems.map(item => 
                    item.parents.map(parentId => {
                      const parent = hierarchyItems.find(n => n.id === parentId);
                      if (!parent) return null;
                      return (
                        <g key={`${item.id}-${parentId}`}>
                          {/* Main line */}
                          <line
                            x1={parent.x}
                            y1={parent.y}
                            x2={item.x}
                            y2={item.y}
                            stroke="#badbe5"
                            strokeWidth="2"
                            className="dark:stroke-cyan-900/60"
                          />
                          {/* Dashed accent */}
                          <line
                            x1={parent.x}
                            y1={parent.y}
                            x2={item.x}
                            y2={item.y}
                            stroke="#eadce4"
                            strokeWidth="1"
                            strokeDasharray="4,4"
                            className="dark:stroke-purple-900/40"
                          />
                          {/* Arrow circle */}
                          <circle
                            cx={(parent.x + item.x) / 2}
                            cy={(parent.y + item.y) / 2}
                            r="2.5"
                            fill="#badbe5"
                            className="dark:fill-cyan-900"
                          />
                        </g>
                      );
                    })
                  )}
                </svg>

                {/* Main Topic Center */}
                <div
                  style={{ left: '50%', top: '45%' }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 p-2.5 sm:p-3.5 rounded-2xl bg-[#fddcc5] border border-amber-300 text-center shadow-lg w-36 sm:w-44 z-10"
                >
                  <span className="text-[7px] sm:text-[8px] font-extrabold tracking-widest text-amber-900 uppercase">Main Topic</span>
                  <input
                    type="text"
                    value={mainTopic}
                    onChange={(e) => setMainTopic(e.target.value)}
                    className="w-full bg-transparent text-center text-xs sm:text-sm font-extrabold font-cinzel text-amber-950 focus:outline-none"
                  />
                </div>

                {/* Hierarchy Items */}
                {hierarchyItems.map(item => (
                  <div
                    key={item.id}
                    onPointerDown={(e) => handlePointerDown(item.id, e)}
                    style={{ left: `${item.x}px`, top: `${item.y}px` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-xl border shadow-md w-32 sm:w-40 cursor-grab active:cursor-grabbing z-10 transition-shadow hover:shadow-lg ${
                      selectedItem?.id === item.id
                        ? 'ring-2 ring-purple-400 border-purple-300'
                        : item.theme === 'lavender'
                        ? 'border-purple-200 dark:border-purple-900'
                        : item.theme === 'mist'
                        ? 'border-cyan-200 dark:border-cyan-900'
                        : 'border-amber-200 dark:border-amber-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1 pointer-events-none">
                      <span className={`text-[7px] sm:text-[8px] font-extrabold px-1 py-0.5 rounded uppercase tracking-wider ${
                        item.theme === 'lavender'
                          ? 'bg-[#eadce4] text-purple-950'
                          : item.theme === 'mist'
                          ? 'bg-[#badbe5] text-cyan-950'
                          : 'bg-[#fddcc5] text-amber-950'
                      }`}>
                        {item.id.substring(0, 8)}
                      </span>
                      {item.parents.length > 0 && (
                        <span className="text-[7px] font-bold text-slate-400">
                          {item.parents.length}P
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs sm:text-sm font-bold truncate text-slate-800 dark:text-gray-200 pointer-events-none flex-1">
                        {item.label}
                      </p>
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setSelectedItem(item)}
                        className="text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 p-0.5 rounded cursor-pointer flex-shrink-0"
                      >
                        <Settings className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Spawn Items */}
                <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 bg-white/95 dark:bg-[#1a1a1f]/95 border border-gray-100 dark:border-neutral-800 p-2.5 sm:p-3 rounded-2xl flex items-center justify-between gap-2 shadow-lg z-20 max-w-sm">
                  <input
                    type="text"
                    placeholder="New concept..."
                    value={newItemLabel}
                    onChange={(e) => setNewItemLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && spawnHierarchyItem()}
                    className="flex-1 bg-gray-50 dark:bg-[#121214] px-2 sm:px-3 py-1.5 text-xs rounded-lg focus:outline-none border border-gray-200 dark:border-neutral-800"
                  />
                  <button
                    onClick={spawnHierarchyItem}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-all cursor-pointer flex-shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Item Editor */}
              {selectedItem && (
                <div className="p-3 sm:p-4 border border-gray-200 dark:border-neutral-800 rounded-2xl bg-gray-50 dark:bg-neutral-900 animate-in slide-in-from-bottom-2 duration-200 max-h-64 overflow-y-auto">
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <h3 className="text-xs font-bold uppercase text-slate-500 truncate">
                      Edit: {selectedItem.id}
                    </h3>
                    <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-700 flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Label</label>
                      <input
                        type="text"
                        value={selectedItem.label}
                        onChange={(e) => setHierarchyItems(prev => prev.map(n => n.id === selectedItem.id ? { ...n, label: e.target.value } : n))}
                        className="w-full bg-white dark:bg-[#121214] px-2 sm:px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-neutral-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Parent Items</label>
                      <div className="space-y-1.5 bg-white dark:bg-[#121214] border border-gray-200 dark:border-neutral-800 rounded-lg p-2 max-h-32 overflow-y-auto">
                        {hierarchyItems
                          .filter(n => n.id !== selectedItem.id)
                          .map(potentialParent => {
                            const isChecked = selectedItem.parents.includes(potentialParent.id);
                            return (
                              <label key={potentialParent.id} className="flex items-center gap-2 text-[10px] font-semibold cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    toggleParentConnection(selectedItem.id, potentialParent.id);
                                    setSelectedItem(curr => curr ? {
                                      ...curr,
                                      parents: isChecked 
                                        ? curr.parents.filter(p => p !== potentialParent.id)
                                        : [...curr.parents, potentialParent.id]
                                    } : null);
                                  }}
                                  className="rounded border-gray-300 text-purple-600"
                                />
                                <span className="truncate">{potentialParent.label}</span>
                              </label>
                            );
                          })}
                      </div>
                    </div>

                    <button
                      onClick={() => removeHierarchyItem(selectedItem.id)}
                      className="w-full py-1.5 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 text-xs font-bold hover:opacity-90"
                    >
                      Delete Item
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Timer & Milestones */}
            <div className="w-full lg:w-72 xl:w-80 p-3 sm:p-6 shrink-0 flex flex-col gap-4 sm:gap-6 overflow-y-auto bg-white/40 dark:bg-[#1a1a1f]/30">
              
              {/* Timer */}
              <div className="p-3 sm:p-5 border border-gray-200 dark:border-neutral-800 rounded-3xl bg-white dark:bg-[#1a1a1f] shadow-sm">
                <h3 className="font-cinzel text-xs tracking-wider text-slate-400 dark:text-gray-500 mb-2 sm:mb-3 font-extrabold text-center uppercase">
                  Focus Timer
                </h3>
                
                <div className="flex items-center gap-1 justify-center mb-3 flex-wrap">
                  <button
                    onClick={() => setTimerPreset('pomodoro')}
                    className={`text-[10px] px-2.5 sm:px-3 py-1 rounded-lg font-bold border transition-all ${
                      timerMode === 'pomodoro'
                        ? 'bg-[#eadce4] text-purple-950 border-purple-200'
                        : 'bg-gray-50 dark:bg-neutral-900 text-slate-500 border-transparent'
                    }`}
                  >
                    Pomodoro
                  </button>
                  <button
                    onClick={() => setTimerPreset('custom')}
                    className={`text-[10px] px-2.5 sm:px-3 py-1 rounded-lg font-bold border transition-all ${
                      timerMode === 'custom'
                        ? 'bg-[#badbe5] text-cyan-950 border-cyan-200'
                        : 'bg-gray-50 dark:bg-neutral-900 text-slate-500 border-transparent'
                    }`}
                  >
                    Custom
                  </button>
                </div>

                <div className="flex flex-col items-center justify-center py-3 sm:py-4">
                  <div className="relative w-28 sm:w-36 h-28 sm:h-36 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full rotate-[-90deg]">
                      <circle cx="50%" cy="50%" r="45%" stroke="#e5e7eb" strokeWidth="5" fill="transparent" className="dark:stroke-neutral-800" />
                      <circle
                        cx="50%"
                        cy="50%"
                        r="45%"
                        stroke={timerMode === 'pomodoro' ? '#eadce4' : '#badbe5'}
                        strokeWidth="5"
                        fill="transparent"
                        strokeDasharray="402"
                        strokeDashoffset={timerDashoffset}
                        className="transition-all duration-300"
                      />
                    </svg>
                    <div className="text-center z-10">
                      <span className="font-cinzel text-xl sm:text-2xl tracking-widest font-extrabold text-slate-800 dark:text-white">
                        {String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}
                      </span>
                      <p className="text-[8px] uppercase tracking-widest text-slate-400 mt-0.5">
                        {timerMode === 'pomodoro' ? '25m' : 'Custom'}
                      </p>
                    </div>
                  </div>
                </div>

                {timerMode === 'custom' && (
                  <div className="p-2.5 bg-gray-50 dark:bg-neutral-900 border border-gray-150 dark:border-neutral-800/80 rounded-lg mb-3 space-y-1.5 text-xs">
                    <div className="flex gap-1.5">
                      <div className="flex-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">Min</label>
                        <input
                          type="number"
                          min={1}
                          value={customInputMinutes}
                          onChange={(e) => setCustomInputMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-white dark:bg-[#121214] border border-gray-200 dark:border-neutral-800 text-xs px-2 py-1 rounded focus:outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">Sec</label>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={customInputSeconds}
                          onChange={(e) => setCustomInputSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                          className="w-full bg-white dark:bg-[#121214] border border-gray-200 dark:border-neutral-800 text-xs px-2 py-1 rounded focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={applyCustomTimerConfig}
                        className="self-end px-2 py-1 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[9px] font-bold"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 justify-center">
                  <button
                    onClick={() => setTimerActive(!timerActive)}
                    className="px-4 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 hover:opacity-90 flex-shrink-0"
                  >
                    {timerActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span className="hidden sm:inline">{timerActive ? 'Pause' : 'Start'}</span>
                  </button>
                  <button
                    onClick={resetTimer}
                    className="p-1.5 rounded-lg border border-gray-200 dark:border-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-800 flex-shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Milestones */}
              <div className="flex-1 flex flex-col min-h-[200px]">
                <h3 className="font-cinzel text-xs tracking-wider text-slate-400 dark:text-gray-500 mb-3 font-extrabold uppercase">
                  Milestones
                </h3>
                
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3">
                  {milestones.length === 0 ? (
                    <div className="h-28 border border-dashed border-gray-150 dark:border-neutral-800/80 rounded-lg flex flex-col items-center justify-center text-center p-3 bg-white/20">
                      <MilestoneIcon className="w-5 h-5 text-gray-300 dark:text-neutral-700 mb-1" />
                      <p className="text-[9px] text-slate-400">No milestones yet</p>
                    </div>
                  ) : (
                    milestones.map(ms => (
                      <div
                        key={ms.id}
                        className={`p-2.5 rounded-xl border transition-all flex items-start gap-2 bg-white dark:bg-[#1a1a1f] ${
                          ms.completed
                            ? 'border-emerald-100 dark:border-emerald-900/60 opacity-85'
                            : 'border-gray-100 dark:border-neutral-800'
                        }`}
                      >
                        <button
                          onClick={() => toggleMilestoneComplete(ms.id)}
                          className="mt-0.5 rounded border border-gray-300 dark:border-neutral-700 flex items-center justify-center w-4 h-4 cursor-pointer text-emerald-500 flex-shrink-0"
                        >
                          {ms.completed && <Check className="w-3 h-3" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-[10px] font-bold leading-tight ${
                              ms.completed
                                ? 'line-through text-slate-400'
                                : 'text-slate-800 dark:text-gray-200'
                            }`}
                          >
                            {ms.label}
                          </p>
                          <div className="flex items-center gap-1 mt-1 text-[8px] text-slate-400">
                            <Calendar className="w-2.5 h-2.5" />
                            <span>{ms.dueDate}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeMilestone(ms.id)}
                          className="text-slate-300 hover:text-red-500 dark:hover:text-red-400 p-0.5 flex-shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Milestone */}
                <div className="bg-white dark:bg-[#1a1a1f] border border-gray-100 dark:border-neutral-800 p-2.5 rounded-lg space-y-2 text-xs">
                  <input
                    type="text"
                    placeholder="Task..."
                    value={newMilestoneLabel}
                    onChange={(e) => setNewMilestoneLabel(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-[#121214] px-2 py-1.5 rounded focus:outline-none border border-gray-200 dark:border-neutral-800"
                  />
                  <input
                    type="date"
                    value={newMilestoneDeadline}
                    onChange={(e) => setNewMilestoneDeadline(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-[#121214] px-2 py-1 rounded focus:outline-none border border-gray-200 dark:border-neutral-800 text-xs"
                  />
                  <button
                    onClick={addMilestone}
                    className="w-full py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold hover:opacity-90 text-xs"
                  >
                    Add Milestone
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
