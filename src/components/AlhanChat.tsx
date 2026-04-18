import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alhan-chat`;

/**
 * Leest de response-body exact één keer (text() verbruikt de stream).
 * Geeft geparseerde `error` terug indien JSON met stringveld; altijd een korte preview voor logging.
 */
async function readAlhanChatErrorPayload(resp: Response): Promise<{
  serverMessage: string | null;
  bodyPreview: string;
}> {
  const text = await resp.text();
  const bodyPreview = text.length > 600 ? `${text.slice(0, 600)}…` : text || '(leeg)';
  if (!text.trim()) {
    return { serverMessage: null, bodyPreview };
  }
  try {
    const parsed = JSON.parse(text) as { error?: unknown };
    if (typeof parsed.error === 'string' && parsed.error.trim()) {
      return { serverMessage: parsed.error.trim(), bodyPreview };
    }
  } catch {
    /* geen JSON */
  }
  return { serverMessage: null, bodyPreview };
}

const LOGGED_IN_GREETING: Msg = {
  role: 'assistant',
  content:
    'Hoi! 👋 Ik ben Alhan, je AI profiel-coach. Vraag me alles over je profiel, opdrachten, of hoe je meer punten kunt verdienen!',
};

async function streamChat({
  messages,
  profileContext,
  dashboardCoachContext,
  onDelta,
  onDone,
  onError,
}: {
  messages: { role: string; content: string }[];
  profileContext: Record<string, unknown> | null;
  dashboardCoachContext?: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    onError('Log in om de chat te gebruiken.');
    return;
  }

  let resp: Response;
  try {
    resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        messages,
        profileContext,
        ...(dashboardCoachContext ? { dashboardCoachContext } : {}),
      }),
    });
  } catch (e) {
    console.error('[AlhanChat] fetch failed', e);
    onError(
      import.meta.env.DEV && e instanceof Error
        ? `Netwerkfout: ${e.message}`
        : 'Er ging iets mis. Probeer het later opnieuw.',
    );
    return;
  }

  if (!resp.ok) {
    const { serverMessage, bodyPreview } = await readAlhanChatErrorPayload(resp);
    console.error('[AlhanChat] alhan-chat HTTP error', {
      status: resp.status,
      parsedError: serverMessage,
      bodyPreview: bodyPreview.slice(0, 500),
    });
    if (resp.status === 401) {
      onError('Log in om de chat te gebruiken.');
      return;
    }
    if (resp.status === 429) {
      onError('Te veel verzoeken, probeer het later opnieuw.');
      return;
    }
    if (resp.status === 402) {
      onError('AI-tegoed op. Neem contact op met de beheerder.');
      return;
    }
    const generic = 'Er ging iets mis. Probeer het later opnieuw.';
    if (import.meta.env.DEV && serverMessage) {
      onError(`[${resp.status}] ${serverMessage}`);
      return;
    }
    onError(generic);
    return;
  }

  if (!resp.body) {
    console.error('[AlhanChat] alhan-chat response OK maar geen body', { status: resp.status });
    onError(
      import.meta.env.DEV
        ? `Streaming mislukt (HTTP ${resp.status}, lege body).`
        : 'Er ging iets mis. Probeer het later opnieuw.',
    );
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = '';
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + '\n' + textBuffer;
        break;
      }
    }
  }

  if (textBuffer.trim()) {
    for (let raw of textBuffer.split('\n')) {
      if (!raw) continue;
      if (raw.endsWith('\r')) raw = raw.slice(0, -1);
      if (raw.startsWith(':') || raw.trim() === '') continue;
      if (!raw.startsWith('data: ')) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        /* ignore */
      }
    }
  }

  onDone();
}

const AlhanChat = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginRoute = location.pathname === '/login';
  const isHomeRoute = location.pathname === '/';
  const isProfileRoute = location.pathname === '/profile';
  const isHoursRoute = location.pathname === '/hours';
  const isWorkRoute = location.pathname === '/work';
  const isNetworkRoute = location.pathname === '/network';
  const isSafetyRoute = location.pathname === '/safety';

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileContext, setProfileContext] = useState<Record<string, unknown> | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const prevAuthUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('alhan-chat:open', onOpen as EventListener);
    return () => window.removeEventListener('alhan-chat:open', onOpen as EventListener);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) {
        setUser(session?.user ?? null);
        setAuthReady(true);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) setProfileContext(null);
  }, [user]);

  useEffect(() => {
    if (!authReady) return;
    const uid = user?.id ?? null;
    if (prevAuthUserIdRef.current === undefined) {
      prevAuthUserIdRef.current = uid;
      if (uid) setMessages([LOGGED_IN_GREETING]);
      else setMessages([]);
      return;
    }
    if (uid !== prevAuthUserIdRef.current) {
      prevAuthUserIdRef.current = uid;
      if (uid) setMessages([LOGGED_IN_GREETING]);
      else setMessages([]);
    }
  }, [authReady, user?.id]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!open || user) return undefined;

    setMessages([{ role: 'assistant', content: t('chat.teaserWelcome') }]);
    const id = window.setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: t('chat.teaserUrgency') }]);
    }, 3000);
    return () => clearTimeout(id);
  }, [open, user, t]);

  const loadProfileContext = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;

    const [
      { data: profile },
      { data: scores },
      { data: achievements },
      { data: certs },
      { data: completions },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, specialization, city, hourly_rate, bio, transport_type, has_own_equipment, status, avatar_url')
        .eq('user_id', u.id)
        .single(),
      supabase.from('leaderboard_scores').select('total_points, current_streak, level, challenges_completed').eq('user_id', u.id).single(),
      supabase.from('user_achievements').select('achievement_id, achievements(name)').eq('user_id', u.id),
      supabase.from('certificates').select('name, expiry_date').eq('user_id', u.id),
      supabase
        .from('user_challenge_completions')
        .select('completed_date')
        .eq('user_id', u.id)
        .order('completed_date', { ascending: false })
        .limit(7),
    ]);

    setProfileContext({
      profile,
      scores,
      achievements: achievements?.map((a: { achievements?: { name?: string } }) => a.achievements?.name).filter(Boolean),
      certificates: certs,
      recentActivity: completions?.length || 0,
    });
  }, []);

  useEffect(() => {
    if (!open || !user) return;
    void loadProfileContext();
  }, [open, user, loadProfileContext]);

  const send = async () => {
    if (!user || !input.trim() || loading) return;
    const userMsg: Msg = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    let assistantSoFar = '';

    const upsertAssistant = (nextChunk: string) => {
      assistantSoFar += nextChunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && prev.length > newMessages.length) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        profileContext,
        dashboardCoachContext: undefined,
        onDelta: chunk => upsertAssistant(chunk),
        onDone: () => setLoading(false),
        onError: msg => {
          setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
          setLoading(false);
        },
      });
    } catch (err) {
      console.error('[AlhanChat] send / stream error', err);
      const fallback = 'Er ging iets mis. Probeer het later opnieuw.';
      const detail =
        import.meta.env.DEV && err instanceof Error && err.message.trim() ? err.message.trim() : null;
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: detail ? `${fallback} (${detail})` : fallback },
      ]);
      setLoading(false);
    }
  };

  const fabBottomClass = isLoginRoute
    ? 'bottom-[calc(6.25rem+env(safe-area-inset-bottom,0px))]'
    : 'bottom-6 mb-safe';

  return (
    <>
      <AnimatePresence>
        {!open &&
          !isHomeRoute &&
          !isProfileRoute &&
          !isHoursRoute &&
          !isWorkRoute &&
          !isNetworkRoute &&
          !isSafetyRoute && (
          <motion.button
            type="button"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setOpen(true)}
            className={cn(
              'fixed right-4 z-50 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:shadow-2xl transition-shadow min-h-11 min-w-11 h-11 w-11 sm:h-12 sm:w-12',
              fabBottomClass,
            )}
            aria-label={t('common.openAssistant')}
          >
            <Bot className="w-6 h-6 shrink-0" aria-hidden />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-0 right-0 left-0 z-50 pb-safe sm:bottom-4 sm:right-4 sm:left-auto sm:w-96 sm:pb-0"
          >
            <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col h-[70vh] sm:h-[500px]">
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-sm">Alhan AI</p>
                  <p className="text-xs text-foreground/80">Jouw profiel-coach</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors min-h-11 min-w-11 inline-flex items-center justify-center"
                  aria-label={t('common.closeMenu')}
                >
                  <X className="w-4 h-4 text-foreground/80" aria-hidden />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
                {user && loading && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEnd} />
              </div>

              {user ? (
                <div className="p-3 border-t border-border pb-safe sm:pb-3">
                  <div className="flex gap-2">
                    <input
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && send()}
                      placeholder="Stel een vraag..."
                      aria-label={t('common.sendMessage')}
                      className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/55 outline-none focus:ring-2 focus:ring-primary/30 min-h-11"
                    />
                    <button
                      type="button"
                      onClick={() => void send()}
                      disabled={!input.trim() || loading}
                      className="min-h-11 min-w-11 h-11 w-11 shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 transition-opacity"
                      aria-label={t('common.sendMessage')}
                    >
                      <Send className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 border-t border-border pb-safe sm:pb-3">
                  <Button
                    type="button"
                    className="w-full min-h-12 rounded-xl text-base font-semibold gradient-primary text-primary-foreground hover:opacity-90"
                    onClick={() => {
                      setOpen(false);
                      navigate('/register');
                    }}
                  >
                    {t('chat.registerNow')}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AlhanChat;
