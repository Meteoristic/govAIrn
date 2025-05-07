import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { Bot, Send, RotateCw, ChevronDown, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";

// Define message type with optional error property
interface ChatMessage {
  role: string;
  content: string;
  timestamp: string;
  error?: boolean;
}

// Temporary mock data for development
const MOCK_MESSAGES: ChatMessage[] = [
  {
    role: 'agent',
    content: 'Hello! I\'m your GovAIrn agent. I can help you understand proposals and execute votes based on your persona preferences.',
    timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
  },
  {
    role: 'user',
    content: 'Can you explain why you recommended voting FOR on the latest proposal?',
    timestamp: new Date(Date.now() - 3540000).toISOString() // 59 minutes ago
  },
  {
    role: 'agent',
    content: 'I recommended voting FOR because this proposal aligns with your preference for governance efficiency. It reduces the quorum requirement from 4% to 2%, which will help the DAO make decisions faster while maintaining adequate representation.',
    timestamp: new Date(Date.now() - 3480000).toISOString() // 58 minutes ago
  }
];

const MOCK_LOGS = [
  {
    action: 'DELEGATION CREATED',
    status: 'completed',
    description: 'Delegated voting power for dao.eth to agent wallet',
    timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    details: {
      transactionHash: '0x123abc456def789ghi',
      network: 'Base',
      delegateAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
    }
  },
  {
    action: 'VOTE SUBMITTED',
    status: 'completed',
    description: 'Voted FOR on proposal "Reduce quorum requirement"',
    timestamp: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
    details: {
      transactionHash: '0x789def123ghi456abc',
      choice: 'FOR',
      confidence: 87
    }
  },
  {
    action: 'VOTE QUERY',
    status: 'completed',
    description: 'Retrieved voting status for proposal',
    timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
  }
];

const AgentChat: React.FC = () => {
  const { proposalId } = useParams<{ proposalId?: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [logs, setLogs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // Scroll to bottom of chat when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Load chat history and logs - using mock data for now
  useEffect(() => {
    // Initialize with mock data 
    setMessages(MOCK_MESSAGES);
    setLogs(MOCK_LOGS);
    
    if (!user?.id) {
      console.log('User not authenticated, using mock data');
      return;
    }
    
    // Simulate loading time for better user experience
    setLoading(true);
    
    // If we have a proposalId, simulate a custom greeting for that proposal
    if (proposalId) {
      const mockProposal = {
        id: proposalId,
        title: 'Reduce quorum requirement from 4% to 2%',
        body: 'This proposal aims to reduce the quorum requirement for voting from 4% to 2%...',
        choices: ['For', 'Against', 'Abstain'],
        start: new Date(Date.now() - 86400000 * 3).toISOString(),
        end: new Date(Date.now() + 86400000 * 4).toISOString()
      };
      
      setProposal(mockProposal);
      
      // Create custom message for this proposal
      const customMessage = {
        role: 'agent',
        content: `Hello! I'm reviewing proposal "${mockProposal.title}". Based on your persona, I've recommended a "For" vote with 87% confidence. Would you like to know more about this recommendation?`,
        timestamp: new Date().toISOString()
      };
      
      setMessages([customMessage]);
    }
    
    // Simulate network delay
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, [user?.id, proposalId]);
  
  // Handle sending a message to the agent
  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;
    
    // Add user message to the chat
    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      // Demo mode responses with delay to simulate AI thinking
      const getMockResponse = (userInput: string) => {
        // Simple response logic based on user input
        const lowerInput = userInput.toLowerCase();
        
        if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
          return "Hello! How can I assist you with governance decisions today?";
        }
        
        if (lowerInput.includes('proposal')) {
          return "I can help analyze proposals based on your governance preferences. Would you like me to explain a specific proposal?";
        }
        
        if (lowerInput.includes('vote') || lowerInput.includes('voting')) {
          return "Your voting power is valuable! I can help you make informed decisions by analyzing proposals against your persona preferences.";
        }
        
        if (lowerInput.includes('why') && (lowerInput.includes('for') || lowerInput.includes('against'))) {
          return "I recommended this vote because it aligns with your governance preferences. Your persona prioritizes long-term sustainability and governance efficiency, and this proposal supports those values.";
        }
        
        // Default response
        return "I understand. Is there anything specific about this proposal or DAO governance that you'd like me to explain further?";
      };
      
      // Get mock response with realistic delay
      const response = await new Promise<string>(resolve => {
        const thinkingTime = 1000 + Math.random() * 1000; // Random delay between 1-2 seconds
        setTimeout(() => {
          resolve(getMockResponse(input.trim()));
        }, thinkingTime);
      });
      
      // Add agent response to chat
      const agentMessage: ChatMessage = {
        role: 'agent',
        content: response,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, agentMessage]);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-phosphor bg-clip-text bg-gradient-to-r from-phosphor to-phosphor/80 text-transparent">
            Agent Chat
          </h1>
          
          {proposal && (
            <div className="bg-black/30 px-4 py-2 rounded-lg flex items-center gap-2">
              <span className="text-silver text-sm">Discussing:</span>
              <span className="text-phosphor font-medium">{proposal.title}</span>
            </div>
          )}
        </div>
        
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="mb-4 bg-black/20 border-silver/10">
            <TabsTrigger value="chat" className="data-[state=active]:bg-indigo/10 data-[state=active]:text-indigo">Chat</TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-indigo/10 data-[state=active]:text-indigo">Execution Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="space-y-4">
            <CardSpotlight className="h-[calc(100vh-280px)] flex flex-col overflow-hidden">
              <div className="relative z-10 flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message, index) => (
                  <div 
                    key={index} 
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user' 
                          ? 'bg-indigo/20 text-phosphor' 
                          : message.error 
                            ? 'bg-red-500/20 text-red-300' 
                            : 'bg-graphite/30 text-silver'
                      }`}
                    >
                      {message.role !== 'user' && (
                        <div className="flex items-center gap-2 mb-2">
                          <Bot size={16} className="text-cyan" />
                          <span className="text-cyan font-medium text-sm">GovAIrn Agent</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <div className="text-right mt-1">
                        <span className="text-xs opacity-60">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
                
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-graphite/30 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <RotateCw size={16} className="text-cyan animate-spin" />
                        <span className="text-silver">Agent is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="relative z-10 p-4 border-t border-silver/10">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask about proposals or instruct your agent..."
                    className="bg-black/30 border-silver/20"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={loading || !input.trim()}
                    className="bg-indigo hover:bg-indigo/90"
                  >
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </CardSpotlight>
          </TabsContent>
          
          <TabsContent value="logs" className="space-y-4">
            <CardSpotlight className="h-[calc(100vh-280px)] flex flex-col overflow-hidden">
              <div className="relative z-10 flex-1 overflow-y-auto p-6">
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-silver">
                    <Clock size={48} className="mb-3 opacity-30" />
                    <p>No execution logs yet</p>
                    <p className="text-sm mt-1 opacity-70">Logs will appear here when your agent takes actions</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {logs.map((log, index) => (
                      <div key={index} className="border border-silver/10 rounded-lg p-4 bg-black/20">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              log.status === 'completed' ? 'bg-teal' : 
                              log.status === 'pending' ? 'bg-yellow-400' : 
                              'bg-red-400'
                            }`} />
                            <span className="font-medium text-phosphor">{log.action}</span>
                          </div>
                          <span className="text-sm text-silver">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        
                        <p className="text-sm text-silver mb-3">{log.description}</p>
                        
                        {log.details && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-indigo flex items-center">
                              <ChevronDown size={12} className="mr-1" />
                              View Details
                            </summary>
                            <pre className="mt-2 p-2 bg-black/30 rounded-md overflow-x-auto text-cyan">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardSpotlight>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AgentChat;
