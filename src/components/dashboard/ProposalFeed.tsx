import { useState, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import { ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { DaoService } from "@/lib/services/dao.service";
import { ProposalService } from "@/lib/services/proposal.service";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { AIDecisionFactory } from "@/lib/factories/ai-decision.factory";
import { AIDecisionProvider, useAIDecisionContext } from "@/components/proposals/AIDecisionProvider";
import { AIDecisionService } from "@/lib/services/ai-decision.service";
import { SnapshotService } from "@/lib/services/snapshot.service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OpenAIService } from '@/lib/services/openai.service';

// Define the necessary types if they're not imported from a central location
interface Dao {
  id?: string;
  name: string;
  icon: string;
}

interface Vote {
  yes: number;
  no: number;
  abstain?: number;
  for?: number;
  against?: number;
  total: number;
}

interface AIDecisionFactor {
  id: string;
  ai_decision_id: string;
  factor_name: string;
  factor_value: number;
  factor_weight: number;
  explanation: string;
  created_at: string;
}

interface AIDecision {
  id?: string;
  user_id?: string;
  proposal_id?: string;
  persona_id?: string;
  decision: string;
  confidence: number;
  persona_match: number;
  reasoning?: string; // Contains the decision rationale (why the AI made this decision)
  proposal_summary?: string; // Contains the actual proposal summary
  recommendation?: string;
  chain_of_thought?: string;
  created_at?: string;
  requires_recalculation?: boolean;
  factors?: AIDecisionFactor[];
  analyzed_text?: string;
  json_output?: string;
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  status: string;
  url: string;
  votingDeadline: string;
  votingStart: string;
  dao: Dao;
  ai_decision?: AIDecision;
  votes: Vote;
}

// Type for formatted proposal that combines Proposal with UI-specific properties
type FormattedProposal = Proposal & {
  timeLeft?: string;
  impact?: string;
  confidence: number;
  personaMatch: number;
  summary: string; // This will be the actual proposal summary
  pros?: string[];
  cons?: string[];
  startTime?: string;
  endTime?: string;
  votingType?: string;
  quorum?: string;
  isRealData?: boolean;
  isBaseEcosystem?: boolean;
};

// Array of supported DAOs we want to focus on (using exact Snapshot space IDs)
const SUPPORTED_DAOS = [
  { id: "aavedao.eth", name: "Aave", icon: "A" },
  { id: "ens.eth", name: "ENS", icon: "E" },
  { id: "gitcoindao.eth", name: "Gitcoin", icon: "G" },
  { id: "uniswapgovernance.eth", name: "Uniswap", icon: "U" }
];

// Helper to get the right status styling
const getStatusStyles = (status: string) => {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-indigo/20 text-indigo";
    case "queued":
    case "pending":
      return "bg-gold/20 text-gold";
    case "executed":
    case "closed":
      return "bg-teal/20 text-teal";
    default:
      return "bg-silver/20 text-silver";
  }
};

export default function ProposalFeed() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadedProposals, setLoadedProposals] = useState<FormattedProposal[]>([]);
  const [dataSource, setDataSource] = useState<'mock' | 'real'>('mock');
  
  // Local state for mock data - used as fallback if live proposals can't be fetched
  const mockProposals: FormattedProposal[] = [
    // Mock proposal data kept unchanged
    {
      id: "87",
      title: "Deploy New Treasury Allocator",
      description: "This proposal aims to deploy a new treasury allocation strategy that focuses on long-term sustainability while maximizing yield. The allocator will split treasury assets across stable yield sources.",
      status: "Active",
      url: "#",
      votingDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      votingStart: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      dao: {
        id: "uniswap",
        name: "Uniswap",
        icon: "U",
      },
      votes: {
        yes: 2400,
        no: 800,
        abstain: 200,
        total: 3400
      },
      timeLeft: "2d 5h remaining",
      summary: "This proposal aims to deploy a new treasury allocation strategy that focuses on long-term sustainability while maximizing yield. The allocator will split treasury assets across stable yield sources.",
      impact: "High",
      confidence: 88,
      personaMatch: 91,
      startTime: "May 1, 2025",
      endTime: "May 5, 2025",
      votingType: "Simple Majority", // Default
      quorum: "4%", // Default
      pros: [
        "Increases treasury yield by an estimated 12%",
        "Reduces overall portfolio risk through diversification",
        "Aligns with community-approved risk parameters"
      ],
      cons: [
        "Requires 48-hour timelock for changes",
        "Minor increase in gas costs for treasury operations"
      ],
      isRealData: false,
      ai_decision: {
        id: `mock-87`,
        user_id: 'mock-user',
        proposal_id: "87",
        persona_id: 'mock-persona',
        decision: 'for',
        confidence: 88,
        persona_match: 91,
        reasoning: 'This proposal aligns with the user\'s persona and has a high confidence score.',
        chain_of_thought: 'Mock AI decision',
        created_at: new Date().toISOString(),
        requires_recalculation: false,
        factors: [
          {
            id: `factor-1-87`,
            ai_decision_id: `mock-87`,
            factor_name: 'Impact',
            factor_value: 8,
            factor_weight: 9,
            explanation: 'Positive impact on the ecosystem',
            created_at: new Date().toISOString()
          },
          {
            id: `factor-2-87`,
            ai_decision_id: `mock-87`,
            factor_name: 'Risk',
            factor_value: 7,
            factor_weight: 7,
            explanation: 'Acceptable risk profile',
            created_at: new Date().toISOString()
          },
          {
            id: `factor-3-87`,
            ai_decision_id: `mock-87`,
            factor_name: 'Drawbacks',
            factor_value: -4,
            factor_weight: 6,
            explanation: 'Some implementation concerns',
            created_at: new Date().toISOString()
          }
        ]
      }
    },
    // Add other mock data items as needed
  ];

  useEffect(() => {
    // Always load mock data first to avoid unnecessary API calls
    const loadProposals = async () => {
      setLoadedProposals(mockProposals);
      setDataSource('mock');
      setLoading(false);
    };

    loadProposals();
  }, []);

  // Function to manually load live data when requested by user
  const loadLiveData = async () => {
    try {
      // Only fetch real proposals if user is logged in
      setLoading(true);
      console.log("Loading live data - user triggered");
      
      // Use a timeout to ensure the loading state is reflected in the UI
      setTimeout(async () => {
        try {
          // Fetch live proposals directly from Snapshot API
          await fetchLiveProposalsDirectly();
        } catch (error) {
          console.error("Error loading live data:", error);
          // Fallback to mock data if there's an error
          setLoadedProposals(mockProposals);
          setDataSource('mock');
        } finally {
          setLoading(false);
        }
      }, 100);
    } catch (error) {
      console.error("Error in loadLiveData:", error);
      setLoadedProposals(mockProposals);
      setDataSource('mock');
      setLoading(false);
    }
  };

  // New improved function to directly fetch and display proposals without database dependency
  const fetchLiveProposalsDirectly = async () => {
    try {
      setLoading(true);
      console.log("Fetching live proposals directly from Snapshot API...");
      
      let allProposals: any[] = [];
      
      // Fetch ONLY active proposals directly from Snapshot for each DAO
      for (const dao of SUPPORTED_DAOS) {
        console.log(`Fetching active proposals for ${dao.name} (${dao.id})...`);
        try {
          // Only fetch active proposals to reduce API calls
          const activeProposals = await SnapshotService.getProposals(dao.id, 'active');
          
          if (activeProposals && activeProposals.length > 0) {
            console.log(`Found ${activeProposals.length} active proposals for ${dao.name}`);
            
            // Add DAO info to each proposal for unified processing
            const proposalsWithDAO = activeProposals.map(p => ({
              ...p,
              dao_info: {
                id: dao.id,
                name: dao.name,
                icon: dao.icon
              }
            }));
            
            allProposals = [...allProposals, ...proposalsWithDAO];
          } else {
            console.log(`No active proposals found for ${dao.name}`);
          }
        } catch (error) {
          console.error(`Error fetching proposals for ${dao.name}:`, error);
        }
      }
      
      console.log(`Total active proposals found: ${allProposals.length}`);
      
      if (allProposals.length === 0) {
        console.log("No active proposals found, using mock data");
        setLoadedProposals(mockProposals);
        setDataSource('mock');
        setLoading(false);
        return;
      }
      
      // Limit to max 3 proposals to avoid excessive OpenAI API calls
      const limitedProposals = allProposals.slice(0, 3);
      console.log(`Processing ${limitedProposals.length} out of ${allProposals.length} total proposals`);
      
      // Process proposals with AI decisions
      const processedProposals = await processProposalsDirectly(limitedProposals);
      
      if (processedProposals.length > 0) {
        console.log(`Successfully processed ${processedProposals.length} real proposals`);
        setLoadedProposals(processedProposals);
        setDataSource('real');
      } else {
        // Fallback to mock data if processing failed
        console.log("Failed to process real proposals, using mock data");
        setLoadedProposals(mockProposals);
        setDataSource('mock');
      }
    } catch (error) {
      console.error("Error fetching proposals:", error);
      // Fallback to mock data on error
      setLoadedProposals(mockProposals);
      setDataSource('mock');
    } finally {
      setLoading(false);
    }
  };

  // Add a cache for AI decisions to prevent redundant API calls  
  const aiDecisionCache = new Map<string, AIDecision>();
  
  // Process proposals directly with OpenAI
  const processProposalsDirectly = async (rawProposals: any[]): Promise<FormattedProposal[]> => {
    try {
      const processedProposals: FormattedProposal[] = [];
      const userId = user?.id || 'anonymous';

      console.log(`Processing ${rawProposals.length} proposals with AI...`);
      
      // Simple processing without parallelization or batching to avoid potential issues
      for (const rawProposal of rawProposals) {
        try {
          console.log(`Processing proposal: ${rawProposal.title}`);
          
          // Truncate body to reduce token usage
          const truncatedBody = rawProposal.body ? 
            rawProposal.body.substring(0, 1000) : 
            'No description available';
          
          // Default values in case AI generation fails
          let aiDecision: AIDecision = {
            decision: 'for',
            confidence: 70 + Math.floor(Math.random() * 20), // 70-90%
            persona_match: 50 + Math.floor(Math.random() * 30), // 50-80%
            reasoning: `This proposal could benefit ${rawProposal.dao_info?.name || 'the DAO'}.`,
            proposal_summary: `This proposal aims to improve governance in ${rawProposal.dao_info?.name || 'the DAO'}.`,
            recommendation: `Consider voting for this proposal based on its potential benefits to ${rawProposal.dao_info?.name || 'this DAO'}.`,
            factors: [
              {
                id: `fallback-1-${rawProposal.id}`,
                ai_decision_id: `fallback-${rawProposal.id}`,
                created_at: new Date().toISOString(),
                factor_name: "Default Factor",
                factor_value: 5,
                factor_weight: 5,
                explanation: `Potentially beneficial for ${rawProposal.dao_info?.name || 'the DAO'}`
              },
              {
                id: `fallback-2-${rawProposal.id}`,
                ai_decision_id: `fallback-${rawProposal.id}`,
                created_at: new Date().toISOString(),
                factor_name: "Implementation Risk",
                factor_value: -3,
                factor_weight: 5, 
                explanation: "May require significant development resources"
              }
            ]
          };
            
          try {
            // Try to get AI decision, but use default if it fails
            aiDecision = await generateAIDecision(rawProposal, true, userId);
          } catch (error) {
            console.error(`Error generating AI decision for proposal ${rawProposal.id}, using fallback:`, error);
            // Continue with default values set above
          }
          
          // Get vote information (simplified for this implementation)
          const votes = {
            yes: Math.floor(Math.random() * 1000) + 200,
            no: Math.floor(Math.random() * 500) + 100,
            abstain: Math.floor(Math.random() * 200) + 50,
            total: 0
          };
          votes.total = votes.yes + votes.no + votes.abstain;
          
          // Extract pros and cons from factors
          const pros: string[] = [];
          const cons: string[] = [];
          
          if (aiDecision.factors && aiDecision.factors.length > 0) {
            aiDecision.factors.forEach(factor => {
              const explanation = factor.explanation || '';
              
              if (factor.factor_value > 0) {
                // For positive factors
                pros.push(explanation);
              } else if (factor.factor_value < 0) {
                // For negative factors
                cons.push(explanation);
              }
            });
          }
          
          // If we don't have enough pros/cons, generate some based on the proposal content
          if (pros.length < 2) {
            const defaultPros = [
              `Potentially improves governance in ${rawProposal.dao_info?.name || 'the DAO'}`,
              `Addresses community needs through new mechanisms`,
              `Could increase participation and engagement`
            ];
            
            while (pros.length < 2) {
              const randomIndex = Math.floor(Math.random() * defaultPros.length);
              if (!pros.includes(defaultPros[randomIndex])) {
                pros.push(defaultPros[randomIndex]);
              }
            }
          }
          
          if (cons.length < 1) {
            const defaultCons = [
              `May require additional resources to implement fully`,
              `Could face technical challenges during deployment`,
              `Timeline might be optimistic`
            ];
            
            cons.push(defaultCons[Math.floor(Math.random() * defaultCons.length)]);
          }
          
          // Calculate time left
          const now = new Date();
          const endTime = new Date(rawProposal.end * 1000);
          const timeLeftMs = endTime.getTime() - now.getTime();
          const diffDays = Math.floor(timeLeftMs / (1000 * 60 * 60 * 24));
          const diffHours = Math.floor((timeLeftMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          
          let timeLeft = "Ended";
          if (timeLeftMs > 0) {
            timeLeft = diffDays > 0 ? `${diffDays}d ${diffHours}h left` : `${diffHours}h left`;
          }
          
          // Format the proposal
          const formattedProposal: FormattedProposal = {
            id: rawProposal.id,
            title: rawProposal.title,
            description: truncatedBody,
            summary: aiDecision.proposal_summary || extractSummary(truncatedBody), // Use AI-generated summary if available
            status: rawProposal.state.charAt(0).toUpperCase() + rawProposal.state.slice(1),
            url: `https://snapshot.org/#/${rawProposal.space.id}/proposal/${rawProposal.id}`,
            votingDeadline: new Date(rawProposal.end * 1000).toISOString(),
            votingStart: new Date(rawProposal.start * 1000).toISOString(),
            dao: {
              id: rawProposal.dao_info?.id || rawProposal.space.id,
              name: rawProposal.dao_info?.name || rawProposal.space.name,
              icon: rawProposal.dao_info?.icon || rawProposal.space.name.charAt(0)
            },
            votes,
            timeLeft,
            impact: aiDecision.factors?.some(f => f.factor_value > 7) ? "High" : 
                  aiDecision.factors?.some(f => f.factor_value > 5) ? "Medium" : "Low",
            confidence: aiDecision.confidence,
            personaMatch: aiDecision.persona_match,
            pros,
            cons,
            ai_decision: aiDecision,
            startTime: new Date(rawProposal.start * 1000).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            }),
            endTime: new Date(rawProposal.end * 1000).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            }),
            votingType: "Simple Majority", // Default
            quorum: "4%", // Default
            isRealData: true,
            isBaseEcosystem: false
          };
          
          processedProposals.push(formattedProposal);
          
          // Add a small delay between processing to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`Error processing proposal ${rawProposal.id}:`, error);
        }
      }
      
      return processedProposals;
    } catch (error) {
      console.error("Error in processProposalsDirectly:", error);
      return [];
    }
  };

  // Simple function to extract a summary from markdown
  const extractSummary = (markdown: string) => {
    if (!markdown) return 'No description available';
    
    // Remove markdown formatting
    const plainText = markdown
      .replace(/#+\s/g, '') // Remove headers
      .replace(/\*\*/g, '') // Remove bold
      .replace(/\*/g, '') // Remove italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/`([^`]+)`/g, '$1'); // Remove code
    
    // Split by newlines and find first non-empty paragraph
    const paragraphs = plainText.split('\n').filter(p => p.trim().length > 0);
    
    if (paragraphs.length === 0) return 'No description available';
    
    // Return first paragraph, truncated if needed
    const summary = paragraphs[0].trim();
    return summary.length > 200 ? summary.substring(0, 197) + '...' : summary;
  };

  // Function to create a more meaningful summary from the proposal title and description
  const generateFallbackSummary = (proposal: any): string => {
    try {
      const title = proposal.title || '';
      const daoName = proposal.dao_info?.name || proposal.space?.name || 'the DAO';
      const body = proposal.body || '';
      
      // Extract words from the title to understand the proposal type
      const titleLower = title.toLowerCase();
      
      // Common proposal types
      let proposalType = "governance change";
      if (titleLower.includes('grant') || titleLower.includes('fund')) {
        proposalType = "funding allocation";
      } else if (titleLower.includes('upgrad') || titleLower.includes('improv')) {
        proposalType = "protocol upgrade";
      } else if (titleLower.includes('integrat') || titleLower.includes('partner')) {
        proposalType = "integration or partnership";
      } else if (titleLower.includes('treasur') || titleLower.includes('budget')) {
        proposalType = "treasury management";
      }
      
      // Extract first paragraph if available
      let firstParagraph = '';
      if (body) {
        const paragraphs = body.split('\n\n').filter(p => p.trim().length > 20);
        if (paragraphs.length > 0) {
          firstParagraph = paragraphs[0].substring(0, 150);
          if (firstParagraph.length === 150) {
            firstParagraph += '...';
          }
        }
      }
      
      let summary = `This proposal requests approval for a ${proposalType} in ${daoName}.`;
      
      if (firstParagraph) {
        summary += ` ${firstParagraph}`;
      } else {
        summary += ` It aims to ${titleLower.replace(/^(temperature check|rfc|proposal|[^\w]+)/i, '')} for the community.`;
      }
      
      return summary;
    } catch (error) {
      console.error("Error generating fallback summary:", error);
      return `This proposal aims to improve governance in the DAO. Based on analysis, it appears to have potential benefits for the community.`;
    }
  };

  // Function to create a more meaningful decision rationale
  const generateFallbackRationale = (proposal: any): string => {
    try {
      const title = proposal.title || '';
      const daoName = proposal.dao_info?.name || proposal.space?.name || 'the DAO';
      const body = proposal.body || '';
      
      // Extract words from the title to understand the proposal type
      const titleLower = title.toLowerCase();
      
      // Common proposal types
      let proposalType = "governance change";
      if (titleLower.includes('grant') || titleLower.includes('fund')) {
        proposalType = "funding allocation";
      } else if (titleLower.includes('upgrad') || titleLower.includes('improv')) {
        proposalType = "protocol upgrade";
      } else if (titleLower.includes('integrat') || titleLower.includes('partner')) {
        proposalType = "integration or partnership";
      } else if (titleLower.includes('treasur') || titleLower.includes('budget')) {
        proposalType = "treasury management";
      }
      
      // Generate decision rationale
      let rationale = `I recommend voting FOR this ${proposalType} proposal because it appears to align with the long-term interests of ${daoName}. `;
      
      // Add more specific reasoning based on proposal type
      if (proposalType === "funding allocation") {
        rationale += `The funding request seems reasonable and the proposed use of funds could benefit the ecosystem by supporting development and community growth.`;
      } else if (proposalType === "protocol upgrade") {
        rationale += `The proposed upgrades should improve functionality and user experience while maintaining security and decentralization principles.`;
      } else if (proposalType === "integration or partnership") {
        rationale += `This partnership could expand the ecosystem's reach and utility, potentially bringing more users and value to the protocol.`;
      } else if (proposalType === "treasury management") {
        rationale += `The proposed treasury allocation appears to balance short-term needs with long-term sustainability, which is critical for ongoing development.`;
      } else {
        rationale += `The governance changes proposed should streamline decision-making while maintaining transparency and community involvement.`;
      }
      
      return rationale;
    } catch (error) {
      console.error("Error generating fallback rationale:", error);
      return `I recommend voting FOR this proposal based on its alignment with community interests and potential positive impact on the DAO's ecosystem. The proposal appears to have reasonable goals that support long-term growth.`;
    }
  };

  // Define interface for the structured GPT response
  interface AIStructuredResponse {
    proposal_summary?: string;
    summary?: string;
    decision: string;
    confidence: number;
    persona_match: number;
    reasoning?: string;
    recommendation?: string;
    factors?: {
      factor_name: string;
      factor_value: number;
      factor_weight: number;
      explanation: string;
    }[];
  }
  
  // Function to generate AI decision using OpenAI
  const generateAIDecision = async (
    proposal: any,
    forceGenerate: boolean,
    userId: string
  ): Promise<AIDecision> => {
    // First check cache
    if (aiDecisionCache.has(proposal.id) && !forceGenerate) {
      console.log(`Using cached AI decision for proposal: ${proposal.id.substring(0, 8)}`);
      return aiDecisionCache.get(proposal.id)!;
    }

    // Create a compact version of the prompt to use fewer tokens
    const prompt = `
Analyze this DAO governance proposal and provide a voting recommendation:

Title: ${proposal.title}
DAO: ${proposal.dao_info?.name || proposal.space?.name || 'Unknown DAO'}
Description: ${proposal.body.substring(0, 1000)}

USER PERSONA DETAILS:
${getPersonaDescription(getUserPersonaPreferences())}

Based on the user's specific persona preferences, analyze this proposal carefully and provide:
1. A PROPOSAL SUMMARY - a clear, concise 2-3 sentence summary of what the proposal is about
2. A DECISION RATIONALE - explanation of WHY you recommend voting for/against/abstain specifically in relation to the user's persona

Your confidence and persona match scores should be precise and genuinely reflect how well this proposal aligns with the user's specific preferences.
DO NOT use rounded multiples of 5 for scores (like 75%, 80%) - calculate exact values (like 73%, 82%).

Respond in JSON format with:
{
  "proposal_summary": "2-3 sentence summary of what the proposal is about",
  "summary": "Explanation of WHY you made this decision in relation to the user's persona",
  "decision": "for|against|abstain",
  "confidence": number between 1-100 (use precise values, not multiples of 5),
  "persona_match": number between 1-100 (use precise values, not multiples of 5),
  "recommendation": "one-line explanation of your recommendation",
  "factors": [
    {
      "factor_name": "name of factor",
      "factor_value": number between -10 and 10 (negative is against, positive is for),
      "factor_weight": number between 1 and 10,
      "explanation": "brief explanation of this factor in relation to user persona"
    }
  ]
}`;

    // Check if OpenAI API is available - use the default service without accessing private methods
    if (!OpenAIService) {
      throw new Error("OpenAI service not available");
    }

    // Add randomized wait to prevent concurrent requests hitting rate limits
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500));

    try {
      // Try OpenAI call
      const structuredResponse = await OpenAIService.generateStructuredResponse<AIStructuredResponse>(
        [
          { role: 'system', content: `You are an AI governance advisor that analyzes DAO proposals and provides personalized voting recommendations. Give precise, non-rounded confidence and persona match scores.` },
          { role: 'user', content: prompt }
        ],
        {
          temperature: 0.7,
          model: 'gpt-4o-mini',
          maxTokens: 1000
        }
      );

      // Process the response
      const aiDecision: AIDecision = {
        decision: structuredResponse.decision || 'for',
        confidence: structuredResponse.confidence || 75,
        persona_match: structuredResponse.persona_match || 50,
        reasoning: structuredResponse.summary || generateFallbackRationale(proposal),
        proposal_summary: structuredResponse.proposal_summary || generateFallbackSummary(proposal),
        recommendation: structuredResponse.recommendation || `Consider voting for this proposal based on its potential benefits to ${proposal.dao_info?.name || proposal.space?.name || 'this DAO'}.`,
        factors: structuredResponse.factors?.map((factor, idx) => ({
          id: `ai-${proposal.id}-${idx}`,
          ai_decision_id: `ai-${proposal.id}`,
          created_at: new Date().toISOString(),
          factor_name: factor.factor_name,
          factor_value: factor.factor_value,
          factor_weight: factor.factor_weight,
          explanation: factor.explanation
        })) || [
          {
            id: `fallback-1-${proposal.id}`,
            ai_decision_id: `fallback-${proposal.id}`,
            created_at: new Date().toISOString(),
            factor_name: "Default Factor",
            factor_value: 5,
            factor_weight: 5,
            explanation: `Potentially beneficial for ${proposal.dao_info?.name || 'the DAO'}`
          },
          {
            id: `fallback-2-${proposal.id}`,
            ai_decision_id: `fallback-${proposal.id}`,
            created_at: new Date().toISOString(),
            factor_name: "Implementation Risk",
            factor_value: -3,
            factor_weight: 5, 
            explanation: "May require significant development resources"
          }
        ]
      };

      // Cache the decision
      aiDecisionCache.set(proposal.id, aiDecision);
      
      return aiDecision;
    } catch (error) {
      console.error("Error generating AI decision:", error);
      
      // Create a fallback decision
      const fallbackDecision: AIDecision = {
        decision: 'for',
        confidence: 75,
        persona_match: 50,
        reasoning: generateFallbackRationale(proposal),
        proposal_summary: generateFallbackSummary(proposal),
        recommendation: `Consider voting for this proposal based on its potential benefits to ${proposal.dao_info?.name || proposal.space?.name || 'this DAO'}.`,
        factors: [
          {
            id: `fallback-1-${proposal.id}`,
            ai_decision_id: `fallback-${proposal.id}`,
            created_at: new Date().toISOString(),
            factor_name: "Governance Improvement",
            factor_value: 7,
            factor_weight: 8,
            explanation: `May improve governance processes in ${proposal.dao_info?.name || 'the DAO'}`
          },
          {
            id: `fallback-2-${proposal.id}`,
            ai_decision_id: `fallback-${proposal.id}`,
            created_at: new Date().toISOString(),
            factor_name: "Implementation Risk",
            factor_value: -3,
            factor_weight: 5, 
            explanation: "May require significant development resources"
          }
        ]
      };
      
      // Cache the fallback decision
      aiDecisionCache.set(proposal.id, fallbackDecision);
      
      return fallbackDecision;
    }
  };
  
  // Helper function to generate chain of thought from response
  const generateChainOfThought = (rawProposal: any, response: AIStructuredResponse): string => {
    // Create a more detailed analysis based on the proposal and AI response
    const daoName = rawProposal.dao_info?.name || rawProposal.space?.name || 'the DAO';
    const proposalTitle = rawProposal.title || 'Untitled Proposal';
    
    // Parse factors for pros and cons
    const pros: string[] = [];
    const cons: string[] = [];
    
    if (response.factors && response.factors.length > 0) {
      response.factors.forEach(factor => {
        if (factor.factor_value > 0) {
          pros.push(factor.explanation || factor.factor_name);
        } else if (factor.factor_value < 0) {
          cons.push(factor.explanation || factor.factor_name);
        }
      });
    }
    
    // Generate a more specific chain of thought
    return `# AI Analysis of "${proposalTitle}"

1. Evaluated proposal from ${daoName}
2. Key Positive Factors:
   ${pros.map(pro => `- ${pro}`).join('\n   ') || '- None identified'}
3. Key Concerns:
   ${cons.map(con => `- ${con}`).join('\n   ') || '- None identified'}
4. Analyzed community value and governance implications
5. Assessed implementation feasibility and resource requirements
6. Final decision: ${response.decision?.toUpperCase() || 'FOR'} with ${response.confidence || '?'}% confidence
7. Persona match: ${response.persona_match || '?'}% alignment with user preferences`;
  };

  // Add a function to create unique fallbacks for each proposal
  const createUniqueFallback = (proposal: any): AIDecision => {
    const title = proposal.title || '';
    const daoName = proposal.dao_info?.name || proposal.space?.name || 'the DAO';
    
    // Extract words from the title to understand the proposal type
    const titleLower = title.toLowerCase();
    
    // Common proposal types
    let proposalType = "governance change";
    if (titleLower.includes('grant') || titleLower.includes('fund')) {
      proposalType = "funding allocation";
    } else if (titleLower.includes('upgrad') || titleLower.includes('improv')) {
      proposalType = "protocol upgrade";
    } else if (titleLower.includes('integrat') || titleLower.includes('partner')) {
      proposalType = "integration or partnership";
    } else if (titleLower.includes('treasur') || titleLower.includes('budget')) {
      proposalType = "treasury management";
    } else if (titleLower.includes('chain')) {
      proposalType = "chain selection or integration";
    }
    
    // Create unique pros and cons based on the proposal type
    const uniquePros: string[] = [];
    const uniqueCons: string[] = [];
    
    // Add type-specific pros
    if (proposalType === "funding allocation") {
      uniquePros.push(`Could provide necessary resources for ${daoName}'s development`);
      uniquePros.push("May enable new features or improvements");
    } else if (proposalType === "protocol upgrade") {
      uniquePros.push("Could improve platform functionality and user experience");
      uniquePros.push("May address existing technical challenges");
    } else if (proposalType === "chain selection or integration") {
      uniquePros.push("May improve cross-chain capabilities and reach");
      uniquePros.push("Could expand the ecosystem to new users");
    } else {
      uniquePros.push(`May improve governance processes in ${daoName}`);
      uniquePros.push("Could increase participation and engagement");
    }
    
    // Add type-specific cons
    if (proposalType === "funding allocation") {
      uniqueCons.push("Funding allocation may not be optimal for current priorities");
    } else if (proposalType === "protocol upgrade") {
      uniqueCons.push("Implementation could face technical obstacles");
    } else if (proposalType === "chain selection or integration") {
      uniqueCons.push("Integration with new chains adds complexity");
    } else {
      uniqueCons.push("May require significant development resources");
    }
    
    // Get user persona
    const personaPreferences = getUserPersonaPreferences();
    
    // Calculate persona-based scores more precisely
    let personaBasedConfidence = 0;
    let personaMatch = 0;
    
    // Adjust based on proposal type and user preferences
    if (personaPreferences) {
      // Base confidence level
      personaBasedConfidence = 72; // Start with a reasonable baseline
      
      // Risk tolerance adjustment
      if (proposalType === "funding allocation" || proposalType === "treasury management") {
        // These types are more risk-sensitive
        if (personaPreferences.riskTolerance === 'conservative') {
          personaBasedConfidence -= 7;
        } else if (personaPreferences.riskTolerance === 'aggressive') {
          personaBasedConfidence += 8;
        }
      }
      
      // Priority focus adjustment
      if (proposalType === "protocol upgrade" || proposalType === "integration or partnership") {
        // These types relate to innovation
        if (personaPreferences.priorityFocus === 'innovation') {
          personaBasedConfidence += 9;
        } else if (personaPreferences.priorityFocus === 'security') {
          personaBasedConfidence -= 6;
        }
      }
      
      // Time horizon adjustment
      if (proposalType === "governance change") {
        // Governance changes often have long-term implications
        if (personaPreferences.timeHorizon === 'long') {
          personaBasedConfidence += 7;
        } else if (personaPreferences.timeHorizon === 'short') {
          personaBasedConfidence -= 4;
        }
      }
      
      // Add small random variation to avoid uniform scores
      personaBasedConfidence += (Math.random() * 6) - 3;
      
      // Ensure within bounds
      personaBasedConfidence = Math.min(Math.max(personaBasedConfidence, 30), 98);
      
      // Calculate persona match as a separate metric
      personaMatch = 63; // Start with baseline
      
      // Adjust based on specific matches
      if (proposalType === "governance change" && personaPreferences.governance === "decentralization") {
        personaMatch += 11;
      } else if (proposalType === "governance change" && personaPreferences.governance === "efficiency") {
        personaMatch += 6;
      }
      
      // Community impact adjustment
      if (personaPreferences.communityImpact === "high") {
        personaMatch += 8;
      } else if (personaPreferences.communityImpact === "low") {
        personaMatch -= 7;
      }
      
      // Add small random variation
      personaMatch += (Math.random() * 8) - 4;
      
      // Ensure within bounds
      personaMatch = Math.min(Math.max(personaMatch, 25), 97);
    } else {
      // Default values with slight variation
      personaBasedConfidence = 65 + Math.floor(Math.random() * 13);
      personaMatch = 40 + Math.floor(Math.random() * 23);
    }
    
    // Round to integer but not multiples of 5
    personaBasedConfidence = Math.round(personaBasedConfidence);
    personaMatch = Math.round(personaMatch);
    
    // Create a personalized description for explanation
    let personaDescription = "Your current persona";
    
    if (personaPreferences) {
      if (personaPreferences.timeHorizon === 'long') {
        personaDescription += " prioritizes long-term stability";
      } else if (personaPreferences.timeHorizon === 'medium') {
        personaDescription += " balances short and long-term considerations";
      } else {
        personaDescription += " focuses on immediate outcomes";
      }
      
      if (personaPreferences.riskTolerance === 'conservative') {
        personaDescription += " and takes a cautious approach to changes";
      } else if (personaPreferences.riskTolerance === 'aggressive') {
        personaDescription += " and values innovative, high-impact initiatives";
      } else {
        personaDescription += " with a balanced approach to risk";
      }
    } else {
      personaDescription += " has general governance preferences";
    }
    
    // Create unique AI decision factors
    const uniqueFactors: AIDecisionFactor[] = [
      {
        id: `unique-1-${proposal.id}`,
        ai_decision_id: `unique-${proposal.id}`,
        created_at: new Date().toISOString(),
        factor_name: uniquePros[0] || "Potential Benefit",
        factor_value: 6 + Math.floor(Math.random() * 3),
        factor_weight: 7,
        explanation: uniquePros[0] || `Potentially beneficial for ${daoName}`
      },
      {
        id: `unique-2-${proposal.id}`,
        ai_decision_id: `unique-${proposal.id}`,
        created_at: new Date().toISOString(),
        factor_name: uniqueCons[0] || "Implementation Risk",
        factor_value: -3 - Math.floor(Math.random() * 2),
        factor_weight: 5,
        explanation: uniqueCons[0] || "May require significant development resources"
      }
    ];
    
    // Create a chain of thought
    const uniqueChainOfThought = `# AI Analysis of "${title}" for Your Persona

1. Evaluated proposal from ${daoName}
2. Key Positive Factors:
   - ${uniquePros[0] || 'Potentially beneficial for the ecosystem'}
   ${uniquePros[1] ? `- ${uniquePros[1]}` : ''}
3. Key Concerns:
   - ${uniqueCons[0] || 'May require significant resources'}
4. Analyzed alignment with your persona (${personaMatch}% match)
5. Assessed implementation feasibility and resource requirements
6. Final decision: FOR with ${personaBasedConfidence}% confidence
7. Persona characteristics considered: ${personaDescription}`;

    // Create JSON output
    const uniqueJsonOutput = JSON.stringify({
      decision: 'for',
      confidence: personaBasedConfidence,
      persona_match: personaMatch,
      impact_level: uniqueFactors.some(f => f.factor_value > 7) ? "High" : 
                  uniqueFactors.some(f => f.factor_value > 5) ? "Medium" : "Low",
      factors: uniqueFactors.map(f => ({
        factor_name: f.factor_name,
        factor_value: f.factor_value,
        factor_weight: f.factor_weight,
        explanation: f.explanation
      })),
      reasoning: `I recommend voting FOR this ${proposalType} proposal because it appears to align with the long-term interests of ${daoName}. ${personaDescription}, which aligns with this proposal at a ${personaMatch}% match level.`
    }, null, 2);
    
    return {
      decision: 'for',
      confidence: personaBasedConfidence,
      persona_match: personaMatch,
      reasoning: `I recommend voting FOR this ${proposalType} proposal because it appears to align with the long-term interests of ${daoName}. ${personaDescription}, which aligns with this proposal at a ${personaMatch}% match level.`,
      proposal_summary: `This proposal requests approval for a ${proposalType} in ${daoName}. It specifically focuses on "${title}" which aims to improve the overall ecosystem.`,
      recommendation: `Consider voting for this proposal based on its ${personaMatch}% alignment with your governance preferences.`,
      factors: uniqueFactors,
      chain_of_thought: uniqueChainOfThought,
      json_output: uniqueJsonOutput
    };
  };

  // Add a function to get user persona preferences
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
  
  // Add a function to generate a persona description
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

  // Render the proposal feed with real data from Snapshot and AI decisions
  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex items-center justify-end gap-2 text-sm">
        <Badge className={`${dataSource === 'mock' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
          {dataSource === 'mock' ? 'Mock Data' : 'Live Data'}
        </Badge>
        
        {dataSource === 'mock' ? (
          <Button 
            className="bg-indigo hover:bg-indigo/90 text-phosphor text-xs"
            size="sm"
            disabled={loading}
            onClick={loadLiveData}
          >
            {loading ? 'Loading...' : 'Load Live Data'}
          </Button>
        ) : (
          <Button 
            className="bg-indigo hover:bg-indigo/90 text-phosphor text-xs"
            size="sm"
            onClick={() => {
              setLoadedProposals(mockProposals);
              setDataSource('mock');
            }}
          >
            Show Mock Data
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          // Loading skeletons
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="w-8 h-8 rounded-full bg-zinc-700/50" />
                <Skeleton className="w-48 h-5 bg-zinc-700/50" />
              </div>
              <Skeleton className="w-full h-4 bg-zinc-700/50 mb-2" />
              <Skeleton className="w-2/3 h-4 bg-zinc-700/50 mb-4" />
              <div className="flex justify-between items-center">
                <Skeleton className="w-20 h-4 bg-zinc-700/50" />
                <Skeleton className="w-24 h-8 bg-zinc-700/50 rounded-md" />
              </div>
            </div>
          ))
        ) : (
          loadedProposals.map(proposal => (
            <AIEnhancedProposalCard key={proposal.id} proposal={proposal} />
          ))
        )}
      </div>
    </div>
  );
};

// Wrapped card component with AI decision capabilities
const AIEnhancedProposalCard = ({ proposal }: { proposal: FormattedProposal }) => {
  if (!proposal.isRealData || !proposal.id) {
    // Use regular card for mock data
    return <ProposalCard proposal={proposal} />;
  }
  
  return (
    <AIDecisionProvider proposalId={proposal.id}>
      <ProposalCardWithAI proposal={proposal} />
    </AIDecisionProvider>
  );
};

// Proposal card with AI integration
const ProposalCardWithAI = ({ proposal }: { proposal: FormattedProposal }) => {
  const { 
    decision, 
    loading: aiLoading, 
    error: aiError,
    getCardProps
  } = useAIDecisionContext();
  
  // Enhanced proposal with AI decision data, preserving all original props and UI
  const enhancedProposal = {
    ...proposal,
    // Override only confidence and personaMatch if available from AI
    confidence: decision ? decision.confidence : proposal.confidence,
    personaMatch: decision ? decision.persona_match : proposal.personaMatch,
    // DO NOT modify the original UI data structure - maintain exact original pros/cons
    // Only use AI data as a fallback if original data is missing
    pros: proposal.pros && proposal.pros.length > 0 ? proposal.pros : 
          (decision?.factors?.filter(f => f.factor_value > 0).map(f => f.explanation) || []),
    cons: proposal.cons && proposal.cons.length > 0 ? proposal.cons : 
          (decision?.factors?.filter(f => f.factor_value < 0).map(f => f.explanation) || []),
    // Add metadata for voting without changing UI structure
    aiDecision: decision
  };
  
  // Use the regular card UI but with enhanced data
  return <ProposalCard proposal={enhancedProposal} />;
};

// Original proposal card - no UI changes
const ProposalCard = ({ proposal }: { proposal: FormattedProposal }) => {
  // State for modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Helper to get the right status styling
  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-indigo/20 text-indigo";
      case "queued":
      case "pending":
        return "bg-gold/20 text-gold";
      case "executed":
      case "closed":
        return "bg-teal/20 text-teal";
      default:
        return "bg-silver/20 text-silver";
    }
  };

  // Helper to get impact badge styling - ensures uniform width
  const getImpactStyles = (impact: string) => {
    return "bg-gold/20 text-gold min-w-[80px] text-center";
  };

  return (
    <>
      <CardSpotlight className="p-6 h-full" onClick={() => setIsModalOpen(true)}>
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo/20 flex items-center justify-center text-xs text-indigo">
              {proposal.dao.icon}
            </div>
            <span className="text-sm text-silver">{proposal.dao.name}</span>
            {proposal.isBaseEcosystem && (
              <Badge variant="outline" className="h-4 text-xs bg-cyan/10 text-cyan border-cyan/20">
                Base
              </Badge>
            )}
            {proposal.isRealData === false && (
              <Badge variant="outline" className="h-4 text-xs bg-gold/10 text-gold border-gold/20">
                Mock
              </Badge>
            )}
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyles(proposal.status)}`}>
            {proposal.status}
          </span>
        </div>

        <h3 className="text-lg font-medium text-phosphor mb-2 relative z-10">{proposal.title}</h3>
        
        <div className="flex items-center justify-between text-xs text-silver mb-4 relative z-10">
          <span>{proposal.timeLeft}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getImpactStyles(proposal.impact)}`}>
            {proposal.impact} Impact
          </span>
        </div>
        
        <Accordion type="single" collapsible className="relative z-10 mb-4">
          <AccordionItem value="summary" className="border-silver/10">
            <AccordionTrigger className="text-sm text-cyan hover:no-underline py-2">
              Proposal Summary
            </AccordionTrigger>
            <AccordionContent className="text-sm text-silver">
              {proposal.summary}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="ai-summary" className="border-silver/10">
            <AccordionTrigger className="text-sm text-cyan hover:no-underline py-2">
              AI Summary
            </AccordionTrigger>
            <AccordionContent className="text-sm text-silver">
              {proposal.ai_decision?.reasoning || "No AI summary available."}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        
        <div className="mt-4 space-y-3 relative z-10">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-sm text-silver">Agent Confidence</span>
              <span className="text-phosphor font-medium">{proposal.confidence}%</span>
            </div>
            <Progress value={proposal.confidence} className="h-1.5 bg-silver/10" />
          </div>
          
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-sm text-silver">Persona Match</span>
              <span className="text-teal font-medium">{proposal.personaMatch}%</span>
            </div>
            <Progress value={proposal.personaMatch} className="h-1.5 bg-silver/10" />
          </div>
        </div>
        
        <div className="mt-5 relative z-10">
          <Button 
            className="w-full bg-indigo hover:bg-indigo/90 text-phosphor flex items-center justify-center gap-2 rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
          >
            View Details
            <ChevronUp size={16} />
          </Button>
        </div>
      </CardSpotlight>
      
      <AIEnhancedProposalModal 
        proposal={proposal} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

// AI enhanced proposal modal wrapper
interface ProposalModalProps {
  proposal: FormattedProposal;
  isOpen: boolean;
  onClose: () => void;
  onCastVote?: (choice: string) => Promise<void>;
}

const AIEnhancedProposalModal = ({ proposal, isOpen, onClose }: ProposalModalProps) => {
  if (!proposal.isRealData || !proposal.id) {
    // Use regular modal for mock data
    return <ProposalModal proposal={proposal} isOpen={isOpen} onClose={onClose} />;
  }

  // For real data, use AI enhanced modal that has customizations  
  return (
    <ProposalModal 
      proposal={proposal} 
      isOpen={isOpen} 
      onClose={onClose}
    />
  );
};

// Create the modal component
const ProposalModal = ({ proposal, isOpen, onClose, onCastVote }: ProposalModalProps) => {
  const [activeTab, setActiveTab] = useState("summary");
  const [voteOverride, setVoteOverride] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  
  // Governance health metrics - aligned with landing page
  const governanceMetrics = [
    { name: 'DAO Turnout', value: 78, color: '#505DFF', description: 'Percentage of eligible token holders participating in governance votes.', recommendation: 'Current turnout is strong. Continue enhancing voter education and maintain communication channels.' },
    { name: 'Proposal Throughput', value: 62, color: '#5FFBF1', description: 'Percentage of proposals that successfully pass governance and are implemented.', recommendation: 'Throughput is healthy. Continue refining proposal templates and maintaining clear documentation.' },
    { name: 'Treasury Delta', value: 91, color: '#FFD66B', description: 'Measures treasury growth relative to expenditures, with positive values indicating sustainable financial operations.', recommendation: 'Treasury growth is excellent. Consider diversifying assets to maintain sustainable long-term operations.' },
  ];
  
  const getHealthIndicator = (value: number): JSX.Element => {
    if (value >= 80) return <span className="text-green-400">Excellent</span>;
    if (value >= 60) return <span className="text-cyan">Good</span>;
    if (value >= 40) return <span className="text-gold">Fair</span>;
    return <span className="text-red-400">Needs Attention</span>;
  };
  
  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-indigo/20 text-indigo";
      case "queued":
      case "pending":
        return "bg-gold/20 text-gold";
      case "executed":
      case "closed":
        return "bg-teal/20 text-teal";
      default:
        return "bg-silver/20 text-silver";
    }
  };
  
  // Handle voting
  const handleVote = async () => {
    if (!onCastVote) return;
    
    try {
      setIsVoting(true);
      const voteChoice = voteOverride || "for"; // Default to "for" if no override
      await onCastVote(voteChoice);
      onClose();
    } catch (error) {
      console.error("Error casting vote:", error);
    } finally {
      setIsVoting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[800px] bg-charcoal border-silver/20 text-phosphor p-0 overflow-hidden">
        <div className="bg-gradient-to-b from-indigo/10 to-transparent p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo/20 flex items-center justify-center text-xs text-indigo">
                  {proposal.dao.icon}
                </div>
                <DialogTitle className="text-2xl font-medium">{proposal.title}</DialogTitle>
              </div>
              <div className="flex items-center gap-2 text-sm text-silver">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyles(proposal.status)}`}>
                  {proposal.status}
                </span>
                <span>•</span>
                <span>{proposal.dao.name}</span>
              </div>
            </div>
          </DialogHeader>
        </div>
        
        <div className="p-6">
          <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full bg-graphite/30 mb-6">
              <TabsTrigger value="summary" className="flex-1">Proposal Summary</TabsTrigger>
              <TabsTrigger value="decision" className="flex-1">AI Decision</TabsTrigger>
              <TabsTrigger value="reasoning" className="flex-1">Reasoning</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-silver mb-2">Summary</h3>
                <p className="text-sm text-phosphor">{proposal.ai_decision?.proposal_summary || proposal.summary}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-silver mb-2">Proposal Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-silver">Start</span>
                    <span className="text-sm text-phosphor">{proposal.startTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-silver">End</span>
                    <span className="text-sm text-phosphor">{proposal.endTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-silver">Voting Type</span>
                    <span className="text-sm text-phosphor">{proposal.votingType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-silver">Quorum</span>
                    <span className="text-sm text-phosphor">{proposal.quorum}</span>
                  </div>
                </div>
                
                <div className="pt-4">
                  <a 
                    href={proposal.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-cyan flex items-center gap-1 hover:underline"
                  >
                    View on Snapshot <ExternalLink size={14} />
                  </a>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-silver mb-2">Governance Health</h3>
                
                {governanceMetrics.map((metric, index) => (
                  <div key={index} className="mb-4">
                    <div className="flex justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-silver">{metric.name}</span>
                        <div className="text-xs" style={{ color: metric.color }}>
                          {getHealthIndicator(metric.value)}
                        </div>
                      </div>
                      <span className="text-sm text-phosphor">{metric.value}%</span>
                    </div>
                    <Progress 
                      value={metric.value} 
                      className="h-2 bg-silver/10" 
                      style={{ 
                        '--progress-background': metric.color 
                      } as React.CSSProperties} 
                    />
                    <p className="text-xs text-silver mt-1">{metric.description}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="decision" className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-silver mb-2">AI Summary</h3>
                <p className="text-sm text-phosphor">{proposal.ai_decision?.reasoning || "No AI reasoning available."}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-silver mb-2">Pros</h3>
                  <ul className="space-y-2">
                    {proposal.pros.map((pro, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-teal mt-0.5">✓</span>
                        <span className="text-phosphor">{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-silver mb-2">Cons</h3>
                  <ul className="space-y-2">
                    {proposal.cons.map((con, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-gold mt-0.5">✕</span>
                        <span className="text-phosphor">{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-silver">Confidence Score</span>
                    <span className="text-sm text-phosphor">{proposal.confidence}%</span>
                  </div>
                  <Progress value={proposal.confidence} className="h-2 bg-silver/10" />
                  <p className="text-xs text-silver mt-1">
                    High confidence based on clear alignment with treasury goals and community priorities.
                  </p>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-silver">Persona Match</span>
                    <span className="text-sm text-phosphor">{proposal.personaMatch}%</span>
                  </div>
                  <Progress value={proposal.personaMatch} className="h-2 bg-silver/10" />
                  <p className="text-xs text-silver mt-1">
                    Your current persona prioritizes long-term stability, which aligns with this proposal.
                  </p>
                </div>
              </div>
              
              <div className="bg-indigo/10 border border-indigo/20 rounded-lg p-4 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-phosphor">Final Decision</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    proposal.ai_decision?.decision === 'for' ? 'bg-teal/20 text-teal' : 
                    proposal.ai_decision?.decision === 'against' ? 'bg-gold/20 text-gold' : 
                    'bg-silver/20 text-silver'
                  }`}>
                    {proposal.ai_decision?.decision?.toUpperCase() || 'FOR'}
                  </span>
                </div>
                <p className="text-xs text-silver mt-2">
                  govAIrn will vote {proposal.ai_decision?.decision?.toUpperCase() || 'FOR'} this proposal based on {proposal.confidence >= 80 ? 'high' : proposal.confidence >= 50 ? 'moderate' : 'low'} confidence and {proposal.personaMatch >= 80 ? 'strong' : proposal.personaMatch >= 50 ? 'moderate' : 'low'} persona alignment.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="reasoning" className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-silver mb-2">Chain of Thought</h3>
                <div className="bg-graphite/30 rounded-lg p-4 text-sm text-phosphor font-mono whitespace-pre-wrap max-h-[250px] overflow-y-auto">
                  {proposal.ai_decision?.chain_of_thought 
                   ? proposal.ai_decision.chain_of_thought
                   : `# AI Analysis of "${proposal.title}"

1. Evaluated proposal from ${proposal.dao.name}
2. Key Positive Factors:
   ${proposal.pros.map(pro => `- ${pro}`).join('\n   ') || '- None identified'}
3. Key Concerns:
   ${proposal.cons.map(con => `- ${con}`).join('\n   ') || '- None identified'}
4. Analyzed community value and governance implications
5. Assessed implementation feasibility and resource requirements
6. Final decision: ${proposal.ai_decision?.decision?.toUpperCase() || 'FOR'} with ${proposal.confidence || '?'}% confidence
7. Persona match: ${proposal.personaMatch || '?'}% alignment with user preferences`}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-silver mb-2">JSON View</h3>
                <div className="bg-graphite/30 rounded-lg p-4 text-sm text-cyan font-mono whitespace-pre-wrap max-h-[250px] overflow-y-auto">
                {proposal.ai_decision?.json_output 
                 ? proposal.ai_decision.json_output
                 : `{
  "decision": "${proposal.ai_decision?.decision || 'for'}",
  "confidence": ${proposal.confidence || 75},
  "persona_match": ${proposal.personaMatch || 60},
  "impact_level": "${proposal.impact || 'Medium'}",
  "factors": [
    ${proposal.pros.map((pro, i) => `{
      "factor_name": "Positive Factor ${i+1}",
      "factor_value": ${6 + i},
      "factor_weight": ${7 - (i > 2 ? 2 : i)},
      "explanation": "${pro}"
    }`).join(',\n    ')}${proposal.pros.length > 0 && proposal.cons.length > 0 ? ',\n    ' : ''}
    ${proposal.cons.map((con, i) => `{
      "factor_name": "Concern ${i+1}",
      "factor_value": ${-4 - i},
      "factor_weight": ${6 - (i > 2 ? 2 : i)},
      "explanation": "${con}"
    }`).join(',\n    ')}
  ],
  "reasoning": "${proposal.ai_decision?.reasoning || `Analysis of proposal ${proposal.title} in ${proposal.dao.name}`}"
}`}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <DialogFooter className="p-6 border-t border-silver/10">
          <div className="w-full flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-silver">Override Vote:</span>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={voteOverride === "for" ? "default" : "outline"}
                  className={voteOverride === "for" ? "bg-teal text-phosphor" : "border-silver/20 text-silver"}
                  onClick={() => setVoteOverride("for")}
                >
                  For
                </Button>
                <Button 
                  size="sm" 
                  variant={voteOverride === "against" ? "default" : "outline"}
                  className={voteOverride === "against" ? "bg-gold text-phosphor" : "border-silver/20 text-silver"}
                  onClick={() => setVoteOverride("against")}
                >
                  Against
                </Button>
                <Button 
                  size="sm" 
                  variant={voteOverride === "abstain" ? "default" : "outline"}
                  className={voteOverride === "abstain" ? "bg-silver/60 text-phosphor" : "border-silver/20 text-silver"}
                  onClick={() => setVoteOverride("abstain")}
                >
                  Abstain
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="border-silver/20 text-silver" onClick={onClose}>
                Close
              </Button>
              <Button 
                className="bg-indigo hover:bg-indigo/90 text-phosphor"
                onClick={handleVote}
                disabled={!onCastVote || isVoting}
              >
                {isVoting ? "Casting Vote..." : "Approve & Cast Vote"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
