"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { getIdToken } from "@/lib/auth";
import { DashboardScaffold } from "../components/DashboardScaffold";
import { LISTING_CATEGORIES } from "@/lib/listings-types";

interface ChatRoom {
  id: string;
  listingId: string;
  listing: {
    title: string;
    price: number | null;
    category: string;
    imageUrl: string | null;
  };
  lastMessage: string | null;
  updatedAt: string;
  otherPartyName: string;
  unreadCount?: number;
}

export default function DashboardMessagesPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRooms([]);
        setLoading(false);
        return;
      }
      try {
        const token = await getIdToken();
        if (!token) {
          setRooms([]);
          setLoading(false);
          return;
        }
        const res = await fetch("/api/chat/rooms", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const raw = data.rooms ?? [];
          setRooms(raw.map((r: ChatRoom) => ({ ...r, unreadCount: r.unreadCount ?? 0 })));
        } else {
          setRooms([]);
        }
      } catch {
        setRooms([]);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  return (
    <DashboardScaffold headerContent={<h1 className="text-lg font-semibold text-gray-900">Messages</h1>}>
      <div className="mx-auto max-w-lg min-[600px]:max-w-2xl px-4 py-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600 text-sm mb-2">No conversations yet.</p>
            <p className="text-gray-500 text-xs mb-4">
              Message a seller from a listing to start a chat.
            </p>
            <Link
              href="/dashboard/marketplace"
              className="inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {Array.from(new Map(rooms.map((r) => [r.id, r])).values()).map((room) => {
              const cat = LISTING_CATEGORIES.find((c) => c.value === room.listing.category);
              const unread = (room.unreadCount ?? 0) > 0;
              return (
                <Link
                  key={room.id}
                  href={`/dashboard/messages/${room.id}`}
                  className={`flex gap-3 rounded-xl border p-3 transition ${
                    unread
                      ? "border-primary-200 bg-primary-50/80 hover:bg-primary-50"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                    {room.listing.imageUrl ? (
                      <img
                        src={room.listing.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xl text-gray-400">{cat?.icon ?? "📦"}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium truncate ${unread ? "text-gray-900 font-semibold" : "text-gray-900"}`}>
                      {room.listing.title}
                    </p>
                    <p className={`text-xs truncate ${unread ? "text-gray-700 font-medium" : "text-gray-500"}`}>
                      {room.otherPartyName}
                      {room.lastMessage && (
                        <> · {room.lastMessage}</>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right flex flex-col items-end gap-1">
                    {unread && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                        {room.unreadCount! > 99 ? "99+" : room.unreadCount}
                      </span>
                    )}
                    {room.listing.price != null && (
                      <p className="text-sm font-semibold text-primary-600">
                        Rs. {Number(room.listing.price).toLocaleString()}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DashboardScaffold>
  );
}
