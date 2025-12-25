import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe('stripe key', {
  apiVersion: '2025-08-27.basil', // Use the latest API version
});

async function setupStripeProducts() {
  try {
    console.log('Setting up Stripe products...');

    // Create the Free plan product
    const freeProduct = await stripe.products.create({
      name: 'Free',
      description: 'Basic access to PiPilot SWE Agent features',
      metadata: {
        tier: 'free',
        features: 'basic'
      }
    });

    // Create the Pro plan product
    const proProduct = await stripe.products.create({
      name: 'Pro',
      description: 'Professional access to PiPilot SWE Agent features.',
      metadata: {
        tier: 'pro',
        features: 'advanced'
      }
    });

    // Create the Free plan price (free tier)
    const freePrice = await stripe.prices.create({
      product: freeProduct.id,
      unit_amount: 0, // Free
      currency: 'usd',
      recurring: {
        interval: 'month',
        interval_count: 1
      },
      metadata: {
        tier: 'free',
        // Define free tier limits
        monthly_tasks: '10', // 10 tasks per month
        support_level: 'community'
      }
    });

    // Create the Pro plan monthly price ($30/month)
    const proMonthlyPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 3000, // $30.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
        interval_count: 1
      },
      metadata: {
        tier: 'pro',
        billing: 'monthly',
        // Define Pro tier limits
        monthly_tasks: '150', // 100 tasks per month
      }
    });

    // Create the Pro plan annual price ($24/month = $288/year)
    const proAnnualPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 28800, // $288.00 in cents for annual billing
      currency: 'usd',
      recurring: {
        interval: 'year',
        interval_count: 1
      },
      metadata: {
        tier: 'pro',
        billing: 'annual',
        // Define Pro tier limits (same as monthly but with annual discount)
        monthly_tasks: '170', // 120 tasks per month (with annual commitment)
        support_level: 'priority',
        discount: '20%' // 20% discount for annual billing
      }
    });

    console.log('✅ Stripe products created successfully!');
    console.log('\n📊 Product Summary:');
    console.log(`Free Plan Product ID: ${freeProduct.id}`);
    console.log(`Free Plan Price ID: ${freePrice.id}`);
    console.log(`Pro Plan Product ID: ${proProduct.id}`);
    console.log(`Pro Monthly Price ID: ${proMonthlyPrice.id}`);
    console.log(`Pro Annual Price ID: ${proAnnualPrice.id}`);

    console.log('\n📋 Free Tier Limits:');
    console.log('- 10 tasks per month');
    console.log('- 10,000 tokens per month');
    console.log('- 1 concurrent job');
    console.log('- Community support');

    console.log('\n📋 Pro Tier Limits:');
    console.log('- 100 tasks per month (120 with annual)');
    console.log('- 100,000 tokens per month (120,000 with annual)');
    console.log('- 5 concurrent jobs');
    console.log('- Priority support');
    console.log('- 20% discount with annual billing ($24/month instead of $30)');

    // Update your environment variables with these values
    console.log('\n🔧 Update your .env file with these values:');
    console.log(`STRIPE_PRICE_FREE=${freePrice.id}`);
    console.log(`STRIPE_PRICE_PRO_MONTHLY=${proMonthlyPrice.id}`);
    console.log(`STRIPE_PRICE_PRO_ANNUAL=${proAnnualPrice.id}`);

  } catch (error) {
    console.error('❌ Error setting up Stripe products:', error);
  }
}

// Run the setup function
setupStripeProducts();