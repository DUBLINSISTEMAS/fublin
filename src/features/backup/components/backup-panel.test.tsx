// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/result";
import type { BackupInfo } from "../schema";
import { DEGRADED_HINT, DEGRADED_LABEL } from "./backup-list";
import { BackupPanel } from "./backup-panel";

type QuickAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  createBackupAction: vi.fn<QuickAction>(async () => ({ ok: true })),
  restoreBackupAction: vi.fn<QuickAction>(async () => ({ ok: true })),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("../actions", () => ({ createBackupAction: mocks.createBackupAction, restoreBackupAction: mocks.restoreBackupAction }));

// Em atributo JSX literal a barra não escapa; a constante garante o mesmo texto no render e na busca.
const BACKUP_DIR = "C:\\crm\\data\\backups";

const backups: BackupInfo[] = [
  { id: "2026-08-27_1430", createdAt: new Date(2026, 7, 27, 14, 30).toISOString(), sizeBytes: 2 * 1024 * 1024, kind: "manual", degraded: false },
  { id: "2026-08-26_0000", createdAt: new Date(2026, 7, 26, 0, 0).toISOString(), sizeBytes: 1536, kind: "auto", degraded: false },
];

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("BackupPanel", () => {
  it("shows the folder, one row per backup and a download link for each", () => {
    render(<BackupPanel backups={backups} backupDir={BACKUP_DIR} />);
    expect(screen.getByText(BACKUP_DIR)).toBeInTheDocument();
    expect(screen.getByText("27/08/2026 às 14:30")).toBeInTheDocument();
    expect(screen.getByText("2,0 MB")).toBeInTheDocument();
    expect(screen.getByText("Automático")).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: /Baixar/ });
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/api/backup/2026-08-27_1430", "/api/backup/2026-08-26_0000"]);
    expect(screen.queryByText(DEGRADED_LABEL)).not.toBeInTheDocument();
  });

  it("warns on a backup made with the raw file copy", () => {
    render(<BackupPanel backups={[{ ...backups[0], degraded: true }]} backupDir={BACKUP_DIR} />);
    expect(screen.getByText(DEGRADED_LABEL)).toBeInTheDocument();
    expect(screen.getByText(DEGRADED_HINT)).toBeInTheDocument();
  });

  it("creates a backup on demand", async () => {
    render(<BackupPanel backups={[]} backupDir="d" />);
    expect(screen.getByText(/Nenhum backup ainda/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fazer backup agora" }));
    await vi.waitFor(() => expect(mocks.createBackupAction).toHaveBeenCalledTimes(1));
  });

  it("restores in two steps and sends the backup id", async () => {
    render(<BackupPanel backups={backups} backupDir="d" />);
    fireEvent.click(screen.getAllByRole("button", { name: "Restaurar" })[1]);
    expect(screen.getByText(/Restaurar este backup\?/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByText(/Restaurar este backup\?/)).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Restaurar" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Sim, restaurar" }));
    await vi.waitFor(() => expect(mocks.restoreBackupAction).toHaveBeenCalledTimes(1));
    expect(mocks.restoreBackupAction.mock.calls[0][1].get("id")).toBe("2026-08-26_0000");
  });

  it("imports a zip through the API, then refreshes and confirms", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, id: "x" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <>
        <BackupPanel backups={[]} backupDir="d" />
        <Toaster />
      </>,
    );
    const input = screen.getByLabelText("Arquivo de backup (.zip)");
    fireEvent.change(input, { target: { files: [new File([new Uint8Array([0x50, 0x4b, 3, 4])], "backup.zip", { type: "application/zip" })] } });
    await vi.waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith("/api/backup/import", expect.objectContaining({ method: "POST" }));
    expect(await screen.findByText(/Backup importado/)).toBeInTheDocument();
  });

  it("shows the server error when the import is refused", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "O zip não contém um banco válido (app.db)." }), { status: 422 })));
    render(
      <>
        <BackupPanel backups={[]} backupDir="d" />
        <Toaster />
      </>,
    );
    fireEvent.change(screen.getByLabelText("Arquivo de backup (.zip)"), { target: { files: [new File(["x"], "x.zip")] } });
    expect(await screen.findByText("O zip não contém um banco válido (app.db).")).toBeInTheDocument();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
