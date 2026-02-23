import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  Copy, 
  ChevronRight, 
  ChevronLeft, 
  Users, 
  LayoutGrid, 
  Save,
  RotateCcw,
  Footprints,
  Settings,
  Star,
  Square,
  Circle,
  FolderOpen,
  FilePlus,
  X,
  CheckSquare,
  MousePointer2,
  Layers,
  Palette,
  Edit3,
  Check,
  Eye,
  History,
  FastForward,
  FileText,
  Calendar,
  GraduationCap,
  ClipboardList,
  LayoutTemplate,
  Printer,
  Music,
  Clock,
  Volume2,
  VolumeX,
  Link as LinkIcon,
  Link2Off,
  CircleDot,
  Flag
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  getDoc, 
  collection,
  query,
  orderBy,
  deleteDoc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "hitzero-v1";

// --- Types ---
type Group = {
  id: string;
  name: string;
  color: string;
};

type Athlete = {
  id: string;
  name: string;
  initial: string;
  groupId: string;
};

type Position = {
  x: number; 
  y: number; 
};

type Formation = {
  id: string;
  name: string;
  positions: Record<string, Position>; 
  notes: string;
  time: number; // Timestamp in seconds when this formation hits
};

type CountRow = {
  id: string;
  section: string;
  counts: [string, string, string, string, string, string, string, string];
};

type Plan = {
  id: string;
  title: string;
  date: string;
  content: string;
};

type RoutineData = {
  id?: string;
  roster: Athlete[];
  groups: Group[];
  formations: Formation[];
  countSheet: CountRow[];
  practicePlans: Plan[];
  classPlans: Plan[];
  title: string;
  lastModified?: any;
  athleteSkills?: Record<string, AthleteSkill[]>;
  rubricEntries?: RubricEntry[];
};

type AthleteShape = 'dot' | 'star' | 'square';

// Skill level for athlete skill tracker
type SkillLevel = 'none' | 'learning' | 'consistent' | 'elite';

type AthleteSkill = {
  skillId: string;
  level: SkillLevel;
  notes: string;
};

type SkillCategory = {
  id: string;
  name: string;
  skills: { id: string; name: string }[];
};

// Scoring rubric
type RubricScore = {
  categoryId: string;
  score: number; // 0–10
  notes: string;
};

type RubricEntry = {
  id: string;
  date: string;
  competition: string;
  scores: RubricScore[];
  totalScore: number;
};

type RoutineSummary = {
  id: string;
  title: string;
  lastModified: any;
};

type Tab = 'roster' | 'formations' | 'settings' | 'countsheet' | 'practice' | 'classes' | 'skills' | 'scoring';

// --- Constants ---
const PANEL_COUNT = 9; 
const ROW_COUNT = 7;   

const DEFAULT_GROUPS: Group[] = [
  { id: 'g1', name: 'Flyer', color: '#f43f5e' },
  { id: 'g2', name: 'Base', color: '#3b82f6' },
  { id: 'g3', name: 'Back', color: '#10b981' },
  { id: 'g4', name: 'Tumbler', color: '#f59e0b' }
];

const DEFAULT_SKILL_CATEGORIES: SkillCategory[] = [
  { id: 'tumbling', name: 'Tumbling', skills: [
    { id: 'bhs', name: 'Back Handspring' },
    { id: 'tuck', name: 'Back Tuck' },
    { id: 'layout', name: 'Layout' },
    { id: 'full', name: 'Full' },
    { id: 'double', name: 'Double Full' },
  ]},
  { id: 'stunting', name: 'Stunting', skills: [
    { id: 'lib', name: 'Liberty' },
    { id: 'heli', name: 'Helicopter' },
    { id: 'arabesque', name: 'Arabesque' },
    { id: 'scorpion', name: 'Scorpion' },
    { id: 'bow_arrow', name: 'Bow & Arrow' },
  ]},
  { id: 'jumps', name: 'Jumps', skills: [
    { id: 'toe_touch', name: 'Toe Touch' },
    { id: 'hurdler', name: 'Hurdler' },
    { id: 'pike', name: 'Pike' },
    { id: 'herkie', name: 'Herkie' },
  ]},
  { id: 'pyramids', name: 'Pyramids', skills: [
    { id: 'toss_hitch', name: 'Toss to Hitch' },
    { id: 'toss_ext', name: 'Toss to Extension' },
    { id: 'release', name: 'Release Move' },
  ]},
];

const DEFAULT_RUBRIC_CATEGORIES = [
  { id: 'stunts', name: 'Stunts & Pyramids', maxScore: 10 },
  { id: 'tumbling_rb', name: 'Tumbling', maxScore: 10 },
  { id: 'jumps_rb', name: 'Jumps', maxScore: 10 },
  { id: 'motion', name: 'Motion Technique', maxScore: 10 },
  { id: 'performance', name: 'Performance', maxScore: 10 },
  { id: 'choreography', name: 'Choreography', maxScore: 10 },
  { id: 'difficulty', name: 'Difficulty', maxScore: 10 },
  { id: 'execution', name: 'Execution', maxScore: 10 },
];

const PRACTICE_TEMPLATE = `PRACTICE PLAN
Time: 

1. WARM UP (15 min)
   - Dynamic Stretching
   - Cardio

2. TUMBLING (20 min)
   - Standing: 
   - Running: 

3. STUNTS (30 min)
   - Skills to hit:
   - Drills:

4. PYRAMIDS (20 min)
   - Section A:
   - Section B:

5. ROUTINE (30 min)
   - Mark throughs:
   - Full outs: 

6. CONDITIONING (5 min)
`;

const CLASS_TEMPLATE = `CLASS PLAN
Level: 
Focus: 

1. WARM UP (10 min)
   - Lines
   - Shapes

2. DRILLS (15 min)
   - Station 1:
   - Station 2:
   - Station 3:

3. SPOTTING / SKILLS (25 min)
   - Athlete 1:
   - Athlete 2:
   - Athlete 3:

4. CONDITIONING (10 min)
   - Abs
   - Legs
`;

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);

const isLightColor = (hex: string) => {
  if (!hex) return false;
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return false;
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128;
};

// Format seconds to MM:SS
const formatTime = (time: number) => {
  if (!Number.isFinite(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// --- PDF Export Helper (Optimized for iOS) ---
const printContent = (title: string, htmlContent: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
      document.body.removeChild(iframe);
      return;
  }

  doc.open();
  doc.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; color: #1a1a1a; }
          h1 { font-size: 24px; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
          h2 { font-size: 18px; margin-top: 30px; margin-bottom: 10px; color: #444; }
          .meta { color: #666; font-size: 14px; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f9f9f9; font-weight: 600; }
          .formation-card { border: 1px solid #eee; border-radius: 8px; padding: 15px; margin-bottom: 20px; page-break-inside: avoid; display: flex; gap: 20px; flex-direction: row; }
          .formation-visual { width: 300px; height: 233px; border: 1px solid #ddd; background: #f5f5f5; position: relative; flex-shrink: 0; }
          .formation-info { flex: 1; }
          .athlete-dot { position: absolute; width: 12px; height: 12px; border-radius: 50%; transform: translate(-50%, -50%); border: 1px solid rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          pre { white-space: pre-wrap; font-family: inherit; line-height: 1.5; font-size: 14px; }
          @media print {
            body { padding: 0; }
            .formation-card { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${htmlContent}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
    }
    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 60000);
  }, 500);
};

const App = () => {
  // --- State ---
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Routine Management
  const [routinesList, setRoutinesList] = useState<RoutineSummary[]>([]);
  const [currentRoutineId, setCurrentRoutineId] = useState<string | null>(null);
  const [isRoutineMenuOpen, setIsRoutineMenuOpen] = useState(false);
  const currentRoutineIdRef = useRef<string | null>(null);

  // Routine Data
  const [routineTitle, setRoutineTitle] = useState("My Cheer Routine");
  const [roster, setRoster] = useState<Athlete[]>([]);
  const [groups, setGroups] = useState<Group[]>(DEFAULT_GROUPS);
  const [formations, setFormations] = useState<Formation[]>([
    { id: 'start', name: 'Opening', positions: {}, notes: '', time: 0 }
  ]);
  const [countSheet, setCountSheet] = useState<CountRow[]>([]);
  const [practicePlans, setPracticePlans] = useState<Plan[]>([]);
  const [classPlans, setClassPlans] = useState<Plan[]>([]);
  
  const [currentFormationIndex, setCurrentFormationIndex] = useState(0);
  
  // Audio State
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [followPlayhead, setFollowPlayhead] = useState(true); 
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Playback Control
  const [playbackMode, setPlaybackMode] = useState<'visual' | 'audio' | 'recording' | 'stopped'>('stopped');
  const [isRecording, setIsRecording] = useState(false);
  const isPlaying = playbackMode !== 'stopped';

  // Refs for Event Access
  const formationsRef = useRef(formations);
  const formationIndexRef = useRef(currentFormationIndex);
  const snapToGridRef = useRef(false);

  // Sync Refs
  useEffect(() => { formationsRef.current = formations; }, [formations]);
  useEffect(() => { formationIndexRef.current = currentFormationIndex; }, [currentFormationIndex]);
  
  // UI State
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [isEditingGroups, setIsEditingGroups] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(1); 
  const [showPaths, setShowPaths] = useState(true);
  const [showGhost, setShowGhost] = useState(false); 
  const [showFuture, setShowFuture] = useState(false); 
  const [sidebarTab, setSidebarTab] = useState<Tab>('roster');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null); 
  
  // Settings
  const [floorColor, setFloorColor] = useState('#334155'); 
  const [markerColor, setMarkerColor] = useState('#f43f5e'); 
  const [snapToGrid, setSnapToGrid] = useState(false);
  useEffect(() => { snapToGridRef.current = snapToGrid; }, [snapToGrid]);

  const [showHorizontalGrid, setShowHorizontalGrid] = useState(false);
  const [athleteShape, setAthleteShape] = useState<AthleteShape>('dot');

  // BPM / Tap Tempo State
  const [bpm, setBpm] = useState<number | null>(null);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [showBeatMarkers, setShowBeatMarkers] = useState(false);

  // Athlete Skills State
  const [athleteSkills, setAthleteSkills] = useState<Record<string, AthleteSkill[]>>({}); // keyed by athleteId
  const [skillCategories] = useState<SkillCategory[]>(DEFAULT_SKILL_CATEGORIES);
  const [selectedSkillAthleteId, setSelectedSkillAthleteId] = useState<string | null>(null);

  // Scoring Rubric State
  const [rubricEntries, setRubricEntries] = useState<RubricEntry[]>([]);
  const [selectedRubricId, setSelectedRubricId] = useState<string | null>(null);
  
  // Selection Context Settings
  const [showContextPrev, setShowContextPrev] = useState(true);
  const [showContextNext, setShowContextNext] = useState(true);
  
  // Dragging State Refs
  const dragData = useRef<{
    isDragging: boolean;
    leaderId: string | null;
    startPointer: { x: number, y: number };
    initialPositions: Record<string, Position>;
    currentPositions: Record<string, Position> | null;
    matRect: DOMRect | null;
  }>({ 
    isDragging: false, 
    leaderId: null, 
    startPointer: {x:0, y:0}, 
    initialPositions: {}, 
    currentPositions: null,
    matRect: null
  });
  
  const matRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync Ref
  useEffect(() => {
    currentRoutineIdRef.current = currentRoutineId;
  }, [currentRoutineId]);

  // --- Handlers defined EARLY to avoid ReferenceErrors ---
  const handleMatClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (dragData.current.isDragging) return;
    if (e.target === matRef.current) {
      setSelectedAthleteIds(new Set());
    }
  };

  // --- ACTIONS (Defined before Effects) ---

  const saveCurrentRoutine = async () => {
    if (!user || !currentRoutineId) return;
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'routines', currentRoutineId);
    await setDoc(docRef, { 
      title: routineTitle, 
      roster, 
      groups, 
      formations,
      countSheet,
      practicePlans,
      classPlans,
      athleteSkills,
      rubricEntries,
      lastModified: serverTimestamp() 
    }, { merge: true });
  };

  const createNewRoutine = async (userId = user?.uid, skipSave = false) => {
    if (!userId) return;
    if (!skipSave) await saveCurrentRoutine();
    const newId = generateId();
    const newRoutine: RoutineData = {
      title: "New Routine",
      roster: [],
      groups: DEFAULT_GROUPS,
      formations: [{ id: 'start', name: 'Opening', positions: {}, notes: '', time: 0 }],
      countSheet: [{id: 'c1', section: 'Opening', counts: ['','','','','','','','']}],
      practicePlans: [],
      classPlans: [],
      lastModified: serverTimestamp()
    };
    await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'routines', newId), newRoutine);
    setCurrentRoutineId(newId);
    setRoutineTitle("New Routine");
    setRoster([]);
    setGroups(DEFAULT_GROUPS);
    setFormations(newRoutine.formations);
    setCountSheet(newRoutine.countSheet);
    setPracticePlans([]);
    setClassPlans([]);
    setAthleteSkills({});
    setRubricEntries([]);
    setCurrentFormationIndex(0);
    setAudioSrc(null); 
    setIsRoutineMenuOpen(false);
  };

  const deleteRoutine = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || routinesList.length <= 1) return;
    if (confirm("Delete this routine?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'routines', id));
      if (currentRoutineId === id) {
        const next = routinesList.find(r => r.id !== id);
        if (next) setCurrentRoutineId(next.id);
      }
    }
  };

  const switchRoutine = async (id: string) => {
    if (id === currentRoutineId) { setIsRoutineMenuOpen(false); return; }
    await saveCurrentRoutine();
    setCurrentRoutineId(id);
    setCurrentFormationIndex(0);
    setIsRoutineMenuOpen(false);
    setPlaybackMode('stopped');
    setSelectedAthleteIds(new Set());
    setAudioSrc(null);
    setAthleteSkills({});
    setRubricEntries([]);
  };

  // --- AUDIO LOGIC ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioSrc(url);
      if (audioRef.current) {
        audioRef.current.load();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      
      // If simply playing back, follow the playhead if enabled
      if (playbackMode === 'audio' && followPlayhead && !isRecording) {
         let activeIndex = 0;
         for (let i = 0; i < formationsRef.current.length; i++) {
             if (time >= formationsRef.current[i].time) {
                 activeIndex = i;
             } else {
                 break;
             }
         }
         
         if (activeIndex !== formationIndexRef.current) {
             setCurrentFormationIndex(activeIndex);
         }
         
         // Interpolate position
         const currentFmt = formationsRef.current[activeIndex];
         const nextFmt = formationsRef.current[activeIndex + 1];
         
         if (nextFmt) {
            const duration = nextFmt.time - currentFmt.time;
            if (duration > 0) {
               const progress = Math.min(1, Math.max(0, (time - currentFmt.time) / duration));
               setAnimationProgress(progress);
            } else {
               setAnimationProgress(1);
            }
         } else {
             setAnimationProgress(1);
         }
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
        audioRef.current.currentTime = time;
    }
    
    // Auto-select formation at this timestamp if enabled
    if (followPlayhead) {
        let activeIndex = 0;
        for (let i = 0; i < formations.length; i++) {
            if (time >= formations[i].time) {
                activeIndex = i;
            } else {
                break;
            }
        }
        setCurrentFormationIndex(activeIndex);
        setAnimationProgress(1); 
    }
  };

  const syncFormationToCurrentTime = useCallback(() => {
    setFormations(prevFormations => {
        const updated = [...prevFormations];
        updated[currentFormationIndex].time = parseFloat(currentTime.toFixed(2));
        updated.sort((a, b) => a.time - b.time);
        return updated;
    });
    
    // Find new index needs to be done after state update or handled carefully
    const updatedForIndex = [...formations];
    updatedForIndex[currentFormationIndex].time = parseFloat(currentTime.toFixed(2));
    updatedForIndex.sort((a, b) => a.time - b.time);
    const newIndex = updatedForIndex.findIndex(f => f.id === formations[currentFormationIndex].id);
    setCurrentFormationIndex(newIndex);
  }, [currentTime, currentFormationIndex, formations]);

  const toggleRecording = useCallback(() => {
      if (isRecording) {
          setIsRecording(false);
          setPlaybackMode('stopped');
      } else {
          setIsRecording(true);
          setPlaybackMode('audio');
          if (audioRef.current) {
              if (currentTime < formations[currentFormationIndex].time) {
                  audioRef.current.currentTime = formations[currentFormationIndex].time;
              }
              audioRef.current.play();
          }
      }
  }, [isRecording, currentTime, formations, currentFormationIndex]);

  const handleNextFormationSync = useCallback(() => {
      if (!isRecording) return;
      
      const nextIndex = currentFormationIndex + 1;
      if (nextIndex < formations.length) {
          setFormations(prev => {
              const updated = [...prev];
              updated[nextIndex].time = parseFloat(currentTime.toFixed(2));
              return updated;
          });
          setCurrentFormationIndex(nextIndex);
      } else {
          setIsRecording(false);
          setPlaybackMode('stopped');
      }
  }, [isRecording, currentFormationIndex, formations.length, currentTime]);

  const togglePlayback = useCallback(() => {
    if (playbackMode === 'audio' || playbackMode === 'recording') {
        setPlaybackMode('stopped');
        setIsRecording(false);
    } else {
        setPlaybackMode('audio');
    }
  }, [playbackMode]);

  const triggerVisualPreview = useCallback(() => {
      if (playbackMode === 'audio') setPlaybackMode('stopped');
      setAnimationProgress(0);
      setPlaybackMode('visual');
  }, [playbackMode]);

  // --- POINTER LOGIC (Window-level) ---

  const handlePointerUp = useCallback(() => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);

    if (dragData.current.currentPositions && Object.keys(dragData.current.currentPositions).length > 0) {
      const idx = formationIndexRef.current;
      const oldFormations = formationsRef.current;
      
      const newFormations = [...oldFormations];
      newFormations[idx] = {
        ...newFormations[idx],
        positions: {
          ...newFormations[idx].positions,
          ...dragData.current.currentPositions
        }
      };
      
      setFormations(newFormations);
    }
    
    dragData.current.isDragging = false;
    dragData.current.currentPositions = null;
    dragData.current.leaderId = null;
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    e.preventDefault();
    const { startPointer, initialPositions, matRect, leaderId } = dragData.current;
    if (!matRect || !leaderId) return;

    const deltaX = e.clientX - startPointer.x;
    const deltaY = e.clientY - startPointer.y;

    const deltaPercentX = (deltaX / matRect.width) * 100;
    const deltaPercentY = (deltaY / matRect.height) * 100;

    let finalDeltaX = deltaPercentX;
    let finalDeltaY = deltaPercentY;

    if (snapToGridRef.current) {
        const leaderInit = initialPositions[leaderId];
        if (leaderInit) {
            const SNAP_X = 100 / (PANEL_COUNT * 2);
            const SNAP_Y = 100 / (ROW_COUNT * 2);
            
            const rawTargetX = leaderInit.x + deltaPercentX;
            const rawTargetY = leaderInit.y + deltaPercentY;
            
            const snappedX = Math.round(rawTargetX / SNAP_X) * SNAP_X;
            const snappedY = Math.round(rawTargetY / SNAP_Y) * SNAP_Y;
            
            finalDeltaX = snappedX - leaderInit.x;
            finalDeltaY = snappedY - leaderInit.y;
        }
    }

    const newPositions: Record<string, Position> = {};

    Object.keys(initialPositions).forEach(id => {
        const init = initialPositions[id];
        const newX = Math.max(0, Math.min(100, init.x + finalDeltaX));
        const newY = Math.max(0, Math.min(100, init.y + finalDeltaY));
        
        newPositions[id] = { x: newX, y: newY };

        const el = document.getElementById(`athlete-${id}`);
        if (el) {
            el.style.left = `${newX}%`;
            el.style.top = `${newY}%`;
            el.style.transition = 'none'; 
        }
    });

    dragData.current.currentPositions = newPositions;
  }, []); 

  const handlePointerDown = (athleteId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);

    let newSelection = new Set(selectedAthleteIds);
    if (isMultiSelectMode || e.shiftKey) {
        if (!newSelection.has(athleteId)) newSelection.add(athleteId);
    } else {
        if (!newSelection.has(athleteId)) newSelection = new Set([athleteId]);
    }
    setSelectedAthleteIds(newSelection);

    const currentFormation = formations[currentFormationIndex];
    const initialPositions: Record<string, Position> = {};
    newSelection.forEach(id => {
       if (currentFormation.positions[id]) {
         initialPositions[id] = { ...currentFormation.positions[id] };
       }
    });

    const matRect = matRef.current?.getBoundingClientRect() || null;

    dragData.current = {
        isDragging: true,
        leaderId: athleteId,
        startPointer: { x: e.clientX, y: e.clientY },
        initialPositions,
        currentPositions: null,
        matRect
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // --- Auth & Init ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const routinesRef = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'routines');
        const q = query(routinesRef, orderBy('lastModified', 'desc'));
        const unsubList = onSnapshot(q, (snapshot) => {
          const list: RoutineSummary[] = [];
          snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() } as RoutineSummary));
          setRoutinesList(list);
          if (!currentRoutineIdRef.current) {
             if (list.length > 0) setCurrentRoutineId(list[0].id);
             else createNewRoutine(currentUser.uid, true);
          }
        });
        return () => unsubList();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Load Routine ---
  useEffect(() => {
    if (!user || !currentRoutineId) return;
    
    const loadRoutine = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'routines', currentRoutineId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data() as RoutineData;
                setRoutineTitle(data.title || "My Cheer Routine");
                setRoster(data.roster || []);
                setGroups(data.groups && data.groups.length > 0 ? data.groups : DEFAULT_GROUPS);
                setFormations(data.formations && data.formations.length > 0 ? data.formations : [{ id: 'start', name: 'Opening', positions: {}, notes: '', time: 0 }]);
                setCountSheet(data.countSheet || [{id: generateId(), section: 'Opening', counts: ['','','','','','','','']}]);
                setPracticePlans(data.practicePlans || []);
                setClassPlans(data.classPlans || []);
                setAthleteSkills(data.athleteSkills || {});
                setRubricEntries(data.rubricEntries || []);
                
                // Note: We don't restore audioSrc here as it's a local file blob that can't be saved to DB easily in this setup
            }
        } catch (e) {
            console.error("Error loading routine", e);
        } finally {
            setLoading(false);
        }
    };

    loadRoutine();
  }, [user, currentRoutineId]);

  // --- Auto Save ---
  useEffect(() => {
    if (!user || loading || !currentRoutineId || dragData.current.isDragging) return;
    
    const saveData = async () => {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'routines', currentRoutineId);
      try {
        await setDoc(docRef, { 
          title: routineTitle, 
          roster, 
          groups, 
          formations, 
          countSheet,
          practicePlans,
          classPlans,
          athleteSkills,
          rubricEntries,
          lastModified: serverTimestamp() 
        }, { merge: true });
      } catch (e) { console.error("Error saving", e); }
    };
    const timer = setTimeout(saveData, 2000);
    return () => clearTimeout(timer);
  }, [routineTitle, roster, groups, formations, countSheet, practicePlans, classPlans, athleteSkills, rubricEntries, user, loading, currentRoutineId]);

  // --- Animation ---
  useEffect(() => {
    let animationFrameId: number;
    
    const loop = (timestamp: number) => {
      if (playbackMode === 'visual') {
          // Standard transition animation (1.5s)
          setAnimationProgress(prev => {
             const next = prev + 0.02; // ~1s transition at 60fps
             if (next >= 1) {
                setPlaybackMode('stopped');
                return 1;
             }
             return next;
          });
      } else if (playbackMode === 'audio' || playbackMode === 'recording') {
         // Audio driven, we mostly rely on onTimeUpdate but requestAnimationFrame keeps UI smooth
      }
      
      if (playbackMode !== 'stopped') {
         animationFrameId = requestAnimationFrame(loop);
      }
    };

    if (playbackMode === 'audio' || playbackMode === 'recording') {
      if (audioRef.current) audioRef.current.play();
    } else if (playbackMode === 'visual') {
      if (audioRef.current) audioRef.current.pause();
      animationFrameId = requestAnimationFrame(loop);
    } else {
       if (audioRef.current) audioRef.current.pause();
    }

    return () => { if (animationFrameId) cancelAnimationFrame(animationFrameId); };
  }, [playbackMode]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (isRecording && e.code === 'Space') {
              e.preventDefault(); 
              handleNextFormationSync();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, handleNextFormationSync]);

  // --- LOGIC: Roster / Formations / Groups ---
  const addFormation = () => {
    const previousFormation = formations[formations.length - 1];
    const newTime = previousFormation ? previousFormation.time + 10 : 0; // Default +10s
    const newFormation: Formation = {
      id: generateId(),
      name: `Formation ${formations.length + 1}`,
      positions: JSON.parse(JSON.stringify(previousFormation.positions)),
      notes: '',
      time: newTime
    };
    setFormations([...formations, newFormation]);
    setCurrentFormationIndex(formations.length);
  };

  const deleteFormation = (index: number) => {
    if (formations.length <= 1) return;
    const newFormations = formations.filter((_, i) => i !== index);
    setFormations(newFormations);
    if (currentFormationIndex >= index) setCurrentFormationIndex(Math.max(0, currentFormationIndex - 1));
  };

  const addGroup = () => {
    const newGroup: Group = { id: generateId(), name: `Group ${groups.length + 1}`, color: '#8b5cf6' };
    setGroups([...groups, newGroup]);
  };

  const updateGroup = (id: string, field: keyof Group, value: string) => {
    setGroups(groups.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const deleteGroup = (id: string) => {
    if (groups.length <= 1) return;
    setGroups(groups.filter(g => g.id !== id));
    const firstGroupId = groups.find(g => g.id !== id)?.id;
    if (firstGroupId) {
      setRoster(roster.map(a => a.groupId === id ? { ...a, groupId: firstGroupId } : a));
    }
  };

  const addAthlete = () => {
    const defaultGroupId = groups.length > 0 ? groups[0].id : 'default';
    
    const newAthlete: Athlete = {
      id: generateId(),
      name: `Athlete ${roster.length + 1}`,
      initial: String(roster.length + 1),
      groupId: defaultGroupId
    };
    setRoster([...roster, newAthlete]);
    const updatedFormations = formations.map(f => ({
      ...f,
      positions: { ...(f.positions || {}), [newAthlete.id]: { x: 50, y: 50 } }
    }));
    setFormations(updatedFormations);
    setSelectedAthleteIds(new Set([newAthlete.id]));
  };

  const removeAthlete = (id: string) => {
    setRoster(roster.filter(a => a.id !== id));
    setSelectedAthleteIds(prev => { const next = new Set(prev); next.delete(id); return next; });
  };

  const updateAthlete = (id: string, field: keyof Athlete, value: string) => {
    setRoster(roster.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  // --- LOGIC: Count Sheet ---
  const addCountRow = () => {
    const newRow: CountRow = { id: generateId(), section: '', counts: ['','','','','','','',''] };
    setCountSheet([...countSheet, newRow]);
  };

  const updateCountRow = (id: string, field: 'section' | 'counts', value: any, countIndex?: number) => {
    setCountSheet(countSheet.map(row => {
      if (row.id !== id) return row;
      if (field === 'section') return { ...row, section: value };
      if (field === 'counts' && typeof countIndex === 'number') {
        const newCounts = [...row.counts] as any;
        newCounts[countIndex] = value;
        return { ...row, counts: newCounts };
      }
      return row;
    }));
  };

  const deleteCountRow = (id: string) => {
    if (countSheet.length <= 1) return;
    setCountSheet(countSheet.filter(r => r.id !== id));
  };

  // --- LOGIC: Plans (Practice / Classes) ---
  const addPlan = (type: 'practice' | 'class') => {
    const newPlan: Plan = {
      id: generateId(),
      title: 'New Plan',
      date: new Date().toISOString().split('T')[0],
      content: ''
    };
    if (type === 'practice') {
      setPracticePlans([newPlan, ...practicePlans]);
    } else {
      setClassPlans([newPlan, ...classPlans]);
    }
    setSelectedPlanId(newPlan.id);
  };

  const updatePlan = (type: 'practice' | 'class', id: string, field: keyof Plan, value: string) => {
    const updater = (plans: Plan[]) => plans.map(p => p.id === id ? { ...p, [field]: value } : p);
    if (type === 'practice') setPracticePlans(updater(practicePlans));
    else setClassPlans(updater(classPlans));
  };

  const deletePlan = (type: 'practice' | 'class', id: string) => {
    if (type === 'practice') {
      setPracticePlans(practicePlans.filter(p => p.id !== id));
    } else {
      setClassPlans(classPlans.filter(p => p.id !== id));
    }
    if (selectedPlanId === id) setSelectedPlanId(null);
  };

  // --- LOGIC: BPM Tap Tempo ---
  const handleTapTempo = () => {
    const now = Date.now();
    const recent = tapTimes.filter(t => now - t < 5000); // only last 5s taps
    const newTaps = [...recent, now];
    setTapTimes(newTaps);

    if (newTaps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < newTaps.length; i++) {
        intervals.push(newTaps[i] - newTaps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      setBpm(calculatedBpm);
    }
  };

  const resetTapTempo = () => {
    setTapTimes([]);
    setBpm(null);
  };

  // Beat interval in seconds
  const beatInterval = bpm ? 60 / bpm : null;

  // --- LOGIC: Athlete Skills ---
  const getAthleteSkillLevel = (athleteId: string, skillId: string): SkillLevel => {
    const skills = athleteSkills[athleteId] || [];
    return skills.find(s => s.skillId === skillId)?.level || 'none';
  };

  const setAthleteSkillLevel = (athleteId: string, skillId: string, level: SkillLevel) => {
    setAthleteSkills(prev => {
      const current = prev[athleteId] || [];
      const existing = current.find(s => s.skillId === skillId);
      const updated = existing
        ? current.map(s => s.skillId === skillId ? { ...s, level } : s)
        : [...current, { skillId, level, notes: '' }];
      return { ...prev, [athleteId]: updated };
    });
  };

  const SKILL_LEVELS: { value: SkillLevel; label: string; color: string }[] = [
    { value: 'none', label: '—', color: 'bg-zinc-800 text-zinc-600' },
    { value: 'learning', label: 'Learning', color: 'bg-yellow-500/20 text-yellow-400' },
    { value: 'consistent', label: 'Consistent', color: 'bg-blue-500/20 text-blue-400' },
    { value: 'elite', label: 'Elite', color: 'bg-emerald-500/20 text-emerald-400' },
  ];

  // --- LOGIC: Scoring Rubric ---
  const addRubricEntry = () => {
    const newEntry: RubricEntry = {
      id: generateId(),
      date: new Date().toISOString().split('T')[0],
      competition: 'Competition',
      scores: DEFAULT_RUBRIC_CATEGORIES.map(cat => ({ categoryId: cat.id, score: 0, notes: '' })),
      totalScore: 0,
    };
    setRubricEntries(prev => [newEntry, ...prev]);
    setSelectedRubricId(newEntry.id);
  };

  const updateRubricScore = (entryId: string, categoryId: string, score: number) => {
    setRubricEntries(prev => prev.map(entry => {
      if (entry.id !== entryId) return entry;
      const newScores = entry.scores.map(s => s.categoryId === categoryId ? { ...s, score } : s);
      const total = newScores.reduce((sum, s) => {
        const cat = DEFAULT_RUBRIC_CATEGORIES.find(c => c.id === s.categoryId);
        return sum + (s.score / (cat?.maxScore || 10)) * (cat?.maxScore || 10);
      }, 0);
      return { ...entry, scores: newScores, totalScore: parseFloat(total.toFixed(2)) };
    }));
  };

  const updateRubricField = (entryId: string, field: 'date' | 'competition', value: string) => {
    setRubricEntries(prev => prev.map(e => e.id === entryId ? { ...e, [field]: value } : e));
  };

  const deleteRubricEntry = (id: string) => {
    setRubricEntries(prev => prev.filter(e => e.id !== id));
    if (selectedRubricId === id) setSelectedRubricId(null);
  };

  // --- Render Helpers ---

  const currentFormation = formations[currentFormationIndex];
  const previousFormation = currentFormationIndex > 0 ? formations[currentFormationIndex - 1] : null;
  const nextFormation = currentFormationIndex < formations.length - 1 ? formations[currentFormationIndex + 1] : null;

  const getDisplayPosition = (athleteId: string): Position | null => {
    const currentPos = currentFormation.positions[athleteId];
    if (!currentPos) return null;
    if (animationProgress < 1 && previousFormation && previousFormation.positions[athleteId] && playbackMode !== 'stopped') {
      const prevPos = previousFormation.positions[athleteId];
      return {
        x: prevPos.x + (currentPos.x - prevPos.x) * animationProgress,
        y: prevPos.y + (currentPos.y - prevPos.y) * animationProgress
      };
    }
    return currentPos;
  };

  const getAthleteColor = (athlete: Athlete) => {
    const group = groups.find(g => g.id === athlete.groupId);
    return group ? group.color : '#ffffff';
  };

  const renderAthleteIcon = (color: string, size: number = 24) => {
    const style = { color: 'white', fill: color, strokeWidth: 1.5, stroke: 'white' };
    switch (athleteShape) {
      case 'star': return <Star size={size} style={style} />;
      case 'square': return <Square size={size * 0.8} style={style} />;
      case 'dot': default: return <Circle size={size} style={{...style, stroke: 'none', fill: color}} />;
    }
  };

  const getGridLinesStyle = () => {
    const isLight = isLightColor(floorColor);
    const lineColor = isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'; 
    const lineWidth = '2px'; 
    const verticalGradient = `linear-gradient(to right, ${lineColor} ${lineWidth}, transparent ${lineWidth})`;
    const horizontalGradient = `linear-gradient(to bottom, ${lineColor} ${lineWidth}, transparent ${lineWidth})`;
    const backgrounds = [verticalGradient];
    if (showHorizontalGrid) backgrounds.push(horizontalGradient);
    return {
      backgroundColor: floorColor, 
      backgroundImage: backgrounds.join(', '),
      backgroundSize: `${100/PANEL_COUNT}% 100%${showHorizontalGrid ? `, 100% ${100/ROW_COUNT}%` : ''}`,
      touchAction: 'none'
    };
  };

  const panelNumberColor = isLightColor(floorColor) ? 'text-black/70' : 'text-white/70';
  const panelBorderColor = isLightColor(floorColor) ? 'border-black/30' : 'border-white/30';

  // --- PDF EXPORT LOGIC ---
  const handleExportPDF = () => {
    if (sidebarTab === 'countsheet') {
      const html = `
        <div class="meta">Routine: ${routineTitle}</div>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Section</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th>
            </tr>
          </thead>
          <tbody>
            ${countSheet.map((row, idx) => `
              <tr>
                <td style="text-align:center">${idx + 1}</td>
                <td><strong>${row.section}</strong></td>
                ${row.counts.map(c => `<td>${c}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      printContent(`${routineTitle} - Count Sheet`, html);
    } 
    else if (sidebarTab === 'practice' || sidebarTab === 'classes') {
      const plans = sidebarTab === 'practice' ? practicePlans : classPlans;
      const selected = plans.find(p => p.id === selectedPlanId);
      
      if (!selected) {
        alert('Please select a plan to export.');
        return;
      }

      const html = `
        <div class="meta">Date: ${selected.date} | Routine: ${routineTitle}</div>
        <div style="white-space: pre-wrap; font-family: monospace; font-size: 14px; background: #f9f9f9; padding: 20px; border-radius: 8px;">
          ${selected.content}
        </div>
      `;
      printContent(`${selected.title}`, html);
    } 
    else if (sidebarTab === 'skills') {
      // Export skill tracker as HTML
      const html = `
        <div class="meta">Routine: ${routineTitle}</div>
        ${roster.map(athlete => {
          const skills = athleteSkills[athlete.id] || [];
          const group = groups.find(g => g.id === athlete.groupId);
          return `
            <h2 style="color:${group?.color || '#000'}">${athlete.name} (${athlete.initial}) — ${group?.name || ''}</h2>
            ${DEFAULT_SKILL_CATEGORIES.map(cat => {
              const catSkills = cat.skills.filter(sk => {
                const s = skills.find(x => x.skillId === sk.id);
                return s && s.level !== 'none';
              });
              if (catSkills.length === 0) return '';
              return `<h3>${cat.name}</h3><table><thead><tr><th>Skill</th><th>Level</th></tr></thead><tbody>${catSkills.map(sk => {
                const s = skills.find(x => x.skillId === sk.id);
                return `<tr><td>${sk.name}</td><td><strong>${s?.level || '—'}</strong></td></tr>`;
              }).join('')}</tbody></table>`;
            }).join('')}
          `;
        }).join('<hr/>')}
      `;
      printContent(`${routineTitle} - Skill Tracker`, html);
    }
    else if (sidebarTab === 'scoring') {
      const html = `
        <div class="meta">Routine: ${routineTitle}</div>
        ${rubricEntries.map(entry => `
          <div style="margin-bottom:30px; padding:20px; border:1px solid #eee; border-radius:8px; page-break-inside:avoid;">
            <h2 style="margin:0 0 5px 0">${entry.competition}</h2>
            <p style="color:#666; font-size:13px; margin:0 0 15px 0">${entry.date} &nbsp;|&nbsp; Total: <strong>${entry.totalScore.toFixed(1)} / ${DEFAULT_RUBRIC_CATEGORIES.length * 10}</strong></p>
            <table><thead><tr><th>Category</th><th>Score</th><th>Max</th></tr></thead>
            <tbody>${entry.scores.map(s => {
              const cat = DEFAULT_RUBRIC_CATEGORIES.find(c => c.id === s.categoryId);
              return `<tr><td>${cat?.name || s.categoryId}</td><td><strong>${s.score.toFixed(1)}</strong></td><td>${cat?.maxScore || 10}</td></tr>`;
            }).join('')}</tbody></table>
          </div>
        `).join('')}
      `;
      printContent(`${routineTitle} - Scoring Rubric`, html);
    }
    else {
      // Routine / Visual Export
      let rosterHtml = `<div style="margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px;"><h3>Roster</h3><div style="display: flex; flex-wrap: wrap; gap: 10px;">`;
      roster.forEach(a => {
        const group = groups.find(g => g.id === a.groupId);
        rosterHtml += `<span style="padding: 2px 8px; background: white; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;"><span style="color:${group?.color || '#000'}">●</span> ${a.name} (${a.initial})</span>`;
      });
      rosterHtml += `</div></div>`;

      const formationsHtml = formations.map((fmt, idx) => {
        const timeLabel = audioSrc ? `<span style="float:right; font-size:12px; color:#666;">Time: ${formatTime(fmt.time)}</span>` : '';
        const dots = roster.map(a => {
           const pos = fmt.positions[a.id];
           if (!pos) return '';
           const group = groups.find(g => g.id === a.groupId);
           const color = group ? group.color : '#000';
           return `<div class="athlete-dot" style="left: ${pos.x}%; top: ${pos.y}%; background-color: ${color};">${a.initial}</div>`;
        }).join('');

        return `
          <div class="formation-card">
            <div class="formation-visual">
               ${dots}
               <div style="position:absolute; bottom:0; width:100%; display:flex; font-size:8px; color:#ccc; border-top:1px solid #eee;">
                  ${Array.from({length: 9}).map((_, i) => `<div style="flex:1; text-align:center; border-right:1px solid #eee;">${i+1}</div>`).join('')}
               </div>
            </div>
            <div class="formation-info">
              <h3>${idx + 1}. ${fmt.name} ${timeLabel}</h3>
              <p><strong>Notes:</strong></p>
              <pre style="background:transparent; padding:0; font-family:sans-serif;">${fmt.notes || 'No notes'}</pre>
            </div>
          </div>
        `;
      }).join('');

      printContent(`${routineTitle} - Routine Book`, rosterHtml + formationsHtml);
    }
  };

  // --- RENDER FUNCTIONS ---
  const renderPlanEditor = (type: 'practice' | 'class') => {
    const plans = type === 'practice' ? practicePlans : classPlans;
    const selectedPlan = plans.find(p => p.id === selectedPlanId);

    const applyTemplate = (template: string) => {
       if (selectedPlan) {
          updatePlan(type, selectedPlan.id, 'content', template);
       }
    };

    return (
      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        {/* Plan List */}
        <div className="w-64 bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-white/5 flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{type === 'practice' ? 'Practices' : 'Classes'}</span>
            <button onClick={() => addPlan(type)} className="p-1 hover:bg-white/10 rounded text-rose-500 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {plans.map(plan => (
              <div 
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`p-3 rounded-xl cursor-pointer transition-all border ${selectedPlanId === plan.id ? 'bg-rose-500/10 border-rose-500/50' : 'bg-transparent border-transparent hover:bg-white/5'}`}
              >
                <div className="font-medium text-sm text-zinc-200 truncate">{plan.title}</div>
                <div className="text-[10px] text-zinc-500">{plan.date}</div>
              </div>
            ))}
            {plans.length === 0 && <div className="p-4 text-center text-xs text-zinc-600">No plans yet</div>}
          </div>
        </div>

        {/* Editor */}
        {selectedPlan ? (
          <div className="flex-1 bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 flex gap-4">
              <input 
                value={selectedPlan.title}
                onChange={(e) => updatePlan(type, selectedPlan.id, 'title', e.target.value)}
                className="flex-1 bg-transparent text-lg font-bold focus:outline-none placeholder-zinc-600"
                placeholder="Plan Title"
              />
              <input 
                type="date"
                value={selectedPlan.date}
                onChange={(e) => updatePlan(type, selectedPlan.id, 'date', e.target.value)}
                className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-sm text-zinc-400 focus:outline-none"
              />
              <button 
                onClick={() => deletePlan(type, selectedPlan.id)}
                className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            {/* Template Buttons (Only if empty) */}
            {selectedPlan.content === '' && (
              <div className="px-4 pt-4 flex gap-2">
                 <button onClick={() => applyTemplate(type === 'practice' ? PRACTICE_TEMPLATE : CLASS_TEMPLATE)} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
                    <LayoutTemplate className="w-3 h-3" />
                    Use {type === 'practice' ? 'Practice' : 'Class'} Template
                 </button>
              </div>
            )}

            <textarea 
              value={selectedPlan.content}
              onChange={(e) => updatePlan(type, selectedPlan.id, 'content', e.target.value)}
              className="flex-1 bg-transparent p-4 focus:outline-none text-zinc-300 resize-none leading-relaxed"
              placeholder="Start typing your plan here..."
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-600">Select or create a plan</div>
        )}
      </div>
    );
  };

  const renderSkillTracker = () => {
    const selectedAthlete = selectedSkillAthleteId ? roster.find(a => a.id === selectedSkillAthleteId) : null;
    return (
      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        {/* Athlete List */}
        <div className="w-56 bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-white/5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Athletes</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {roster.map(athlete => {
              const color = getAthleteColor(athlete);
              const skillCount = (athleteSkills[athlete.id] || []).filter(s => s.level !== 'none').length;
              return (
                <div
                  key={athlete.id}
                  onClick={() => setSelectedSkillAthleteId(athlete.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border flex items-center gap-3 ${selectedSkillAthleteId === athlete.id ? 'bg-rose-500/10 border-rose-500/50' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0" style={{ backgroundColor: color }}>{athlete.initial}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-zinc-200 truncate">{athlete.name}</div>
                    <div className="text-[10px] text-zinc-500">{skillCount} skills tracked</div>
                  </div>
                </div>
              );
            })}
            {roster.length === 0 && <div className="p-4 text-center text-xs text-zinc-600">Add athletes in Roster</div>}
          </div>
        </div>

        {/* Skill Grid */}
        {selectedAthlete ? (
          <div className="flex-1 bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black" style={{ backgroundColor: getAthleteColor(selectedAthlete) }}>{selectedAthlete.initial}</div>
              <div>
                <div className="text-sm font-bold text-zinc-100">{selectedAthlete.name}</div>
                <div className="text-[10px] text-zinc-500">{groups.find(g => g.id === selectedAthlete.groupId)?.name}</div>
              </div>
              <div className="ml-auto flex gap-2 text-[10px]">
                {SKILL_LEVELS.filter(l => l.value !== 'none').map(l => (
                  <span key={l.value} className={`px-2 py-0.5 rounded-full font-bold ${l.color}`}>{l.label}</span>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {skillCategories.map(cat => (
                <div key={cat.id}>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">{cat.name}</div>
                  <div className="grid grid-cols-1 gap-2">
                    {cat.skills.map(skill => {
                      const level = getAthleteSkillLevel(selectedAthlete.id, skill.id);
                      return (
                        <div key={skill.id} className="flex items-center gap-3 p-2.5 bg-black/20 rounded-xl border border-white/5">
                          <span className="text-xs text-zinc-300 flex-1">{skill.name}</span>
                          <div className="flex gap-1">
                            {SKILL_LEVELS.map(l => (
                              <button
                                key={l.value}
                                onClick={() => setAthleteSkillLevel(selectedAthlete.id, skill.id, l.value)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${level === l.value ? l.color + ' ring-1 ring-white/20' : 'bg-zinc-800/60 text-zinc-600 hover:bg-zinc-700'}`}
                              >
                                {l.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-2">
            <GraduationCap className="w-12 h-12 opacity-20" />
            <span className="text-sm">Select an athlete to view skills</span>
          </div>
        )}
      </div>
    );
  };

  const renderScoringRubric = () => {
    const selectedEntry = rubricEntries.find(e => e.id === selectedRubricId);
    return (
      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        {/* Entry List */}
        <div className="w-56 bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Competitions</span>
            <button onClick={addRubricEntry} className="p-1 hover:bg-white/10 rounded text-rose-500 transition-colors"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {rubricEntries.map(entry => {
              const pct = (entry.totalScore / (DEFAULT_RUBRIC_CATEGORIES.length * 10)) * 100;
              return (
                <div
                  key={entry.id}
                  onClick={() => setSelectedRubricId(entry.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border ${selectedRubricId === entry.id ? 'bg-rose-500/10 border-rose-500/50' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-zinc-200 truncate flex-1">{entry.competition}</span>
                    <span className="text-xs font-black text-rose-400 ml-2">{entry.totalScore.toFixed(1)}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 mb-2">{entry.date}</div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {rubricEntries.length === 0 && <div className="p-4 text-center text-xs text-zinc-600">No entries yet</div>}
          </div>
        </div>

        {/* Score Editor */}
        {selectedEntry ? (
          <div className="flex-1 bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-4">
              <input
                value={selectedEntry.competition}
                onChange={e => updateRubricField(selectedEntry.id, 'competition', e.target.value)}
                className="flex-1 bg-transparent text-base font-bold focus:outline-none text-zinc-100 placeholder-zinc-600"
                placeholder="Competition Name"
              />
              <input
                type="date"
                value={selectedEntry.date}
                onChange={e => updateRubricField(selectedEntry.id, 'date', e.target.value)}
                className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-sm text-zinc-400 focus:outline-none"
              />
              <div className="text-right">
                <div className="text-xl font-black text-rose-400">{selectedEntry.totalScore.toFixed(1)}</div>
                <div className="text-[10px] text-zinc-500">/ {DEFAULT_RUBRIC_CATEGORIES.length * 10}.0</div>
              </div>
              <button onClick={() => deleteRubricEntry(selectedEntry.id)} className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid gap-3">
                {DEFAULT_RUBRIC_CATEGORIES.map(cat => {
                  const scoreEntry = selectedEntry.scores.find(s => s.categoryId === cat.id);
                  const score = scoreEntry?.score || 0;
                  const pct = (score / cat.maxScore) * 100;
                  return (
                    <div key={cat.id} className="bg-black/20 border border-white/5 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-zinc-200">{cat.name}</span>
                        <div className="flex items-center gap-3">
                          <div className="text-xl font-black" style={{ color: score >= 8 ? '#10b981' : score >= 6 ? '#f59e0b' : '#f43f5e' }}>{score.toFixed(1)}</div>
                          <span className="text-xs text-zinc-600">/ {cat.maxScore}</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={cat.maxScore}
                        step="0.5"
                        value={score}
                        onChange={e => updateRubricScore(selectedEntry.id, cat.id, parseFloat(e.target.value))}
                        className="w-full accent-rose-500"
                      />
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: score >= 8 ? '#10b981' : score >= 6 ? '#f59e0b' : '#f43f5e' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-2">
            <Star className="w-12 h-12 opacity-20" />
            <span className="text-sm">Select or add a competition entry</span>
            <button onClick={addRubricEntry} className="mt-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-sm font-bold text-white transition-colors">+ New Entry</button>
          </div>
        )}
      </div>
    );
  };

  const PrintLayout = () => {
     return (
       <div className="print-only hidden print:block bg-white text-black p-8 absolute inset-0 z-50 overflow-visible">
          <h1 className="text-2xl font-bold mb-4 border-b pb-2">{routineTitle} - {sidebarTab === 'roster' || sidebarTab === 'formations' ? 'Routine Book' : sidebarTab === 'countsheet' ? 'Count Sheet' : 'Plan'}</h1>
          
          {sidebarTab === 'countsheet' && (
             <table className="w-full border-collapse text-xs">
                <thead><tr className="bg-gray-100"><th className="border p-2">#</th><th className="border p-2">Section</th>{[1,2,3,4,5,6,7,8].map(n=><th key={n} className="border p-2">{n}</th>)}</tr></thead>
                <tbody>{countSheet.map((r, i) => <tr key={r.id}><td className="border p-2 text-center">{i+1}</td><td className="border p-2 font-bold">{r.section}</td>{r.counts.map((c,ci)=><td key={ci} className="border p-2">{c}</td>)}</tr>)}</tbody>
             </table>
          )}

          {(sidebarTab === 'practice' || sidebarTab === 'classes') && (
             <div>
                {selectedPlanId ? (() => {
                   const plans = sidebarTab === 'practice' ? practicePlans : classPlans;
                   const p = plans.find(x => x.id === selectedPlanId);
                   return p ? (
                      <div>
                         <div className="mb-4 text-sm text-gray-600">{p.date}</div>
                         <h2 className="text-xl font-bold mb-4">{p.title}</h2>
                         <pre className="whitespace-pre-wrap font-sans text-sm">{p.content}</pre>
                      </div>
                   ) : <div>No Plan Selected</div>
                })() : <div>Select a plan to print</div>}
             </div>
          )}

          {(sidebarTab === 'roster' || sidebarTab === 'formations' || sidebarTab === 'settings') && (
             <div>
                <div className="mb-6 p-4 bg-gray-50 rounded border flex flex-wrap gap-2">
                   {roster.map(a => {
                      const g = groups.find(x => x.id === a.groupId);
                      return <span key={a.id} className="text-xs px-2 py-1 border rounded bg-white"><span style={{color:g?.color}}>●</span> {a.name} ({a.initial})</span>;
                   })}
                </div>
                {formations.map((fmt, idx) => (
                   <div key={fmt.id} className="mb-6 border rounded p-4 break-inside-avoid flex gap-6">
                      <div className="w-64 h-48 border bg-gray-100 relative shrink-0">
                         {roster.map(a => {
                            const pos = fmt.positions[a.id];
                            if(!pos) return null;
                            const g = groups.find(x => x.id === a.groupId);
                            return <div key={a.id} className="absolute w-3 h-3 rounded-full flex items-center justify-center text-[6px] font-bold text-white -translate-x-1/2 -translate-y-1/2" style={{left:`${pos.x}%`, top:`${pos.y}%`, backgroundColor: g?.color, printColorAdjust:'exact', WebkitPrintColorAdjust:'exact'}}>{a.initial}</div>
                         })}
                         <div className="absolute bottom-0 w-full flex text-[8px] text-gray-400 border-t border-gray-300">{Array.from({length:9}).map((_,i)=><div key={i} className="flex-1 text-center border-r border-gray-300 last:border-r-0">{i+1}</div>)}</div>
                      </div>
                      <div className="flex-1">
                         <h3 className="font-bold text-lg mb-2">{idx+1}. {fmt.name} <span className="text-sm font-normal text-gray-500 float-right">{formatTime(fmt.time)}</span></h3>
                         <div className="text-sm whitespace-pre-wrap text-gray-700">{fmt.notes || 'No notes'}</div>
                      </div>
                   </div>
                ))}
             </div>
          )}
       </div>
    );
  };

  // --- MEMOIZED COMPONENTS ---
  const TimelineDeck = useMemo(() => (
    <div className="absolute bottom-6 left-6 right-6 h-32 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col z-40 shadow-2xl overflow-hidden">
      
      {/* Audio Controls Row */}
      <div className="h-8 bg-black/20 border-b border-white/5 flex items-center px-4 gap-4">
          {audioSrc ? (
             <>
               <div className="flex items-center gap-2">
                 <button onClick={togglePlayback} className="text-zinc-400 hover:text-white" title={playbackMode === 'audio' || playbackMode === 'recording' ? 'Pause' : 'Play Music'}>
                   {playbackMode === 'audio' || playbackMode === 'recording' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                 </button>
                 <button onClick={triggerVisualPreview} className="text-zinc-400 hover:text-rose-400" title="Preview Visual Only (Mute)">
                   <Eye className="w-3 h-3" />
                 </button>
               </div>
               
               {/* Timeline Ticks Container */}
               <div className="flex-1 relative h-4 group">
                    <input 
                        type="range" 
                        min="0" 
                        max={audioDuration || 100} 
                        value={currentTime} 
                        onChange={handleSeek}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    />
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-zinc-700 rounded-lg overflow-hidden">
                         <div className="h-full bg-rose-500 transition-all duration-100 ease-linear" style={{ width: `${(currentTime / (audioDuration || 1)) * 100}%` }} />
                    </div>
                    {/* Tick Marks for Formations */}
                    {formations.map((f, i) => (
                        <div 
                            key={f.id}
                            className="absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-white/50 hover:bg-white z-10 pointer-events-none"
                            style={{ left: `${(f.time / (audioDuration || 1)) * 100}%` }}
                        />
                    ))}
               </div>

               <span className="text-[10px] font-mono text-zinc-500 w-16 text-right">{formatTime(currentTime)}</span>
               <button onClick={() => { if(audioRef.current) audioRef.current.muted = !isMuted; setIsMuted(!isMuted); }} className="text-zinc-400 hover:text-white">
                 {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
               </button>
               {/* BPM display in audio row */}
               <div className="flex items-center gap-2 border-l border-white/10 pl-3">
                 <button
                   onClick={handleTapTempo}
                   className="px-2.5 py-1 bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 border border-white/5"
                 >
                   TAP
                 </button>
                 <span className="text-[10px] font-mono font-bold text-rose-400 w-14">
                   {bpm ? `${bpm} BPM` : '— BPM'}
                 </span>
                 {bpm && (
                   <button onClick={resetTapTempo} className="text-zinc-600 hover:text-zinc-400"><X className="w-3 h-3" /></button>
                 )}
               </div>
             </>
          ) : (
             <label className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer flex-1">
                <Music className="w-3 h-3" />
                <span>Click to Import Music (MP3)</span>
                <input type="file" accept="audio/*,.mp3,.wav,.m4a" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
             </label>
          )}
          {/* BPM Tap Tempo always visible when no audio */}
          {!audioSrc && (
            <div className="flex items-center gap-2 border-l border-white/10 pl-3">
              <button
                onClick={handleTapTempo}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 border border-white/5"
              >
                TAP
              </button>
              <span className="text-[10px] font-mono font-bold text-rose-400 w-14">
                {bpm ? `${bpm} BPM` : '— BPM'}
              </span>
              {bpm && <button onClick={resetTapTempo} className="text-zinc-600 hover:text-zinc-400"><X className="w-3 h-3" /></button>}
            </div>
          )}
      </div>

      <div className="flex-1 flex items-center gap-4 px-4">
        {/* Play Formation Controls */}
        <div className="flex items-center gap-3 pr-4 border-r border-white/10">
            {audioSrc ? (
               <div className="flex flex-col items-center gap-1">
                   <button 
                     onClick={toggleRecording}
                     className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white shadow-lg animate-pulse' : 'bg-zinc-800 text-red-500 hover:bg-zinc-700'}`}
                     title="Tap to Sync Mode"
                   >
                     {isRecording ? <div className="w-3 h-3 bg-white rounded-sm" /> : <CircleDot className="w-4 h-4 fill-current" />}
                   </button>
                   {isRecording && <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider">REC</span>}
               </div>
            ) : (
                <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Current</span>
                    <span className="text-sm font-bold text-white max-w-[100px] truncate">
                    {currentFormation.name}
                    </span>
                </div>
            )}
            
            {audioSrc && (
                <div className="flex flex-col gap-1">
                   {isRecording ? (
                      <button 
                        onClick={handleNextFormationSync}
                        className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-rose-600 text-white rounded-lg border border-white/10 font-bold text-xs uppercase tracking-wide transition-all active:scale-95"
                      >
                        Set Break
                      </button>
                   ) : (
                      <>
                        <button 
                            onClick={syncFormationToCurrentTime}
                            className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-colors border border-rose-500/20"
                            title="Set Time for This Formation"
                        >
                            <Clock className="w-3 h-3" />
                        </button>
                        <button
                            onClick={() => setFollowPlayhead(!followPlayhead)}
                            className={`p-1.5 rounded-lg transition-colors border ${followPlayhead ? 'bg-zinc-700 text-white border-zinc-600' : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300'}`}
                            title={followPlayhead ? "Unlink Selection from Music" : "Link Selection to Music"}
                        >
                            {followPlayhead ? <LinkIcon className="w-3 h-3" /> : <Link2Off className="w-3 h-3" />}
                        </button>
                      </>
                   )}
                </div>
            )}
        </div>
        
        {/* Scrubber */}
        <div className="flex-1 overflow-x-auto custom-scrollbar flex items-center gap-3 py-2 mask-linear">
          {formations.map((fmt, idx) => (
            <div 
              key={fmt.id}
              onClick={() => setCurrentFormationIndex(idx)}
              className={`flex-shrink-0 w-28 h-20 rounded-xl cursor-pointer border transition-all relative group overflow-hidden ${idx === currentFormationIndex ? 'border-rose-500/80 ring-2 ring-rose-500/20 bg-rose-500/5' : 'border-white/5 bg-black/20 hover:bg-white/5 hover:border-white/10'}`}
            >
              <div className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${idx === currentFormationIndex ? 'bg-rose-500 text-white' : 'bg-black/40 text-zinc-500'}`}>
                {idx + 1}
              </div>
              <div className="absolute top-1.5 right-1.5 text-[9px] font-mono text-zinc-500">
                {formatTime(fmt.time)}
              </div>
              <div className="absolute bottom-0 w-full p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                <div className="text-[10px] font-medium truncate text-zinc-300 group-hover:text-white transition-colors text-center">{fmt.name}</div>
              </div>
              <div className="absolute inset-0 opacity-30 pointer-events-none flex items-center justify-center p-3">
                <div className="relative w-full h-full">
                  {Object.values(fmt.positions).map((pos, i) => (
                    <div key={i} className="absolute w-1 h-1 bg-white rounded-full shadow-sm" style={{ left: `${pos.x}%`, top: `${pos.y}%` }} />
                  ))}
                </div>
              </div>
            </div>
          ))}
          <button 
            onClick={addFormation}
            className="flex-shrink-0 w-12 h-20 rounded-xl border border-dashed border-white/10 hover:border-rose-500/50 hover:bg-rose-500/5 flex items-center justify-center text-zinc-600 hover:text-rose-400 transition-all group"
          >
            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 pl-4 border-l border-white/10">
            <button onClick={addFormation} className="p-2.5 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors" title="Duplicate">
              <Copy className="w-5 h-5" />
            </button>
            <button onClick={() => deleteFormation(currentFormationIndex)} disabled={formations.length === 1} className="p-2.5 hover:bg-red-500/10 rounded-xl text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-30" title="Delete">
              <Trash2 className="w-5 h-5" />
            </button>
        </div>
      </div>
      
      <audio 
         ref={audioRef} 
         src={audioSrc || undefined} 
         onTimeUpdate={handleTimeUpdate}
         onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
         onEnded={() => setPlaybackMode('stopped')}
         hidden 
      />
    </div>
  ), [formations, currentFormationIndex, playbackMode, addFormation, deleteFormation, audioSrc, currentTime, audioDuration, isMuted, syncFormationToCurrentTime, handleSeek, followPlayhead, isRecording, toggleRecording, handleNextFormationSync]); 

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-zinc-100 overflow-hidden font-sans select-none selection:bg-rose-500/30"
         style={{ backgroundImage: 'radial-gradient(circle at center, #18181b 0%, #09090b 100%)' }}>
      
      {/* ... Header ... */}
      {/* (Same Header Code) */}
      <div className="absolute top-4 left-4 right-4 h-16 bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-2xl flex items-center justify-between px-6 z-50 shadow-2xl">
        {/* ... Header Content ... */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-rose-500/20">
              <LayoutGrid className="text-white w-5 h-5" />
            </div>
            <input 
              value={routineTitle}
              onChange={(e) => setRoutineTitle(e.target.value)}
              className="bg-transparent font-bold text-lg focus:outline-none focus:ring-0 text-zinc-100 placeholder-zinc-600 w-full sm:w-auto tracking-tight"
              placeholder="Routine Name"
            />
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="relative group">
            <button 
              onClick={() => setIsRoutineMenuOpen(!isRoutineMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg text-xs font-medium transition-all border border-white/5 hover:border-white/10 text-zinc-400 hover:text-zinc-200"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Switch Routine</span>
              <ChevronRight className={`w-3 h-3 transition-transform ${isRoutineMenuOpen ? 'rotate-90' : ''}`} />
            </button>
            {isRoutineMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[60vh] animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3 border-b border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Library</span>
                  <button onClick={() => createNewRoutine()} className="p-1 hover:bg-white/10 rounded text-rose-500 transition-colors" title="New Routine">
                    <FilePlus className="w-4 h-4" />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 p-1 space-y-0.5">
                  {routinesList.map(routine => (
                    <div 
                      key={routine.id}
                      onClick={() => switchRoutine(routine.id)}
                      className={`px-3 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-all ${currentRoutineId === routine.id ? 'bg-rose-500/10 text-rose-400' : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200'}`}
                    >
                      <span className="text-xs font-medium truncate flex-1">{routine.title}</span>
                      {routinesList.length > 1 && (
                        <button 
                          onClick={(e) => deleteRoutine(routine.id, e)}
                          className="p-1 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
           <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg text-xs font-medium transition-all border border-white/5 hover:border-white/10 text-zinc-300 hover:text-white"
              title="Export PDF"
           >
              <Printer className="w-3.5 h-3.5" />
              <span>Export</span>
           </button>
           <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-colors ${loading ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              {loading ? 'Syncing' : 'Saved'}
           </div>
        </div>
      </div>

      {/* Main Layout & Logic from previous response */}
      {/* ... Left Sidebar ... */}
      <div className="flex flex-1 overflow-hidden pt-24 pb-6 px-4 gap-4 print:hidden">
        <aside className="w-72 flex flex-col gap-4 z-20">
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-2 flex flex-col gap-1 shadow-xl">
            {[
              { id: 'roster', label: 'Roster', icon: Users },
              { id: 'formations', label: 'Notes', icon: Layers },
              { id: 'settings', label: 'Settings', icon: Settings },
              { id: 'countsheet', label: 'Count Sheet', icon: FileText },
              { id: 'practice', label: 'Practice Plans', icon: ClipboardList },
              { id: 'classes', label: 'Classes', icon: GraduationCap },
              { id: 'skills', label: 'Skill Tracker', icon: Star },
              { id: 'scoring', label: 'Scoring Rubric', icon: Flag },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setSidebarTab(tab.id as any)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${sidebarTab === tab.id ? 'bg-zinc-800 text-rose-400 shadow-sm ring-1 ring-white/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {(sidebarTab === 'roster' || sidebarTab === 'formations' || sidebarTab === 'settings') && (
             <div className="flex-1 bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4 shadow-xl overflow-y-auto custom-scrollbar flex flex-col min-h-0">
                {/* ... Sidebar Contents (Same as before) ... */}
                {/* Just re-pasting for context, focusing on the print update */}
                {sidebarTab === 'roster' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300 flex-1 flex flex-col">
                    <div className="space-y-2 pb-2 border-b border-white/5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Groups</label>
                        <button onClick={() => setIsEditingGroups(!isEditingGroups)} className="text-[10px] text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 transition-colors">
                          {isEditingGroups ? <Check className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                          {isEditingGroups ? 'Done' : 'Edit'}
                        </button>
                      </div>
                      {isEditingGroups ? (
                        <div className="space-y-2">
                          {groups.map(group => (
                            <div key={group.id} className="flex items-center gap-2 bg-black/20 p-2 rounded-lg">
                              <input type="color" value={group.color} onChange={(e) => updateGroup(group.id, 'color', e.target.value)} className="w-6 h-6 rounded bg-transparent cursor-pointer" />
                              <input value={group.name} onChange={(e) => updateGroup(group.id, 'name', e.target.value)} className="bg-transparent text-xs text-zinc-200 focus:outline-none flex-1" />
                              {groups.length > 1 && (
                                <button onClick={() => deleteGroup(group.id)} className="text-zinc-600 hover:text-red-400"><X className="w-3 h-3" /></button>
                              )}
                            </div>
                          ))}
                          <button onClick={addGroup} className="w-full py-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-dashed border-white/10 rounded-lg hover:border-white/20 transition-all">+ New Group</button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {groups.map(group => (
                            <div key={group.id} className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-full border border-white/5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                              <span className="text-[10px] text-zinc-300 font-medium">{group.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={addAthlete} className="w-full py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-rose-900/20 flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/10"><Plus className="w-4 h-4" /> Add Athlete</button>
                    <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                      {roster.map(athlete => {
                        const groupColor = getAthleteColor(athlete);
                        return (
                          <div key={athlete.id} className={`p-2 rounded-xl flex items-center gap-3 group border transition-all ${selectedAthleteIds.has(athlete.id) ? 'bg-rose-500/10 border-rose-500/50' : 'bg-white/5 border-transparent hover:border-white/10 hover:bg-white/10'}`} onClick={(e) => {
                             if (isMultiSelectMode || e.shiftKey) { const next = new Set(selectedAthleteIds); if (next.has(athlete.id)) next.delete(athlete.id); else next.add(athlete.id); setSelectedAthleteIds(next); } else { setSelectedAthleteIds(new Set([athlete.id])); }
                          }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm" style={{ backgroundColor: groupColor, color: 'rgba(0,0,0,0.6)' }}>{athlete.initial}</div>
                            <div className="flex-1 min-w-0">
                              <input value={athlete.name} onChange={(e) => updateAthlete(athlete.id, 'name', e.target.value)} className="bg-transparent w-full text-xs font-semibold text-zinc-200 focus:outline-none placeholder-zinc-600" placeholder="Name" />
                              <div className="flex gap-1.5 mt-1">
                                <select value={athlete.groupId} onChange={(e) => updateAthlete(athlete.id, 'groupId', e.target.value)} className="bg-black/20 text-[9px] font-medium text-zinc-400 rounded px-1.5 py-0.5 focus:outline-none focus:text-rose-400 cursor-pointer hover:bg-black/40 transition-colors w-24 truncate">
                                  {groups.map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}
                                </select>
                                <input value={athlete.initial} maxLength={2} onChange={(e) => updateAthlete(athlete.id, 'initial', e.target.value)} className="bg-black/20 text-[9px] text-center w-6 rounded px-0 py-0.5 focus:outline-none focus:text-rose-400 hover:bg-black/40 transition-colors" placeholder="Init" />
                              </div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); removeAthlete(athlete.id); }} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 p-1.5 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Formations Tab */}
                {sidebarTab === 'formations' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">Formation Name</label>
                      <input value={currentFormation.name} onChange={(e) => { const updated = formations.map((f, i) => i === currentFormationIndex ? { ...f, name: e.target.value } : f); setFormations(updated); }} className="w-full bg-black/20 text-sm p-3 rounded-xl border border-white/5 focus:border-rose-500/50 focus:bg-black/40 focus:outline-none transition-all text-zinc-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">Choreography Notes</label>
                      <textarea value={currentFormation.notes} onChange={(e) => { const updated = formations.map((f, i) => i === currentFormationIndex ? { ...f, notes: e.target.value } : f); setFormations(updated); }} className="w-full h-48 bg-black/20 text-sm p-3 rounded-xl border border-white/5 focus:border-rose-500/50 focus:bg-black/40 focus:outline-none resize-none transition-all text-zinc-300 leading-relaxed" placeholder="e.g. 1-3 load in, 5 dip, 7 up..." />
                    </div>
                    <div className="pt-6 border-t border-white/5 space-y-4">
                      {[
                        { label: 'Show Paths', val: showPaths, set: setShowPaths, icon: Footprints },
                        { label: 'Show Ghost (Prev)', val: showGhost, set: setShowGhost, icon: RotateCcw },
                        { label: 'Show Next (Future)', val: showFuture, set: setShowFuture, icon: ChevronRight }
                      ].map(opt => (
                        <div key={opt.label} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3 text-zinc-400 group-hover:text-zinc-200 transition-colors"><div className={`p-1.5 rounded-lg ${opt.val ? 'bg-rose-500/10 text-rose-400' : 'bg-white/5'}`}><opt.icon className="w-3.5 h-3.5" /></div><span className="text-xs font-medium">{opt.label}</span></div>
                          <button onClick={() => opt.set(!opt.val)} className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${opt.val ? 'bg-rose-600' : 'bg-zinc-700'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${opt.val ? 'left-6' : 'left-1'}`} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Settings Tab */}
                {sidebarTab === 'settings' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="space-y-3"><label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">Appearance</label><div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5"><span className="text-xs font-medium text-zinc-300">Mat Color</span><div className="relative w-6 h-6 rounded-full overflow-hidden border border-white/20 ring-2 ring-white/5"><input type="color" value={floorColor} onChange={(e) => setFloorColor(e.target.value)} className="absolute -top-4 -left-4 w-16 h-16 cursor-pointer" /></div></div><div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5"><span className="text-xs font-medium text-zinc-300">Center Marker</span><div className="relative w-6 h-6 rounded-full overflow-hidden border border-white/20 ring-2 ring-white/5"><input type="color" value={markerColor} onChange={(e) => setMarkerColor(e.target.value)} className="absolute -top-4 -left-4 w-16 h-16 cursor-pointer" /></div></div></div>
                    <div className="space-y-3"><label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">Athlete Style</label><div className="grid grid-cols-3 gap-2">{['dot', 'star', 'square'].map((shape) => (<button key={shape} onClick={() => setAthleteShape(shape as AthleteShape)} className={`p-3 rounded-xl flex items-center justify-center transition-all border ${athleteShape === shape ? 'bg-rose-500/10 border-rose-500/50 text-rose-400' : 'bg-black/20 border-white/5 text-zinc-500 hover:bg-black/40 hover:text-zinc-300'}`}>{shape === 'dot' && <div className="w-2.5 h-2.5 rounded-full bg-current" />}{shape === 'star' && <Star size={14} />}{shape === 'square' && <Square size={12} />}</button>))}</div></div>
                    <div className="space-y-3"><label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">Selection Context</label><div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5"><div className="flex items-center gap-2 text-zinc-300"><History className="w-3.5 h-3.5" /><span className="text-xs font-medium">Show Previous Spot</span></div><button onClick={() => setShowContextPrev(!showContextPrev)} className={`w-10 h-5 rounded-full relative transition-colors ${showContextPrev ? 'bg-rose-600' : 'bg-zinc-700'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${showContextPrev ? 'left-6' : 'left-1'}`} /></button></div><div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5"><div className="flex items-center gap-2 text-zinc-300"><FastForward className="w-3.5 h-3.5" /><span className="text-xs font-medium">Show Next Spot</span></div><button onClick={() => setShowContextNext(!showContextNext)} className={`w-10 h-5 rounded-full relative transition-colors ${showContextNext ? 'bg-rose-600' : 'bg-zinc-700'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${showContextNext ? 'left-6' : 'left-1'}`} /></button></div></div>
                    <div className="space-y-3"><label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">Grid & Snap</label><div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5"><span className="text-xs font-medium text-zinc-300">Snap to Grid</span><button onClick={() => setSnapToGrid(!snapToGrid)} className={`w-10 h-5 rounded-full relative transition-colors ${snapToGrid ? 'bg-rose-600' : 'bg-zinc-700'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${snapToGrid ? 'left-6' : 'left-1'}`} /></button></div><div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5"><span className="text-xs font-medium text-zinc-300">Show Horizontal Grid</span><button onClick={() => setShowHorizontalGrid(!showHorizontalGrid)} className={`w-10 h-5 rounded-full relative transition-colors ${showHorizontalGrid ? 'bg-rose-600' : 'bg-zinc-700'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${showHorizontalGrid ? 'left-6' : 'left-1'}`} /></button></div></div>
                  </div>
                )}
             </div>
          )}
        </aside>

        {/* ... Main Workspace (Mat / Plan Editors) ... */}
        <main className="flex-1 flex flex-col relative min-w-0 print:hidden">
          
          {/* TOOLBAR FLOATING */}
          {(sidebarTab === 'roster' || sidebarTab === 'formations' || sidebarTab === 'settings') && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-3 bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-1.5 rounded-full shadow-2xl">
               <button onClick={() => setIsMultiSelectMode(!isMultiSelectMode)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${isMultiSelectMode ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
                 {isMultiSelectMode ? <CheckSquare className="w-3.5 h-3.5" /> : <MousePointer2 className="w-3.5 h-3.5" />}
                 <span>{isMultiSelectMode ? 'Multi-Select ON' : 'Multi-Select'}</span>
               </button>
               {selectedAthleteIds.size > 0 && (<div className="px-3 text-xs font-bold text-rose-400 border-l border-white/10">{selectedAthleteIds.size} Selected</div>)}
            </div>
          )}

          {(sidebarTab === 'roster' || sidebarTab === 'formations' || sidebarTab === 'settings') ? (
              <div className="flex-1 relative overflow-hidden flex items-center justify-center p-8 pb-32">
                <div ref={matRef} className="relative w-full max-w-5xl aspect-[54/42] shadow-[0_0_100px_-20px_rgba(0,0,0,0.5)] rounded-md transition-all duration-300 ring-1 ring-white/10 backdrop-brightness-110" style={getGridLinesStyle()} onMouseDown={handleMatClick}>
                  <div className="absolute -inset-4 bg-rose-500/5 blur-3xl -z-10 rounded-full opacity-50 pointer-events-none" />
                  <svg className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 pointer-events-none opacity-90 drop-shadow-lg z-10" style={{ color: markerColor }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  <div className={`absolute bottom-0 w-full flex ${panelNumberColor} text-xs font-mono font-black select-none z-10`}>{Array.from({length: PANEL_COUNT}).map((_, i) => (<div key={i} className={`flex-1 text-center border-r ${panelBorderColor} last:border-r-0 pb-2`}>{i + 1}</div>))}</div>
                  
                  {/* PATHS */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    {previousFormation && roster.map(athlete => {
                      const curr = currentFormation.positions[athlete.id];
                      const prev = previousFormation.positions[athlete.id];
                      if (!curr || !prev) return null;
                      if (Math.abs(curr.x - prev.x) < 0.1 && Math.abs(curr.y - prev.y) < 0.1) return null;
                      const isSelected = selectedAthleteIds.has(athlete.id);
                      const isVisible = showPaths || (isSelected && showContextPrev);
                      if (!isVisible) return null;
                      const color = getAthleteColor(athlete);
                      return (<g key={`path-${athlete.id}`}><defs><marker id={`arrow-${athlete.id}`} markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto"><path d="M0,0 L4,2 L0,4" fill={color} opacity="0.4" /></marker></defs><line x1={`${prev.x}%`} y1={`${prev.y}%`} x2={`${curr.x}%`} y2={`${curr.y}%`} stroke={color} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.3" markerEnd={`url(#arrow-${athlete.id})`} /></g>);
                    })}
                  </svg>

                  {/* ATHLETES */}
                  {roster.map(athlete => {
                    const pos = getDisplayPosition(athlete.id);
                    if (!pos) return null;
                    const isSelected = selectedAthleteIds.has(athlete.id);
                    const color = getAthleteColor(athlete);
                    const prevPos = previousFormation?.positions[athlete.id];
                    const showGhostNode = (showGhost || (isSelected && showContextPrev)) && prevPos && !isPlaying && animationProgress === 1 && (Math.abs(pos.x - prevPos.x) > 1 || Math.abs(pos.y - prevPos.y) > 1);
                    const nextPos = nextFormation?.positions[athlete.id];
                    const showFutureNode = (showFuture || (isSelected && showContextNext)) && nextPos && !isPlaying && animationProgress === 1;

                    return (
                      <React.Fragment key={athlete.id}>
                         {showGhostNode && (<div className="absolute w-8 h-8 flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 opacity-30 pointer-events-none z-10 grayscale mix-blend-screen" style={{ left: `${prevPos!.x}%`, top: `${prevPos!.y}%`, color: color }}>{athleteShape === 'dot' ? <div className="w-5 h-5 rounded-full border-2 border-dashed flex items-center justify-center" style={{borderColor: color}}><span className="text-[8px] font-bold">{athlete.initial}</span></div> : renderAthleteIcon(color, 20)}</div>)}
                         {showFutureNode && (<div className="absolute w-8 h-8 flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 opacity-60 pointer-events-none z-10" style={{ left: `${nextPos!.x}%`, top: `${nextPos!.y}%`, color: color }}>{athleteShape === 'dot' ? (<div className="w-6 h-6 rounded-full border-2 border-dotted flex items-center justify-center bg-white/5 backdrop-blur-sm shadow-sm" style={{borderColor: color}}><span className="text-[8px] font-bold text-white">{athlete.initial}</span></div>) : (<div className="opacity-60 drop-shadow-sm">{renderAthleteIcon(color, 20)}</div>)}</div>)}
                        
                        <div id={`athlete-${athlete.id}`} onPointerDown={(e) => handlePointerDown(athlete.id, e)} 
                             className={`absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-20 transition-all duration-200 ${isSelected ? 'scale-125 z-30' : 'hover:scale-110'}`} 
                             style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: '32px', height: '32px', filter: isSelected ? 'drop-shadow(0 0 8px rgba(255,255,255,0.4))' : 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}>
                            {isSelected && (<div className="absolute inset-0 rounded-full border-2 border-white animate-pulse opacity-100" style={{ boxShadow: '0 0 10px rgba(255,255,255,0.5)' }} />)}
                            {athleteShape === 'dot' ? (
                                <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-md relative overflow-hidden" 
                                     style={{ background: `linear-gradient(135deg, ${color}, ${color}88)`, boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                  <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent pointer-events-none" />
                                  <span className="text-white font-black text-[10px] pointer-events-none relative z-10 drop-shadow-sm">{athlete.initial}</span>
                                </div>
                            ) : (
                               <div className="relative" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}>
                                  {renderAthleteIcon(color, 24)}
                                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white drop-shadow-md pt-0.5 pointer-events-none">{athlete.initial}</span>
                               </div>
                            )}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
          ) : sidebarTab === 'countsheet' ? (
            <div className="flex-1 overflow-auto p-8 custom-scrollbar">
               {/* Count sheet content (same as before) */}
               <div className="max-w-6xl mx-auto bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-zinc-200">8 Count Sheet</h2>
                  <button onClick={addCountRow} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-lg text-sm font-bold text-white transition-colors">+ Add 8-Count</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-zinc-400 uppercase bg-black/20">
                      <tr>
                        <th className="px-4 py-3 w-16 text-center">#</th>
                        <th className="px-4 py-3 w-40">Section</th>
                        {[1,2,3,4,5,6,7,8].map(n => <th key={n} className="px-4 py-3 text-center border-l border-white/5">{n}</th>)}
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {countSheet.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-4 py-3 text-center font-mono text-zinc-500">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <input value={row.section} onChange={(e) => updateCountRow(row.id, 'section', e.target.value)} className="w-full bg-transparent focus:outline-none text-rose-400 placeholder-zinc-700 font-bold" placeholder="Section Name" />
                          </td>
                          {row.counts.map((val, cIdx) => (
                            <td key={cIdx} className="px-2 py-3 border-l border-white/5">
                              <input value={val} onChange={(e) => updateCountRow(row.id, 'counts', e.target.value, cIdx)} className="w-full bg-transparent text-center focus:outline-none text-zinc-300 placeholder-zinc-800" placeholder="-" />
                            </td>
                          ))}
                          <td className="px-2 py-3 text-right">
                            <button onClick={() => deleteCountRow(row.id)} className="text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><X className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : sidebarTab === 'skills' ? (
            renderSkillTracker()
          ) : sidebarTab === 'scoring' ? (
            renderScoringRubric()
          ) : (
            renderPlanEditor(sidebarTab === 'practice' ? 'practice' : 'class')
          )}

          {/* Timeline Deck - Only show when mat visible */}
          {(sidebarTab === 'roster' || sidebarTab === 'formations' || sidebarTab === 'settings') && TimelineDeck}
        </main>
      </div>

      {/* PRINT VIEW (Hidden on Screen) */}
      <PrintLayout />
    </div>
  );
};

export default App;