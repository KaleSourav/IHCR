// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// CORS Headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, email, phone, gender, occupation } = await req.json()

    // Retrieve the secret keys
    // Once deployed, set these via: supabase secrets set RAZORPAY_KEY_ID=xxx RAZORPAY_KEY_SECRET=yyy
    const key_id = Deno.env.get('RAZORPAY_KEY_ID')
    const key_secret = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (!key_id || !key_secret) {
      throw new Error("Razorpay credentials are not set.")
    }

    // Call Razorpay API to create an order
    const amount = 9900; // ₹99 in paise
    const currency = "INR";

    const basicAuth = btoa(`${key_id}:${key_secret}`)
    
    const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${basicAuth}`
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt: `receipt_${Date.now()}`,
        notes: {
          name,
          email,
          phone,
          gender,
          occupation
        }
      })
    })

    const rzpData = await rzpResponse.json()

    if (!rzpResponse.ok) {
      throw new Error(rzpData.error?.description || "Failed to create Razorpay order")
    }

    return new Response(
      JSON.stringify({
        order_id: rzpData.id,
        amount: amount,
        key_id: key_id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
