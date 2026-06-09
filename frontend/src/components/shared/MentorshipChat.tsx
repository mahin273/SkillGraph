import { useEffect, useRef, useState } from "react";
import { MessageCircle, RefreshCw, Send } from "lucide-react";
import {
  getMentorshipMessages,
  sendMentorshipMessage,
  type MentorshipMessage
} from "../../services/mentorship.service";
import { useAuthStore } from "../../store/auth.store";
import { Button } from "../ui/button";

interface MentorshipChatProps {
  mentorshipId: string;
  partnerName: string;
  status: string;
}

export function MentorshipChat({ mentorshipId, partnerName, status }: MentorshipChatProps) {
  const { userId } = useAuthStore();
  const [messages, setMessages] = useState<MentorshipMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const canRead = status !== "requested";
  const canSend = status === "active";

  useEffect(() => {
    if (!canRead) return;

    let cancelled = false;

    async function loadMessages() {
      try {
        setLoading(true);
        setError(null);
        const data = await getMentorshipMessages(mentorshipId);
        if (!cancelled) setMessages(data);
      } catch (err) {
        console.error("Failed to load mentorship chat:", err);
        if (!cancelled) setError("Could not load chat history.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [mentorshipId, canRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = messageDraft.trim();
    if (!body || !canSend) return;

    setSending(true);
    setError(null);
    try {
      const message = await sendMentorshipMessage(mentorshipId, body);
      setMessages((current) => [...current, message]);
      setMessageDraft("");
    } catch (err) {
      console.error("Failed to send mentorship message:", err);
      setError("Could not send your message.");
    } finally {
      setSending(false);
    }
  };

  if (!canRead) return null;

  return (
    <div className="rounded-lg border border-[#dfe3ea] bg-[#f7f8fa]">
      <div className="flex items-center justify-between border-b border-[#dfe3ea] px-3 py-2">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4 text-[#0c66e4]" />
          <div>
            <h5 className="text-xs font-bold text-[#17202a]">Mentorship Chat</h5>
            <p className="text-[10px] text-[#626f86]">Messages with {partnerName}</p>
          </div>
        </div>
        {!canSend && (
          <span className="rounded-full border border-[#dfe3ea] bg-white px-2 py-0.5 text-[10px] font-bold text-[#626f86]">
            Read-only
          </span>
        )}
      </div>

      <div className="flex max-h-56 min-h-28 flex-col gap-2 overflow-y-auto p-3">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-xs text-[#626f86]">
            Loading chat...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded border border-dashed border-[#cfd7e3] bg-white px-3 py-6 text-center text-xs text-[#626f86]">
            No messages yet. Start with goals, meeting time, or next steps.
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === userId;

            return (
              <div key={message.id} className={`flex flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed shadow-xs ${
                    isMine
                      ? "bg-[#0c66e4] text-white"
                      : "border border-[#dfe3ea] bg-white text-[#17202a]"
                  }`}
                >
                  {message.body}
                </div>
                <span className="px-1 text-[10px] text-[#626f86]">
                  {isMine ? "You" : message.sender.fullName} ·{" "}
                  {new Date(message.createdAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit"
                  })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="border-t border-[#dfe3ea] bg-[#fff6f6] px-3 py-2 text-xs text-[#ae2a19]">
          {error}
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-[#dfe3ea] bg-white p-2">
        <textarea
          value={messageDraft}
          onChange={(event) => setMessageDraft(event.target.value)}
          disabled={!canSend || sending}
          maxLength={2000}
          rows={2}
          placeholder={canSend ? "Write a message..." : "Chat is read-only after completion."}
          className="min-h-10 flex-1 resize-none rounded-md border border-[#cfd7e3] px-3 py-2 text-xs text-[#17202a] outline-none focus:border-[#0c66e4] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        />
        <Button
          type="submit"
          disabled={!messageDraft.trim() || !canSend || sending}
          className="self-end bg-[#0c66e4] px-3 text-white hover:bg-[#0052cc]"
          aria-label="Send mentorship message"
        >
          {sending ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </div>
  );
}
