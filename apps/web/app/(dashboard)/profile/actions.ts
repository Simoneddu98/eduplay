"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato" };

  const full_name = (formData.get("full_name") as string)?.trim() || null;
  const bio = (formData.get("bio") as string)?.trim() || null;
  const avatar_url = (formData.get("avatar_url") as string)?.trim() || null;

  const { error } = await supabase
    .from("profiles")
    .update({ full_name, bio, avatar_url })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/profile");
  return { success: true };
}

export async function changePassword(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!password || password.length < 6) return { error: "Password troppo corta (min 6 caratteri)" };
  if (password !== confirm) return { error: "Le password non coincidono" };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { success: true };
}
