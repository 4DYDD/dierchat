"use client";
import { useEffect, useRef, useState } from "react";

import io from "socket.io-client";
import Developing from "./Developing";

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "";

interface Message {
  author: string;
  message: string;
  time: string;
  room: string;
}

export default function Home() {
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL, {
      transports: ["websocket"], // 👈 paksa pake websocket, bukan polling
      secure: true, // 👈 pastikan koneksi HTTPS
    });
    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleReceiveMessage = (data: Message) => {
      setMessages((prev) => [...prev, data]);
    };
    socket.on("receive_message", handleReceiveMessage);
    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (process.env.NEXT_PUBLIC_STATUS === "development") return <Developing />;

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (room && username && socket) {
      socket.emit("join_room", room);
      setJoined(true);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message && socket && room) {
      const msg: Message = {
        author: username,
        message,
        time: new Date().toLocaleTimeString(),
        room,
      };
      socket.emit("send_message", msg);
      setMessages((prev) => [...prev, msg]);
      setMessage("");
    }
  };

  if (!socket)
    return (
      <div className="fixed translate-x-[-50%] translate-y-[-50%] left-[50%] top-[50%]">
        Loading...
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">Group Chat Room</h1>
        {!joined ? (
          <form onSubmit={handleJoinRoom} className="flex flex-col gap-3 mb-4">
            <input
              type="text"
              placeholder="Your Name"
              className="input input-bordered w-full p-2 rounded border"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Room Code (e.g. 12345)"
              className="input input-bordered w-full p-2 rounded border"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              required
            />
            <button
              type="submit"
              className="bg-blue-600 text-white rounded p-2 font-semibold hover:bg-blue-700 transition"
            >
              Join Room
            </button>
          </form>
        ) : (
          <>
            <div className="mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                Room: <span className="font-mono font-bold">{room}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                Username:{" "}
                <span className="font-mono font-bold">{username}</span>
              </div>
              <button
                className="text-xs text-red-500 hover:underline"
                onClick={() => {
                  if (socket && room) {
                    socket.emit("leave_room", room);
                  }
                  setJoined(false);
                  setMessages([]);
                  setRoom("");
                }}
              >
                Leave Room
              </button>
            </div>
            <div className="h-64 overflow-y-auto bg-gray-50 dark:bg-gray-700 rounded p-2 mb-4 border border-gray-200 dark:border-gray-600">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 mt-24">
                  No messages yet.
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`mb-2 flex flex-col ${
                      msg.author === username ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`px-3 py-1 rounded-lg max-w-[80%] ${
                        msg.author === username
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      <span className="block text-xs font-semibold">
                        {msg.author}
                      </span>
                      <span>{msg.message}</span>
                      <span className="block text-[10px] text-right text-gray-300 dark:text-gray-400">
                        {msg.time}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                placeholder="Type your message..."
                className="input input-bordered flex-1 p-2 rounded border"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={!joined}
                required
              />
              <button
                type="submit"
                className="bg-blue-600 text-white rounded px-4 font-semibold hover:bg-blue-700 transition"
                disabled={!joined || !message}
              >
                Send
              </button>
            </form>
          </>
        )}
      </div>
      <footer className="mt-8 text-gray-400 text-xs text-center">
        Made with Next.js, Tailwind, Socket.io & Express
      </footer>
    </div>
  );
}
