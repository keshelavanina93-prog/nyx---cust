import { getTranslations } from "next-intl/server";
import { STEPS, stepIndexForStatus, type StepKey } from "@/lib/shipments/status";
import { StepperView } from "@/components/stepper-view";

export async function Stepper({ base, status, current }: { base: string; status: string; current: StepKey }) {
  const t = await getTranslations("steps");
  const ts = await getTranslations("shell");
  const reached = stepIndexForStatus(status);
  const currentIndex = STEPS.indexOf(current);
  const steps = STEPS.map((key, i) => ({
    key,
    label: t(key),
    href: `${base}/${key}`,
    state: key === current ? ("current" as const) : i < reached ? ("done" as const) : i <= reached ? ("available" as const) : ("locked" as const),
    enabled: i <= reached,
  }));
  return <StepperView steps={steps} currentIndex={currentIndex} reachedIndex={reached} label={ts("steps")} />;
}
