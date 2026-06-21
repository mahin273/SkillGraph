import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MessageSquare,
  Search,
  Send,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Calendar,
  BookOpen,
  Award,
  AlertCircle,
  MessageCircle,
  X,
  Linkedin,
  Github,
} from "lucide-react";
import {
  getMentorshipConnections,
  getMentorshipMessages,
  sendMentorshipMessage,
  updateMentorshipMilestones,
  type MentorshipMessage
} from "../services/mentorship.service";
import { useAuthStore } from "../store/auth.store";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";

const DEFAULT_MILESTONES = [
  "[ ] Milestone 1: Foundational Concepts & Core Syntax",
  "[ ] Milestone 2: Practical Hands-On Application",
  "[ ] Milestone 3: Peer-Review & Advanced Refactoring",
  "[ ] Milestone 4: Career alignment, Resume check & Exit interview"
];

export function Messages() {
  const { userId } = useAuthStore();
  const [searchParams] = useSearchParams();
  const connectionIdParam = searchParams.get("id");
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<any | null>(null);
  const [messages, setMessages] = useState<MentorshipMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newMilestoneText, setNewMilestoneText] = useState("");

  const isMentor = selectedConnection ? selectedConnection.alumni.user.id === userId : false;
  const studentPartner = selectedConnection ? selectedConnection.student : null;
  
  // Loading states
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updatingMilestones, setUpdatingMilestones] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch connections on mount
  useEffect(() => {
    async function loadConnections() {
      try {
        setLoadingConnections(true);
        const data = await getMentorshipConnections();
        setConnections(data);
        
        // Auto-select connection if parameter is passed
        if (connectionIdParam) {
          const matched = data.find((c) => c.id === connectionIdParam);
          if (matched) {
            setSelectedConnection(matched);
          } else if (data.length > 0) {
            setSelectedConnection(data[0]);
          }
        } else if (data.length > 0) {
          setSelectedConnection(data[0]);
        }
      } catch (err) {
        console.error("Failed to load active connections:", err);
        setError("Could not load conversations.");
      } finally {
        setLoadingConnections(false);
      }
    }
    void loadConnections();
  }, [connectionIdParam]);

  // Keep a ref to the latest selected connection to avoid stale closure in polling interval
  const selectedConnectionRef = useRef(selectedConnection);
  useEffect(() => {
    selectedConnectionRef.current = selectedConnection;
  }, [selectedConnection]);

  // Poll connections list (including milestones and status) every 3 seconds
  useEffect(() => {
    let cancelled = false;

    async function pollConnections() {
      try {
        const data = await getMentorshipConnections();
        if (cancelled) return;
        setConnections(data);
        
        const currentSelected = selectedConnectionRef.current;
        if (currentSelected) {
          const updated = data.find((c) => c.id === currentSelected.id);
          if (updated) {
            const milestonesChanged = JSON.stringify(updated.milestones) !== JSON.stringify(currentSelected.milestones);
            const statusChanged = updated.status !== currentSelected.status;
            if (milestonesChanged || statusChanged) {
              setSelectedConnection(updated);
            }
          }
        }
      } catch (err) {
        console.error("Failed to poll connection updates:", err);
      }
    }

    const intervalId = setInterval(() => {
      void pollConnections();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  // Poll messages when selected connection changes
  useEffect(() => {
    if (!selectedConnection) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    async function loadMessages() {
      try {
        const data = await getMentorshipMessages(selectedConnection.id);
        if (!cancelled) {
          setMessages(data);
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    }

    // Load immediately
    setLoadingMessages(true);
    void loadMessages().finally(() => {
      if (!cancelled) setLoadingMessages(false);
    });

    // Setup polling every 3 seconds
    const intervalId = setInterval(() => {
      void loadMessages();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [selectedConnection]);

  // Scroll to bottom when messages load/change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  // Handle send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = messageDraft.trim();
    if (!body || !selectedConnection) return;

    setSendingMessage(true);
    try {
      const newMessage = await sendMentorshipMessage(selectedConnection.id, body);
      setMessages((current) => [...current, newMessage]);
      setMessageDraft("");
      
      // Update connection list's last message snippet locally
      setConnections((current) =>
        current.map((c) =>
          c.id === selectedConnection.id
            ? { ...c, messages: [newMessage], updatedAt: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSendingMessage(false);
    }
  };

  const getNormalizedMilestones = (milestones: any[] | null | undefined): string[] => {
    const list = milestones || [];
    const hasNewFormat = list.some((m) => typeof m === "string" && (m.startsWith("[x] ") || m.startsWith("[ ] ")));
    
    if (hasNewFormat) {
      return list.map((m) => String(m));
    }

    return DEFAULT_MILESTONES.map((tmpl) => {
      const cleanTmpl = tmpl.replace(/^\[[ x]\]\s*/, "");
      const isCompleted = list.some((legacyName: any) => String(legacyName).includes(cleanTmpl) || cleanTmpl.includes(String(legacyName)));
      return isCompleted ? `[x] ${cleanTmpl}` : `[ ] ${cleanTmpl}`;
    });
  };

  // Toggle Milestones (Only for Mentor/Alumni)
  const handleToggleMilestone = async (milestoneToToggle: string, currentCompleted: boolean) => {
    if (!selectedConnection) return;
    
    const isMentor = selectedConnection.alumni.user.id === userId;
    if (!isMentor) return; // Only mentors can update milestones

    setUpdatingMilestones(true);
    try {
      const currentList = getNormalizedMilestones(selectedConnection.milestones);
      const updatedList = currentList.map((m) => {
        if (m === milestoneToToggle) {
          return currentCompleted
            ? m.replace(/^\[x\]\s*/, "[ ] ")
            : m.replace(/^\[ \]\s*/, "[x] ");
        }
        return m;
      });

      const updated = await updateMentorshipMilestones(selectedConnection.id, updatedList);
      
      // Update selected connection state
      setSelectedConnection((prev: any) => ({
        ...prev,
        milestones: updated.milestones
      }));

      // Update connections list state
      setConnections((prevList) =>
        prevList.map((c) =>
          c.id === selectedConnection.id ? { ...c, milestones: updated.milestones } : c
        )
      );
    } catch (err) {
      console.error("Failed to update milestone:", err);
    } finally {
      setUpdatingMilestones(false);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMilestoneText.trim();
    if (!text || !selectedConnection) return;

    setUpdatingMilestones(true);
    try {
      const currentList = getNormalizedMilestones(selectedConnection.milestones);
      const newMilestone = `[ ] ${text}`;
      const updatedList = [...currentList, newMilestone];

      const updated = await updateMentorshipMilestones(selectedConnection.id, updatedList);
      
      setSelectedConnection((prev: any) => ({
        ...prev,
        milestones: updated.milestones
      }));

      setConnections((prevList) =>
        prevList.map((c) =>
          c.id === selectedConnection.id ? { ...c, milestones: updated.milestones } : c
        )
      );
      setNewMilestoneText("");
    } catch (err) {
      console.error("Failed to add milestone:", err);
    } finally {
      setUpdatingMilestones(false);
    }
  };

  const handleRemoveMilestone = async (milestoneToRemove: string) => {
    if (!selectedConnection) return;
    if (!confirm("Are you sure you want to remove this milestone?")) return;

    setUpdatingMilestones(true);
    try {
      const currentList = getNormalizedMilestones(selectedConnection.milestones);
      const updatedList = currentList.filter((m) => m !== milestoneToRemove);

      const updated = await updateMentorshipMilestones(selectedConnection.id, updatedList);
      
      setSelectedConnection((prev: any) => ({
        ...prev,
        milestones: updated.milestones
      }));

      setConnections((prevList) =>
        prevList.map((c) =>
          c.id === selectedConnection.id ? { ...c, milestones: updated.milestones } : c
        )
      );
    } catch (err) {
      console.error("Failed to remove milestone:", err);
    } finally {
      setUpdatingMilestones(false);
    }
  };

  // Filter connections by name or skill
  const filteredConnections = connections.filter((conn) => {
    const isMentor = conn.alumni.user.id === userId;
    const partner = isMentor ? conn.student.user : conn.alumni.user;
    const query = searchQuery.toLowerCase();
    return (
      partner.fullName.toLowerCase().includes(query) ||
      conn.skill.name.toLowerCase().includes(query)
    );
  });

  return (
    <div className="mx-auto flex h-[calc(100vh-2rem)] w-full max-w-[1720px] rounded-xl border border-border bg-white shadow-sm overflow-hidden animate-fade-in">
      
      {/* Left Pane - Sidebar Conversation List */}
      <div className="w-80 border-r border-[#dfe3ea] flex flex-col bg-[#f7f8fa] shrink-0">
        <div className="p-4 border-b border-[#dfe3ea] bg-white flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-[#17202a] flex items-center gap-1.5">
              <MessageCircle className="size-5 text-[#0c66e4]" />
              Messages
            </h1>
            <Badge className="bg-[#e9f2ff] text-[#0c66e4] border border-[#0c66e4]/10 hover:bg-[#e9f2ff]">
              {connections.length} active
            </Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search chat or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 border-[#cfd7e3] bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#edf0f5]">
          {loadingConnections ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <RefreshCw className="size-5 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Loading chats...</p>
            </div>
          ) : filteredConnections.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground italic">
              {searchQuery ? "No matching conversations found." : "No mentorship chats yet. Send request to a mentor to start."}
            </div>
          ) : (
            filteredConnections.map((conn) => {
              const isMentor = conn.alumni.user.id === userId;
              const partner = isMentor ? conn.student.user : conn.alumni.user;
              const isSelected = selectedConnection?.id === conn.id;
              
              // Get last message snippet
              const lastMsg = conn.messages?.[0];
              const lastMsgSnippet = lastMsg
                ? `${lastMsg.senderId === userId ? "You: " : ""}${lastMsg.body}`
                : "No messages yet.";

              return (
                <button
                  key={conn.id}
                  onClick={() => setSelectedConnection(conn)}
                  className={`w-full text-left p-3.5 flex gap-3 transition-colors duration-150 ${
                    isSelected ? "bg-[#e9f2ff]" : "bg-[#f7f8fa] hover:bg-slate-100"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="size-11 rounded-full bg-[#0c66e4]/10 text-[#0c66e4] border border-[#0c66e4]/10 font-bold flex items-center justify-center text-sm">
                      {partner.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    {conn.status === "active" && (
                      <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 border-2 border-white" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold truncate ${isSelected ? "text-[#0c66e4]" : "text-[#17202a]"}`}>
                        {partner.fullName}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-medium ml-1">
                        {conn.skill.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge className={`text-[9px] py-0 px-1 border-none hover:bg-opacity-100 ${
                        isMentor ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {isMentor ? "Student" : "Mentor"}
                      </Badge>
                      {conn.status === "completed" && (
                        <Badge className="text-[9px] py-0 px-1 bg-emerald-100 text-emerald-800">
                          Completed
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground truncate leading-relaxed">
                      {lastMsgSnippet}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Selected Conversation Workspace */}
      {selectedConnection ? (
        <div className="flex-1 flex overflow-hidden">
          
          {/* Middle Pane - Message Thread */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {/* Chat Header */}
            <div className="px-5 py-3.5 border-b border-[#dfe3ea] flex items-center justify-between bg-white shadow-xs">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-[#0c66e4]/10 text-[#0c66e4] font-bold flex items-center justify-center text-xs">
                  {(selectedConnection.alumni.user.id === userId
                    ? selectedConnection.student.user.fullName
                    : selectedConnection.alumni.user.fullName
                  ).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#17202a]">
                    {selectedConnection.alumni.user.id === userId
                      ? selectedConnection.student.user.fullName
                      : selectedConnection.alumni.user.fullName}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">
                      Skill: <span className="font-semibold text-slate-800">{selectedConnection.skill.name}</span>
                    </span>
                    <span className="text-muted-foreground text-[10px]">·</span>
                    <Badge className={`text-[9px] py-0 border-none ${
                      selectedConnection.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"
                    }`}>
                      {selectedConnection.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Profile Link Button */}
              {selectedConnection.alumni.user.id === userId ? (
                <a
                  href={`/galaxy/${selectedConnection.student.publicHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0c66e4] hover:underline"
                >
                  View Skill Galaxy
                  <ExternalLink className="size-3.5" />
                </a>
              ) : selectedConnection.alumni.linkedinUrl ? (
                <a
                  href={selectedConnection.alumni.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0c66e4] hover:underline"
                >
                  View LinkedIn Profile
                  <ExternalLink className="size-3.5" />
                </a>
              ) : null}
            </div>

            {/* Message Thread Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
              {loadingMessages && messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground text-xs">
                  <RefreshCw className="size-5 animate-spin text-primary" />
                  Loading conversation...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <div className="rounded-full bg-[#e9f2ff] p-4 text-[#0c66e4] mb-3">
                    <MessageSquare className="size-6" />
                  </div>
                  <h4 className="font-bold text-sm text-[#17202a]">Start the Conversation</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                    Ask questions, set meeting agendas, or align on target milestones.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === userId;
                  return (
                    <div key={msg.id} className={`flex flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                          isMine
                            ? "bg-[#0c66e4] text-white rounded-br-none"
                            : "border border-[#dfe3ea] bg-white text-[#17202a] rounded-bl-none"
                        }`}
                      >
                        {msg.body}
                      </div>
                      <span className="px-1.5 text-[9px] text-muted-foreground">
                        {isMine ? "You" : msg.sender.fullName} ·{" "}
                        {new Date(msg.createdAt).toLocaleString([], {
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

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-[#dfe3ea] bg-white flex gap-3 items-end">
              <textarea
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                disabled={selectedConnection.status !== "active" || sendingMessage}
                maxLength={2000}
                rows={2}
                placeholder={
                  selectedConnection.status === "active"
                    ? "Write your message here..."
                    : "This conversation is read-only because the connection is no longer active."
                }
                className="flex-1 resize-none rounded-lg border border-[#cfd7e3] px-3.5 py-2 text-xs text-[#17202a] outline-none focus:border-[#0c66e4] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
              />
              <Button
                type="submit"
                disabled={!messageDraft.trim() || selectedConnection.status !== "active" || sendingMessage}
                className="h-10 bg-[#0c66e4] hover:bg-[#0052cc] text-white px-4 text-xs font-semibold flex items-center gap-1.5"
              >
                {sendingMessage ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <>
                    <Send className="size-3.5" />
                    Send
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Right Pane - Mentorship Info & Milestones Checklist */}
          <div className="w-80 border-l border-[#dfe3ea] bg-[#f7f8fa] flex flex-col shrink-0 overflow-y-auto">
            <div className="p-5 border-b border-[#dfe3ea] bg-white">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Connection Details
              </h4>
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3.5" /> Established
                  </span>
                  <span className="font-semibold text-slate-800">
                    {new Date(selectedConnection.createdAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <BookOpen className="size-3.5" /> Skill Area
                  </span>
                  <Badge className="bg-[#e9f2ff] text-[#0c66e4] border border-[#0c66e4]/10 hover:bg-[#e9f2ff] text-[10px]">
                    {selectedConnection.skill.name}
                  </Badge>
                </div>
              </div>
            </div>

            {isMentor && studentPartner && (
              <div className="p-5 border-t border-[#dfe3ea] bg-white">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Student Profile
                </h4>
                
                {/* Social & Portfolio Links */}
                <div className="flex gap-2 mb-4">
                  {studentPartner.linkedinUrl ? (
                    <a
                      href={studentPartner.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#cfd7e3] bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Linkedin className="size-3.5 text-[#0a66c2]" />
                      LinkedIn
                    </a>
                  ) : (
                    <span className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#dfe3ea] bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-400">
                      No LinkedIn
                    </span>
                  )}
                  
                  {studentPartner.portfolioUrl ? (
                    <a
                      href={studentPartner.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#cfd7e3] bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink className="size-3.5 text-slate-500" />
                      Portfolio
                    </a>
                  ) : (
                    <span className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#dfe3ea] bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-400">
                      No Portfolio
                    </span>
                  )}
                </div>

                {/* GitHub Repositories */}
                <div className="mt-4">
                  <h5 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Github className="size-3.5" />
                    GitHub Repositories ({studentPartner.user.repositories?.length || 0})
                  </h5>
                  {!studentPartner.user.repositories || studentPartner.user.repositories.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground italic bg-[#f7f8fa] p-2 rounded-md border border-[#dfe3ea]">
                      No repositories connected.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                      {studentPartner.user.repositories.slice(0, 5).map((repo: any) => (
                        <a
                          key={repo.id}
                          href={`https://github.com/${repo.fullName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-[11px] p-2 rounded bg-white hover:bg-[#e9f2ff] border border-[#dfe3ea] hover:border-[#0c66e4]/30 text-[#0c66e4] font-medium truncate"
                          title={repo.repoName}
                        >
                          {repo.repoName}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Peer Endorsements */}
                <div className="mt-4">
                  <h5 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Award className="size-3.5" />
                    Peer Endorsements ({studentPartner.user.endorsementsGot?.length || 0})
                  </h5>
                  {!studentPartner.user.endorsementsGot || studentPartner.user.endorsementsGot.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground italic bg-[#f7f8fa] p-2 rounded-md border border-[#dfe3ea]">
                      No peer endorsements received yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                      {Object.entries(
                        studentPartner.user.endorsementsGot.reduce((acc: Record<string, number>, end: any) => {
                          const skillName = end.skill?.name || "Skill";
                          acc[skillName] = (acc[skillName] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([skillName, count]) => (
                        <Badge
                          key={skillName}
                          className="bg-emerald-50 text-emerald-800 border border-emerald-100 hover:bg-emerald-50 text-[10px] py-0.5 px-2 font-semibold flex items-center gap-1"
                        >
                          {skillName}
                          <span className="bg-emerald-200/60 text-emerald-900 rounded-full px-1 py-0.2 text-[9px] font-extrabold">
                            {count as number}
                          </span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Milestones checklist */}
            <div className="p-5 flex-1 bg-white border-t border-[#dfe3ea] mt-4">
              <div className="flex items-center justify-between mb-3.5">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Award className="size-4 text-primary" />
                  Milestones Progress
                </h4>
                {updatingMilestones && (
                  <RefreshCw className="size-3 animate-spin text-primary" />
                )}
              </div>

              {selectedConnection.alumni.user.id !== userId && (
                <div className="mb-3 rounded-md bg-[#e9f2ff]/50 border border-[#0c66e4]/10 p-2.5 text-[11px] text-[#0c66e4] leading-relaxed flex gap-2">
                  <AlertCircle className="size-4 shrink-0 text-[#0c66e4]" />
                  <span>Only your mentor can tick off completed milestones. Share your updates in chat to request approval.</span>
                </div>
              )}

              {/* Milestones list */}
              <div className="space-y-3.5">
                {getNormalizedMilestones(selectedConnection.milestones).map((m) => {
                  const isCompleted = m.startsWith("[x] ");
                  const displayContent = m.replace(/^\[[ x]\]\s*/, "");
                  
                  const parts = displayContent.split(":");
                  const title = parts[0];
                  const description = parts.slice(1).join(":");
                  
                  return (
                    <div
                      key={m}
                      className={`flex gap-3 text-xs p-2.5 rounded-lg border transition-all select-none ${
                        isCompleted
                          ? "bg-emerald-50/50 border-emerald-100 text-emerald-800"
                          : "bg-[#f7f8fa] border-[#dfe3ea] text-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        disabled={!isMentor || updatingMilestones || selectedConnection.status !== "active"}
                        onChange={() => handleToggleMilestone(m, isCompleted)}
                        className="mt-0.5 size-4 accent-emerald-600 rounded border-gray-300 disabled:cursor-not-allowed cursor-pointer"
                      />
                      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                        <span className={`font-semibold break-words ${isCompleted ? "line-through text-emerald-700" : ""}`}>
                          {title}
                        </span>
                        {description && (
                          <span className="text-[10px] text-muted-foreground break-words">
                            {description.trim()}
                          </span>
                        )}
                      </div>
                      {isMentor && selectedConnection.status === "active" && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMilestone(m)}
                          className="text-slate-400 hover:text-rose-600 shrink-0 self-start p-0.5"
                          title="Remove milestone"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Custom Milestone Form (Only for Mentor/Alumni) */}
              {selectedConnection.alumni.user.id === userId && selectedConnection.status === "active" && (
                <form onSubmit={handleAddMilestone} className="mt-4 pt-4 border-t border-[#dfe3ea] flex gap-2">
                  <Input
                    type="text"
                    placeholder="Add custom milestone..."
                    value={newMilestoneText}
                    onChange={(e) => setNewMilestoneText(e.target.value)}
                    className="h-8 text-[11px] px-2 border-[#cfd7e3] bg-white flex-1"
                    maxLength={100}
                    disabled={updatingMilestones}
                  />
                  <Button
                    type="submit"
                    disabled={!newMilestoneText.trim() || updatingMilestones}
                    className="h-8 px-2.5 bg-[#0c66e4] hover:bg-[#0052cc] text-white text-[11px] font-semibold"
                  >
                    Add
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/30 text-center p-10 animate-fade-in">
          <div className="rounded-full bg-[#e9f2ff] p-5 text-[#0c66e4] mb-4 shadow-sm animate-pulse">
            <MessageSquare className="size-8" />
          </div>
          <h2 className="text-lg font-bold text-[#17202a]">Your Conversations</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
            Select a contact from the sidebar list to start chatting, view shared milestones, and track mentorship progress.
          </p>
        </div>
      )}
    </div>
  );
}
