/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Proxy em vez de chamar http://localhost:8000 direto: mantem front e API
      // na mesma origem em desenvolvimento, entao o cookie de sessao viaja sem
      // depender de CORS nem de SameSite=None. E o mesmo arranjo que o Caddy faz
      // em producao, o que evita o classico "funciona local, quebra no deploy".
      //
      // O alvo vem de env var porque dentro do Compose o backend atende pelo nome
      // do servico (http://backend:8000), e nao por localhost.
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
