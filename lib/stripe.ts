import Stripe from "stripe"

// Only initialize Stripe if environment variables are available
// This prevents build-time errors when STRIPE_SECRET_KEY is not set
let stripeInstance: Stripe | null = null

function initializeStripe() {
  const primaryKey = process.env.STRIPE_SECRET_KEY
  const fallbackKey = process.env.STRIPE_SECRET_KEY_FALLBACK // Optional fallback via env var

  // Try primary key first
  if (primaryKey) {
    try {
      console.log("Initializing Stripe with primary key...")
      stripeInstance = new Stripe(primaryKey, {
        apiVersion: "2025-08-27.basil",
        typescript: true,
      })

      console.log("Stripe primary key initialized successfully")
      return
    } catch (error) {
      console.warn("Primary Stripe key failed, trying fallback:", error)
    }
  }

  // Try fallback key if primary fails
  if (fallbackKey) {
    try {
      console.log("Initializing Stripe with fallback key...")
      stripeInstance = new Stripe(fallbackKey, {
        apiVersion: "2025-08-27.basil",
        typescript: true,
      })

      console.log("Stripe fallback key initialized successfully")
      return
    } catch (error) {
      console.error("Fallback Stripe key also failed:", error)
    }
  }

  console.error("Both primary and fallback Stripe keys failed to initialize")
  stripeInstance = null
}

// Initialize Stripe on module load
initializeStripe()

export const stripe = stripeInstance

export const stripeConfig = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  secretKey: process.env.STRIPE_SECRET_KEY || "",
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
}

// Price IDs for different plans (you'll need to create these in Stripe)
export const STRIPE_PRICES = {
  FREE: process.env.STRIPE_PRICE_FREE || "price_1SiIwD3G7U0M1bp1FrBOA3KB",
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY || "price_1SiIwD3G7U0M1bp1Vc3ndopi",
  PRO_ANNUAL: process.env.STRIPE_PRICE_PRO_ANNUAL || "price_1SiIwE3G7U0M1bp1auNQbKID",
  CREDITS_150: process.env.STRIPE_PRICE_CREDITS_150 || "price_1SiIwF3G7U0M1bp1yfI4CgyQ",
}

export const PLAN_LIMITS = {
  FREE: {
    monthlyTasks: 10,
    supportLevel: 'community',
    features: ["basic_projects"]
  },
  PRO: {
    monthlyTasks: 150,
    supportLevel: 'priority',
    features: ["all_models", "advanced_projects", "custom_templates", "premium_ai_models"]
  },
  PRO_ANNUAL: {
    monthlyTasks: 170,
    supportLevel: 'priority',
    features: ["all_models", "advanced_projects", "custom_templates", "premium_ai_models"]
  }
}