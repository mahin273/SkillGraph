import { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Award,
  CheckCircle2,
  Lock,
  RefreshCw,
  Zap,
  HelpCircle,
  FileCheck,
  MessageCircle,
  Send
} from "lucide-react";
import {
  getMentorshipMessages,
  sendMentorshipMessage,
  updateMentorshipMilestones,
  verifyMentorshipRequest,
  type MentorshipMessage
} from "../../services/mentorship.service";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "../../store/auth.store";

interface MentorshipWorkspaceProps {
  mentorshipId: string;
  skillName: string;
  partnerName: string;
  partnerRole: "mentor" | "student";
  initialStatus: string;
  initialMilestones?: string[];
  onRefresh: () => void;
}

export function MentorshipWorkspace({
  mentorshipId,
  skillName,
  partnerName,
  partnerRole,
  initialStatus,
  initialMilestones = [],
  onRefresh
}: MentorshipWorkspaceProps) {
  const { userId } = useAuthStore();
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const [messages, setMessages] = useState<MentorshipMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const milestonesList = [
    {
      id: 0,
      title: "Foundational Concepts & Core Syntax",
      desc: "Demonstrate grasp of core structures, syntax rules, and standard design paradigms."
    },
    {
      id: 1,
      title: "Practical Hands-On Application",
      desc: "Build a prototype repository or complete a module assignment showcasing functional utility."
    },
    {
      id: 2,
      title: "Advanced Review & Code Refactoring",
      desc: "Perform optimization checks, implement clean error handling, and complete a final knowledge audit."
    }
  ];

  const milestonesToChecked = (milestones: string[]) =>
    milestonesList.map((milestone) => milestones.includes(milestone.title));

  const [checkedMilestones, setCheckedMilestones] = useState<boolean[]>(() =>
    milestonesToChecked(initialMilestones)
  );

  const allDone = checkedMilestones.every((m) => m === true);
  const canUseChat = status !== "requested";
  const canSendMessage = status === "active";

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    setCheckedMilestones(milestonesToChecked(initialMilestones));
  }, [initialMilestones, mentorshipId]);

  useEffect(() => {
    if (!canUseChat) return;

    let cancelled = false;

    async function loadMessages() {
      try {
        setChatLoading(true);
        setChatError(null);
        const data = await getMentorshipMessages(mentorshipId);
        if (!cancelled) {
          setMessages(data);
        }
      } catch (err) {
        console.error("Failed to load mentorship chat:", err);
        if (!cancelled) {
          setChatError("Could not load chat history.");
        }
      } finally {
        if (!cancelled) {
          setChatLoading(false);
        }
      }
    }

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [mentorshipId, canUseChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const handleCheckboxChange = async (index: number) => {
    if (partnerRole !== "mentor" || status === "completed") return;

    const updated = [...checkedMilestones];
    updated[index] = !updated[index];
    setCheckedMilestones(updated);

    try {
      await updateMentorshipMilestones(
        mentorshipId,
        updated.map((val, idx) => (val ? milestonesList[idx].title : "")).filter(Boolean)
      );
      onRefresh();
    } catch (err) {
      console.error("Failed to sync milestones:", err);
      setCheckedMilestones(checkedMilestones);
    }
  };

  const handleVerifySkill = async () => {
    if (partnerRole !== "mentor" || !allDone || status === "completed") return;
    setVerifying(true);
    try {
      await verifyMentorshipRequest(mentorshipId);
      setStatus("completed");
      onRefresh();
    } catch (err) {
      console.error("Failed to verify mentorship:", err);
      alert("Error finalizing mentorship verification.");
    } finally {
      setVerifying(false);
    }
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = messageDraft.trim();
    if (!body || !canSendMessage) return;

    setSendingMessage(true);
    setChatError(null);
    try {
      const message = await sendMentorshipMessage(mentorshipId, body);
      setMessages((current) => [...current, message]);
      setMessageDraft("");
    } catch (err) {
      console.error("Failed to send mentorship message:", err);
      setChatError("Could not send your message.");
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#dfe3ea] bg-white p-5 shadow-sm flex flex-col gap-4">
      {/* Workspace Header */}
      <div className="flex items-center justify-between border-b border-[#edf0f5] pb-3">
        <div>
          <h4 className="text-sm font-bold text-[#17202a]">
            {skillName} Mentorship Workspace
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {partnerRole === "mentor" ? (
              <>Working with Student: <strong className="text-[#17202a]">{partnerName}</strong></>
            ) : (
              <>Your Alumni Mentor: <strong className="text-[#17202a]">{partnerName}</strong></>
            )}
          </p>
        </div>

        {status === "completed" ? (
          <span className="rounded-full bg-[#e7f8ef] border border-[#b8f5d0] px-2.5 py-0.5 text-xs font-bold text-[#1f845a] flex items-center gap-1">
            <CheckCircle2 className="size-3.5" />
            Skill Verified
          </span>
        ) : (
          <span className="rounded-full bg-[#e9f2ff] border border-[#0c66e4]/10 px-2.5 py-0.5 text-xs font-bold text-[#0c66e4] flex items-center gap-1.5 animate-pulse">
            <Zap className="size-3.5" />
            Active Learning
          </span>
        )}
      </div>

      {/* Chat */}
      {canUseChat && (
        <div className="rounded-lg border border-[#dfe3ea] bg-[#f7f8fa]">
          <div className="flex items-center justify-between border-b border-[#dfe3ea] px-3 py-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-4 text-[#0c66e4]" />
              <div>
                <h5 className="text-xs font-bold text-[#17202a]">Mentorship Chat</h5>
                <p className="text-[10px] text-muted-foreground">Messages with {partnerName}</p>
              </div>
            </div>
            {!canSendMessage && (
              <span className="rounded-full border border-[#dfe3ea] bg-white px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                Read-only
              </span>
            )}
          </div>

          <div className="flex max-h-56 min-h-28 flex-col gap-2 overflow-y-auto p-3">
            {chatLoading ? (
              <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
                Loading chat...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded border border-dashed border-[#cfd7e3] bg-white px-3 py-6 text-center text-xs text-muted-foreground">
                No messages yet. Start the conversation about goals, meeting time, or next steps.
              </div>
            ) : (
              messages.map((message) => {
                const isMine = message.senderId === userId;

                return (
                  <div
                    key={message.id}
                    className={`flex flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed shadow-xs ${
                        isMine
                          ? "bg-[#0c66e4] text-white"
                          : "border border-[#dfe3ea] bg-white text-[#17202a]"
                      }`}
                    >
                      {message.body}
                    </div>
                    <span className="px-1 text-[10px] text-muted-foreground">
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

          {chatError && (
            <div className="border-t border-[#dfe3ea] bg-[#fff6f6] px-3 py-2 text-xs text-[#ae2a19]">
              {chatError}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-[#dfe3ea] bg-white p-2">
            <textarea
              value={messageDraft}
              onChange={(event) => setMessageDraft(event.target.value)}
              disabled={!canSendMessage || sendingMessage}
              maxLength={2000}
              rows={2}
              placeholder={canSendMessage ? "Write a message..." : "Chat is read-only after verification."}
              className="min-h-10 flex-1 resize-none rounded-md border border-[#cfd7e3] px-3 py-2 text-xs text-[#17202a] outline-none focus:border-[#0c66e4] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            />
            <Button
              type="submit"
              disabled={!messageDraft.trim() || !canSendMessage || sendingMessage}
              className="self-end bg-[#0c66e4] px-3 text-white hover:bg-[#0052cc]"
              aria-label="Send mentorship message"
            >
              {sendingMessage ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>
        </div>
      )}

      {/* Checklist items */}
      <div className="flex flex-col gap-3">
        {milestonesList.map((m, idx) => {
          const isChecked = checkedMilestones[idx];
          const isMentor = partnerRole === "mentor";
          const isDisabled = !isMentor || status === "completed";

          return (
            <div
              key={m.id}
              onClick={() => !isDisabled && handleCheckboxChange(idx)}
              className={`flex gap-3.5 p-3 rounded-lg border transition-all ${
                isChecked
                  ? "bg-[#e7f8ef]/20 border-emerald-200"
                  : "bg-white border-[#dfe3ea]"
              } ${!isDisabled ? "cursor-pointer hover:border-slate-300 hover:bg-[#f7f8fa]" : "cursor-not-allowed"}`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={isDisabled}
                onChange={() => {}} // handled by click of outer container
                className="mt-0.5 rounded border-[#cfd7e3] text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${isChecked ? "text-emerald-800 line-through" : "text-[#17202a]"}`}>
                    Milestone {idx + 1}: {m.title}
                  </span>
                  {!isMentor && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-1 py-0.5 rounded bg-slate-50 border flex items-center gap-0.5">
                      <Lock className="size-2.5" />
                      Read-only
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {m.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recipient validation controls */}
      {partnerRole === "mentor" && status !== "completed" && (
        <div className="border-t border-[#edf0f5] pt-4 mt-1 flex flex-col gap-2.5">
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-[#f7f8fa] border border-[#dfe3ea] p-3 rounded-lg">
            <HelpCircle className="size-4 text-[#0c66e4] shrink-0 mt-0.5" />
            <p>
              <strong>Mentor Verification:</strong> Check off milestones as the student demonstrates competence. When all 3 checkboxes are ticked, you can verify this skill, publishing it to their Neo4j public graph.
            </p>
          </div>

          <Button
            onClick={handleVerifySkill}
            disabled={verifying || !allDone}
            className={`w-full py-2 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 ${
              allDone
                ? "bg-[#1f845a] hover:bg-[#166042] text-white"
                : "bg-slate-100 border border-[#dfe3ea] text-slate-400 cursor-not-allowed"
            }`}
          >
            {verifying ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : (
              <FileCheck className="size-3.5" />
            )}
            Confirm & Verify Student's Skill
          </Button>
        </div>
      )}
    </div>
  );
}
