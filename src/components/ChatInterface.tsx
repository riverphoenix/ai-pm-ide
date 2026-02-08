import { useState, useEffect, useRef } from 'react';
import { Message, ChatStreamEvent, Settings } from '../lib/types';
import { conversationsAPI, messagesAPI, tokenUsageAPI, modelsAPI } from '../lib/ipc';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatInterfaceProps {
  projectId: string;
  conversationId?: string;
  apiKey: string;
  settings: Settings;
  model?: string;
}

interface MessageWithContext extends Message {
  systemPrompt?: string;
  fullContext?: string;
}

export default function ChatInterface({
  projectId,
  conversationId: initialConversationId,
  apiKey,
  settings,
  model = 'gpt-5',
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<MessageWithContext[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId
  );
  const [streamingMessage, setStreamingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());
  const [selectedModel, setSelectedModel] = useState('gpt-5');
  const [availableModels, setAvailableModels] = useState<string[]>([
    'gpt-5',
    'gpt-5-mini',
    'gpt-5-nano',
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Update local conversationId when prop changes
  useEffect(() => {
    setConversationId(initialConversationId);
  }, [initialConversationId]);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      loadMessages();
    } else {
      // Clear messages when starting new conversation
      setMessages([]);
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // Fetch available models when API key is available
  useEffect(() => {
    const fetchModels = async () => {
      if (apiKey) {
        console.log('🔍 Fetching available OpenAI models...');
        try {
          const models = await modelsAPI.list(apiKey);
          console.log('✅ Fetched models:', models);
          if (models && models.length > 0) {
            setAvailableModels(models);
            // If current selected model is not in the list, switch to first available
            if (!models.includes(selectedModel)) {
              setSelectedModel(models[0]);
            }
          }
        } catch (error) {
          console.error('❌ Failed to fetch models:', error);
          // Keep default models on error
        }
      }
    };

    fetchModels();
  }, [apiKey]); // Only run when apiKey changes

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    if (!conversationId) return;
    console.log('Loading messages for conversation:', conversationId);
    try {
      const msgs = await messagesAPI.list(conversationId);
      console.log('Loaded messages:', msgs.length);
      setMessages(msgs);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setError('Failed to load conversation messages');
    }
  };

  const generateSystemPrompt = (): string => {
    const parts: string[] = [
      'You are an AI assistant helping a Product Manager with their work.',
    ];

    if (settings.name || settings.surname) {
      const fullName = [settings.name, settings.surname].filter(Boolean).join(' ');
      parts.push(`You are assisting ${fullName}.`);
    }

    if (settings.job_title) {
      parts.push(`They are a ${settings.job_title}.`);
    }

    if (settings.company) {
      parts.push(`They work at ${settings.company}.`);
    }

    if (settings.about_me) {
      parts.push(`\nAbout them:\n${settings.about_me}`);
    }

    if (settings.about_role) {
      parts.push(`\nAbout their role:\n${settings.about_role}`);
    }

    parts.push(
      '\nProvide concise, actionable advice tailored to their role. Use PM frameworks and best practices when relevant.'
    );

    return parts.join(' ');
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setStreamingMessage('');
    setError(null);

    try {
      // Create conversation if needed
      let convId = conversationId;
      if (!convId) {
        const conversation = await conversationsAPI.create(
          projectId,
          userMessage.substring(0, 50) + '...',
          selectedModel
        );
        convId = conversation.id;
        setConversationId(convId);
      }

      // Generate system prompt with profile information
      const systemPrompt = generateSystemPrompt();

      // Prepare full context for display
      const fullContext = JSON.stringify({
        system: systemPrompt,
        model: selectedModel,
        max_tokens: 4096,
        conversation_history: messages.length,
      }, null, 2);

      // Add user message to database with context
      const userMsg = await messagesAPI.add(convId, 'user', userMessage, 0);
      const userMsgWithContext: MessageWithContext = {
        ...userMsg,
        systemPrompt,
        fullContext,
      };
      setMessages((prev) => [...prev, userMsgWithContext]);

      // Prepare messages for Claude API
      const chatMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ];

      // Call Python sidecar streaming endpoint
      console.log('Sending request to Python sidecar:', {
        url: 'http://localhost:8000/chat/stream',
        model: selectedModel,
        messageCount: chatMessages.length,
        hasApiKey: !!apiKey,
      });

      const response = await fetch('http://localhost:8000/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          messages: chatMessages,
          conversation_id: convId,
          api_key: apiKey,
          model: selectedModel,
          max_tokens: 4096,
          system: systemPrompt,
        }),
      });

      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`API error (${response.status}): ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let totalTokens = 0;
      let inputTokens = 0;
      let outputTokens = 0;
      let cost = 0;

      console.log('Starting to read stream...');

      if (reader) {
        let chunkCount = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('Stream done. Total chunks:', chunkCount, 'Content length:', assistantContent.length);
            break;
          }

          chunkCount++;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              try {
                const event: ChatStreamEvent = JSON.parse(data);
                console.log('Stream event:', event.type, event);

                if (event.type === 'content_block_delta' && event.delta?.text) {
                  assistantContent += event.delta.text;
                  setStreamingMessage(assistantContent);
                } else if (event.type === 'message_stop' && event.usage) {
                  inputTokens = event.usage.input_tokens;
                  outputTokens = event.usage.output_tokens;
                  totalTokens = inputTokens + outputTokens;
                  cost = event.cost || 0;
                  console.log('Message complete. Tokens:', totalTokens, 'Cost:', cost);
                } else if (event.type === 'error') {
                  console.error('Stream error:', event.error);
                  throw new Error(event.error);
                }
              } catch (e) {
                // Ignore JSON parse errors for incomplete chunks
                if (data.trim()) {
                  console.warn('Failed to parse event:', data.substring(0, 100));
                }
              }
            }
          }
        }
      } else {
        console.error('No reader available from response');
      }

      // Add assistant message to database
      console.log('Saving assistant message. Content length:', assistantContent.length);
      const assistantMsg = await messagesAPI.add(
        convId,
        'assistant',
        assistantContent,
        totalTokens
      );
      console.log('Assistant message saved:', assistantMsg.id);
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingMessage('');

      // Update conversation stats and record token usage
      await Promise.all([
        conversationsAPI.updateStats(convId, totalTokens, cost),
        tokenUsageAPI.record(convId, selectedModel, inputTokens, outputTokens, cost)
      ]);
      console.log('Conversation stats updated successfully');
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const togglePromptExpansion = (messageId: string) => {
    setExpandedPrompts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 flex-1">
      {/* Top Bar with Model Selector */}
      <div className="border-b border-slate-800 bg-slate-900/50 px-4 py-2.5 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Model:</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            disabled={loading}
          >
            {availableModels.map((model) => (
              <option key={model} value={model}>
                {model === 'gpt-5' ? '🌟 GPT-5' :
                 model === 'gpt-5-mini' ? '⚡ GPT-5 Mini' :
                 model === 'gpt-5-nano' ? '💨 GPT-5 Nano' : model}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages Area - ChatGPT Style */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && !streamingMessage && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-2xl px-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl mb-6 border border-indigo-500/20">
                <span className="text-4xl">💬</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Chat with GPT
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Ask questions about your project, get help with PM frameworks, or brainstorm ideas. Your conversation is saved automatically.
              </p>
            </div>
          </div>
        )}

        <div className="py-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`w-full ${
                message.role === 'assistant' ? 'bg-slate-900/30' : ''
              }`}
            >
              <div className="max-w-3xl mx-auto px-6 py-6">
                <div className="flex gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                    }`}>
                      {message.role === 'user' ? 'Y' : 'AI'}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white mb-2">
                      {message.role === 'user' ? 'You' : 'Assistant'}
                    </div>
                    <div className="text-sm text-slate-200 leading-relaxed">
                      <MarkdownRenderer content={message.content} />
                    </div>

                    {/* Prompt context toggle */}
                    {message.role === 'user' && message.fullContext && (
                      <div className="mt-3">
                        <button
                          onClick={() => togglePromptExpansion(message.id)}
                          className="text-[10px] text-slate-500 hover:text-slate-400 transition-colors"
                        >
                          {expandedPrompts.has(message.id) ? '▼ Hide' : '▶ View'} prompt details
                        </button>
                        {expandedPrompts.has(message.id) && (
                          <pre className="text-[10px] text-slate-500 mt-2 p-3 bg-slate-900/50 rounded border border-slate-800 overflow-x-auto">
                            {message.fullContext}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Streaming Message */}
          {streamingMessage && (
            <div className="w-full bg-slate-900/30">
              <div className="max-w-3xl mx-auto px-6 py-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                      AI
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white mb-2">
                      Assistant
                    </div>
                    <div className="text-sm text-slate-200 leading-relaxed">
                      <MarkdownRenderer content={streamingMessage} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && !streamingMessage && (
            <div className="w-full bg-slate-900/30">
              <div className="max-w-3xl mx-auto px-6 py-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                      AI
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white mb-2">
                      Assistant
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="w-full">
              <div className="max-w-3xl mx-auto px-6 py-4">
                <div className="flex gap-4 p-4 bg-red-900/20 border border-red-700/30 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500/20 text-red-400">
                      ⚠
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-red-400 mb-1">
                      Error
                    </div>
                    <div className="text-sm text-red-300">
                      {error}
                    </div>
                    <button
                      onClick={() => setError(null)}
                      className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - ChatGPT Style */}
      <div className="border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              disabled={loading}
              className="w-full px-4 py-3 pr-12 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              rows={1}
              style={{ minHeight: '52px', maxHeight: '200px' }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="absolute right-2 bottom-2 w-8 h-8 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              title="Send message"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 text-center">
            Press Enter to send • Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}
