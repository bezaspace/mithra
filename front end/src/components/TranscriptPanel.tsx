type Props = {
  userTranscript: string;
  assistantMessages: string[];
  isSessionReady: boolean;
};

export function TranscriptPanel({ userTranscript, assistantMessages, isSessionReady }: Props) {
  const assistantItems = assistantMessages.length > 0 ? assistantMessages : ["Waiting for Raksha to reply..."];

  return (
    <section className="panel transcript-panel">
      <h3 className="panel-title">Live Transcript</h3>
      <p className="panel-subtitle">
        {isSessionReady ? "Speech and text replies appear here in real time." : "Start a session to see live speech activity."}
      </p>
      <div className="transcript-columns">
        <div className="transcript-block">
          <p className="transcript-label">You</p>
          <p className="transcript-text">{userTranscript || (isSessionReady ? "Listening for your speech..." : "No live input yet.")}</p>
        </div>
        <div className="transcript-block">
          <p className="transcript-label">Raksha</p>
          <ul className="transcript-list">
            {assistantItems.map((msg, idx) => (
              <li key={`${idx}-${msg.slice(0, 16)}`} className="transcript-item">
                {msg}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
