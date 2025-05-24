import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketUtils";

export const Chat = () => {
  const { user, logout } = useAuth();
  const {
    messages,
    typingUsers,
    unreadCounts,
    sendMessage,
    sendTypingStatus,
    updateMessageStatus,
    resetUnreadCount,
    clearMessages,
  } = useSocket();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState("chats"); // "chats" or "search"
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  // Fetch conversations
  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/messages/conversations/history`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  // Search users
  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_SERVER_URL
        }/api/users/search?query=${encodeURIComponent(searchQuery)}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error("Search failed:", error);
    }
  };
  // Load messages with pagination
  const loadMessages = async (userId, currentPage = 1, append = false) => {
    try {
      setLoadingMore(true);
      const response = await fetch(
        `${
          import.meta.env.VITE_SERVER_URL
        }/api/messages/${userId}?page=${currentPage}&limit=20`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        if (append) {
          setChatMessages((prev) => [...prev, ...data.messages]);
        } else {
          setChatMessages(data.messages || []);
        }
        setHasMore(data.pagination.hasMore);
        setPage(data.pagination.page);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Load more messages when scrolling up
  const handleLoadMoreMessages = () => {
    if (hasMore && !loadingMore && selectedUser) {
      loadMessages(selectedUser._id, page + 1, true);
    }
  }; // Handle user selection
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setSearchQuery("");
    setSearchResults([]);
    setActiveTab("chats");
    clearMessages();
    setPage(1);
    setHasMore(true);
    loadMessages(user._id, 1, false);

    // Reset unread count for this user
    resetUnreadCount(user._id);

    // Mark messages as read on the server
    markMessagesAsRead(user._id);
  };

  // Mark messages as read when a conversation is opened
  const markMessagesAsRead = async (userId) => {
    try {
      await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/messages/${userId}/read`,
        {
          method: "PUT",
          credentials: "include",
        }
      );
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedUser) return;

    sendMessage(selectedUser._id, messageInput);
    setMessageInput("");

    // Clear typing status when sending a message
    sendTypingStatus(selectedUser._id, false);
  };

  // Handle typing indicator
  const handleMessageInputChange = (e) => {
    setMessageInput(e.target.value);

    if (selectedUser) {
      // Send typing status
      sendTypingStatus(selectedUser._id, e.target.value.length > 0);

      // Clear typing status after 3 seconds of inactivity
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        sendTypingStatus(selectedUser._id, false);
      }, 3000);
    }
  };
  useEffect(() => {
    if (activeTab === "search") {
      const timer = setTimeout(searchUsers, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, activeTab, searchUsers]);

  // Initialize by loading conversations
  useEffect(() => {
    fetchConversations();
  }, []);
  // Update message statuses to 'seen' when viewing a conversation
  const updateMessageSeenStatus = useCallback(
    (messages) => {
      if (selectedUser && messages.length > 0) {
        // Find messages from the selected user that haven't been marked as seen
        const unseenMessages = messages.filter(
          (msg) => msg.sender._id === selectedUser._id && msg.status !== "seen"
        );

        // Update each message status to 'seen'
        unseenMessages.forEach((msg) => {
          updateMessageStatus(msg._id, "seen");
        });
      }
    },
    [selectedUser, updateMessageStatus]
  );

  // Effect to mark messages as seen when they are displayed
  useEffect(() => {
    if (chatMessages.length > 0 && selectedUser) {
      updateMessageSeenStatus(chatMessages);
    }
  }, [chatMessages, selectedUser, updateMessageSeenStatus]);

  // Update chat messages when new messages arrive via socket
  useEffect(() => {
    if (selectedUser) {
      const newMessages = messages.filter(
        (msg) =>
          (msg.sender._id === user.id &&
            msg.receiver._id === selectedUser._id) ||
          (msg.sender._id === selectedUser._id && msg.receiver._id === user.id)
      );

      if (newMessages.length > 0) {
        setChatMessages((prev) => [...prev, ...newMessages]);
        // Also update the conversation list
        fetchConversations();
      }
    }
  }, [messages, selectedUser, user.id]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Handle scroll events for infinite loading
  const handleScroll = (e) => {
    const { scrollTop } = e.currentTarget;
    if (scrollTop === 0 && hasMore && !loadingMore) {
      handleLoadMoreMessages();
    }
  };
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={
                  user.profilePicture ||
                  "https://ui-avatars.com/api/?name=" +
                    encodeURIComponent(user.name)
                }
                alt={user.name}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <h2 className="font-semibold">{user.name}</h2>
                <p className="text-sm opacity-90">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 hover:bg-blue-700 rounded-lg transition duration-200"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`flex-1 py-3 font-medium text-sm ${
              activeTab === "chats"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("chats")}
          >
            Conversations
          </button>
          <button
            className={`flex-1 py-3 font-medium text-sm ${
              activeTab === "search"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("search")}
          >
            Search
          </button>
        </div>

        {/* Search Input (only shown in search tab) */}
        {activeTab === "search" && (
          <div className="p-4 border-b">
            <div className="relative">
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg
                className="w-5 h-5 absolute left-3 top-3.5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Search Results */}
          {activeTab === "search" && searchResults.length > 0 && (
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">
                Search Results
              </h3>
              {searchResults.map((searchUser) => (
                <div
                  key={searchUser._id}
                  onClick={() => handleUserSelect(searchUser)}
                  className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg cursor-pointer transition duration-200"
                >
                  <img
                    src={
                      searchUser.profilePicture ||
                      "https://ui-avatars.com/api/?name=" +
                        encodeURIComponent(searchUser.name)
                    }
                    alt={searchUser.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-medium">{searchUser.name}</p>
                    <p className="text-sm text-gray-600">{searchUser.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Conversations List */}
          {activeTab === "chats" && (
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">
                Recent Conversations
              </h3>
              {loading ? (
                <div className="flex justify-center p-4">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              ) : conversations.length > 0 ? (
                conversations.map((conversation) => (
                  <div
                    key={conversation._id}
                    onClick={() => handleUserSelect(conversation.user)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition duration-200 ${
                      selectedUser && selectedUser._id === conversation.user._id
                        ? "bg-blue-50"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <img
                      src={
                        conversation.user.profilePicture ||
                        "https://ui-avatars.com/api/?name=" +
                          encodeURIComponent(conversation.user.name)
                      }
                      alt={conversation.user.name}
                      className="w-10 h-10 rounded-full flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between">
                        <p className="font-medium truncate">
                          {conversation.user.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(
                            conversation.timestamp
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.lastMessage}
                      </p>
                    </div>{" "}
                    {/* Unread count indicator - combine from backend + socket state */}
                    {(conversation.unread > 0 ||
                      unreadCounts[conversation.user._id] > 0) && (
                      <span className="w-5 h-5 bg-blue-500 text-white text-xs flex items-center justify-center rounded-full">
                        {(conversation.unread || 0) +
                          (unreadCounts[conversation.user._id] || 0)}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  No conversations yet. Start by searching for a user.
                </div>
              )}
            </div>
          )}
        </div>
      </div>{" "}
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-white shadow-sm">
              <div className="flex items-center gap-3">
                <img
                  src={
                    selectedUser.profilePicture ||
                    "https://ui-avatars.com/api/?name=" +
                      encodeURIComponent(selectedUser.name)
                  }
                  alt={selectedUser.name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h3 className="font-semibold">{selectedUser.name}</h3>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>
              </div>
            </div>
            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-4"
              onScroll={handleScroll}
            >
              {/* Loading indicator at the top for loading more messages */}
              {loadingMore && (
                <div className="flex justify-center py-2">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              )}
              {chatMessages.map((message, index) => (
                <div
                  key={message._id || index}
                  className={`flex ${
                    message.sender._id === user.id
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  {message.sender._id !== user.id && (
                    <img
                      src={
                        message.sender.profilePicture ||
                        "https://ui-avatars.com/api/?name=" +
                          encodeURIComponent(message.sender.name)
                      }
                      alt={message.sender.name}
                      className="w-8 h-8 rounded-full mr-2 self-end mb-1"
                    />
                  )}
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender._id === user.id
                        ? "bg-blue-500 text-white rounded-tr-none"
                        : "bg-white border rounded-tl-none"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p
                        className={`text-xs ${
                          message.sender._id === user.id
                            ? "text-blue-100"
                            : "text-gray-500"
                        }`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {message.sender._id === user.id && message.status && (
                        <span
                          className={`text-xs ml-1 ${
                            message.status === "seen"
                              ? "text-blue-100"
                              : "text-blue-200"
                          }`}
                        >
                          {message.status === "seen" ? "✓✓" : "✓"}
                        </span>
                      )}
                    </div>
                  </div>
                  {message.sender._id === user.id && (
                    <img
                      src={
                        user.profilePicture ||
                        "https://ui-avatars.com/api/?name=" +
                          encodeURIComponent(user.name)
                      }
                      alt={user.name}
                      className="w-8 h-8 rounded-full ml-2 self-end mb-1"
                    />
                  )}
                </div>
              ))}

              {/* Reference for scrolling to the bottom */}
              <div ref={messagesEndRef} />
            </div>{" "}
            {/* Message Input */}
            <div className="p-4 border-t bg-white">
              {typingUsers[selectedUser?._id] && (
                <div className="text-xs text-gray-500 mb-2 italic">
                  {selectedUser.name} is typing...
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={handleMessageInputChange}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className={`px-6 py-3 rounded-lg transition duration-200 ${
                    messageInput.trim()
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Welcome to Chat App
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                {activeTab === "chats" && conversations.length > 0
                  ? "Select a conversation to start chatting"
                  : "Start a conversation by searching for users"}
              </p>
              {activeTab === "chats" && conversations.length === 0 && (
                <button
                  onClick={() => setActiveTab("search")}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-200"
                >
                  Find Users
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
