import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Command,
  FileText,
  HelpCircle,
  Laptop,
  ListTodo,
  Menu,
  Mic,
  MoreHorizontal,
  Moon,
  Plus,
  RotateCcw,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

type Section = 'overview' | 'tasks' | 'notes' | 'activity';
type Task = { id: string; title: string; done: boolean; createdAt: string; source?: string };
type Note = { id: string; title: string; body: string; updatedAt: string };
type ActivityItem = { id: string; label: string; detail: string; time: string; tone: 'amber' | 'teal' | 'slate' };
type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string; time: string };

const STORAGE = {
  tasks: 'jarvis-controller:tasks',
  notes: 'jarvis-controller:notes',
  activity: 'jarvis-controller:activity',
  chat: 'jarvis-controller:chat',
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/+$/, '');

const nowLabel = () =>
  new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date());

const seedTasks: Task[] = [
  { id: 'task-1', title: 'Review the launch brief and mark open questions', done: false, createdAt: 'Today', source: 'local' },
  { id: 'task-2', title: 'Block a quiet hour for deep work', done: false, createdAt: 'Today', source: 'local' },
  { id: 'task-3', title: 'Send the revised project outline', done: true, createdAt: 'Yesterday', source: 'local' },
];
const seedNotes: Note[] = [
  { id: 'note-1', title: 'North star', body: 'Make the next action obvious. Remove friction before adding features.', updatedAt: 'Just now' },
  { id: 'note-2', title: 'Ideas to revisit', body: 'A small weekly review ritual. Fewer dashboards, better signals.', updatedAt: 'Yesterday' },
];
const seedActivity: ActivityItem[] = [
  { id: 'activity-1', label: 'Workspace ready', detail: 'Local mode is active on this device', time: 'Just now', tone: 'teal' },
  { id: 'activity-2', label: 'Task completed', detail: 'Send the revised project outline', time: 'Yesterday', tone: 'amber' },
  { id: 'activity-3', label: 'Note captured', detail: 'Ideas to revisit', time: 'Yesterday', tone: 'slate' },
];
const seedChat: ChatMessage[] = [
  { id: 'chat-1', role: 'assistant', text: 'Good to see you. I am ready to help you sort the next few hours.', time: '09:41' },
  { id: 'chat-2', role: 'assistant', text: 'Try “add task prepare the afternoon brief” or ask me to show your open work.', time: '09:41' },
];

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function App() {
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(() => readStorage(STORAGE.tasks, seedTasks));
  const [notes, setNotes] = useState<Note[]>(() => readStorage(STORAGE.notes, seedNotes));
  const [activity, setActivity] = useState<ActivityItem[]>(() => readStorage(STORAGE.activity, seedActivity));
  const [chat, setChat] = useState<ChatMessage[]>(() => readStorage(STORAGE.chat, seedChat));
  const [command, setCommand] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [taskDraft, setTaskDraft] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteDraft, setNoteDraft] = useState({ title: '', body: '' });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const commandRef = useRef<HTMLInputElement>(null);

  useEffect(() => { window.localStorage.setItem(STORAGE.tasks, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { window.localStorage.setItem(STORAGE.notes, JSON.stringify(notes)); }, [notes]);
  useEffect(() => { window.localStorage.setItem(STORAGE.activity, JSON.stringify(activity)); }, [activity]);
  useEffect(() => { window.localStorage.setItem(STORAGE.chat, JSON.stringify(chat)); }, [chat]);
  useEffect(() => {
    let active = true;
    fetch(`${API_BASE_URL}/healthz`)
      .then((response) => {
        if (!response.ok) throw new Error('Backend health check failed');
        return response.json() as Promise<{ status?: string }>;
      })
      .then((health) => {
        if (active) setBackendOnline(health.status === 'ok');
      })
      .catch(() => {
        if (active) setBackendOnline(false);
      });
    return () => { active = false; };
  }, []);

  const openTasks = useMemo(() => tasks.filter((task) => !task.done), [tasks]);
  const completedTasks = tasks.length - openTasks.length;

  const addActivity = (label: string, detail: string, tone: ActivityItem['tone'] = 'amber') => {
    setActivity((current) => [
      { id: `activity-${Date.now()}`, label, detail, time: 'Just now', tone },
      ...current,
    ].slice(0, 12));
  };

  const addTask = (title: string) => {
    const clean = title.trim();
    if (!clean) return;
    setTasks((current) => [{ id: `task-${Date.now()}`, title: clean, done: false, createdAt: 'Just now', source: 'local' }, ...current]);
    addActivity('Task added', clean, 'amber');
    setTaskDraft('');
    setAddingTask(false);
  };

  const toggleTask = (id: string) => {
    const target = tasks.find((task) => task.id === id);
    if (!target) return;
    setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task));
    addActivity(target.done ? 'Task reopened' : 'Task completed', target.title, target.done ? 'slate' : 'teal');
  };

  const deleteTask = (id: string) => {
    const target = tasks.find((task) => task.id === id);
    setTasks((current) => current.filter((task) => task.id !== id));
    if (target) addActivity('Task removed', target.title, 'slate');
  };

  const saveNote = () => {
    const title = noteDraft.title.trim() || 'Untitled note';
    const body = noteDraft.body.trim();
    if (editingNote) {
      setNotes((current) => current.map((note) => note.id === editingNote.id ? { ...note, title, body, updatedAt: 'Just now' } : note));
      addActivity('Note updated', title, 'teal');
    } else {
      setNotes((current) => [{ id: `note-${Date.now()}`, title, body, updatedAt: 'Just now' }, ...current]);
      addActivity('Note captured', title, 'teal');
    }
    setEditingNote(null);
    setNoteDraft({ title: '', body: '' });
  };

  const deleteNote = (id: string) => {
    const target = notes.find((note) => note.id === id);
    setNotes((current) => current.filter((note) => note.id !== id));
    if (target) addActivity('Note removed', target.title, 'slate');
  };

  const respondToCommand = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const time = nowLabel();
    setChat((current) => [...current, { id: `chat-${Date.now()}`, role: 'user', text: clean, time }]);
    setCommand('');
    const lower = clean.toLowerCase();
    let response = 'I captured that locally. Try “add task …” or “show my tasks” when you want me to act.';
    if (lower.startsWith('add task ')) {
      addTask(clean.slice(9));
      response = `Added “${clean.slice(9).trim()}” to your task list.`;
    } else if (lower.startsWith('note ')) {
      const title = clean.slice(5).trim() || 'Quick note';
      setEditingNote(null);
      setNoteDraft({ title, body: '' });
      setActiveSection('notes');
      response = `Opened a new note called “${title}”.`;
    } else if (lower.includes('show') && lower.includes('task')) {
      setActiveSection('tasks');
      response = `You have ${openTasks.length} open ${openTasks.length === 1 ? 'task' : 'tasks'}.`;
    } else if (lower.includes('help')) {
      setHelpOpen(true);
      response = 'I opened the local command guide for you.';
    }
    window.setTimeout(() => setChat((current) => [...current, { id: `chat-${Date.now()}-reply`, role: 'assistant', text: response, time: nowLabel() }]), 180);
  };

  const startListening = () => {
    type Recognition = { lang: string; interimResults: boolean; maxAlternatives: number; start: () => void; onresult: (event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void; onend: () => void; };
    type RecognitionWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Speech = (window as RecognitionWindow).SpeechRecognition || (window as RecognitionWindow).webkitSpeechRecognition;
    if (!Speech) {
      commandRef.current?.focus();
      return;
    }
    const recognition = new Speech();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => setCommand(event.results[0][0].transcript);
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  };

  const resetLocalData = () => {
    setTasks(seedTasks);
    setNotes(seedNotes);
    setActivity(seedActivity);
    setChat(seedChat);
    addActivity('Workspace reset', 'Returned to the starter local workspace', 'slate');
    setSettingsOpen(false);
  };

  const beginEditNote = (note: Note) => {
    setEditingNote(note);
    setNoteDraft({ title: note.title, body: note.body });
  };

  return (
    <div className="app-shell noise">
      <div className="flex min-h-[100dvh]">
        <aside className={`sidebar-glass fixed inset-y-0 left-0 z-40 flex w-[258px] flex-col px-4 py-5 transition-transform duration-300 md:static md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="mb-8 flex items-center justify-between px-2">
            <button className="flex items-center gap-3 text-left" onClick={() => { setActiveSection('overview'); setSidebarOpen(false); }} aria-label="Go to overview">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg shadow-[hsl(var(--primary)/.12)]"><Command size={18} strokeWidth={2.5} /></div>
              <div><div className="text-[15px] font-extrabold tracking-tight text-[hsl(var(--foreground))]">JARVIS</div><div className="mono text-[9px] uppercase tracking-[.22em] text-[hsl(var(--muted-foreground))]">local operator</div></div>
            </button>
            <button className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] md:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={17} /></button>
          </div>
          <nav className="space-y-1" aria-label="Main navigation">
            <NavItem icon={<Laptop size={17} />} label="Command center" active={activeSection === 'overview'} onClick={() => { setActiveSection('overview'); setSidebarOpen(false); }} />
            <NavItem icon={<ListTodo size={17} />} label="Tasks" count={openTasks.length} active={activeSection === 'tasks'} onClick={() => { setActiveSection('tasks'); setSidebarOpen(false); }} />
            <NavItem icon={<FileText size={17} />} label="Notes" count={notes.length} active={activeSection === 'notes'} onClick={() => { setActiveSection('notes'); setSidebarOpen(false); }} />
            <NavItem icon={<Activity size={17} />} label="Activity" active={activeSection === 'activity'} onClick={() => { setActiveSection('activity'); setSidebarOpen(false); }} />
          </nav>
          <div className="mt-auto">
            <div className="mb-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.48)] p-3.5">
              <div className="mb-2 flex items-center gap-2"><span className="signal-dot h-2 w-2 rounded-full bg-[hsl(var(--accent))]" /><span className="mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--accent))]">Local mode</span></div>
              <p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">Your workspace stays on this device. No API keys required.</p>
            </div>
            <div className="space-y-1">
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]" onClick={() => setSettingsOpen(true)}><Settings size={16} /> Settings <span className="ml-auto mono text-[9px] opacity-50">⌘,</span></button>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]" onClick={() => setHelpOpen(true)}><HelpCircle size={16} /> How it works</button>
            </div>
          </div>
        </aside>
        {sidebarOpen && <button className="fixed inset-0 z-30 bg-[hsl(225_45%_4%/.65)] md:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close navigation overlay" />}

        <main className="min-w-0 flex-1">
          <header className="flex h-[72px] items-center justify-between border-b border-[hsl(var(--border)/.75)] px-5 md:px-10">
            <div className="flex items-center gap-3">
              <button className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] md:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
              <div className="hidden items-center gap-2 md:flex"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" /><span className="mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">System nominal</span></div>
              <div className="md:hidden"><span className="text-sm font-bold tracking-tight">JARVIS</span></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] px-3 py-1.5 sm:flex"><span className={`signal-dot h-1.5 w-1.5 rounded-full ${backendOnline ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--muted-foreground))]'}`} /><span className="mono text-[10px] text-[hsl(var(--muted-foreground))]">{backendOnline ? 'API CONNECTED' : 'LOCAL MODE'}</span></div>
              <button className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]" onClick={() => setHelpOpen(true)} aria-label="Open help"><HelpCircle size={18} /></button>
              <button className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]" onClick={() => setSettingsOpen(true)} aria-label="Open settings"><Settings size={18} /></button>
              <div className="ml-1 grid h-8 w-8 place-items-center rounded-full border border-[hsl(var(--primary)/.45)] bg-[hsl(var(--primary)/.12)] mono text-[11px] font-medium text-[hsl(var(--primary))]">OP</div>
            </div>
          </header>
          <div className="mx-auto max-w-[1380px] px-5 py-8 md:px-10 md:py-10">
            {activeSection === 'overview' && <Overview openTasks={openTasks} completedTasks={completedTasks} tasks={tasks} notes={notes} activity={activity} chat={chat} command={command} setCommand={setCommand} respondToCommand={respondToCommand} startListening={startListening} listening={listening} commandRef={commandRef} setActiveSection={setActiveSection} toggleTask={toggleTask} addTask={() => setAddingTask(true)} />}
            {activeSection === 'tasks' && <TasksView tasks={tasks} openTasks={openTasks} setAddingTask={setAddingTask} toggleTask={toggleTask} deleteTask={deleteTask} />}
            {activeSection === 'notes' && <NotesView notes={notes} editingNote={editingNote} noteDraft={noteDraft} setNoteDraft={setNoteDraft} beginEditNote={beginEditNote} deleteNote={deleteNote} saveNote={saveNote} cancelNote={() => { setEditingNote(null); setNoteDraft({ title: '', body: '' }); }} startNew={() => { setEditingNote(null); setNoteDraft({ title: 'Untitled note', body: '' }); }} />}
            {activeSection === 'activity' && <ActivityView activity={activity} />}
          </div>
        </main>
      </div>
      {addingTask && <TaskDialog draft={taskDraft} setDraft={setTaskDraft} onClose={() => setAddingTask(false)} onSave={() => addTask(taskDraft)} />}
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} onReset={resetLocalData} />}
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

function NavItem({ icon, label, count, active, onClick }: { icon: ReactNode; label: string; count?: number; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all ${active ? 'bg-[hsl(var(--primary)/.11)] font-semibold text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary)/.8)] hover:text-[hsl(var(--foreground))]'}`}><span className={active ? 'text-[hsl(var(--primary))]' : 'opacity-75'}>{icon}</span><span>{label}</span>{count !== undefined && <span className={`mono ml-auto text-[10px] ${active ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>{count}</span>}</button>;
}

type OverviewProps = {
  openTasks: Task[]; completedTasks: number; tasks: Task[]; notes: Note[]; activity: ActivityItem[]; chat: ChatMessage[];
  command: string; setCommand: (value: string) => void; respondToCommand: (value: string) => void;
  startListening: () => void; listening: boolean; commandRef: React.RefObject<HTMLInputElement | null>;
  setActiveSection: (section: Section) => void; toggleTask: (id: string) => void; addTask: () => void;
};

function Overview({ openTasks, completedTasks, tasks, notes, activity, chat, command, setCommand, respondToCommand, startListening, listening, commandRef, setActiveSection, toggleTask, addTask }: OverviewProps) {
  const submit = (event: FormEvent) => { event.preventDefault(); respondToCommand(command); };
  return <div className="space-y-7">
    <div className="fade-up flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div><div className="mono mb-3 text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">Thursday · 09:42 local</div><h1 className="text-3xl font-extrabold tracking-[-.04em] text-[hsl(var(--foreground))] md:text-[42px]">Good morning, operator.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">A quiet view of what needs your attention. I am listening for the next useful move.</p></div>
      <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]"><ShieldCheck size={15} className="text-[hsl(var(--accent))]" /> Private by default</div>
    </div>
    <form className="glass fade-up fade-up-delay-1 relative overflow-hidden rounded-2xl p-4 md:p-5" onSubmit={submit}>
      <div className="absolute right-0 top-0 h-32 w-48 rounded-full bg-[hsl(var(--primary)/.06)] blur-3xl" />
      <div className="relative flex items-start gap-3"><div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[hsl(var(--primary)/.13)] text-[hsl(var(--primary))]"><Sparkles size={17} /></div><div className="min-w-0 flex-1"><div className="mb-2 flex items-center justify-between"><label htmlFor="command" className="mono text-[10px] uppercase tracking-[.17em] text-[hsl(var(--muted-foreground))]">Command line</label><span className="hidden text-[11px] text-[hsl(var(--muted-foreground))] sm:block">Local assistant · no network</span></div><input ref={commandRef} id="command" value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Ask Jarvis to organize the next thing…" className="w-full bg-transparent py-1 text-base text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground)/.7)] md:text-lg" /><div className="mt-4 flex items-center gap-2"><button type="button" onClick={startListening} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${listening ? 'border-[hsl(var(--primary)/.7)] bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]'}`}><Mic size={14} /> {listening ? 'Listening…' : 'Speak'}</button><span className="hidden text-[11px] text-[hsl(var(--muted-foreground))] md:block">Try “add task…”</span><button type="submit" className="ml-auto flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3.5 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5">Send <Send size={14} /></button></div></div></div>
    </form>
    <section className="glass fade-up fade-up-delay-1 rounded-2xl p-4 md:p-5"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><div className="grid h-6 w-6 place-items-center rounded-lg bg-[hsl(var(--accent)/.12)] text-[hsl(var(--accent))]"><Command size={13} /></div><span className="text-xs font-semibold">Operator thread</span></div><span className="mono text-[9px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Stored locally</span></div><div className="space-y-2.5">{chat.slice(-4).map((message) => <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-xl px-3 py-2 text-xs leading-5 ${message.role === 'user' ? 'bg-[hsl(var(--primary)/.14)] text-[hsl(var(--foreground))]' : 'bg-[hsl(var(--secondary)/.68)] text-[hsl(var(--secondary-foreground))]'}`}><div>{message.text}</div><div className="mono mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">{message.time}</div></div></div>)}</div></section>
    <div className="fade-up fade-up-delay-2 grid gap-4 sm:grid-cols-3">
      <Metric label="Open tasks" value={openTasks.length.toString().padStart(2, '0')} detail={openTasks.length ? 'Needs your attention' : 'Clear runway'} icon={<ListTodo size={16} />} accent="amber" />
      <Metric label="Completed" value={completedTasks.toString().padStart(2, '0')} detail="In this local space" icon={<CheckCircle2 size={16} />} accent="teal" />
      <Metric label="Notes captured" value={notes.length.toString().padStart(2, '0')} detail="Ideas worth keeping" icon={<FileText size={16} />} accent="slate" />
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <section className="glass fade-up fade-up-delay-2 rounded-2xl p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between"><div><div className="mono mb-1 text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Priority queue</div><h2 className="text-lg font-bold tracking-tight">Your next moves</h2></div><button onClick={addTask} className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-xs font-semibold text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary))]"><Plus size={14} /> Add task</button></div>
        {openTasks.length ? <div className="space-y-2">{openTasks.slice(0, 4).map((task) => <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id)} />)}</div> : <EmptyState icon={<CheckCircle2 size={21} />} title="Runway is clear" detail="You have no open tasks. Add one when something lands." action="Add a task" onAction={addTask} />}
        {tasks.length > 4 && <button onClick={() => setActiveSection('tasks')} className="mt-4 flex items-center gap-1 text-xs font-semibold text-[hsl(var(--primary))] hover:gap-2">View all tasks <ArrowUpRight size={14} /></button>}
      </section>
      <section className="glass fade-up fade-up-delay-3 rounded-2xl p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between"><div><div className="mono mb-1 text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Recent signal</div><h2 className="text-lg font-bold tracking-tight">Activity</h2></div><button onClick={() => setActiveSection('activity')} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" aria-label="View all activity"><ArrowUpRight size={17} /></button></div>
        <div className="space-y-4">{activity.slice(0, 4).map((item) => <ActivityRow key={item.id} item={item} />)}</div>
      </section>
    </div>
    <section className="fade-up fade-up-delay-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.35)] p-4 md:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[hsl(var(--accent)/.12)] text-[hsl(var(--accent))]"><Zap size={17} /></div><div className="flex-1"><p className="text-sm font-semibold">A focused workspace, kept close.</p><p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">Tasks, notes, activity, and commands are stored in your browser. Nothing leaves this device.</p></div><button onClick={() => setActiveSection('notes')} className="flex items-center gap-1 self-start text-xs font-semibold text-[hsl(var(--accent))] sm:self-auto">Open notes <ChevronRight size={14} /></button></div></section>
  </div>;
}

function Metric({ label, value, detail, icon, accent }: { label: string; value: string; detail: string; icon: ReactNode; accent: 'amber' | 'teal' | 'slate' }) {
  const color = accent === 'amber' ? 'text-[hsl(var(--primary))] bg-[hsl(var(--primary)/.1)]' : accent === 'teal' ? 'text-[hsl(var(--accent))] bg-[hsl(var(--accent)/.1)]' : 'text-[hsl(var(--secondary-foreground))] bg-[hsl(var(--secondary))]';
  return <div className="glass rounded-xl p-4"><div className={`mb-4 grid h-8 w-8 place-items-center rounded-lg ${color}`}>{icon}</div><div className="flex items-end justify-between gap-2"><div><div className="text-xs text-[hsl(var(--muted-foreground))]">{label}</div><div className="mt-1 text-2xl font-extrabold tracking-tight">{value}</div></div><span className="text-right text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{detail}</span></div></div>;
}

function TaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete?: () => void }) {
  return <div className="group flex items-center gap-3 rounded-xl border border-transparent px-2 py-3 transition-colors hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary)/.45)]"><button onClick={onToggle} className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-all ${task.done ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))]' : 'border-[hsl(var(--muted-foreground)/.65)] hover:border-[hsl(var(--primary))]'}`} aria-label={task.done ? `Reopen ${task.title}` : `Complete ${task.title}`}>{task.done && <Check size={13} strokeWidth={3} />}</button><div className={`min-w-0 flex-1 text-sm ${task.done ? 'text-[hsl(var(--muted-foreground))] line-through' : 'text-[hsl(var(--foreground))]'}`}>{task.title}<div className="mono mt-1 text-[9px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">{task.createdAt}</div></div>{onDelete && <button onClick={onDelete} className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity hover:text-[hsl(var(--destructive))] group-hover:opacity-100" aria-label={`Delete ${task.title}`}><Trash2 size={14} /></button>}</div>;
}

function TasksView({ tasks, openTasks, setAddingTask, toggleTask, deleteTask }: { tasks: Task[]; openTasks: Task[]; setAddingTask: (value: boolean) => void; toggleTask: (id: string) => void; deleteTask: (id: string) => void }) {
  return <div className="space-y-6"><PageHeading eyebrow="WORK QUEUE" title="Tasks" detail={`${openTasks.length} open · ${tasks.length - openTasks.length} complete`} action={<button onClick={() => setAddingTask(true)} className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3.5 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"><Plus size={15} /> Add task</button>} /><div className="glass rounded-2xl p-5 md:p-7">{tasks.length ? <div className="space-y-1">{tasks.map((task) => <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id)} onDelete={() => deleteTask(task.id)} />)}</div> : <EmptyState icon={<ListTodo size={21} />} title="Nothing on the queue" detail="Capture the first thing you want to move forward." action="Add a task" onAction={() => setAddingTask(true)} />}</div></div>;
}

function NotesView({ notes, editingNote, noteDraft, setNoteDraft, beginEditNote, deleteNote, saveNote, cancelNote, startNew }: { notes: Note[]; editingNote: Note | null; noteDraft: { title: string; body: string }; setNoteDraft: (value: { title: string; body: string }) => void; beginEditNote: (note: Note) => void; deleteNote: (id: string) => void; saveNote: () => void; cancelNote: () => void; startNew: () => void }) {
  return <div className="space-y-6"><PageHeading eyebrow="MEMORY BANK" title="Notes" detail={`${notes.length} local ${notes.length === 1 ? 'note' : 'notes'}`} action={<button onClick={startNew} className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3.5 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"><Plus size={15} /> New note</button>} />{editingNote !== null || noteDraft.title || noteDraft.body ? <NoteEditor draft={noteDraft} setDraft={setNoteDraft} onSave={saveNote} onCancel={cancelNote} editing={Boolean(editingNote)} /> : null}<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{notes.map((note) => <article key={note.id} className="glass group rounded-2xl p-5 transition-transform hover:-translate-y-0.5"><div className="mb-5 flex items-start justify-between"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[hsl(var(--accent)/.1)] text-[hsl(var(--accent))]"><FileText size={16} /></div><div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"><button onClick={() => beginEditNote(note)} className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]" aria-label={`Edit ${note.title}`}><MoreHorizontal size={16} /></button><button onClick={() => deleteNote(note.id)} className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--destructive)/.1)] hover:text-[hsl(var(--destructive))] " aria-label={`Delete ${note.title}`}><Trash2 size={15} /></button></div></div><h3 className="font-bold">{note.title}</h3><p className="mt-2 min-h-[56px] whitespace-pre-wrap text-sm leading-6 text-[hsl(var(--muted-foreground))]">{note.body || 'No additional detail yet.'}</p><div className="mono mt-5 border-t border-[hsl(var(--border))] pt-3 text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Updated {note.updatedAt}</div></article>)}</div>{!notes.length && !noteDraft.title && <EmptyState icon={<FileText size={21} />} title="Your memory bank is quiet" detail="Keep a thought nearby before it disappears." action="Write a note" onAction={startNew} />}</div>;
}

function ActivityView({ activity }: { activity: ActivityItem[] }) {
  return <div className="space-y-6"><PageHeading eyebrow="SYSTEM LOG" title="Activity" detail="A local record of your workspace" /><div className="glass rounded-2xl p-5 md:p-7"><div className="space-y-1">{activity.map((item) => <ActivityRow key={item.id} item={item} spacious />)}</div>{!activity.length && <EmptyState icon={<Activity size={21} />} title="No activity yet" detail="Your local actions will appear here." />}</div></div>;
}

function PageHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: ReactNode }) {
  return <div className="fade-up flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mono mb-3 text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">{eyebrow}</div><h1 className="text-3xl font-extrabold tracking-[-.04em] md:text-[40px]">{title}</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{detail}</p></div>{action}</div>;
}

function ActivityRow({ item, spacious = false }: { item: ActivityItem; spacious?: boolean }) {
  const dot = item.tone === 'teal' ? 'bg-[hsl(var(--accent))]' : item.tone === 'amber' ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted-foreground))]';
  return <div className={`flex gap-3 ${spacious ? 'rounded-xl px-2 py-4 hover:bg-[hsl(var(--secondary)/.4)]' : ''}`}><div className="relative mt-1.5 flex w-4 justify-center"><span className={`h-2 w-2 rounded-full ${dot}`} />{spacious && <span className="absolute top-4 h-full w-px bg-[hsl(var(--border))]" />}</div><div className="min-w-0 flex-1"><div className="flex items-baseline justify-between gap-3"><p className="text-sm font-semibold">{item.label}</p><span className="mono shrink-0 text-[9px] text-[hsl(var(--muted-foreground))]">{item.time}</span></div><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{item.detail}</p></div></div>;
}

function EmptyState({ icon, title, detail, action, onAction }: { icon: ReactNode; title: string; detail: string; action?: string; onAction?: () => void }) {
  return <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[hsl(var(--border))] px-5 py-12 text-center"><div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">{icon}</div><h3 className="font-bold">{title}</h3><p className="mt-1 max-w-xs text-xs leading-5 text-[hsl(var(--muted-foreground))]">{detail}</p>{action && onAction && <button onClick={onAction} className="mt-5 flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--primary))]">{action} <ChevronRight size={14} /></button>}</div>;
}

function InlineTaskForm({ draft, setDraft, onSave, onCancel }: { draft: string; setDraft: (value: string) => void; onSave: () => void; onCancel: () => void }) {
  return <form className="glass rounded-xl p-4" onSubmit={(event) => { event.preventDefault(); onSave(); }}><input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="What needs to happen?" className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.55)] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--primary)/.7)]" /><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">Cancel</button><button type="submit" className="rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))]">Save task</button></div></form>;
}

function NoteEditor({ draft, setDraft, onSave, onCancel, editing }: { draft: { title: string; body: string }; setDraft: (value: { title: string; body: string }) => void; onSave: () => void; onCancel: () => void; editing: boolean }) {
  return <form className="glass fade-up rounded-2xl p-5 md:p-6" onSubmit={(event) => { event.preventDefault(); onSave(); }}><div className="mb-4 flex items-center justify-between"><div className="mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--primary))]">{editing ? 'EDIT NOTE' : 'NEW NOTE'}</div><button type="button" onClick={onCancel} className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]" aria-label="Close note editor"><X size={16} /></button></div><input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Note title" className="mb-3 w-full bg-transparent text-xl font-bold outline-none placeholder:text-[hsl(var(--muted-foreground)/.7)]" /><textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="Write the useful part…" rows={4} className="w-full resize-none rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.4)] p-3 text-sm leading-6 outline-none focus:border-[hsl(var(--primary)/.7)]" /><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">Cancel</button><button type="submit" className="rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))]">Save note</button></div></form>;
}

function TaskDialog({ draft, setDraft, onClose, onSave }: { draft: string; setDraft: (value: string) => void; onClose: () => void; onSave: () => void }) {
  return <Modal title="Add a task" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(); }}><p className="mb-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Give the next action a clear verb. Jarvis will keep it on this device.</p><input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="e.g. Prepare the afternoon brief" className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.6)] px-3 py-3 text-sm outline-none focus:border-[hsl(var(--primary)/.7)]" /><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">Cancel</button><button type="submit" className="rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))]">Add task</button></div></form></Modal>;
}

function SettingsDialog({ onClose, onReset }: { onClose: () => void; onReset: () => void }) {
  return <Modal title="Workspace settings" onClose={onClose}><div className="space-y-4"><div className="flex items-start gap-3 rounded-xl border border-[hsl(var(--accent)/.25)] bg-[hsl(var(--accent)/.07)] p-3.5"><ShieldCheck className="mt-0.5 shrink-0 text-[hsl(var(--accent))]" size={17} /><div><p className="text-sm font-semibold">Local mode is on</p><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">There are no connected services or API keys. Your workspace is stored in browser localStorage.</p></div></div><div className="flex items-center justify-between rounded-xl border border-[hsl(var(--border))] p-3.5"><div><p className="text-sm font-semibold">Appearance</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Midnight cockpit · fixed for focus</p></div><Moon size={17} className="text-[hsl(var(--muted-foreground))]" /></div><div className="border-t border-[hsl(var(--border))] pt-4"><button onClick={onReset} className="flex items-center gap-2 text-xs font-semibold text-[hsl(var(--destructive))] hover:underline"><RotateCcw size={14} /> Reset starter workspace</button><p className="mt-2 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">This replaces your local tasks, notes, and activity with the starter content.</p></div></div></Modal>;
}

function HelpDialog({ onClose }: { onClose: () => void }) {
  return <Modal title="How it works" onClose={onClose}><div className="space-y-4"><div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.4)] p-4"><div className="mb-2 flex items-center gap-2 text-sm font-bold"><Command size={16} className="text-[hsl(var(--primary))]" /> Command line</div><p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">Type a request and press Send. “add task …”, “note …”, “show my tasks”, and “help” have direct local actions. Everything else is captured as a conversation.</p></div><div className="grid gap-2 text-xs text-[hsl(var(--muted-foreground))]"><div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[hsl(var(--accent))]" /> Complete tasks from the queue</div><div className="flex items-center gap-2"><FileText size={14} className="text-[hsl(var(--accent))]" /> Create and edit notes anytime</div><div className="flex items-center gap-2"><ShieldCheck size={14} className="text-[hsl(var(--accent))]" /> Data never leaves this browser</div></div></div></Modal>;
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[hsl(225_45%_4%/.72)] p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}><div className="glass w-full max-w-md rounded-2xl p-5 shadow-2xl md:p-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose} className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]" aria-label={`Close ${title}`}><X size={17} /></button></div>{children}</div></div>;
}

export default App;