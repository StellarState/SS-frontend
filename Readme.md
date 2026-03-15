<div align="center">
  <img src="logo.png" alt="StellarSettle Logo" width="200"/>
  
  # StellarSettle Web App
  
  **Modern web interface for decentralized invoice financing**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
</div>

## 📋 Overview

User-friendly web application for StellarSettle featuring:

- 📊 Seller dashboard for invoice management
- 💼 Investor marketplace for browsing opportunities
- 🔐 Stellar wallet integration (Freighter, xBull)
- 📈 Real-time analytics and reporting
- 📱 Responsive mobile-first design
- 🌙 Dark mode support

## 🏗️ Architecture
```
app/
├── (auth)/              # Authentication pages
├── (dashboard)/         # Protected dashboard pages
│   ├── seller/          # Seller views
│   └── investor/        # Investor views
├── marketplace/         # Public marketplace
└── api/                 # API routes (if needed)

components/
├── ui/                  # Reusable UI components (shadcn)
├── dashboard/           # Dashboard-specific components
├── invoices/            # Invoice components
└── wallet/              # Wallet connection components

lib/
├── stellar/             # Stellar SDK utilities
├── api/                 # API client
└── utils/               # Helper functions

hooks/
├── useStellar.ts        # Stellar wallet hook
├── useInvoices.ts       # Invoice data hook
└── useInvestments.ts    # Investment data hook
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Stellar wallet browser extension (Freighter recommended)

### Installation
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit environment variables
nano .env.local

# Start development server
npm run dev

# Open http://localhost:3000
```

### Install all shadcn/ui components (optional)

The project uses [shadcn/ui](https://ui.shadcn.com) (New York style, Slate theme). A few base components are included. To add the full set (form, dialog, sheet, toast, etc.) run:

```bash
# If you see "Lock compromised" or npm cache errors, run first:
npm cache clean --force

# Then install all shadcn components:
npm run shadcn:add
```

### Environment Variables
```env
# API
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_API_VERSION=v1

# Stellar
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Smart Contracts
NEXT_PUBLIC_ESCROW_CONTRACT_ID=CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_TOKEN_CONTRACT_ID=CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Features
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
```

## 🎨 Design System

Built with:
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: TailwindCSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **Tables**: TanStack Table

Color palette:
```css
--primary: #0066CC (Stellar blue)
--secondary: #F8D12F (Stellar yellow)
--accent: #00B4D8
--background: #FFFFFF / #0A0A0A (dark mode)
```

## 📱 Key Features

### For Sellers
- Upload invoices (PDF, drag-and-drop)
- View invoice status & history
- Track payments in real-time
- Analytics dashboard
- Export reports

### For Investors
- Browse marketplace with filters
- View invoice risk scores
- One-click investments
- Portfolio tracking
- ROI calculator

### Shared
- Stellar wallet connection
- Multi-signature support
- Transaction history
- Notifications (email + in-app)
- Mobile responsive

## 🧪 Testing
```bash
# Run unit tests
npm test

# Run E2E tests (Playwright)
npm run test:e2e

# Run accessibility tests
npm run test:a11y

# Generate coverage
npm run test:coverage
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Docker
```bash
# Build image
docker build -t stellarsettle-app .

# Run container
docker run -p 3000:3000 stellarsettle-app
```

### Environment Specific
- Development: `npm run dev`
- Staging: `npm run build && npm start`
- Production: Deploy to Vercel/Netlify

## 🔒 Security

- CSP headers configured
- XSS protection via Next.js
- CSRF tokens for sensitive operations
- Wallet signature verification
- Rate limiting on API routes
- Secure cookie settings

## 📊 Performance

- Lighthouse score: 95+
- First Contentful Paint: <1.5s
- Time to Interactive: <3.0s
- Code splitting & lazy loading
- Image optimization (next/image)
- API response caching

## 🤝 Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

Built with ❤️ on Stellar