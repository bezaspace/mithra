import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";

import { BookingUpdates, type BookingUpdate } from "./components/BookingUpdates";
import { DoctorRecommendations } from "./components/DoctorRecommendations";
import { TranscriptPanel } from "./components/TranscriptPanel";
import { backendHttpUrl, backendWsUrl } from "./lib/backendUrls";
import { startMicCapture, type AudioInputController } from "./lib/audioIn";
import { AudioPlayer } from "./lib/audioOut";
import { LiveSocket, type AdherenceReportSavedEvent, type DoctorCard, type ServerEvent } from "./lib/liveSocket";
import { SchedulePage } from "./pages/SchedulePage";
import { DashboardPage } from "./pages/DashboardPage";

type ConnectionState = "idle" | "connecting" | "ready" | "error";
type VoiceVisualState = "idle" | "listening" | "holding" | "awaiting" | "speaking" | "error";
type ScheduleSnapshotEvent = Extract<ServerEvent, { type: "schedule_snapshot" }>;

const wsUrl = backendWsUrl;
const appName = import.meta.env.VITE_APP_NAME ?? "Raksha";
const defaultUserId = import.meta.env.VITE_USER_ID ?? "raksha-user";
const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const MAX_ASSISTANT_MESSAGES = 8;

const withSessionParams = (url: string, userId: string, timezone: string): string => {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}user_id=${encodeURIComponent(userId)}&timezone=${encodeURIComponent(timezone)}`;
};

const mergeTranscriptText = (current: string, incoming: string): string => {
  const currentText = current.trim();
  const incomingText = incoming.trim();

  if (!incomingText) return currentText;
  if (!currentText) return incomingText;
  if (incomingText.startsWith(currentText)) return incomingText;
  if (currentText.startsWith(incomingText)) return currentText;
  return incomingText;
};

const mergeAssistantMessages = (messages: string[], incoming: string): string[] => {
  const normalized = incoming.trim();
  if (!normalized) return messages;
  if (messages.length === 0) return [normalized];

  const next = [...messages];
  const lastMessage = next[next.length - 1];
  if (normalized === lastMessage || lastMessage.startsWith(normalized)) {
    return next;
  }
  if (normalized.startsWith(lastMessage)) {
    next[next.length - 1] = normalized;
    return next;
  }

  next.push(normalized);
  return next.slice(-MAX_ASSISTANT_MESSAGES);
};

export default function App() {
  const [state, setState] = useState<ConnectionState>("idle");
  const [warning, setWarning] = useState("");
  const [visualState, setVisualState] = useState<VoiceVisualState>("idle");
  const [userTranscript, setUserTranscript] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<string[]>([]);
  const [symptomsSummary, setSymptomsSummary] = useState("");
  const [recommendedDoctors, setRecommendedDoctors] = useState<DoctorCard[]>([]);
  const [bookingUpdates, setBookingUpdates] = useState<BookingUpdate[]>([]);
  const [isPttActive, setIsPttActive] = useState(false);
  const [liveScheduleSnapshot, setLiveScheduleSnapshot] = useState<ScheduleSnapshotEvent | null>(null);
  const [latestAdherenceEvent, setLatestAdherenceEvent] = useState<AdherenceReportSavedEvent | null>(null);

  const socket = useMemo(() => new LiveSocket(), []);
  const playerRef = useRef<AudioPlayer | null>(null);
  const micRef = useRef<AudioInputController | null>(null);
  const assistantSampleRateRef = useRef<number>(24000);
  const speakingTimeoutRef = useRef<number | null>(null);
  const isPttActiveRef = useRef(false);
  const pttSeqRef = useRef(0);
  const pendingCloseStateRef = useRef<{ state: ConnectionState; visualState: VoiceVisualState; warning: string } | null>(
    null
  );

  const logUi = (message: string, payload?: unknown) => {
    if (payload === undefined) {
      console.info(`[raksha.ui] ${message}`);
      return;
    }
    console.info(`[raksha.ui] ${message}`, payload);
  };

  useEffect(() => {
    return () => {
      if (speakingTimeoutRef.current !== null) {
        window.clearTimeout(speakingTimeoutRef.current);
      }
    };
  }, []);

  const setListeningVisual = () => {
    setVisualState("listening");
  };

  const stopAssistantPlaybackNow = () => {
    logUi("ASSISTANT_PLAYBACK_INTERRUPT");
    playerRef.current?.interruptNow();
    if (speakingTimeoutRef.current !== null) {
      window.clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }
  };

  const markPttActive = (active: boolean) => {
    isPttActiveRef.current = active;
    setIsPttActive(active);
  };

  const scheduleListeningVisual = (delayMs: number) => {
    if (speakingTimeoutRef.current !== null) {
      window.clearTimeout(speakingTimeoutRef.current);
    }
    speakingTimeoutRef.current = window.setTimeout(() => {
      if (!isPttActiveRef.current) {
        setListeningVisual();
      }
      speakingTimeoutRef.current = null;
    }, delayMs);
  };

  const connect = async () => {
    logUi("SESSION_CONNECT_START");
    pendingCloseStateRef.current = null;
    setState("connecting");
    setVisualState("idle");
    setWarning("");
    setUserTranscript("");
    setAssistantMessages([]);
    setSymptomsSummary("");
    setRecommendedDoctors([]);
    setBookingUpdates([]);
    setLiveScheduleSnapshot(null);
    setLatestAdherenceEvent(null);
    markPttActive(false);
    assistantSampleRateRef.current = 24000;

    playerRef.current = new AudioPlayer();
    socket.connect(withSessionParams(wsUrl, defaultUserId, browserTimezone), {
      onOpen: () => {
        logUi("SESSION_SOCKET_OPEN");
      },
      onClose: () => {
        logUi("SESSION_CLOSED");
        markPttActive(false);
        const pendingCloseState = pendingCloseStateRef.current;
        pendingCloseStateRef.current = null;
        if (pendingCloseState) {
          setState(pendingCloseState.state);
          setVisualState(pendingCloseState.visualState);
          setWarning(pendingCloseState.warning);
          return;
        }
        setState("idle");
        setVisualState("idle");
      },
      onError: () => {
        logUi("SESSION_ERROR");
        setWarning("Connection error. Check backend logs.");
        setState("error");
        setVisualState("error");
        markPttActive(false);
      },
      onEvent: (evt) => {
        logUi("SERVER_EVENT", { type: evt.type });
        if (evt.type === "session_ready") {
          setState("ready");
          setWarning("");
          if (!isPttActiveRef.current) {
            setListeningVisual();
          }
          return;
        }
        if (evt.type === "profile_status") {
          setWarning(evt.message);
          return;
        }
        if (evt.type === "partial_transcript") {
          setUserTranscript((current) => mergeTranscriptText(current, evt.text));
          return;
        }
        if (evt.type === "assistant_text") {
          setAssistantMessages((current) => mergeAssistantMessages(current, evt.text));
          if (!isPttActiveRef.current) {
            setVisualState("speaking");
            scheduleListeningVisual(1200);
          }
          return;
        }
        if (evt.type === "warning") {
          setWarning(evt.message);
          return;
        }
        if (evt.type === "fallback_started") {
          setWarning("Recovering your previous request after live tool interruption...");
          setVisualState("awaiting");
          return;
        }
        if (evt.type === "fallback_completed") {
          setWarning(
            evt.result === "ok"
              ? "Recovered your request. Reconnecting voice session..."
              : "Could not recover automatically. Please repeat your request."
          );
          return;
        }
        if (evt.type === "session_recovering") {
          setVisualState("awaiting");
          return;
        }
        if (evt.type === "error") {
          setWarning(evt.message);
          return;
        }
        if (evt.type === "assistant_audio_format") {
          assistantSampleRateRef.current = evt.sampleRate;
          return;
        }
        if (evt.type === "assistant_interrupted") {
          stopAssistantPlaybackNow();
          if (!isPttActiveRef.current) {
            setVisualState("awaiting");
          }
          return;
        }
        if (evt.type === "doctor_recommendations") {
          setSymptomsSummary(evt.symptomsSummary);
          setRecommendedDoctors(evt.doctors);
          return;
        }
        if (evt.type === "booking_update") {
          setBookingUpdates((prev) => [...prev, { status: evt.status, message: evt.message, booking: evt.booking }]);
          return;
        }
        if (evt.type === "schedule_snapshot") {
          setLiveScheduleSnapshot(evt);
          return;
        }
        if (evt.type === "adherence_report_saved") {
          if (!evt.saved) {
            setWarning(evt.message || "Could not save adherence report.");
            return;
          }
          setLatestAdherenceEvent(evt);
        }
      },
      onAudioChunk: (chunk) => {
        logUi("AUDIO_RX_CHUNK", { bytes: chunk.byteLength });
        playerRef.current?.playPcm16Chunk(chunk, assistantSampleRateRef.current);
        if (!isPttActiveRef.current) {
          setVisualState("speaking");
        }
        scheduleListeningVisual(280);
      },
    });

    try {
      micRef.current = await startMicCapture((chunk) => {
        socket.sendAudioChunk(chunk);
      });
      micRef.current.pauseStream();
      logUi("MIC_READY");
    } catch (error) {
      logUi("MIC_UNAVAILABLE", error);
      pendingCloseStateRef.current = {
        state: "error",
        visualState: "error",
        warning: "Microphone unavailable.",
      };
      micRef.current?.stop();
      micRef.current = null;
      socket.disconnect();
      if (playerRef.current) {
        await playerRef.current.close();
        playerRef.current = null;
      }
      setWarning("Microphone unavailable.");
      setVisualState("error");
      setState("error");
    }
  };

  const disconnect = async () => {
    pendingCloseStateRef.current = null;
    if (isPttActiveRef.current) {
      logUi("PTT_END_ON_DISCONNECT");
      markPttActive(false);
      micRef.current?.pauseStream();
      logUi("MIC_PAUSE");
      socket.sendEvent({ type: "ptt_end" });
    }
    if (speakingTimeoutRef.current !== null) {
      window.clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }
    micRef.current?.pauseStream();
    logUi("MIC_PAUSE");
    micRef.current?.stop();
    logUi("MIC_STOP");
    micRef.current = null;
    socket.disconnect();
    if (playerRef.current) {
      await playerRef.current.close();
      playerRef.current = null;
      logUi("AUDIO_PLAYER_CLOSED");
    }
    setState("idle");
    setVisualState("idle");
    setUserTranscript("");
    setAssistantMessages([]);
  };

  const beginPtt = () => {
    if (state !== "ready" || isPttActiveRef.current) return;
    pttSeqRef.current += 1;
    logUi("PTT_BEGIN", { turn: pttSeqRef.current });
    stopAssistantPlaybackNow();
    setUserTranscript("");
    markPttActive(true);
    setVisualState("holding");
    micRef.current?.startStream();
    logUi("MIC_START");
    socket.sendEvent({ type: "ptt_start" });
  };

  const endPtt = () => {
    if (!isPttActiveRef.current) return;
    logUi("PTT_END", { turn: pttSeqRef.current });
    markPttActive(false);
    micRef.current?.pauseStream();
    logUi("MIC_PAUSE");
    socket.sendEvent({ type: "ptt_end" });
    if (state === "ready") {
      setVisualState("awaiting");
    }
  };

  return (
    <main className="app-shell">
      <h1 className="app-title">{appName}</h1>
      <p className="app-subtitle">General health guidance only. Not diagnosis or emergency care.</p>

      <nav className="top-nav">
        <NavLink to="/" className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}>
          Voice
        </NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}>
          Dashboard
        </NavLink>
        <NavLink to="/schedule" className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}>
          Schedule
        </NavLink>
      </nav>

      <Routes>
        <Route
          path="/"
          element={
            <VoiceSessionPage
              state={state}
              visualState={visualState}
              warning={warning}
              userTranscript={userTranscript}
              assistantMessages={assistantMessages}
              symptomsSummary={symptomsSummary}
              recommendedDoctors={recommendedDoctors}
              bookingUpdates={bookingUpdates}
              isPttActive={isPttActive}
              onConnect={connect}
              onDisconnect={disconnect}
              onBeginPtt={beginPtt}
              onEndPtt={endPtt}
            />
          }
        />
        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />
        <Route
          path="/schedule"
          element={
            <SchedulePage
              backendHttpUrl={backendHttpUrl}
              userId={defaultUserId}
              liveSnapshot={liveScheduleSnapshot}
              liveReportUpdate={latestAdherenceEvent}
            />
          }
        />
      </Routes>
    </main>
  );
}

function VoiceSessionPage({
  state,
  visualState,
  warning,
  userTranscript,
  assistantMessages,
  symptomsSummary,
  recommendedDoctors,
  bookingUpdates,
  isPttActive,
  onConnect,
  onDisconnect,
  onBeginPtt,
  onEndPtt,
}: {
  state: ConnectionState;
  visualState: VoiceVisualState;
  warning: string;
  userTranscript: string;
  assistantMessages: string[];
  symptomsSummary: string;
  recommendedDoctors: DoctorCard[];
  bookingUpdates: BookingUpdate[];
  isPttActive: boolean;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onBeginPtt: () => void;
  onEndPtt: () => void;
}) {
  const statusText =
    state === "connecting"
      ? "Connecting..."
      : state === "error"
        ? "Connection error"
        : state !== "ready"
          ? "Start session"
          : isPttActive
            ? "Listening (hold active)"
            : visualState === "speaking"
              ? "Raksha is speaking"
              : visualState === "awaiting"
                ? "Awaiting response..."
                : "Press and hold to speak";
  const isSessionReady = state === "ready";

  return (
    <>
      <button
        className="session-btn"
        onClick={() => {
          if (state === "idle" || state === "error") {
            void onConnect();
          } else {
            void onDisconnect();
          }
        }}
        disabled={state === "connecting"}
      >
        {state === "idle" || state === "error" ? "Start Session" : "End Session"}
      </button>

      <button
        className={`orb orb-${visualState}`}
        disabled={!isSessionReady}
        aria-label="Hold to talk"
        onPointerDown={(evt) => {
          evt.currentTarget.setPointerCapture(evt.pointerId);
          onBeginPtt();
        }}
        onPointerUp={onEndPtt}
        onPointerCancel={onEndPtt}
        onLostPointerCapture={onEndPtt}
        onKeyDown={(evt) => {
          if ((evt.key === " " || evt.key === "Enter") && !evt.repeat) {
            evt.preventDefault();
            onBeginPtt();
          }
        }}
        onKeyUp={(evt) => {
          if (evt.key === " " || evt.key === "Enter") {
            evt.preventDefault();
            onEndPtt();
          }
        }}
      >
        <span className="orb-core" />
      </button>

      <p className="status-text">{statusText}</p>
      {warning ? <p className="warning-text">{warning}</p> : null}

      <div className="conversation-panels">
        <TranscriptPanel
          userTranscript={userTranscript}
          assistantMessages={assistantMessages}
          isSessionReady={isSessionReady}
        />
        <DoctorRecommendations symptomsSummary={symptomsSummary} doctors={recommendedDoctors} />
        <BookingUpdates updates={bookingUpdates} />
      </div>
    </>
  );
}
