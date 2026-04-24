import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.14.0'
// Note: To use crypto in Deno for HMAC
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts"

serve(async (req) => {
  try {
    // Webhook from Razorpay
    const bodyText = await req.text()
    const rzpSignature = req.headers.get('x-razorpay-signature')

    const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')
    if (!secret || !rzpSignature) {
      throw new Error("Missing secret or signature")
    }

    // Verify HMAC
    const expectedSignature = hmac("sha256", secret, bodyText, "utf8", "hex")
    
    if (expectedSignature !== rzpSignature) {
      throw new Error("Invalid signature")
    }

    const payload = JSON.parse(bodyText)
    const payment = payload.payload.payment.entity
    const order = payload.payload.order.entity

    // The notes object contains the user data we passed in create-order
    const { name, email, phone, gender, occupation } = order.notes

    // 1. Save to Supabase DB
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: dbData, error: dbError } = await supabase
      .from('registrations')
      .insert([
        {
          name,
          email,
          phone,
          gender,
          occupation,
          workshop: 'AI & ChatGPT',
          razorpay_payment_id: payment.id,
          razorpay_order_id: order.id,
          amount: payment.amount,
          payment_status: payment.status,
        }
      ])
      .select()

    if (dbError) throw dbError

    // 2. Append to Google Sheets (Placeholder)
    // Here you would make a fetch request to the Google Sheets API 
    // or use a pre-configured Google App Script Web App URL.
    console.log("Preparing to send data to Google Sheets...")

    // 3. Send Email via Resend (Placeholder)
    // You would use fetch to call the Resend API.
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (resendApiKey) {
      console.log(`Preparing to send email to ${email} via Resend...`)
      // await fetch("https://api.resend.com/emails", { ... })
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("Webhook Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
