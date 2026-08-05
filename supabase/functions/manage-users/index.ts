import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Valida token do chamador (tem que ser admin_geral)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Sem token");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) throw new Error("Usuário inválido");

    const { data: profile } = await supabaseAdmin
      .from("admin_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "admin_geral") {
      throw new Error("Apenas o admin geral pode gerenciar usuários.");
    }

    const { action, payload } = await req.json();

    if (action === "create_coordenador") {
      const { email, tempPassword, name, courseIds } = payload;

      // 1. Cria no Auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name },
      });
      if (createError) throw createError;

      // 2. Cria perfil com precisa_trocar_senha = true
      const { error: profileError } = await supabaseAdmin.from("admin_profiles").insert({
        user_id: newUser.user.id,
        email,
        name,
        role: "coordenador_adjunto",
        course_ids: courseIds || [],
        precisa_trocar_senha: true,
      });
      if (profileError) throw profileError;

      return new Response(JSON.stringify({ success: true, user: newUser.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle_active") {
      const { userId, active } = payload;
      const { error } = await supabaseAdmin.from("admin_profiles").update({ active }).eq("user_id", userId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_courses") {
      const { userId, courseIds } = payload;
      const { error } = await supabaseAdmin.from("admin_profiles").update({ course_ids: courseIds }).eq("user_id", userId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_password") {
      const { userId, newTempPassword } = payload;
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newTempPassword,
      });
      if (authError) throw authError;

      const { error: profileError } = await supabaseAdmin.from("admin_profiles").update({ precisa_trocar_senha: true }).eq("user_id", userId);
      if (profileError) throw profileError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_user") {
      const { userId } = payload;
      await supabaseAdmin.from("admin_profiles").delete().eq("user_id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Ação inválida");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
