// File: app/api/reset-fix/route.ts
// CHỨC NĂNG: Buộc reset mật khẩu Admin/Tester để tạo hash hợp lệ.

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/supabase"; 

export async function GET() {
  const USER_TO_FIX = "quachthanhlong2k3@gmail.com";
  const NEW_PASSWORD = "PasswordFix2025!";

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const { data: userData } = await supabaseAdmin.from("auth.users").select("id").eq("email", USER_TO_FIX).single();

    if (!userData) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const userId = userData.id;

    await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: NEW_PASSWORD,
      email_confirm: true
    });

    return NextResponse.json({
      message: `Password successfully reset to "${NEW_PASSWORD}" via Admin SDK.`,
      status: "SUCCESS",
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error during fix." }, { status: 500 });
  }
}
