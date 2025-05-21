import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { SnappySlider } from '@/components/ui/snappy-slider';
import { PersonaService } from '@/lib/services/persona.service';
import { supabase } from '@/lib/supabase';

const MyPersona = () => {
  const { isAuthenticated, user, signInWithEthereum } = useAuth();
  const { isConnected, address } = useAccount();
  const { toast } = useToast();
  
  // Persona form state
  const [riskTolerance, setRiskTolerance] = useState(50); // 0-100 scale where 100 is high risk
  const [esgFocus, setEsgFocus] = useState(50); // 0-100 scale where 100 is high ESG focus
  const [treasuryGrowth, setTreasuryGrowth] = useState(50); // 0-100 scale where 100 is aggressive
  const [timeHorizon, setTimeHorizon] = useState(50); // 0-100 scale where 100 is long-term
  const [voteFrequency, setVoteFrequency] = useState(50); // 0-100 scale where 100 is active
  
  // Keep track of original values for reset functionality
  const [originalValues, setOriginalValues] = useState({
    risk: 50,
    esg: 50,
    treasury: 50,
    horizon: 50,
    frequency: 50
  });
  
  const [persona, setPersona] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Debug logging
  console.log("MyPersona State:", { 
    isAuthenticated, 
    user: user?.id, 
    wallet: address,
    isConnected,
    persona: persona?.id
  });
  
  // Fetch existing persona on component mount
  useEffect(() => {
    const fetchPersona = async () => {
      if (!isConnected || !address) {
        console.log("No wallet connected, skipping persona fetch");
        setLoading(false);
        return;
      }
      
      try {
        console.log("Fetching persona for wallet:", address);
        const isDevelopmentMode = import.meta.env.DEV;
        
        // Development mode or no authenticated user - use wallet address directly
        if (isDevelopmentMode || !isAuthenticated || !user?.id) {
          console.log(isDevelopmentMode ? 
            "Development mode: Fetching persona by wallet address" : 
            "No authenticated user: Falling back to wallet address");
          
          const normalizedWalletAddress = address.toLowerCase();
          const personaData = await PersonaService.getActivePersonaByWallet(normalizedWalletAddress);
          
          if (personaData) {
            console.log("Persona found by wallet:", personaData.id);
            setPersona(personaData);
            
            // Update sliders with the fetched values
            setTimeHorizon(personaData.horizon || 50);
            setRiskTolerance(personaData.risk || 50);
            setEsgFocus(personaData.esg || 50);
            setTreasuryGrowth(personaData.treasury || 50);
            setVoteFrequency(personaData.frequency || 50);
            
            // Store original values for reset functionality
            setOriginalValues({
              risk: personaData.risk || 50,
              esg: personaData.esg || 50,
              treasury: personaData.treasury || 50,
              horizon: personaData.horizon || 50,
              frequency: personaData.frequency || 50
            });
            setLoading(false);
            return;
          } else {
            console.log("No active persona found by wallet, will use defaults");
          }
        }
        // Only try production flow if we're not in development mode AND user is authenticated
        else if (!isDevelopmentMode && isAuthenticated && user?.id) {
          console.log("Production mode & authenticated: Fetching from production tables for user:", user.id);
          const activePersona = await PersonaService.getActivePersona(user.id);
          
          if (activePersona) {
            console.log("Production persona found:", activePersona.id);
            setPersona(activePersona);
            
            // Update sliders with the fetched values
            setTimeHorizon(activePersona.horizon || 50);
            setRiskTolerance(activePersona.risk || 50);
            setEsgFocus(activePersona.esg || 50);
            setTreasuryGrowth(activePersona.treasury || 50);
            setVoteFrequency(activePersona.frequency || 50);
            
            // Store original values for reset functionality
            setOriginalValues({
              risk: activePersona.risk || 50,
              esg: activePersona.esg || 50,
              treasury: activePersona.treasury || 50,
              horizon: activePersona.horizon || 50,
              frequency: activePersona.frequency || 50
            });
            setLoading(false);
            return;
          }
        }
        
        console.log("No active persona found via any method, using defaults");
      } catch (err) {
        console.error('Unexpected error fetching persona:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPersona();
  }, [isConnected, address, isAuthenticated, user, toast]);
  
  // Handle save persona
  const handleSavePersona = async () => {
    if (!isConnected || !address) {
      console.error("Cannot save persona: No wallet connected");
      toast({
        title: "Connection required",
        description: "Please connect your wallet to save your persona.",
        variant: "destructive",
      });
      return;
    }
    
    // If not authenticated, prompt to sign in first
    if (!isAuthenticated && isConnected) {
      try {
        toast({
          title: "Authentication required",
          description: "Please sign the message to authenticate.",
        });
        
        await signInWithEthereum();
        
        toast({
          title: "Authentication successful",
          description: "Now you can save your persona preferences.",
        });
      } catch (error) {
        console.error("Failed to authenticate:", error);
        toast({
          title: "Authentication failed",
          description: "Please try again to save your preferences.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setSaving(true);
    
    try {
      const personaValues = {
        risk: riskTolerance,
        esg: esgFocus,
        treasury: treasuryGrowth,
        horizon: timeHorizon,
        frequency: voteFrequency,
      };
      
      console.log("Saving persona with values:", personaValues);
      console.log("Current persona state:", persona ? persona.id : 'No persona yet');
      console.log("Is authenticated:", isAuthenticated, "User ID:", user?.id);
      console.log("Wallet address:", address);
      
      const isDevelopmentMode = import.meta.env.DEV;
      const normalizedWalletAddress = address.toLowerCase();
      
      // Development mode - always use wallet address
      if (isDevelopmentMode) {
        console.log("Development mode: Using wallet-based persona save flow");
        
        try {
          // Check if we have any existing personas for this wallet
          const existingPersonas = await PersonaService.getPersonasByWallet(normalizedWalletAddress);
          console.log("Existing personas for wallet:", existingPersonas.length ? existingPersonas.map(p => p.id) : 'None');
          
          if (persona || existingPersonas.length > 0) {
            // Update existing persona (use the one in state, or first found if none in state)
            const personaToUpdate = persona || existingPersonas[0];
            console.log("Updating existing wallet-based persona:", personaToUpdate.id);
            
            const updatedPersona = await PersonaService.updatePersonaWithWallet(
              personaToUpdate.id,
              normalizedWalletAddress,
              "My Persona",
              personaValues,
              true // Set as active
            );
            
            console.log("Wallet-based persona updated successfully:", updatedPersona.id);
            setPersona(updatedPersona);
            
            toast({
              title: "Success",
              description: "Your persona preferences have been updated.",
            });
          } else {
            // Create new persona
            console.log("Creating new wallet-based persona");
            const newPersona = await PersonaService.createPersonaWithWallet(
              normalizedWalletAddress,
              "My Persona",
              personaValues,
              true // Set as active
            );
            
            console.log("Wallet-based persona created successfully:", newPersona.id);
            setPersona(newPersona);
            
            toast({
              title: "Success",
              description: "Your persona preferences have been saved.",
            });
          }
        } catch (error) {
          console.error("Error saving wallet-based persona:", error);
          toast({
            title: "Error",
            description: "There was a problem saving your preferences.",
            variant: "destructive",
          });
        }
      }
      // Production mode and authenticated - use user ID
      else if (!isDevelopmentMode && isAuthenticated && user?.id) {
        try {
          if (persona) {
            // Update existing persona
            console.log("Updating production persona:", persona.id);
            const updatedPersona = await PersonaService.updatePersona(
              persona.id,
              "My Persona", // Name parameter
              personaValues,
              true // Set as active
            );
            
            console.log("Production persona updated successfully:", updatedPersona.id);
            setPersona(updatedPersona);
            
            toast({
              title: "Success",
              description: "Your persona preferences have been updated.",
            });
          } else {
            // Create new persona
            console.log("Creating new production persona for user:", user.id);
            const newPersona = await PersonaService.createPersona(
              user.id,
              "My Persona", // Name parameter
              personaValues,
              true // Set as active
            );
            
            console.log("Production persona created successfully:", newPersona.id);
            setPersona(newPersona);
            
            toast({
              title: "Success",
              description: "Your persona preferences have been saved.",
            });
          }
        } catch (error) {
          console.error("Error saving production persona:", error);
          
          // Fallback to wallet-based flow if production flow fails
          try {
            console.log("Falling back to wallet-based save after production error");
            await handleWalletBasedSave();
          } catch (fallbackError) {
            console.error("Fallback save also failed:", fallbackError);
            toast({
              title: "Error",
              description: "There was a problem saving your preferences.",
              variant: "destructive",
            });
          }
        }
      }
      // Not authenticated but has wallet - use wallet address
      else if (isConnected && address) {
        console.log("Not authenticated: Using wallet-based flow");
        await handleWalletBasedSave();
      }
      // No auth or wallet - can't save
      else {
        console.error("Cannot save: No authentication or wallet");
        toast({
          title: "Error",
          description: "Authentication or wallet connection required to save.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Unexpected error saving persona:", err);
      toast({
        title: "Error",
        description: "There was a problem saving your preferences.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Helper function for wallet-based save logic
  const handleWalletBasedSave = async () => {
    const personaValues = {
      risk: riskTolerance,
      esg: esgFocus,
      treasury: treasuryGrowth,
      horizon: timeHorizon,
      frequency: voteFrequency,
    };
    
    const normalizedWalletAddress = address.toLowerCase();
    
    // Check if we have any existing personas for this wallet address
    const existingPersonas = await PersonaService.getPersonasByWallet(normalizedWalletAddress);
    console.log("Existing personas for wallet:", existingPersonas.length ? existingPersonas.map(p => p.id) : 'None');
    
    if (existingPersonas.length > 0) {
      // Use the first one we find if we don't have a specific persona set in state
      const personaToUpdate = persona || existingPersonas[0];
      console.log("Updating existing wallet-based persona:", personaToUpdate.id);
      
      const updatedPersona = await PersonaService.updatePersonaWithWallet(
        personaToUpdate.id,
        normalizedWalletAddress,
        "My Persona",
        personaValues,
        true // Set as active
      );
      
      console.log("Wallet-based persona updated successfully:", updatedPersona.id);
      setPersona(updatedPersona);
      
      toast({
        title: "Success",
        description: "Your persona preferences have been updated.",
      });
    } else {
      // Create new persona with wallet
      console.log("Creating new wallet-based persona");
      const newPersona = await PersonaService.createPersonaWithWallet(
        normalizedWalletAddress,
        "My Persona",
        personaValues,
        true // Set as active
      );
      
      console.log("Wallet-based persona created successfully:", newPersona.id);
      setPersona(newPersona);
      
      toast({
        title: "Success",
        description: "Your persona preferences have been saved.",
      });
    }
  };
  
  // Handle reset persona to original values
  const handleResetPersona = () => {
    setRiskTolerance(originalValues.risk);
    setEsgFocus(originalValues.esg);
    setTreasuryGrowth(originalValues.treasury);
    setTimeHorizon(originalValues.horizon);
    setVoteFrequency(originalValues.frequency);
    
    toast({
      title: "Persona reset",
      description: "Your governance preferences have been reset to original values.",
    });
  };
  
  // Get descriptive text for slider values
  const getRiskDescription = (value) => {
    if (value < 30) return 'Low Risk';
    if (value < 70) return 'Moderate Risk';
    return 'High Risk';
  };
  
  const getESGDescription = (value) => {
    if (value < 30) return 'Low Priority';
    if (value < 70) return 'Moderate Priority';
    return 'High Priority';
  };
  
  const getTreasuryDescription = (value) => {
    if (value < 30) return 'Stability Focused';
    if (value < 70) return 'Balanced Growth';
    return 'Aggressive Growth';
  };
  
  const getHorizonDescription = (value) => {
    if (value < 30) return 'Short-Term';
    if (value < 70) return 'Medium-Term';
    return 'Long-Term';
  };
  
  const getFrequencyDescription = (value) => {
    if (value < 30) return 'Rare Participation';
    if (value < 70) return 'Regular Participation';
    return 'Active Participation';
  };
  
  // Generate natural language summary
  const getPersonaSummary = () => {
    if (!isConnected) return '';
    
    let summary = `Your governance agent has a ${getHorizonDescription(timeHorizon).toLowerCase()} focus with `;
    
    // Risk tolerance
    summary += `${getRiskDescription(riskTolerance).toLowerCase()} tolerance. `;
    
    // ESG focus
    summary += `ESG considerations are a ${getESGDescription(esgFocus).toLowerCase()} in your voting decisions. `;
    
    // Treasury growth
    summary += `You prefer ${getTreasuryDescription(treasuryGrowth).toLowerCase()} for protocol treasury management. `;
    
    // Vote frequency
    summary += `Your voting style indicates ${getFrequencyDescription(voteFrequency).toLowerCase()}.`;
    
    return summary;
  };
  
  return (
    <DashboardLayout>
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 border border-graphite/20 rounded-lg p-6 bg-void shadow-md">
            <h2 className="text-2xl font-semibold text-phosphor mb-6">My Governance Style</h2>
            
            {!isConnected ? (
              <div className="text-center p-8">
                <p className="text-silver mb-4">Connect your wallet to customize your governance persona</p>
                <Button 
                  variant="default" 
                  onClick={() => { }}
                  className="w-full max-w-xs"
                >
                  Connect Wallet
                </Button>
              </div>
            ) : loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan"></div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="space-y-6">
                  <SnappySlider
                    values={[0, 25, 50, 75, 100]}
                    defaultValue={riskTolerance}
                    value={riskTolerance}
                    min={0}
                    max={100}
                    step={1}
                    onChange={setRiskTolerance}
                    label="Risk Tolerance"
                    suffix="%"
                    className="mb-2"
                  />
                  
                  <SnappySlider
                    values={[0, 25, 50, 75, 100]}
                    defaultValue={esgFocus}
                    value={esgFocus}
                    min={0}
                    max={100}
                    step={1}
                    onChange={setEsgFocus}
                    label="ESG Priority"
                    suffix="%"
                    className="mb-2"
                  />
                  
                  <SnappySlider
                    values={[0, 25, 50, 75, 100]}
                    defaultValue={treasuryGrowth}
                    value={treasuryGrowth}
                    min={0}
                    max={100}
                    step={1}
                    onChange={setTreasuryGrowth}
                    label="Treasury Growth Bias"
                    suffix="%"
                    className="mb-2"
                  />
                  
                  <SnappySlider
                    values={[0, 25, 50, 75, 100]}
                    defaultValue={timeHorizon}
                    value={timeHorizon}
                    min={0}
                    max={100}
                    step={1}
                    onChange={setTimeHorizon}
                    label="Time Horizon"
                    suffix="%"
                    className="mb-2"
                  />
                  
                  <SnappySlider
                    values={[0, 25, 50, 75, 100]}
                    defaultValue={voteFrequency}
                    value={voteFrequency}
                    min={0}
                    max={100}
                    step={1}
                    onChange={setVoteFrequency}
                    label="Vote Frequency Preference"
                    suffix="%"
                    className="mb-2"
                  />
                </div>
                
                {/* Natural Language Summary */}
                <div className="bg-graphite/10 p-4 rounded-md border border-graphite/20">
                  <h3 className="text-lg text-phosphor mb-3">Governance Summary</h3>
                  <p className="text-sm text-silver">{getPersonaSummary()}</p>
                </div>
                
                {/* Controls */}
                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={handleResetPersona}
                    disabled={saving}
                    className="bg-white border-gray-300 text-void hover:bg-gray-100"
                  >
                    Reset
                  </Button>
                  
                  <Button
                    onClick={handleSavePersona}
                    disabled={saving}
                    className="bg-indigo text-void hover:bg-indigo/90"
                  >
                    {saving ? 'Saving...' : 'Save Persona'}
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-1 border border-graphite/20 rounded-lg p-6 bg-void shadow-md">
            <h2 className="text-2xl font-semibold text-phosphor mb-6">Persona Meaning</h2>
            
            {!isConnected ? (
              <div className="text-center p-8">
                <div className="text-silver mb-2">Connect your wallet to view your persona summary</div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-silver">Risk Tolerance:</span>
                    <span className="text-phosphor font-medium">
                      {getRiskDescription(riskTolerance)}
                    </span>
                  </div>
                  <div className="w-full bg-graphite/20 rounded-full h-2">
                    <div 
                      className="bg-indigo h-2 rounded-full" 
                      style={{ width: `${riskTolerance}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-silver">ESG Focus:</span>
                    <span className="text-phosphor font-medium">
                      {getESGDescription(esgFocus)}
                    </span>
                  </div>
                  <div className="w-full bg-graphite/20 rounded-full h-2">
                    <div 
                      className="bg-teal h-2 rounded-full" 
                      style={{ width: `${esgFocus}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-silver">Treasury Growth:</span>
                    <span className="text-phosphor font-medium">
                      {getTreasuryDescription(treasuryGrowth)}
                    </span>
                  </div>
                  <div className="w-full bg-graphite/20 rounded-full h-2">
                    <div 
                      className="bg-gold h-2 rounded-full" 
                      style={{ width: `${treasuryGrowth}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-silver">Time Horizon:</span>
                    <span className="text-phosphor font-medium">
                      {getHorizonDescription(timeHorizon)}
                    </span>
                  </div>
                  <div className="w-full bg-graphite/20 rounded-full h-2">
                    <div 
                      className="bg-cyan h-2 rounded-full" 
                      style={{ width: `${timeHorizon}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-silver">Vote Frequency:</span>
                    <span className="text-phosphor font-medium">
                      {getFrequencyDescription(voteFrequency)}
                    </span>
                  </div>
                  <div className="w-full bg-graphite/20 rounded-full h-2">
                    <div 
                      className="bg-phosphor h-2 rounded-full" 
                      style={{ width: `${voteFrequency}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="border-t border-silver/10 pt-4 mt-6">
                  <h3 className="text-lg text-phosphor mb-3">What This Means</h3>
                  <p className="text-sm text-silver">
                    {timeHorizon >= 70 && riskTolerance < 30 
                      ? "You prefer sustainable long-term growth with minimal risk. Your agent will prioritize stability and predictable outcomes over high rewards."
                      : timeHorizon >= 70 && riskTolerance >= 70
                        ? "You're focused on long-term growth and willing to take significant risks. Your agent will prioritize ambitious proposals with high potential impact."
                        : timeHorizon < 30 && riskTolerance >= 70
                          ? "You prioritize short-term gains with aggressive risk taking. Your agent will look for immediate high-reward opportunities."
                          : "You have a balanced approach to governance. Your agent will evaluate proposals based on a mix of short and long-term considerations."}
                    
                    {esgFocus >= 70
                      ? " Environmental and social impact will be key factors in your voting decisions."
                      : esgFocus < 30
                        ? " Financial and technical considerations will take precedence over ESG factors."
                        : " ESG factors will be considered alongside financial and technical merits."}
                    
                    {treasuryGrowth >= 70
                      ? " You favor aggressive treasury growth strategies that may include higher-risk investments."
                      : treasuryGrowth < 30
                        ? " You prioritize treasury stability and conservation over aggressive growth strategies."
                        : " You balance treasury growth with responsible risk management."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MyPersona;
