// IMPORTANT: Ensure correct imports. Using an import_map.json during deployment is recommended.
// Example supabase/import_map.json:
// {
//   "imports": {
//     "std/": "https://deno.land/std@0.177.0/",
//     "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.42.0",
//     "siwe": "npm:siwe@2"
//   }
// }
// Deploy using: supabase functions deploy siwe-auth --import-map supabase/import_map.json

import "jsr:@supabase/functions-js/edge-runtime.d.ts"; // Add Supabase Edge Runtime types
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { SiweMessage } from "npm:siwe@2";

// IMPORTANT: Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
// in Supabase Dashboard -> Project Settings -> Functions -> siwe-auth -> Environment Variables
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false } // No need to persist session server-side
});

interface SiweRequest {
  message: string;
  signature: string;
}

serve(async (req) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };

  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers, status: 204 });
  }

  try {
    // Parse the request body
    const body = await req.json() as SiweRequest;
    const { message, signature } = body;

    if (!message || !signature) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: message and signature" }),
        { headers, status: 400 }
      );
    }

    // Parse and verify the SIWE message
    const siweMessage = new SiweMessage(message);

    // Verify the signature
    const { success: isValid, error: verifyError } = await siweMessage.verify({
      signature,
      domain: siweMessage.domain,
      nonce: siweMessage.nonce,
    });

    if (!isValid) {
      console.error("SIWE verification failed:", verifyError);
      return new Response(
        JSON.stringify({ error: `Invalid signature: ${verifyError?.type}` }),
        { headers, status: 400 }
      );
    }

    // Get the wallet address from the verified message
    const walletAddress = siweMessage.address.toLowerCase();

    // Email for Supabase Auth (required by Supabase)
    const email = `${walletAddress}@wallet.govairn.eth`;

    // Generate a deterministic password based on the wallet address
    const encoder = new TextEncoder();
    const data = encoder.encode(walletAddress + "govairn-salt");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const password = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Attempt to find an existing user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers({
      filters: {
        email: email,
      },
    });

    let userId;

    // If user exists, get their ID
    if (userData && userData.users && userData.users.length > 0) {
      userId = userData.users[0].id;

      // Update user metadata
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          wallet_address: walletAddress,
          siwe_verified: true,
          last_signed_in: new Date().toISOString(),
        },
      });
    } else {
      // Create a new user if none exists
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Skip email verification
        user_metadata: {
          wallet_address: walletAddress,
          siwe_verified: true,
          last_signed_in: new Date().toISOString(),
        },
      });

      if (createUserError) {
        console.error("Error creating user:", createUserError);
        return new Response(
          JSON.stringify({ error: `Failed to create user: ${createUserError.message}` }),
          { headers, status: 500 }
        );
      }

      userId = newUser?.user?.id;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Failed to get or create user" }),
        { headers, status: 500 }
      );
    }

    // Ensure profile and wallet records exist (in a transaction for data consistency)
    const { error: transactionError } = await supabase.rpc("create_user_profile_and_wallet", {
      user_id: userId,
      wallet_addr: walletAddress,
    });

    if (transactionError) {
      console.error("Error in transaction:", transactionError);
      // We'll still return success since the user is authenticated,
      // but log the error for debugging
    }

    // Return successful confirmation with basic user info
    // Frontend (AuthContext) will use this confirmation to proceed with signInWithPassword
    return new Response(
      JSON.stringify({
        message: "SIWE verification successful. User confirmed.",
        user: {
          id: userId,
          wallet_address: walletAddress,
        },
      }),
      { headers, status: 200 }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: `Server error: ${err.message}` }),
      { headers, status: 500 }
    );
  }
});
