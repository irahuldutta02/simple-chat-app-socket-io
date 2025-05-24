import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { SocketContext } from "./SocketUtils";

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const newSocket = io(import.meta.env.VITE_SERVER_URL);
      setSocket(newSocket);

      newSocket.emit("join", user.id);

      newSocket.on("messageReceived", (message) => {
        setMessages((prev) => [...prev, message]);

        // If message is from someone else, increment unread count
        if (message.sender._id !== user.id) {
          setUnreadCounts((prev) => ({
            ...prev,
            [message.sender._id]: (prev[message.sender._id] || 0) + 1,
          }));
        }
      });

      newSocket.on("userTyping", ({ userId, isTyping }) => {
        setTypingUsers((prev) => ({
          ...prev,
          [userId]: isTyping,
        }));
      });

      newSocket.on("messageStatusUpdated", ({ messageId, status }) => {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === messageId ? { ...msg, status } : msg))
        );
      });

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  const sendMessage = (receiverId, content) => {
    if (socket && user) {
      socket.emit("sendMessage", {
        senderId: user.id,
        receiverId,
        content,
      });
    }
  };

  const sendTypingStatus = useCallback(
    (receiverId, isTyping) => {
      if (socket && user) {
        socket.emit("typing", {
          senderId: user.id,
          receiverId,
          isTyping,
        });
      }
    },
    [socket, user]
  );

  const updateMessageStatus = useCallback(
    (messageId, status) => {
      if (socket) {
        socket.emit("messageStatus", {
          messageId,
          status,
        });
      }
    },
    [socket]
  );

  const clearMessages = () => {
    setMessages([]);
  };

  const resetUnreadCount = useCallback((userId) => {
    setUnreadCounts((prev) => ({
      ...prev,
      [userId]: 0,
    }));
  }, []);

  const value = {
    socket,
    messages,
    typingUsers,
    unreadCounts,
    sendMessage,
    sendTypingStatus,
    updateMessageStatus,
    clearMessages,
    resetUnreadCount,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
