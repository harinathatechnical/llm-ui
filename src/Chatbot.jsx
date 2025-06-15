import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './Chatbot.css';

function Chatbot() {
    // --- State ---
    const [userInput, setUserInput] = useState('');
    const [messages, setMessages] = useState([]); // Stores objects like { text: "...", sender: "user/ai", type: "text/list" }
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- Ref for scrolling ---
    const messagesEndRef = useRef(null);

    // --- Constants ---
    const API_BASE_URL = 'http://localhost:8080/api/mongo';

    // --- Effects ---
    // Scroll to the bottom whenever messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // --- Event Handlers ---
    const handleInputChange = (event) => {
        setUserInput(event.target.value);
    };

    const handleSendMessage = async () => {
        if (!userInput.trim()) {
            return; // Don't send empty messages
        }

        const userMessageText = userInput.trim(); // Store the user's exact message
        // Add user message to display immediately
        setMessages((prevMessages) => [...prevMessages, { content: userMessageText, sender: 'user' }]);
        setUserInput(''); // Clear the input field

        setIsLoading(true);
        setError(null); // Clear previous errors

        try {
            const encodedMessage = encodeURIComponent(userMessageText);
            const response = await axios.get(`${API_BASE_URL}/${encodedMessage}`);
            const responseData = response.data; // Axios automatically parses JSON

            let aiDisplayContent; // This will hold the AI's response for display
            let aiMessageType = 'text'; // Default type for AI messages

            // --- Determine how to display the response ---
            if (Array.isArray(responseData)) {
                // If it's an array (from a tool call like listing databases/collections)
                aiMessageType = 'list';
                aiDisplayContent = (
                    <>
                        <p>I found the following items:</p> {/* General intro */}
                       <ol>
  {responseData.map((item, index) => (
    <li key={index}>
      {typeof item === 'object' && item !== null ? (
        <ul>
          {Object.entries(item).map(([key, value], subIndex) => (
            <li key={subIndex}>
              <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
            </li>
          ))}
        </ul>
      ) : (
        <span>{String(item)}</span>
      )}
    </li>
  ))}
</ol>


                    </>
                );
            } else if (typeof responseData === 'object' && responseData !== null) {
                // If it's a JSON object (like {"message": "..."} or {"error": "..."})
                if (responseData.message) {
                    aiDisplayContent = responseData.message;
                } else if (responseData.error) {
                    aiDisplayContent = "Error from server: " + responseData.error;
                    setError(responseData.error);
                } else {
                    aiDisplayContent = "Received an unexpected data format.";
                    console.warn("Unexpected responseData:", responseData);
                }
            } else {
                // Fallback for any other unexpected plain text (should ideally be handled above)
                aiDisplayContent = String(responseData);
            }

            // Add AI response to messages state
            setMessages((prevMessages) => [...prevMessages, { content: aiDisplayContent, sender: 'ai', type: aiMessageType }]);

        } catch (err) {
            console.error('Error calling backend:', err);
            // Provide a general error message if the API call fails entirely
            setMessages((prevMessages) => [
                ...prevMessages, // Keep previous messages
                { content: 'Sorry, I encountered an error. Please try again.', sender: 'ai-error', type: 'text' },
            ]);
            setError(err.message || 'Failed to connect to the backend.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter' && !isLoading) {
            handleSendMessage();
        }
    };

    // --- Render ---
    return (
        <div className="chatbot-container">
            <h1>Rules AI Chatbot</h1>

            <div className="messages-display">
                {messages.map((msg, index) => (
                    // Render the message content. React will handle if it's a string or JSX.
                    <div key={index} className={`message-bubble ${msg.sender} ${msg.type === 'list' ? 'message-list' : ''}`}>
                        {msg.content}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="input-area">
                <input
                    type="text"
                    value={userInput}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    disabled={isLoading}
                />
                <button onClick={handleSendMessage} disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send'}
                </button>
            </div>

            {error && <p className="error-message">Error: {error}</p>}
        </div>
    );
}

export default Chatbot;