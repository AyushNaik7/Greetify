import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


const schema = z.object({
  businessId: z.string().uuid(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(60),
});

export const chatWithReceptionist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: z.infer<typeof schema>) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: member } = await context.supabase
      .from("business_members")
      .select("id")
      .eq("business_id", data.businessId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!member) throw new Error("You don't have access to this business");
    const { runReceptionist } = await import("@/lib/receptionist.server");
    return runReceptionist(context.supabase, data.businessId, data.messages, { channel: "chat" });
  });
