
import React, { useRef, useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, Calendar, ArrowDown, ArrowUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Sample data for voting history
const votingHistorySample = [
  {
    id: "1",
    proposal: "ETH-1923: Treasury Rebalancing",
    dao: "EthereumDAO",
    status: "Cast",
    vote: "For",
    confidence: 92,
    timestamp: "2025-04-28T14:32:00",
  },
  {
    id: "2",
    proposal: "UNI-438: Liquidity Mining Program",
    dao: "Uniswap",
    status: "Cast",
    vote: "Against",
    confidence: 87,
    timestamp: "2025-04-25T09:15:00",
  },
  {
    id: "3",
    proposal: "AAVE-211: Risk Parameter Update",
    dao: "Aave",
    status: "Overridden",
    vote: "For",
    confidence: 64,
    timestamp: "2025-04-22T17:45:00",
  },
  {
    id: "4",
    proposal: "MKR-592: Oracle Upgrade",
    dao: "MakerDAO",
    status: "Cast",
    vote: "For",
    confidence: 93,
    timestamp: "2025-04-19T11:20:00",
  },
  {
    id: "5",
    proposal: "COMP-782: Interest Rate Model",
    dao: "Compound",
    status: "Missed",
    vote: "N/A",
    confidence: 0,
    timestamp: "2025-04-17T03:10:00",
  },
  {
    id: "6",
    proposal: "ENS-129: Domain Renewal Fee",
    dao: "ENS DAO",
    status: "Cast",
    vote: "Against",
    confidence: 89,
    timestamp: "2025-04-15T19:25:00",
  },
  {
    id: "7",
    proposal: "UNI-441: Fee Structure Revision",
    dao: "Uniswap",
    status: "Cast",
    vote: "For",
    confidence: 78,
    timestamp: "2025-04-12T08:30:00",
  },
];

const VotingHistory = () => {
  const topRef = useRef<HTMLDivElement>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  } | null>(null);
  const [votingData, setVotingData] = useState(votingHistorySample);
  
  // Scroll to the top when component mounts
  useEffect(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "instant" });
      window.scrollTo(0, 0);
    }
  }, []);

  // Sort function for table columns
  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
    
    const sortedData = [...votingData].sort((a, b) => {
      if (a[key as keyof typeof a] < b[key as keyof typeof b]) {
        return direction === "ascending" ? -1 : 1;
      }
      if (a[key as keyof typeof a] > b[key as keyof typeof b]) {
        return direction === "ascending" ? 1 : -1;
      }
      return 0;
    });
    
    setVotingData(sortedData);
  };

  // Get the current sorting icon for a column
  const getSortDirectionIcon = (name: string) => {
    if (!sortConfig) {
      return null;
    }
    if (sortConfig.key === name) {
      return sortConfig.direction === "ascending" ? 
        <ArrowUp className="ml-1 h-4 w-4" /> : 
        <ArrowDown className="ml-1 h-4 w-4" />;
    }
    return null;
  };

  // Calculate KPI stats
  const totalVotes = votingData.filter(item => item.status !== "Missed").length;
  const avgConfidence = Math.round(votingData.reduce((acc, item) => acc + item.confidence, 0) / votingData.length);
  const matchRate = Math.round(votingData.filter(item => item.status === "Cast").length / votingData.length * 100);

  return (
    <DashboardLayout>
      <div ref={topRef} className="p-6 relative">
        {/* Background gradients */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute top-0 left-[-10%] w-3/4 h-1/3 rounded-full bg-indigo/5 blur-[120px]" />
          <div className="absolute bottom-0 right-[-5%] w-1/2 h-1/3 rounded-full bg-cyan/5 blur-[100px]" />
        </div>
      
        {/* Subtle grid pattern */}
        <div className="fixed inset-0 -z-10 grid-pattern opacity-10"></div>
        
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold text-phosphor bg-gradient-to-r from-phosphor via-phosphor to-silver/70 bg-clip-text text-transparent mb-6">Voting History</h1>
          
          {/* Performance KPI Block */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-graphite border border-silver/10 rounded-2xl p-6 backdrop-blur-sm">
              <p className="text-silver text-sm mb-2">Total Votes</p>
              <h3 className="text-3xl font-bold text-phosphor">{totalVotes}</h3>
            </div>
            <div className="bg-graphite border border-silver/10 rounded-2xl p-6 backdrop-blur-sm">
              <p className="text-silver text-sm mb-2">Avg Confidence</p>
              <h3 className="text-3xl font-bold text-phosphor">{avgConfidence}%</h3>
            </div>
            <div className="bg-graphite border border-silver/10 rounded-2xl p-6 backdrop-blur-sm">
              <p className="text-silver text-sm mb-2">Persona Match Rate</p>
              <h3 className="text-3xl font-bold text-phosphor">{matchRate}%</h3>
            </div>
          </div>
          
          {/* Filter Toolbar */}
          <div className="bg-graphite border border-silver/10 rounded-2xl p-6 backdrop-blur-sm mb-8">
            <h2 className="text-xl font-medium text-phosphor mb-4">Filters</h2>
            
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-4 bg-black/20">
                <TabsTrigger value="all">All Votes</TabsTrigger>
                <TabsTrigger value="cast">Cast</TabsTrigger>
                <TabsTrigger value="overridden">Overridden</TabsTrigger>
                <TabsTrigger value="missed">Missed</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-silver mb-2 block">Time Range</label>
                    <div className="flex">
                      <Button variant="outline" size="icon" className="mr-2">
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Input placeholder="Any time" className="bg-charcoal/40 backdrop-blur-md border-silver/10" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-silver mb-2 block">DAO</label>
                    <Select>
                      <SelectTrigger className="bg-charcoal/40 backdrop-blur-md border-silver/10">
                        <SelectValue placeholder="All DAOs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All DAOs</SelectItem>
                        <SelectItem value="ethereum">EthereumDAO</SelectItem>
                        <SelectItem value="uniswap">Uniswap</SelectItem>
                        <SelectItem value="aave">Aave</SelectItem>
                        <SelectItem value="maker">MakerDAO</SelectItem>
                        <SelectItem value="compound">Compound</SelectItem>
                        <SelectItem value="ens">ENS DAO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm text-silver mb-2 block">Vote Result</label>
                    <Select>
                      <SelectTrigger className="bg-charcoal/40 backdrop-blur-md border-silver/10">
                        <SelectValue placeholder="Any result" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any result</SelectItem>
                        <SelectItem value="for">For</SelectItem>
                        <SelectItem value="against">Against</SelectItem>
                        <SelectItem value="abstain">Abstain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button variant="outline" size="sm" className="mr-2 border-silver/20 hover:bg-charcoal/50 text-silver">
                    Reset Filters
                  </Button>
                  <Button size="sm" className="bg-indigo hover:bg-indigo/90 text-phosphor">
                    <Filter className="mr-2 h-4 w-4" />
                    Apply Filters
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="cast" className="mt-0">
                {/* Same filter layout for Cast votes */}
                <div className="text-center text-silver py-4">
                  Filter options for Cast votes
                </div>
              </TabsContent>
              
              <TabsContent value="overridden" className="mt-0">
                {/* Filter layout for Overridden votes */}
                <div className="text-center text-silver py-4">
                  Filter options for Overridden votes
                </div>
              </TabsContent>
              
              <TabsContent value="missed" className="mt-0">
                {/* Filter layout for Missed votes */}
                <div className="text-center text-silver py-4">
                  Filter options for Missed votes
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Voting Timeline / Table */}
          <div className="bg-graphite border border-silver/10 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-xl font-medium text-phosphor mb-4">Voting Timeline</h2>
            
            <div className="relative overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-silver/10 hover:bg-transparent">
                      <TableHead 
                        className="text-phosphor cursor-pointer"
                        onClick={() => requestSort('proposal')}
                      >
                        <div className="flex items-center">
                          Proposal
                          {getSortDirectionIcon('proposal')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-phosphor cursor-pointer"
                        onClick={() => requestSort('dao')}
                      >
                        <div className="flex items-center">
                          DAO
                          {getSortDirectionIcon('dao')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-phosphor cursor-pointer"
                        onClick={() => requestSort('status')}
                      >
                        <div className="flex items-center">
                          Status
                          {getSortDirectionIcon('status')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-phosphor cursor-pointer"
                        onClick={() => requestSort('vote')}
                      >
                        <div className="flex items-center">
                          Vote
                          {getSortDirectionIcon('vote')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-phosphor cursor-pointer"
                        onClick={() => requestSort('confidence')}
                      >
                        <div className="flex items-center">
                          Confidence
                          {getSortDirectionIcon('confidence')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-phosphor cursor-pointer"
                        onClick={() => requestSort('timestamp')}
                      >
                        <div className="flex items-center">
                          Timestamp
                          {getSortDirectionIcon('timestamp')}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {votingData.map((vote) => (
                      <TableRow key={vote.id} className="border-silver/10">
                        <TableCell className="font-medium text-phosphor">
                          {vote.proposal}
                        </TableCell>
                        <TableCell>{vote.dao}</TableCell>
                        <TableCell>
                          <span 
                            className={`inline-block px-2 py-1 rounded-full text-xs ${
                              vote.status === "Cast" 
                                ? "bg-cyan/20 text-cyan" 
                                : vote.status === "Overridden" 
                                ? "bg-gold/20 text-gold" 
                                : "bg-silver/20 text-silver"
                            }`}
                          >
                            {vote.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span 
                            className={`${
                              vote.vote === "For" 
                                ? "text-emerald-400" 
                                : vote.vote === "Against" 
                                ? "text-rose-400" 
                                : "text-silver"
                            }`}
                          >
                            {vote.vote}
                          </span>
                        </TableCell>
                        <TableCell>
                          {vote.confidence > 0 ? (
                            <div className="w-full bg-silver/10 rounded-full h-2 relative">
                              <div 
                                className={`absolute top-0 left-0 h-2 rounded-full ${
                                  vote.confidence > 80 
                                    ? "bg-emerald-400" 
                                    : vote.confidence > 50 
                                    ? "bg-gold" 
                                    : "bg-rose-400"
                                }`}
                                style={{ width: `${vote.confidence}%` }}
                              ></div>
                              <span className="ml-[102%] text-xs text-silver">{vote.confidence}%</span>
                            </div>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                        <TableCell className="text-silver">
                          {new Date(vote.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VotingHistory;
