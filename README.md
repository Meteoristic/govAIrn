# GovAIrn - AI-Powered Governance for Web3 DAOs

<div align="center">
  <img src="public/images/govairn-logo.png" alt="GovAIrn Logo" width="120" />
  <h3>Intelligent Governance for Decentralized Organizations</h3>
</div>

## Overview

GovAIrn is an intelligent governance platform that helps DAO participants make better decisions through AI-powered analysis of proposals, personalized recommendations, and comprehensive governance health metrics. The platform bridges the gap between governance protocols like Snapshot and individual stakeholders by providing deeper, more accessible insights.

### Key Features

- 🤖 **AI Decision Engine**: Analyzes proposals and generates voting recommendations based on your personal governance preferences
- 📊 **DAO Dashboard**: View active proposals across multiple DAOs with real-time analytics
- 👤 **Persona Builder**: Create and customize your governance persona to align AI recommendations with your values
- 📝 **Proposal Analysis**: Get detailed breakdowns of each proposal including pros, cons, and impact assessments
- 🔄 **Snapshot Integration**: Seamlessly sync with Snapshot spaces and get AI insights on live proposals

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **UI Framework**: Tailwind CSS, shadcn/ui components
- **Web3 Integration**: wagmi, ethers.js, RainbowKit
- **Data Storage**: Supabase (PostgreSQL)
- **AI/ML**: OpenAI API integration
- **Authentication**: Sign-in with Ethereum (SIWE)
- **Deployment**: Serverless Edge Functions

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account for backend services
- OpenAI API key for AI analysis features
- Environment variables configured (see `.env.example`)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/govairn.git
   cd govairn
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your API keys (see `.env.example`)

4. Start the development server
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:8080`

## Usage

### Dashboard

The dashboard provides an overview of active governance proposals across supported DAOs. You can:
- View proposal summaries and AI recommendations
- Load live data from Snapshot spaces
- Explore governance health metrics

### Persona Management

Create and manage your governance persona to customize AI recommendations:
1. Navigate to the Persona page from the sidebar
2. Adjust sliders to set your governance preferences
3. Save your persona to influence AI decision-making

### Proposal Analysis

For each proposal, GovAIrn provides:
- Summary and key points
- AI-generated pros and cons
- Confidence scores and decision recommendations
- Detailed reasoning for the AI's recommendation

## Environment Variables

Create a `.env` file with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration
VITE_OPENAI_API_KEY=your_openai_api_key

# Snapshot API URL
VITE_SNAPSHOT_API_URL=https://hub.snapshot.org/graphql

# Base URL for Edge Functions
VITE_EDGE_FUNCTION_URL=your_edge_function_url
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [shadcn/ui](https://ui.shadcn.com/) components
- Powered by [OpenAI](https://openai.com/) for intelligent proposal analysis
- Integrated with [Snapshot](https://snapshot.org/) for DAO governance
- Wallet connection via [RainbowKit](https://www.rainbowkit.com/)
