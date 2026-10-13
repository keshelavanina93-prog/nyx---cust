import { makeIntakeHandler } from "@/lib/intake/handler";
import { emailAdapter } from "@/lib/intake/email";

export const POST = makeIntakeHandler(emailAdapter);
