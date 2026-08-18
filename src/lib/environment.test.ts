import { describe, expect, it } from "vitest";

import { isLoopbackSupabaseUrl, validateSupabaseEnvironment } from "./environment";

describe("proteção de ambiente Supabase", () => {
  it("reconhece apenas hosts locais no modo de desenvolvimento", () => {
    expect(isLoopbackSupabaseUrl("http://127.0.0.1:55321")).toBe(true);
    expect(isLoopbackSupabaseUrl("http://localhost:54321")).toBe(true);
    expect(isLoopbackSupabaseUrl("https://project.supabase.co")).toBe(false);
  });

  it("recusa o projeto hospedado no modo local", () => {
    expect(validateSupabaseEnvironment("local", "https://project.supabase.co")).toContain(
      "Docker",
    );
    expect(validateSupabaseEnvironment("local", "http://127.0.0.1:55321")).toBeNull();
  });

  it("recusa localhost nos modos remotos", () => {
    expect(validateSupabaseEnvironment("remote", "http://127.0.0.1:55321")).toContain(
      "remoto",
    );
    expect(validateSupabaseEnvironment("production", "https://project.supabase.co")).toBeNull();
  });
});
