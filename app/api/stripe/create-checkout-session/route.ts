import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, STRIPE_PRICES } from "@/lib/stripe";
import Stripe from "stripe";

// Helper function to get Stripe instance safely
function getStripe() {
  if (!stripe) {
    throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.");
  }
  return stripe as Stripe;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { priceId, successUrl, cancelUrl, planType, github_username, installation_id } = await request.json();

    // Validate required parameters for GitHub context
    if (!github_username) {
      return NextResponse.json({ error: "GitHub username is required" }, { status: 400 });
    }

    if (!installation_id) {
      return NextResponse.json({ error: "Installation ID is required" }, { status: 400 });
    }

    // Validate the price ID
    const validPriceIds = [
      STRIPE_PRICES.FREE,
      STRIPE_PRICES.PRO_MONTHLY,
      STRIPE_PRICES.PRO_ANNUAL,
      STRIPE_PRICES.CREDITS_150
    ];

    if (!validPriceIds.includes(priceId)) {
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
    }

    const supabase = await createClient();

    // Get or create user in our database based on GitHub username
    let userId: string | undefined;
    let stripeCustomerId: string | undefined;
    let subscriptionStatus: string | undefined;
    let stripeSubscriptionId: string | undefined;

    // Try to find existing user by GitHub username
    const { data: existingUser, error: userFetchError } = await supabase
      .from('users')
      .select('*')
      .eq('github_username', github_username)
      .single();

    if (existingUser) {
      userId = existingUser.id;
      stripeCustomerId = existingUser.stripe_customer_id;
      subscriptionStatus = existingUser.subscription_status;
      stripeSubscriptionId = existingUser.stripe_subscription_id;
    } else {
      // Create a new user record
      const { data: newUser, error: createUserError } = await supabase
        .from('users')
        .insert({
          github_username: github_username,
          name: github_username, // Use username as name if not available
          subscription_plan: 'free',
          subscription_status: 'active',
        })
        .select('id')
        .single();

      if (createUserError) {
        console.error('Error creating user:', createUserError);
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
      }

      userId = newUser.id;
    }

    // Create or retrieve Stripe customer ID if not already present
    if (!stripeCustomerId) {
      const stripeInstance = getStripe();
      const customer = await stripeInstance.customers.create({
        email: `${github_username}@users.noreply.github.com`, // Use GitHub noreply email
        name: github_username,
        metadata: {
          github_username: github_username,
          installation_id: installation_id.toString(),
          user_id: userId
        }
      });

      stripeCustomerId = customer.id;

      // Update user with the new customer ID
      const { error: updateError } = await supabase
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user with customer ID:', updateError);
        // Continue anyway, as we have the customer ID
      }
    }

    // Create the checkout session
    const stripeInstance = getStripe();
    const isCreditsPurchase = planType === 'credits_150';
    const session = await stripeInstance.checkout.sessions.create({
      customer: stripeCustomerId,
      billing_address_collection: 'auto',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: isCreditsPurchase ? 'payment' : 'subscription',
      success_url: successUrl || `${request.nextUrl.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${request.nextUrl.origin}/pricing`,
      metadata: {
        user_id: userId,
        github_username: github_username,
        installation_id: installation_id,
        plan_type: planType || 'unknown'
      },
      // If user already has a subscription, we can allow them to update it
      ...(stripeSubscriptionId && {
        subscription_data: {
          metadata: {
            user_id: userId,
            github_username: github_username,
            installation_id: installation_id
          }
        }
      })
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      customer: stripeCustomerId,
      github_username: github_username
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}