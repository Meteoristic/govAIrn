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
import { OpenAIService } from "@/lib/services/openai.service";
import { supabase } from "@/lib/supabase";

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

// Add these utility functions for persona handling
const getUserPersonaPreferences = () => {
  try {
    // Try to get persona preferences from localStorage
    const storedPersona = localStorage.getItem('user_persona');
    if (storedPersona) {
      return JSON.parse(storedPersona);
    }
    
    // Default values if no persona is found
    return {
      riskTolerance: 'moderate',        // 'conservative', 'moderate', 'aggressive'
      priorityFocus: 'balanced',        // 'security', 'innovation', 'balanced'
      timeHorizon: 'medium',            // 'short', 'medium', 'long'
      governance: 'decentralization',   // 'efficiency', 'decentralization', 'balanced'
      communityImpact: 'high'           // 'low', 'medium', 'high'
    };
  } catch (error) {
    console.error("Error retrieving user persona:", error);
    return null;
  }
};

const getPersonaDescription = (personaPreferences: any) => {
  if (!personaPreferences) return "Your current persona preferences are not set.";
  
  const descriptions = {
    riskTolerance: {
      conservative: "prioritizes caution and safety in governance decisions",
      moderate: "balances risk and opportunity in decision-making",
      aggressive: "favors bold initiatives with higher potential returns"
    },
    priorityFocus: {
      security: "emphasizes protocol security and stability",
      innovation: "values innovation and ecosystem growth",
      balanced: "seeks balance between security and innovation"
    },
    timeHorizon: {
      short: "focuses on immediate impact and short-term outcomes",
      medium: "considers medium-term implications (6-18 months)",
      long: "prioritizes long-term sustainability and growth"
    },
    governance: {
      efficiency: "values streamlined decision-making processes",
      decentralization: "prioritizes community involvement and decentralized governance",
      balanced: "balances efficiency with decentralized participation"
    },
    communityImpact: {
      low: "places moderate emphasis on community impact",
      medium: "considers community impact as important",
      high: "strongly values proposals that benefit the wider community"
    }
  };
  
  return `Your persona ${descriptions.riskTolerance[personaPreferences.riskTolerance]}, ${descriptions.priorityFocus[personaPreferences.priorityFocus]}, and ${descriptions.timeHorizon[personaPreferences.timeHorizon]}. You ${descriptions.governance[personaPreferences.governance]} and ${descriptions.communityImpact[personaPreferences.communityImpact]}.`;
};

// Add a utility function to clean markdown formatting
const cleanMarkdownFormatting = (text: string): string => {
  if (!text) return '';
  
  // Replace heading markers (###, ##, #)
  let cleaned = text
    .replace(/^###\s+(.*)$/gm, 'HEADING: $1')
    .replace(/^##\s+(.*)$/gm, 'HEADING: $1')
    .replace(/^#\s+(.*)$/gm, 'HEADING: $1');
    
  // Replace bold/emphasis markers
  cleaned = cleaned
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1');
  
  return cleaned;
};

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
  
  // Load chat history and logs
  useEffect(() => {
    // Initialize with mock logs (we'll keep these for now)
    setLogs(MOCK_LOGS);
    
    // Load saved conversations from Supabase if user is authenticated
    const loadConversations = async () => {
      // Indicate loading state
      setLoading(true);
      
      try {
        if (user?.id) {
          // Fetch user's conversations from Supabase
          const { data, error } = await supabase
            .from('agent_conversations')
            .select('*')
            .eq('user_id', user.id)
            .order('timestamp', { ascending: true })
            .limit(20);
            
          if (error) {
            console.error('Error fetching conversations:', error);
            // Fall back to mock data if there's an error
            setMessages(MOCK_MESSAGES);
          } else if (data && data.length > 0) {
            // Transform the data into the ChatMessage format
            const chatMessages = data.map((msg): ChatMessage => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp
            }));
            
            setMessages(chatMessages);
          } else {
            // If no conversations found, use welcome message
            const welcomeMessage: ChatMessage = {
              role: 'agent',
              content: "Hello! I'm your GovAIrn agent. I can help you understand proposals and make informed governance decisions. How may I assist you today?",
              timestamp: new Date().toISOString()
            };
            
            setMessages([welcomeMessage]);
            
            // Store welcome message in Supabase
            await supabase.from('agent_conversations').insert({
              user_id: user.id,
              role: welcomeMessage.role,
              content: welcomeMessage.content,
              timestamp: welcomeMessage.timestamp
            });
          }
        } else {
          // User not authenticated, use mock data
          console.log('User not authenticated, using mock data');
          setMessages(MOCK_MESSAGES);
        }
        
        // If we have a proposalId, fetch the proposal details
        if (proposalId) {
          // In a real implementation, we would fetch the actual proposal
          // For now we'll use mock data
          const mockProposal = {
            id: proposalId,
            title: 'Reduce quorum requirement from 4% to 2%',
            body: 'This proposal aims to reduce the quorum requirement for voting from 4% to 2%...',
            choices: ['For', 'Against', 'Abstain'],
            start: new Date(Date.now() - 86400000 * 3).toISOString(),
            end: new Date(Date.now() + 86400000 * 4).toISOString()
          };
          
          setProposal(mockProposal);
        }
      } catch (error) {
        console.error('Error in loading conversations:', error);
        // Fall back to mock data
        setMessages(MOCK_MESSAGES);
      } finally {
        // Remove loading state
        setLoading(false);
      }
    };
    
    // Execute the function to load conversations
    loadConversations();
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
      // Get user persona preferences
      const personaPreferences = getUserPersonaPreferences();
      const personaDescription = getPersonaDescription(personaPreferences);
      
      // Create conversation history for context
      const conversationMessages = [
        {
          role: 'system',
          content: `You are an AI governance agent for GovAIrn. Your role is to help users make informed decisions about DAO governance proposals based on their specific persona preferences.

${personaDescription}

When advising on proposals or governance matters:
1. Always consider the user's specific governance preferences above
2. Provide definitive recommendations that align with these preferences
3. Offer concrete suggestions rather than general guidance
4. Be transparent about the confidence level of your insights (high/medium/low)
5. Analyze proposals for their alignment with the user's priorities

Format your responses in clear, direct language. DO NOT use markdown formatting like "#" for headers or "*" for emphasis. Structure your insights with plain text headings (all caps for section titles) and standard bullet points (•) where appropriate.

If analyzing specific proposals, consider:
- Financial impact on the DAO treasury
- Alignment with the user's risk tolerance and time horizon
- Community sentiment and historical precedent
- Technical feasibility and security implications

End your responses with a clear call to action or specific next steps.`
        },
        // Include recent conversation history for context (last 5 messages)
        ...messages.slice(-5).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        // Add the latest user message
        { role: 'user', content: input }
      ];
      
      // Use OpenAI to generate a response
      const response = await OpenAIService.generateCompletion(
        conversationMessages as any,
        { 
          temperature: 0.7,
          maxTokens: 500 // Keep responses reasonably sized
        }
      );
      
      // Clean markdown formatting from the response
      const cleanedResponse = cleanMarkdownFormatting(response);
      
      // Add agent response to chat
      const agentMessage: ChatMessage = {
        role: 'agent',
        content: cleanedResponse,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, agentMessage]);
      
      // Store the conversation in Supabase for persistence if user is authenticated
      if (user?.id) {
        try {
          await supabase.from('agent_conversations').insert([
            {
              user_id: user.id,
              role: userMessage.role,
              content: userMessage.content,
              timestamp: userMessage.timestamp
            },
            {
              user_id: user.id,
              role: agentMessage.role,
              content: agentMessage.content, // Store the cleaned response
              timestamp: agentMessage.timestamp
            }
          ]);
        } catch (storageError) {
          console.error('Error storing conversation:', storageError);
          // Non-critical error, don't show to user
        }
      }
    } catch (error) {
      console.error('Error in agent chat:', error);
      
      // Add error message to the chat
      const errorMessage: ChatMessage = {
        role: 'agent',
        content: 'I apologize, but I encountered an error processing your request. Please try again later.',
        timestamp: new Date().toISOString(),
        error: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      // Show error toast
      toast({
        title: 'Error',
        description: 'Failed to get a response from the agent. Please try again later.',
        variant: 'destructive'
      });
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
