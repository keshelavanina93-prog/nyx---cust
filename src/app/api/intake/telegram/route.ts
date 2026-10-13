import { makeIntakeHandler } from "@/lib/intake/handler";
import { telegramAdapter } from "@/lib/intake/telegram";

export const POST = makeIntakeHandler(telegramAdapter);
