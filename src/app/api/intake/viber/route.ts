import { makeIntakeHandler } from "@/lib/intake/handler";
import { viberAdapter } from "@/lib/intake/viber";

export const POST = makeIntakeHandler(viberAdapter);
