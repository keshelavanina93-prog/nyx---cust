import type ka from "./messages/ka.json";

declare global {
  interface IntlMessages extends Record<string, unknown> {
    terms: (typeof ka)["terms"];
  }
}

declare module "next-intl" {
  interface AppConfig {
    Messages: typeof ka;
  }
}

export {};
