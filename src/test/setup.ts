import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Sem `globals: true` o Testing Library não registra o cleanup sozinho: cada teste começa com o DOM vazio.
afterEach(cleanup);
