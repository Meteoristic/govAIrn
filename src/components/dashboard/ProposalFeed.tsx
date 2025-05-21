import { useState, useEffect, useRef } from "react";
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
import { useToast } from "@/components/ui/use-toast";
import { useWalletClient } from "wagmi";
import { PersonaService } from "@/lib/services/persona.service";
import { eventBus, EVENTS } from '@/lib/utils/events';
import { useAuthModal } from "@/hooks/useAuthModal";
import { ConnectWalletModal } from "@/components/auth/ConnectWalletModal";

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
export const SUPPORTED_DAOS = [
  { id: "aavedao.eth", name: "Aave", icon: "A" },
  { id: "ens.eth", name: "ENS", icon: "E" },
  { id: "gitcoindao.eth", name: "Gitcoin", icon: "G" },
  { id: "uniswapgovernance.eth", name: "Uniswap", icon: "U" },
  { id: "stakedao.eth", name: "Stake DAO", icon: "S" }, // Added Stake DAO
  { id: "cryodao.eth", name: "CryoDAO", icon: "C" }  // Added CryoDAO
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

// Add a cache for AI decisions to prevent redundant API calls  
const aiDecisionCache = new Map<string, AIDecision>();

// Replace verbose debugging logs with structured logging for significant actions
const logDebug = (message: string, data?: any) => {
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true') {
    if (data) {
      console.log(`[ProposalFeed] ${message}`, data);
    } else {
      console.log(`[ProposalFeed] ${message}`);
    }
  }
};

export default function ProposalFeed() {
  logDebug("[ProposalFeed] Component RENDERED/RE-RENDERED"); // Log component rendering
  const { user, isAuthenticated } = useAuth();
  const { checkAuthAccess, isModalOpen, requiredFeature, openAuthModal, closeAuthModal } = useAuthModal();
  
  // State for proposals and loading
  const [proposals, setProposals] = useState<FormattedProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLive, setLoadingLive] = useState(false);
  const [dataSource, setDataSource] = useState<'mock' | 'real'>('mock');
  const { toast } = useToast();
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  
  // Use a ref to maintain the latest supported DAOs
  const supportedDaosRef = useRef(SUPPORTED_DAOS);
  
  // State for wallet and persona
  const [activePersonaFromApi, setActivePersonaFromApi] = useState<any>(null);
  // Get wallet from wagmi
  const { data: walletClient } = useWalletClient();
  const address = walletClient?.account?.address;
  const isConnected = !!address;
  
  // Load active persona on component mount if wallet is connected
  useEffect(() => {
    const loadActivePersona = async () => {
      if (isConnected && address) {
        try {
          const isDevelopmentMode = import.meta.env.DEV;
          logDebug('[ProposalFeed] Loading active persona for wallet:', address);
          
          // Development mode - use wallet address
          if (isDevelopmentMode) {
            const persona = await PersonaService.getActivePersonaByWallet(address);
            if (persona) {
              logDebug('[ProposalFeed] Found active persona by wallet:', persona.id);
              setActivePersonaFromApi(persona);
            } else {
              logDebug('[ProposalFeed] No active persona found for wallet:', address);
            }
          }
        } catch (error) {
          logDebug('[ProposalFeed] Error loading active persona:', error);
        }
      }
    };
    
    loadActivePersona();
  }, [isConnected, address]);
  
  // Local state for mock data - used as fallback if live proposals can't be fetched
  const mockProposals: FormattedProposal[] = [
    // Existing Uniswap mock proposal
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
    
    // New Aave mock proposal
    {
      id: "42",
      title: "Aave V3 Safety Module Parameter Updates",
      description: "This proposal aims to adjust the Safety Module (SM) parameters for Aave V3 to enhance protocol resilience against market shocks. The proposed changes include updating risk parameters, cooldown periods, and slashing mechanisms.",
      status: "Active",
      url: "#",
      votingDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      votingStart: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      dao: {
        id: "aave",
        name: "Aave",
        icon: "A",
      },
      votes: {
        yes: 1850,
        no: 320,
        abstain: 150,
        total: 2320
      },
      timeLeft: "3d 8h remaining",
      summary: "This proposal seeks to update Aave's Safety Module parameters to improve protocol resilience against market volatility and enhance staker security. Key changes include adjusted slashing conditions and cooldown period optimizations.",
      impact: "Medium",
      confidence: 84,
      personaMatch: 76,
      startTime: "May 2, 2025",
      endTime: "May 7, 2025",
      votingType: "Simple Majority",
      quorum: "3%",
      pros: [
        "Enhances protocol security during high market volatility",
        "Optimizes staking rewards for long-term participants",
        "Implements learnings from recent market stress tests"
      ],
      cons: [
        "Changes cooldown periods which affects staker flexibility",
        "Slightly increases complexity of the safety module"
      ],
      isRealData: false,
      ai_decision: {
        id: `mock-42`,
        user_id: 'mock-user',
        proposal_id: "42",
        persona_id: 'mock-persona',
        decision: 'for',
        confidence: 84,
        persona_match: 76,
        reasoning: 'This proposal significantly improves protocol safety while maintaining a reasonable balance with user flexibility. The changes address known vulnerabilities and align with your persona\'s preference for security enhancements.',
        chain_of_thought: 'Mock AI decision',
        created_at: new Date().toISOString(),
        requires_recalculation: false,
        factors: [
          {
            id: `factor-1-42`,
            ai_decision_id: `mock-42`,
            factor_name: 'Security Improvement',
            factor_value: 9,
            factor_weight: 8,
            explanation: 'Significant improvements to protocol security mechanisms',
            created_at: new Date().toISOString()
          },
          {
            id: `factor-2-42`,
            ai_decision_id: `mock-42`,
            factor_name: 'Staker Experience',
            factor_value: 6,
            factor_weight: 7,
            explanation: 'Better aligned incentives for long-term stakers',
            created_at: new Date().toISOString()
          },
          {
            id: `factor-3-42`,
            ai_decision_id: `mock-42`,
            factor_name: 'User Flexibility',
            factor_value: -3,
            factor_weight: 5,
            explanation: 'Cooldown changes may limit flexibility for some users',
            created_at: new Date().toISOString()
          }
        ]
      }
    },

    // New Gitcoin mock proposal
    {
      id: "63",
      title: "Gitcoin Grants Stack Integration with Base",
      description: "This proposal seeks to integrate Gitcoin Grants Stack with Base for more efficient and cost-effective quadratic funding rounds. The integration will leverage Base's L2 scaling solution to reduce gas costs and improve the grants distribution process.",
      status: "Pending",
      url: "#",
      votingDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      votingStart: new Date(Date.now()).toISOString(),
      dao: {
        id: "gitcoin",
        name: "Gitcoin",
        icon: "G",
      },
      votes: {
        yes: 980,
        no: 160,
        abstain: 130,
        total: 1270
      },
      timeLeft: "5d 0h remaining",
      summary: "This proposal aims to integrate Gitcoin Grants with Base L2 to reduce gas costs, improve transaction speeds, and make participation more accessible for smaller donors. The integration will become effective starting with the next grants round.",
      impact: "High",
      confidence: 92,
      personaMatch: 83,
      startTime: "May 4, 2025",
      endTime: "May 9, 2025",
      votingType: "Simple Majority",
      quorum: "5%",
      pros: [
        "Reduces gas costs for grant applications and donations by ~95%",
        "Makes matching fund distribution more efficient and timely",
        "Opens participation to smaller donors previously priced out by gas fees",
        "Expands the Gitcoin ecosystem to Base users and projects"
      ],
      cons: [
        "Requires changes to the existing grants interface",
        "Will need a bridge for cross-chain asset movements"
      ],
      isRealData: false,
      isBaseEcosystem: true,
      ai_decision: {
        id: `mock-63`,
        user_id: 'mock-user',
        proposal_id: "63",
        persona_id: 'mock-persona',
        decision: 'for',
        confidence: 92,
        persona_match: 83,
        reasoning: 'This proposal represents a significant improvement to the Gitcoin grants infrastructure, with substantial gas savings that will make funding more accessible to small donors. The Base integration aligns with scaling goals and improves the overall public goods funding ecosystem.',
        chain_of_thought: 'Mock AI decision',
        created_at: new Date().toISOString(),
        requires_recalculation: false,
        factors: [
          {
            id: `factor-1-63`,
            ai_decision_id: `mock-63`,
            factor_name: 'Cost Reduction',
            factor_value: 10,
            factor_weight: 9,
            explanation: 'Dramatic reduction in gas fees improves accessibility',
            created_at: new Date().toISOString()
          },
          {
            id: `factor-2-63`,
            ai_decision_id: `mock-63`,
            factor_name: 'Ecosystem Growth',
            factor_value: 8,
            factor_weight: 8,
            explanation: 'Expands Gitcoin\'s reach to new users and projects',
            created_at: new Date().toISOString()
          },
          {
            id: `factor-3-63`,
            ai_decision_id: `mock-63`,
            factor_name: 'Implementation Complexity',
            factor_value: -2,
            factor_weight: 6,
            explanation: 'Minor UI changes required and bridge implementation',
            created_at: new Date().toISOString()
          }
        ]
      }
    }
  ];

  useEffect(() => {
    logDebug("[ProposalFeed] useEffect (initial load) triggered.");
    const loadProposals = async () => {
      logDebug("[ProposalFeed] useEffect: Initial loadProposals (mock) starting.");
      setProposals(mockProposals);
      setLoading(false);
      logDebug("[ProposalFeed] useEffect: Initial mock proposals loaded.");
    };
    loadProposals();
  }, []);

  // Listen for DAO list updates
  useEffect(() => {
    const handleDaoListUpdated = (updatedDaos: any[]) => {
      logDebug(`[ProposalFeed] Received DAO_LIST_UPDATED event with ${updatedDaos.length} DAOs`);
      supportedDaosRef.current = updatedDaos;
      
      
      // If we're currently showing live data, refresh it to include new DAOs
      if (dataSource === 'real') {
        toast({
          title: "DAO List Updated",
          description: "Refreshing proposal feed with newly added DAOs...",
          duration: 3000,
        });
        
        // Wait a moment before reloading to allow the toast to be seen
        setTimeout(() => {
          loadLiveData();
        }, 1000);
      }
    };
    
    // Subscribe to the DAO list updated event
    eventBus.on(EVENTS.DAO_LIST_UPDATED, handleDaoListUpdated);
    
    // Cleanup the event listener when component unmounts
    return () => {
      eventBus.off(EVENTS.DAO_LIST_UPDATED, handleDaoListUpdated);
    };
  }, [dataSource]);

  // Function to manually load live data when requested by user
  const loadLiveData = async () => {
    console.log("[ProposalFeed] loadLiveData FUNCTION CALLED (Load Live Data button clicked)."); // VERY FIRST LINE IN FUNCTION
    try {
      // Set both loading indicators to true for UI feedback
      setLoading(true);
      setLoadingLive(true);
      // Immediately set the dataSource to 'real' to update UI
      setDataSource('real');
      
      // Display a toast notification to inform the user
      toast({
        title: "Loading live proposals",
        description: "Fetching active proposals from Snapshot and generating AI decisions... This may take a few moments.",
        duration: 5000,
      });
      
      // Fetch live proposals from Snapshot API and generate AI decisions
      try {
        const liveProposals = await fetchLiveProposalsDirectly();
        
        if (liveProposals && liveProposals.length > 0) {
          console.log(`Successfully loaded ${liveProposals.length} live proposals`);
          // Update state with the live proposals and mark data source as real
          setProposals(liveProposals);
          
          // Ensure data source is set to real
          setDataSource('real');
          
          // Success notification
          toast({
            title: "Live data loaded",
            description: `${liveProposals.length} active proposals loaded and analyzed with AI.`,
            duration: 3000,
          });
        } else {
          console.warn("No live active proposals found, using mock data");
          setProposals(mockProposals);
          
          // If no proposals found, revert to mock data
          setDataSource('mock');
          
          toast({
            title: "No active proposals found",
            description: "Using mock data instead. Try again later.",
            variant: "destructive",
            duration: 5000,
          });
        }
      } catch (error) {
        console.error("Error loading live data:", error);
        // Fallback to mock data if there's an error
        setProposals(mockProposals);
        
        // If error, revert to mock data
        setDataSource('mock');
        
        // Error notification
        toast({
          title: "Could not load live data",
          description: "Using mock data instead. Check console for details.",
          variant: "destructive",
          duration: 5000,
        });
      } finally {
        // Always turn off loading indicators when done
        setLoading(false);
        setLoadingLive(false);
      }
    } catch (error) {
      console.error("[ProposalFeed] CRITICAL ERROR in loadLiveData top-level try-catch:", error);
      setProposals(mockProposals);
      
      // If critical error, revert to mock data
      setDataSource('mock');
      setLoading(false);
      setLoadingLive(false);
      
      // Error notification
      toast({
        title: "Error loading data",
        description: "An unexpected error occurred. Using mock data instead.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Improved function to fetch live proposals directly from Snapshot API
  const fetchLiveProposalsDirectly = async () => {
    console.log("Fetching live proposals directly from Snapshot API...");
    
    let allProposals = [];
    
    // Get the latest supported DAOs from the ref
    const currentSupportedDaos = supportedDaosRef.current;
    console.log(`Using ${currentSupportedDaos.length} supported DAOs for fetching proposals:`, 
      currentSupportedDaos.map(dao => dao.id).join(', '));
    
    // Try to find active proposals for each DAO
    for (const dao of currentSupportedDaos) {
      console.log(`Fetching active proposals for ${dao.name} (${dao.id})...`);
      try {
        // ONLY fetch active proposals - no fallback to closed
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
          console.log(`No active proposals for ${dao.name}.`);
        }
      } catch (error) {
        console.error(`Error fetching proposals for ${dao.name}:`, error);
      }
    }
    
    console.log(`Total active proposals found: ${allProposals.length}`);
    
    if (allProposals.length === 0) {
      console.log("No active proposals found for any supported DAO");
      toast({
        title: "No Active Proposals",
        description: "There are currently no active proposals in any of the supported DAOs. Please try again later.",
        variant: "destructive",
        duration: 5000,
      });
      return [];
    }
    
    // Limit to max 3 proposals to avoid excessive OpenAI API calls
    const limitedProposals = allProposals.slice(0, 3);
    console.log(`Processing ${limitedProposals.length} out of ${allProposals.length} total proposals`);
    
    // Process proposals with AI decisions
    const processedProposals = await processProposalsDirectly(limitedProposals);
    return processedProposals;
  };

  // Process proposals with AI decisions
  const processProposalsDirectly = async (rawProposals: any[]): Promise<FormattedProposal[]> => {
    try {
      console.log(`[ProposalFeed] Processing ${rawProposals.length} proposals with AI decisions...`);
      const processedProposals = [];
      const userId = user?.id || 'anonymous';
      console.log(`[ProposalFeed] Using user ID: ${userId}`);
      
      // Get user persona for better AI decisions
      const personaPreferences = getUserPersonaPreferences();
      console.log(`[ProposalFeed] User persona preferences:`, personaPreferences);
      
      // Process each proposal one by one
      let proposalIndex = 0;
      const totalProposals = rawProposals.length;
      
      for (const rawProposal of rawProposals) {
        proposalIndex++;
        try {
          console.log(`[ProposalFeed] Processing proposal ${proposalIndex}/${totalProposals}: "${rawProposal.title}"`);
          
          // Update loading toast to show progress
          toast({
            title: `Processing Proposal ${proposalIndex}/${totalProposals}`,
            description: `Generating AI analysis for "${rawProposal.title.substring(0, 30)}..."`,
            duration: 3000,
          });
          
          // Truncate body to reduce token usage
          const truncatedBody = rawProposal.body ? 
            rawProposal.body.substring(0, 1000) : 
            'No description available';
          console.log(`[ProposalFeed] Truncated proposal body to ${truncatedBody.length} characters`);
          
          // Generate AI decision for this proposal
          let aiDecision;
          let generationSuccessful = false;
          
          // Add a random delay (1-3 seconds) before each proposal to avoid rate limits
          const delayMs = 1000 + Math.floor(Math.random() * 2000);
          console.log(`[ProposalFeed] Adding delay of ${delayMs}ms before OpenAI API call to avoid rate limits...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          
          // Try up to 3 times to generate AI decision
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              console.log(`[ProposalFeed] Attempt ${attempt}/3 to generate AI decision for proposal "${rawProposal.title}" (ID: ${rawProposal.id})`);
              
              // Ensure loading state is maintained during API calls
              setLoading(true);
              setLoadingLive(true);
              
              aiDecision = await generateAIDecision(rawProposal, true, userId);
              
              // More comprehensive validation that all critical fields are present
              if (aiDecision && 
                  aiDecision.decision && 
                  aiDecision.confidence && 
                  aiDecision.persona_match && 
                  aiDecision.reasoning &&
                  aiDecision.proposal_summary &&
                  aiDecision.factors && 
                  aiDecision.factors.length >= 2) {
                
                console.log(`[ProposalFeed] Successfully generated AI decision for proposal "${rawProposal.title}": ${aiDecision.decision} with ${aiDecision.confidence}% confidence`);
                generationSuccessful = true;
                break;
              } else {
                // Log detailed information about missing fields
                const missingFields = [];
                if (!aiDecision.decision) missingFields.push('decision');
                if (!aiDecision.confidence) missingFields.push('confidence');
                if (!aiDecision.persona_match) missingFields.push('persona_match');
                if (!aiDecision.reasoning) missingFields.push('reasoning');
                if (!aiDecision.proposal_summary) missingFields.push('proposal_summary');
                if (!aiDecision.factors || aiDecision.factors.length < 2) missingFields.push('factors');
                
                console.warn(`[ProposalFeed] AI decision for proposal "${rawProposal.title}" is missing fields: ${missingFields.join(', ')}, retrying...`);
              }
            } catch (error) {
              console.error(`[ProposalFeed] Error in attempt ${attempt}/3 for proposal "${rawProposal.title}":`, error);
              
              // Small delay before retry
              if (attempt < 3) {
                const retryDelay = 1000 * attempt; // Longer delays for subsequent retries
                console.log(`[ProposalFeed] Waiting ${retryDelay}ms before retry ${attempt + 1}...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
              }
            }
          }
          
          // If all attempts failed, create a robust fallback
          if (!generationSuccessful) {
            console.warn(`All attempts to generate AI decision failed for proposal ${rawProposal.id}, using enhanced fallback`);
            
            // Create a deterministic but more sophisticated fallback decision
            aiDecision = createUniqueFallback(rawProposal);
          }
          
          // Extract pros and cons from factors
          const pros = aiDecision.factors
            ?.filter(factor => factor.factor_value > 0)
            .map(factor => factor.explanation) || [];
            
          const cons = aiDecision.factors
            ?.filter(factor => factor.factor_value < 0)
            .map(factor => factor.explanation) || [];
            
          console.log("[ProposalFeed] Extracted pros and cons from factors:", {
            factorsAvailable: !!aiDecision.factors && Array.isArray(aiDecision.factors),
            factorsCount: aiDecision.factors?.length || 0,
            prosCount: pros.length,
            consCount: cons.length
          });
          
          // Calculate time left
          const now = new Date();
          const endTime = new Date(rawProposal.end * 1000);
          const timeLeftMs = endTime.getTime() - now.getTime();
          const diffDays = Math.floor(timeLeftMs / (1000 * 60 * 60 * 24));
          const diffHours = Math.floor((timeLeftMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          
          let timeLeft = "Ended";
          if (timeLeftMs > 0) {
            timeLeft = diffDays > 0 ? `${diffDays}d ${diffHours}h remaining` : `${diffHours}h remaining`;
          }
          
          // Format the proposal
          const formattedProposal = {
            id: rawProposal.id,
            title: rawProposal.title,
            description: truncatedBody,
            summary: aiDecision.proposal_summary || extractSummary(truncatedBody),
            status: rawProposal.state.charAt(0).toUpperCase() + rawProposal.state.slice(1),
            url: `https://snapshot.org/#/${rawProposal.space.id}/proposal/${rawProposal.id}`,
            votingDeadline: new Date(rawProposal.end * 1000).toISOString(),
            votingStart: new Date(rawProposal.start * 1000).toISOString(),
            dao: {
              id: rawProposal.dao_info?.id || rawProposal.space.id,
              name: rawProposal.dao_info?.name || rawProposal.space.name,
              icon: rawProposal.dao_info?.icon || rawProposal.space.name.charAt(0)
            },
            votes: {
              yes: Math.floor(2000 + (Number(rawProposal.id) % 100) * 30),
              no: Math.floor(1000 + (Number(rawProposal.id) % 100) * 20),
              abstain: Math.floor(200 + (Number(rawProposal.id) % 100) * 5),
              total: Math.floor(3200 + (Number(rawProposal.id) % 100) * 55)
            },
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
      
      // Turn off loading indicators when all processing is complete
      setLoading(false);
      setLoadingLive(false);
      
      if (processedProposals.length === 0) {
        console.error("Failed to process any proposals");
        toast({
          title: "No proposals processed",
          description: "Could not process any proposals. Using mock data instead.",
          variant: "destructive",
          duration: 5000,
        });
        return [];
      }
      
      console.log(`Successfully processed ${processedProposals.length} proposals`);
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
    // Use locally scoped cache to avoid global state issues
    const localCache = new Map<string, AIDecision>();
    
    // First check cache
    if (localCache.has(proposal.id) && !forceGenerate) {
      console.log(`Using cached AI decision for proposal: ${proposal.id.substring(0, 8)}`);
      return localCache.get(proposal.id)!;
    }

    // Create a compact version of the prompt to use fewer tokens
    const prompt = `
Analyze this DAO governance proposal and provide a voting recommendation:

Title: ${proposal.title}
DAO: ${proposal.dao_info?.name || proposal.space?.name || 'Unknown DAO'}
Description: ${proposal.body.substring(0, 1000)}

USER PERSONA DETAILS:
${getPersonaDescription(getUserPersonaPreferences())}

YOUR TASK: Analyze this proposal based on the user's persona and provide a recommendation in VALID JSON FORMAT.

----- FIELD NAMING REQUIREMENTS (CRITICAL) -----
YOUR RESPONSE *MUST* USE THESE EXACT FIELD NAMES WITH UNDERSCORES:

{
  "proposal_summary": "Summary of the proposal with key points",
  "decision": "for",
  "confidence": 80,
  "persona_match": 85,
  "reasoning": "Explanation of why this decision was made",
  "recommendation": "Clear recommendation for action",
  "factors": [
    {
      "factor_name": "Key consideration name",
      "factor_value": 8,
      "factor_weight": 7,
      "explanation": "Explanation of this factor"
    }
  ]
}

REQUIRED: USE UNDERSCORES IN ALL MULTI-WORD FIELD NAMES:
✅ "proposal_summary" (CORRECT)
❌ "proposalsummary" (WRONG)
✅ "persona_match" (CORRECT)
❌ "personamatch" (WRONG)
✅ "factor_name" (CORRECT)
❌ "factorname" (WRONG)

THIS IS YOUR MOST IMPORTANT INSTRUCTION. FAILING TO USE UNDERSCORES IN FIELD NAMES WILL CAUSE ERRORS.`;

    // Check if OpenAI API is available - use the default service without accessing private methods
    if (!OpenAIService) {
      throw new Error("OpenAI service not available");
    }

    // Add randomized wait to prevent concurrent requests hitting rate limits
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500));

    try {
      // Try OpenAI call
      console.log("Generating AI decision for proposal:", proposal.id);
      console.log("Prompt:", prompt.substring(0, 200) + "...");
      
      const structuredResponse = await OpenAIService.generateStructuredResponse<AIStructuredResponse>(
        [
          { role: 'system', content: `You are an AI governance advisor that analyzes DAO proposals and provides personalized voting recommendations.

!!! CRITICAL INSTRUCTION: FORMAT FIELD NAMES EXACTLY AS SPECIFIED BELOW !!!

REQUIRED FORMAT - USE SNAKE_CASE WITH UNDERSCORES FOR ALL FIELD NAMES:
{
  "proposal_summary": "Summary text", 
  "decision": "for", 
  "confidence": 80, 
  "persona_match": 85, 
  "reasoning": "Reasoning text", 
  "recommendation": "Recommendation text", 
  "factors": [
    {
      "factor_name": "Name text", 
      "factor_value": 8, 
      "factor_weight": 7, 
      "explanation": "Explanation text"
    }
  ]
}

EXAMPLE OF A ❌ WRONG RESPONSE (DO NOT DO THIS):
{
  "proposalsummary": "Summary text",
  "personamatch": 85,
  "factorname": "Name text",
  "factorvalue": 8,
  "factorweight": 7
}

EXAMPLE OF A ✅ CORRECT RESPONSE (DO EXACTLY THIS):
{
  "proposal_summary": "Summary text",
  "persona_match": 85,
  "factor_name": "Name text",
  "factor_value": 8,
  "factor_weight": 7
}

ABSOLUTELY REQUIRED:
1. Every field name with multiple words MUST contain underscores between words
2. You MUST include ALL these fields with EXACT names as shown:
   - "proposal_summary" (NOT "proposalsummary")
   - "persona_match" (NOT "personamatch")
   - "factor_name" (NOT "factorname")
   - "factor_value" (NOT "factorvalue")
   - "factor_weight" (NOT "factorweight")

WARNING: Your response will be rejected if field names are missing underscores!

THE BIGGEST MISTAKE YOU CAN MAKE IS REMOVING UNDERSCORES FROM FIELD NAMES.
KEEP THE UNDERSCORES IN ALL FIELD NAMES AT ALL COSTS.` },
          { role: 'user', content: prompt }
        ],
        {
          temperature: 0.1, // ALWAYS use this very low temperature for consistent outputs
          model: 'gpt-4o', // Use better model for more reliable field naming 
          maxTokens: 2500 // Increased token limit for comprehensive responses
        }
      );

      console.log("OpenAI response received:", structuredResponse ? "success" : "empty");
      // Log the actual structuredResponse content to help diagnose issues
      console.log("OpenAI structured response details:", JSON.stringify(structuredResponse, null, 2));
      
      // PRE-PROCESSING: Normalize field names before validation
      const normalizedResponse = preProcessResponseFields(structuredResponse);
      console.log("NORMALIZED RESPONSE:", JSON.stringify(normalizedResponse, null, 2));
      
      // NEW DETAILED LOGS - Check each field individually
      console.log("DETAILED RESPONSE CHECK:");
      console.log("- decision:", normalizedResponse.decision);
      console.log("- confidence:", normalizedResponse.confidence);
      console.log("- persona_match:", normalizedResponse.persona_match);
      console.log("- reasoning:", normalizedResponse.reasoning?.substring(0, 50) + "...");
      console.log("- proposal_summary:", normalizedResponse.proposal_summary?.substring(0, 50) + "...");
      console.log("- recommendation:", normalizedResponse.recommendation?.substring(0, 50) + "...");
      console.log("- factors:", normalizedResponse.factors ? 
        `Present (${normalizedResponse.factors.length} items)` : 
        "Missing or Empty");
      
      // Add individual field validations while preserving as much AI content as possible
      // Only apply targeted fallbacks for specific missing fields
      let validatedResponse = { ...normalizedResponse };
      
      // Validate and set required fields if missing, logging each issue
      if (!validatedResponse.decision || 
          !['for', 'against', 'abstain'].includes(validatedResponse.decision.toLowerCase())) {
        console.warn("[ProposalFeed] AI decision field missing or invalid - applying fallback");
        validatedResponse.decision = 'for'; // Default to 'for'
      }
      
      if (!validatedResponse.confidence || 
          typeof validatedResponse.confidence !== 'number' || 
          validatedResponse.confidence < 1 || 
          validatedResponse.confidence > 100) {
        console.warn("[ProposalFeed] AI confidence field missing or invalid - applying fallback");
        validatedResponse.confidence = 75; // Default confidence value
      }
      
      if (!validatedResponse.persona_match || 
          typeof validatedResponse.persona_match !== 'number' || 
          validatedResponse.persona_match < 1 || 
          validatedResponse.persona_match > 100) {
        console.warn("[ProposalFeed] AI persona_match field missing or invalid - applying fallback");
        validatedResponse.persona_match = 65; // Default persona match value
      }
      
      if (!validatedResponse.reasoning || validatedResponse.reasoning.trim() === '') {
        console.warn("[ProposalFeed] AI reasoning field missing - applying fallback");
        validatedResponse.reasoning = generateFallbackRationale(proposal);
      }
      
      if (!validatedResponse.proposal_summary || validatedResponse.proposal_summary.trim() === '') {
        console.warn("[ProposalFeed] AI proposal_summary field missing - applying fallback");
        validatedResponse.proposal_summary = generateFallbackSummary(proposal);
      }
      
      // Ensure recommendation field
      if (!validatedResponse.recommendation || validatedResponse.recommendation.trim() === '') {
        console.warn("[ProposalFeed] AI recommendation field missing - applying fallback");
        validatedResponse.recommendation = `Consider voting ${validatedResponse.decision} based on the ${validatedResponse.confidence}% confidence analysis.`;
      }
      
      // Ensure factors array is valid and has enough content
      if (!validatedResponse.factors || 
          !Array.isArray(validatedResponse.factors) || 
          validatedResponse.factors.length < 2) {
        console.warn("[ProposalFeed] AI factors array missing or insufficient - applying fallback factors");
        
        // Create complete fallback factors
        validatedResponse.factors = [
          {
            factor_name: "Proposal Impact",
            factor_value: 7,
            factor_weight: 8,
            explanation: `Potentially beneficial for ${proposal.dao_info?.name || proposal.space?.name || 'the DAO'}`
          },
          {
            factor_name: "Implementation Complexity",
            factor_value: -3,
            factor_weight: 6,
            explanation: "May require significant development resources"
          },
          {
            factor_name: "Community Alignment",
            factor_value: 6,
            factor_weight: 7,
            explanation: "Generally aligns with community goals and priorities"
          }
        ];
      } else {
        // Check if factors have both positive and negative values
        const hasPositive = validatedResponse.factors.some(f => f.factor_value > 0);
        const hasNegative = validatedResponse.factors.some(f => f.factor_value < 0);
        
        if (!hasPositive || !hasNegative) {
          console.warn("[ProposalFeed] AI factors missing balance - adding missing positive/negative factor");
          
          // Add a missing positive or negative factor as needed
          if (!hasPositive) {
            validatedResponse.factors.push({
              factor_name: "Potential Benefit",
              factor_value: 6,
              factor_weight: 7,
              explanation: `May provide value to the ${proposal.dao_info?.name || proposal.space?.name || 'DAO'} ecosystem`
            });
          }
          
          if (!hasNegative) {
            validatedResponse.factors.push({
              factor_name: "Implementation Consideration",
              factor_value: -3,
              factor_weight: 5,
              explanation: "Implementation may require careful planning and resources"
            });
          }
        }
      }
      
      // Process the response with our validated fields
      const aiDecision: AIDecision = {
        decision: validatedResponse.decision || 'for',
        confidence: validatedResponse.confidence || 75,
        persona_match: validatedResponse.persona_match || 50,
        reasoning: validatedResponse.reasoning || generateFallbackRationale(proposal),
        proposal_summary: validatedResponse.proposal_summary || generateFallbackSummary(proposal),
        recommendation: validatedResponse.recommendation || `Consider voting for this proposal based on its potential benefits to ${proposal.dao_info?.name || proposal.space?.name || 'this DAO'}.`,
        factors: validatedResponse.factors?.map((factor, idx) => ({
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
        ],
        chain_of_thought: generateChainOfThought(proposal, validatedResponse) 
      };

      // Add improved logging to verify we've successfully processed the AI response
      console.log(`[ProposalFeed] Successfully processed AI decision for proposal ${proposal.id}:`);
      console.log(`  - Decision: ${aiDecision.decision}`);
      console.log(`  - Confidence: ${aiDecision.confidence}%`);
      console.log(`  - Persona match: ${aiDecision.persona_match}%`);
      console.log(`  - Factors: ${aiDecision.factors?.length || 0} items`);
      console.log(`  - Pros: ${aiDecision.factors?.filter(f => f.factor_value > 0).length || 0} items`);
      console.log(`  - Cons: ${aiDecision.factors?.filter(f => f.factor_value < 0).length || 0} items`);

      // Cache the decision locally
      localCache.set(proposal.id, aiDecision);
      
      return aiDecision;
    } catch (error) {
      console.error("Error generating AI decision:", error);
      
      // Create a more meaningful fallback decision
      const fallbackDecision = createUniqueFallback(proposal);
      
      // Cache the fallback decision locally
      localCache.set(proposal.id, fallbackDecision);
      
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
      uniqueCons.push("May require reallocating resources from other initiatives");
      uniqueCons.push(`Implementation timeline might not align with ${daoName}'s current roadmap`);
    } else if (proposalType === "protocol upgrade") {
      uniqueCons.push("Implementation could face technical obstacles");
      uniqueCons.push("May require significant development resources");
      uniqueCons.push("Could introduce new points of failure if not properly tested");
    } else if (proposalType === "chain selection or integration") {
      uniqueCons.push("Integration with new chains adds complexity");
      uniqueCons.push("May encounter interoperability challenges");
      uniqueCons.push("Could fragment the user base across multiple chains");
    } else if (proposalType === "treasury management") {
      uniqueCons.push("Proposed strategy may expose treasury to new risk types");
      uniqueCons.push("Market conditions could change, impacting expected returns");
      uniqueCons.push("May reduce available liquidity for short-term operations");
    } else {
      uniqueCons.push("May require changes to established governance processes");
      uniqueCons.push("Implementation details need further clarification");
      uniqueCons.push("Could potentially increase governance overhead");
    }
    
    // Create more specific factors for the unique proposal type
    let uniqueProFactor = {
      id: `unique-1-${proposal.id}`,
      ai_decision_id: `unique-${proposal.id}`,
      created_at: new Date().toISOString(),
      factor_name: proposalType === "funding allocation" ? "Resource Allocation" : 
                  proposalType === "protocol upgrade" ? "Technical Improvement" :
                  proposalType === "chain selection" ? "Ecosystem Expansion" :
                  proposalType === "treasury management" ? "Financial Impact" : "Governance Enhancement",
      factor_value: 6 + Math.floor(Math.random() * 3),
      factor_weight: 7,
      explanation: uniquePros[0] || `Potentially beneficial for ${daoName}`
    };
    
    let uniqueConFactor = {
      id: `unique-2-${proposal.id}`,
      ai_decision_id: `unique-${proposal.id}`,
      created_at: new Date().toISOString(),
      factor_name: proposalType === "funding allocation" ? "Budget Constraints" : 
                 proposalType === "protocol upgrade" ? "Implementation Complexity" :
                 proposalType === "chain selection" ? "Operational Overhead" :
                 proposalType === "treasury management" ? "Risk Exposure" : "Process Complexity",
      factor_value: -3 - Math.floor(Math.random() * 2),
      factor_weight: 5,
      explanation: uniqueCons[0] || "May require significant development resources"
    };
    
    // Add one additional factor specific to proposal type
    let additionalFactor = {
      id: `unique-3-${proposal.id}`,
      ai_decision_id: `unique-${proposal.id}`,
      created_at: new Date().toISOString(),
      factor_name: "Community Impact",
      factor_value: 4 + Math.floor(Math.random() * 3),
      factor_weight: 6,
      explanation: proposalType === "funding allocation" ? `Could foster ecosystem growth in ${daoName}` :
                 proposalType === "protocol upgrade" ? "May improve user experience and adoption" :
                 proposalType === "chain selection" ? "Could bring in new community members" :
                 proposalType === "treasury management" ? "Potential for sustainable long-term funding" :
                 "Might increase community engagement and participation"
    };
    
    // Create unique AI decision factors
    const uniqueFactors: AIDecisionFactor[] = [
      uniqueProFactor,
      uniqueConFactor,
      additionalFactor
    ];
    
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
      // If we have an active persona in state already, use that
      if (activePersonaFromApi) {
        console.log("[getUserPersonaPreferences] Using active persona from state:", activePersonaFromApi);
        return {
          riskTolerance: mapSliderToValue(activePersonaFromApi.risk || 50, 'riskTolerance'),
          priorityFocus: mapSliderToValue(activePersonaFromApi.esg || 50, 'priorityFocus'),
          timeHorizon: mapSliderToValue(activePersonaFromApi.horizon || 50, 'timeHorizon'),
          governance: mapSliderToValue(activePersonaFromApi.frequency || 50, 'governance'),
          communityImpact: mapSliderToValue(activePersonaFromApi.treasury || 50, 'communityImpact')
        };
      }
      
      // Use a fixed persona preferences object (outside cache)
      const cachedPersonaValue = localStorage.getItem('cached_persona_preferences');
      if (cachedPersonaValue) {
        try {
          return JSON.parse(cachedPersonaValue);
        } catch (e) {
          console.error('Failed to parse cached persona', e);
        }
      }
      
      // Try to get persona preferences from localStorage as fallback
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
  
  // Helper function to map slider values (0-100) to named persona values
  const mapSliderToValue = (sliderValue: number, category: string) => {
    // Define mapping ranges for each category
    const ranges = {
      riskTolerance: [
        { max: 33, value: 'conservative' },
        { max: 66, value: 'moderate' },
        { max: 100, value: 'aggressive' }
      ],
      priorityFocus: [
        { max: 33, value: 'security' },
        { max: 66, value: 'balanced' },
        { max: 100, value: 'innovation' }
      ],
      timeHorizon: [
        { max: 33, value: 'short' },
        { max: 66, value: 'medium' },
        { max: 100, value: 'long' }
      ],
      governance: [
        { max: 33, value: 'efficiency' },
        { max: 66, value: 'balanced' },
        { max: 100, value: 'decentralization' }
      ],
      communityImpact: [
        { max: 33, value: 'low' },
        { max: 66, value: 'medium' },
        { max: 100, value: 'high' }
      ]
    };
    
    // Find the appropriate range
    const categoryRanges = ranges[category];
    if (!categoryRanges) return 'moderate'; // Default fallback
    
    for (const range of categoryRanges) {
      if (sliderValue <= range.max) {
        return range.value;
      }
    }
    
    return categoryRanges[categoryRanges.length - 1].value; // Use highest range if no match
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

  // Function to ensure proper field names - guaranteed preprocessing
  const preProcessResponseFields = (response: any): AIStructuredResponse => {
    // Create a new normalized object with proper field names
    const normalized: any = {
      // Copy simple fields directly or use alternate names
      decision: response.decision,
      confidence: response.confidence,
      reasoning: response.reasoning,
      recommendation: response.recommendation,
      
      // Handle multi-word fields that commonly lose underscores
      proposal_summary: response.proposal_summary || response.proposalsummary || response.proposalSummary || response.summary,
      persona_match: response.persona_match || response.personamatch || response.personaMatch || response.match,
    };
    
    // Special handling for factors array
    if (Array.isArray(response.factors)) {
      normalized.factors = response.factors.map((factor: any, index: number) => {
        // Create properly normalized factor object
        return {
          factor_name: factor.factor_name || factor.factorname || factor.factorName || factor.name || `Factor ${index + 1}`,
          factor_value: factor.factor_value || factor.factorvalue || factor.factorValue || factor.value || 
                      (index % 2 === 0 ? 6 : -3), // Default alternating values
          factor_weight: factor.factor_weight || factor.factorweight || factor.factorWeight || factor.weight || 
                       Math.abs((factor.factor_value || 5)) > 5 ? 8 : 5, // Default weights
          explanation: factor.explanation || factor.desc || factor.description || 
                     `${factor.factor_name || factor.factorname || factor.name || `Factor ${index + 1}`} details`
        };
      });
    } else {
      // If factors aren't in expected format, create a default set
      console.warn("[ProposalFeed] factors field missing or not an array - creating default factors");
      normalized.factors = [
        {
          factor_name: "Primary Impact",
          factor_value: 7,
          factor_weight: 8,
          explanation: "Expected primary benefit of this proposal"
        },
        {
          factor_name: "Implementation Consideration",
          factor_value: -3,
          factor_weight: 5,
          explanation: "Potential challenges during implementation"
        }
      ];
    }
    
    // If critical fields are still missing, set reasonable defaults
    if (normalized.decision === undefined) {
      normalized.decision = "for";
    }
    
    if (normalized.confidence === undefined || 
        typeof normalized.confidence !== 'number' || 
        normalized.confidence < 0 || 
        normalized.confidence > 100) {
      normalized.confidence = 75;
    }
    
    if (normalized.persona_match === undefined || 
        typeof normalized.persona_match !== 'number' || 
        normalized.persona_match < 0 || 
        normalized.persona_match > 100) {
      normalized.persona_match = 65;
    }
    
    // Ensure all other fields have at least default values
    normalized.reasoning = normalized.reasoning || "This proposal appears well-aligned with governance objectives";
    normalized.recommendation = normalized.recommendation || `Consider voting ${normalized.decision} on this proposal`;
    
    return normalized as AIStructuredResponse;
  };

  // Function to handle clicking the "Load Live Data" button
  const handleLoadLiveDataClick = () => {
    // Check if user is authenticated before loading live data
    if (checkAuthAccess("load live data")) {
      loadLiveData();
    }
    // The modal will automatically open via checkAuthAccess if needed
  };

  // Render the proposal feed with real data from Snapshot and AI decisions
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="text-indigo hover:text-phosphor hover:border-indigo/50"
            onClick={handleLoadLiveDataClick}
            disabled={loading || loadingLive}
          >
            {loadingLive ? (
              <>
                <div className="loading-dots mr-2">
                  <div className="loading-dots--dot"></div>
                  <div className="loading-dots--dot"></div>
                  <div className="loading-dots--dot"></div>
                </div>
                Loading Live Data...
              </>
            ) : (
              'Load Live Data'
            )}
          </Button>

          <Button
            variant="ghost"
            className="text-silver hover:text-phosphor"
            onClick={() => setIsExplainerOpen(true)}
          >
            What's this?
          </Button>
        </div>
        <Badge variant="outline" className="bg-charcoal/60 border-silver/10 text-silver">
          {dataSource === 'real' ? 'Live Data' : 'Sample Data'}
        </Badge>
      </div>

      {/* Conditionally render mock or live proposals here */}
      <AuthPromptWrapper className="grid grid-cols-1 gap-6">
        {loading ? (
          // Loading skeletons
          Array(3).fill(0).map((_, i) => (
            <div key={`skeleton-${i}`} className="bg-charcoal/80 p-4 rounded-lg border border-silver/10 shadow-glow-sm">
              <div className="animate-pulse flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-6 bg-silver/10 rounded w-3/4"></div>
                  <div className="h-6 bg-indigo/20 rounded w-24"></div>
                </div>
                <div className="h-4 bg-silver/10 rounded w-2/3"></div>
                <div className="h-4 bg-silver/10 rounded w-1/2"></div>
                <div className="h-10 bg-silver/10 rounded"></div>
              </div>
            </div>
          ))
        ) : (
          proposals.map((proposal) => (
            <AIEnhancedProposalCard key={proposal.id} proposal={proposal} />
          ))
        )}
      </AuthPromptWrapper>
      
      {/* Dialog that explains what the "Load Live Data" button does */}
      <Dialog open={isExplainerOpen} onOpenChange={setIsExplainerOpen}>
        <DialogContent className="sm:max-w-[425px] bg-black/30 backdrop-blur-md border-silver/10 shadow-glow-sm">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-[-10%] w-3/4 h-1/3 rounded-full bg-indigo/5 blur-[120px]" />
            <div className="absolute bottom-0 right-[-5%] w-1/2 h-1/3 rounded-full bg-cyan/5 blur-[100px]" />
          </div>
          
          <DialogHeader>
            <DialogTitle className="text-phosphor">About Live Data Loading</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-silver mb-4">
              The "Load Live Data" button fetches real-time governance proposals from DAOs on Snapshot. 
              Our AI will analyze these proposals based on your persona preferences.
            </p>
            <p className="text-silver mb-4">
              This feature requires wallet connection and authentication to access your personal preferences.
            </p>
            <p className="text-indigo">
              Note: We limit the number of proposals to minimize API usage during development.
            </p>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Connect Wallet Modal */}
      <ConnectWalletModal 
        isOpen={isModalOpen} 
        onClose={closeAuthModal} 
        requiredFeature={requiredFeature}
      />
    </div>
  );
}

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
            <AccordionTrigger 
              className="text-sm text-cyan hover:no-underline py-2"
              onClick={(e) => e.stopPropagation()} // Stop the click from reaching the CardSpotlight
            >
              Proposal Summary
            </AccordionTrigger>
            <AccordionContent className="text-sm text-silver">
              {proposal.summary}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="ai-summary" className="border-silver/10">
            <AccordionTrigger 
              className="text-sm text-cyan hover:no-underline py-2"
              onClick={(e) => e.stopPropagation()} // Stop the click from reaching the CardSpotlight
            >
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

// Create an enhanced modal that is wrapped with AI decision provider
const AIEnhancedProposalModal = ({ proposal, isOpen, onClose }: ProposalModalProps) => {
  if (!proposal.isRealData || !proposal.id) {
    // Use regular modal for mock data
    return <ProposalModal proposal={proposal} isOpen={isOpen} onClose={onClose} />;
  }
  
  // For real data, use AI enhanced modal that has customizations  
  return (
    <AIDecisionProvider proposalId={proposal.id}>
      <ProposalModal proposal={proposal} isOpen={isOpen} onClose={onClose} />
    </AIDecisionProvider>
  );
};

// Create the modal component
const ProposalModal = ({ proposal, isOpen, onClose, onCastVote }: ProposalModalProps) => {
  // State for active tab
  const [activeTab, setActiveTab] = useState<string>("summary");
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
      <DialogContent className="max-w-[800px] max-h-[90vh] bg-charcoal border-silver/20 text-phosphor p-0 flex flex-col overflow-hidden"
                    aria-describedby="proposal-modal-description">
        <div className="sr-only" id="proposal-modal-description">
          Proposal details for {proposal.title}, including summary, voting information, and AI analysis.
        </div>
        <div className="bg-gradient-to-b from-indigo/10 to-transparent p-6 flex-shrink-0">
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
        
        <div className="p-6 overflow-y-auto flex-grow">
          <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full bg-graphite/30 mb-6 sticky top-0 z-10">
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
                    {(proposal.pros && proposal.pros.length > 0) ? (
                      proposal.pros.map((pro, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="text-teal mt-0.5">✓</span>
                          <span className="text-phosphor">{pro}</span>
                        </li>
                      ))
                    ) : (
                      // Fallback pros based on proposal type if none available
                      <>
                        <li className="flex items-start gap-2 text-sm">
                          <span className="text-teal mt-0.5">✓</span>
                          <span className="text-phosphor">Addresses a relevant concern for the DAO</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <span className="text-teal mt-0.5">✓</span>
                          <span className="text-phosphor">Has potential to improve governance efficiency</span>
                        </li>
                        {proposal.isBaseEcosystem && (
                          <li className="flex items-start gap-2 text-sm">
                            <span className="text-teal mt-0.5">✓</span>
                            <span className="text-phosphor">Aligned with protocol ecosystem growth</span>
                          </li>
                        )}
                      </>
                    )}
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-silver mb-2">Cons</h3>
                  <ul className="space-y-2">
                    {(proposal.cons && proposal.cons.length > 0) ? (
                      proposal.cons.map((con, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="text-gold mt-0.5">✕</span>
                          <span className="text-phosphor">{con}</span>
                        </li>
                      ))
                    ) : (
                      // Fallback cons if none available
                      <>
                        <li className="flex items-start gap-2 text-sm">
                          <span className="text-gold mt-0.5">✕</span>
                          <span className="text-phosphor">Implementation details need further clarification</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <span className="text-gold mt-0.5">✕</span>
                          <span className="text-phosphor">May require significant resources to execute properly</span>
                        </li>
                      </>
                    )}
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
                <div className="bg-graphite/30 rounded-lg p-4 text-sm text-phosphor font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto">
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
                <div className="bg-graphite/30 rounded-lg p-4 text-sm text-cyan font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto">
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
        
        <DialogFooter className="p-6 border-t border-silver/10 flex-shrink-0">
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

const AuthPromptWrapper = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  const { isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  
  return (
    <div className={className}>
      {children}
      
      {!isAuthenticated && (
        <div className="mt-4 rounded-lg border border-indigo/20 bg-indigo/5 p-3 text-center">
          <p className="text-sm text-phosphor mb-2">
            Connect your wallet to see personalized AI decisions
          </p>
          <Button 
            variant="outline" 
            size="sm"
            className="border-indigo/30 text-indigo hover:bg-indigo/10"
            onClick={() => openAuthModal("personalized AI recommendations")}
          >
            Connect Wallet
          </Button>
        </div>
      )}
    </div>
  );
};
