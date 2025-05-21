import React from "react";
import { Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";
import { Toaster } from "@/components/ui/toaster";
import Proposals from "@/pages/Proposals";
import Daos from "@/pages/Daos";
import DaoDetail from "@/pages/DaoDetail";
import DaoDetailPage from "@/pages/dao/DaoDetailPage";
import MyPersona from "@/pages/MyPersona";
import DecisionAgent from "@/pages/DecisionAgent";
import VotingHistory from "@/pages/VotingHistory";
import Settings from "@/pages/Settings";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AuthPage from "@/pages/AuthPage";
import AdminPage from "@/pages/AdminPage";
import SeedUniswap from "@/pages/SeedUniswap";
import AgentChat from "@/pages/agent/AgentChat";

const App = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Index />} />
        
        {/* Auth page - only shown if user navigates directly */}
        <Route path="/auth" element={<AuthPage />} />
        
        {/* Public Dashboard - accessible without authentication */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Protected routes */}
        <Route path="/daos" element={
          <ProtectedRoute>
            <Daos />
          </ProtectedRoute>
        } />
        <Route path="/dao/:id" element={
          <ProtectedRoute>
            <DaoDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/dao/:id/proposals" element={
          <ProtectedRoute>
            <DaoDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/proposals" element={
          <ProtectedRoute>
            <Proposals />
          </ProtectedRoute>
        } />
        <Route path="/my-persona" element={
          <ProtectedRoute>
            <MyPersona />
          </ProtectedRoute>
        } />
        <Route path="/decision-agent" element={
          <ProtectedRoute>
            <DecisionAgent />
          </ProtectedRoute>
        } />
        <Route path="/voting-history" element={
          <ProtectedRoute>
            <VotingHistory />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/agent/chat" element={
          <ProtectedRoute>
            <AgentChat />
          </ProtectedRoute>
        } />
        <Route path="/agent/chat/:proposalId" element={
          <ProtectedRoute>
            <AgentChat />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        } />
        <Route path="/seed-uniswap" element={
          <ProtectedRoute>
            <SeedUniswap />
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </AuthProvider>
  );
};

export default App;
