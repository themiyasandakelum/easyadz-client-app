"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { getIdToken } from "@/lib/auth";
import { DashboardScaffold } from "../../components/DashboardScaffold";
import { LISTING_CATEGORIES, type ListingCategory } from "@/lib/listings-types";

const VALID_CATEGORIES = LISTING_CATEGORIES.map((c) => c.value);
const POLL_INTERVAL_MS = 2500;

interface Message {
  id: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  isOwn: boolean;
}

interface RoomInfo {
  id: string;
  listingId: string;
  listing: {
    title: string;
    price: number | null;
    category: string;
    imageUrl: string | null;
  };
  otherPartyName: string;
}

interface RecommendedListing {
  id: string;
  category: string;
  title: string;
  price: number | null;
  location: string | null;
  images: string[] | null;
}

function MiniListingCard({ listing }: { listing: RecommendedListing }) {
  const imageUrl = listing.images?.[0];
  const cat = LISTING_CATEGORIES.find((c) => c.value === listing.category);

  return (
    <Link
      href={`/dashboard/marketplace/listing/${listing.id}`}
      className="flex shrink-0 w-36 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-3xl text-gray-300">{cat?.icon ?? "📦"}</span>
        )}
      </div>
      <div className="p-2">
        <p className="font-medium text-gray-900 truncate text-xs">{listing.title}</p>
        {listing.price != null && (
          <p className="text-xs font-semibold text-primary-600">Rs. {Number(listing.price).toLocaleString()}</p>
        )}
      </div>
    </Link>
  );
}

function ChatPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const chatId = params?.chatId as string;
  const listingIdFromUrl = searchParams.get("listingId");
  const categoryFromUrl = searchParams.get("category");

  const category = (categoryFromUrl && VALID_CATEGORIES.includes(categoryFromUrl as ListingCategory))
    ? (categoryFromUrl as ListingCategory)
    : "vehicle";

  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recommendedListings, setRecommendedListings] = useState<RecommendedListing[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const fetchRoom = useCallback(async (token: string) => {
    const res = await fetch(`/api/chat/${chatId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  }, [chatId]);

  const fetchMessages = useCallback(async (token: string) => {
    const res = await fetch(`/api/chat/${chatId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.messages ?? [];
  }, [chatId]);

  useEffect(() => {
    if (!chatId) {
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const token = await getIdToken();
        if (!token || cancelled) return;
        const [roomData, msgData] = await Promise.all([
          fetchRoom(token),
          fetchMessages(token),
        ]);
        if (!cancelled) {
          setRoom(roomData);
          setMessages(msgData);
          if (roomData && token) {
            fetch(`/api/chat/${chatId}/read`, {
              method: "PATCH",
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
          }
        }
      } catch {
        if (!cancelled) setRoom(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) load();
      else setLoading(false);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [chatId, fetchRoom, fetchMessages]);

  useEffect(() => {
    if (!chatId || !room) return;
    const auth = getFirebaseAuth();
    if (!auth?.currentUser) return;
    const poll = async () => {
      const token = await getIdToken();
      if (!token) return;
      const msgData = await fetchMessages(token);
      setMessages(msgData);
      fetch(`/api/chat/${chatId}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    };
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [chatId, room, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams();
      params.set("category", category);
      params.set("limit", "11");
      const res = await fetch(`/api/listings?${params}`);
      if (!res.ok || cancelled) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      const filtered = listingIdFromUrl
        ? list.filter((l: { id: string }) => l.id !== listingIdFromUrl)
        : list;
      if (!cancelled) setRecommendedListings(filtered.slice(0, 10));
    })();
    return () => { cancelled = true; };
  }, [category, listingIdFromUrl]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending || !chatId) return;
    setSending(true);
    setInput("");
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`/api/chat/${chatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data];
        });
        scrollToBottom();
      }
    } finally {
      setSending(false);
    }
  };

  const catLabel = LISTING_CATEGORIES.find((c) => c.value === category)?.label ?? category;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-primary-700 font-medium">Loading chat…</div>
      </div>
    );
  }

  if (!room) {
    return (
      <DashboardScaffold>
        <div className="mx-auto max-w-lg px-4 py-8 text-center">
          <p className="text-gray-600 mb-4">Chat not found or you don&apos;t have access.</p>
          <Link href="/dashboard/messages" className="text-primary-600 font-medium">
            ← Back to Messages
          </Link>
        </div>
      </DashboardScaffold>
    );
  }

  return (
    <DashboardScaffold headerContent={<h1 className="text-lg font-semibold text-gray-900 truncate">Chat</h1>}>
      <div className="flex flex-col min-[900px]:flex-row h-[calc(100vh-4rem)] min-h-[400px]">
        <section
          className="flex-1 min-w-0 flex flex-col border-b min-[900px]:border-b-0 min-[900px]:border-r border-gray-200 bg-white"
          aria-label="Chat"
        >
          {/* Item Summary Header */}
          <div className="shrink-0 border-b border-gray-200 bg-gray-50 px-4 py-3">
            <Link
              href={`/dashboard/marketplace/listing/${room.listingId}`}
              className="flex items-center gap-3 hover:bg-gray-100 -mx-2 -my-1 px-2 py-1 rounded-lg transition"
            >
              {room.listing.imageUrl ? (
                <img
                  src={room.listing.imageUrl}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                  <span className="text-xl">📦</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 truncate text-sm">{room.listing.title}</p>
                <p className="text-xs text-gray-500">
                  {room.otherPartyName}
                  {room.listing.price != null && (
                    <> · Rs. {Number(room.listing.price).toLocaleString()}</>
                  )}
                </p>
              </div>
            </Link>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-8">No messages yet. Say hello!</p>
            ) : (
              (() => {
                const seen = new Set<string>();
                return messages.filter((m) => {
                  if (seen.has(m.id)) return false;
                  seen.add(m.id);
                  return true;
                });
              })().map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                      msg.isOwn
                        ? "bg-primary-600 text-white"
                        : msg.isRead
                          ? "bg-gray-100 text-gray-900"
                          : "bg-primary-50 text-gray-900 ring-1 ring-primary-200"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Send form */}
          <form onSubmit={handleSend} className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                maxLength={4000}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        </section>

        {/* Recommended for You */}
        <section
          className="w-full min-[900px]:w-80 shrink-0 flex flex-col bg-gray-50"
          aria-label="Recommended for you"
        >
          <div className="p-3 border-b border-gray-200 bg-white">
            <h2 className="text-sm font-semibold text-gray-800">Recommended for You</h2>
            <p className="text-xs text-gray-500">Similar {catLabel} ads while you wait</p>
          </div>
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-3">
            {recommendedListings.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No similar ads in this category.</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
                {recommendedListings.map((listing) => (
                  <MiniListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardScaffold>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-white"><div className="text-primary-700 font-medium">Loading…</div></div>}>
      <ChatPageContent />
    </Suspense>
  );
}
