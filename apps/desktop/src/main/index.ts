import { app, shell, BrowserWindow, ipcMain, dialog, protocol, net } from "electron";
import { join } from "path";
import { pathToFileURL } from "url";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";

// Register custom protocol before app is ready — makes it a "standard" scheme
// so relative URLs, Workers, and fetch all work correctly (unlike file://)
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 12, y: 19 },
    backgroundColor: "#0a0a0f",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  // Allow alphaTab print popup, deny all others
  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (details.url === "about:blank" || details.url === "") {
      return { action: "allow" };
    }
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // Fullscreen events
  mainWindow.on("enter-full-screen", () => {
    mainWindow.webContents.send("fullscreen-changed", true);
  });
  mainWindow.on("leave-full-screen", () => {
    mainWindow.webContents.send("fullscreen-changed", false);
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadURL("app://bundle/index.html");
  }

  return mainWindow;
}

app.whenReady().then(() => {
  // Serve renderer files via custom protocol so alphaTab Workers/fonts resolve correctly
  const rendererDir = join(__dirname, "../renderer");
  protocol.handle("app", (request) => {
    const url = new URL(request.url);
    const filePath = join(rendererDir, decodeURIComponent(url.pathname));
    return net.fetch(pathToFileURL(filePath).toString());
  });

  electronApp.setAppUserModelId("com.guitar-tab-reader");

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC: Open file dialog
  ipcMain.handle("dialog:openFile", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        {
          name: "Guitar Pro Files",
          extensions: ["gp", "gp3", "gp4", "gp5", "gpx", "gp7"],
        },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    const fileName =
      filePath.split("/").pop() || filePath.split("\\").pop() || "Unknown";
    const buffer = readFileSync(filePath);
    const data = Array.from(new Uint8Array(buffer));

    return { data, filePath, fileName };
  });

  // IPC: Save As dialog
  ipcMain.handle("dialog:saveFile", async (_event, data: number[]) => {
    const result = await dialog.showSaveDialog({
      filters: [
        {
          name: "Guitar Pro Files",
          extensions: ["gp"],
        },
      ],
    });

    if (result.canceled || !result.filePath) {
      return false;
    }

    writeFileSync(result.filePath, Buffer.from(new Uint8Array(data)));
    return true;
  });

  // IPC: Save to existing path
  ipcMain.handle(
    "file:save",
    async (_event, filePath: string, data: number[]) => {
      try {
        writeFileSync(filePath, Buffer.from(new Uint8Array(data)));
        return true;
      } catch {
        return false;
      }
    },
  );

  // IPC: Read file by absolute path
  ipcMain.handle("file:readPath", async (_event, filePath: string) => {
    try {
      if (!existsSync(filePath)) {
        return { error: "FILE_NOT_FOUND" as const };
      }
      const buffer = readFileSync(filePath);
      const data = Array.from(new Uint8Array(buffer));
      const fileName =
        filePath.split("/").pop() || filePath.split("\\").pop() || "Unknown";
      return { data, filePath, fileName };
    } catch {
      return { error: "READ_ERROR" as const };
    }
  });

  // IPC: Toggle fullscreen
  ipcMain.handle("window:toggleFullscreen", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setFullScreen(!win.isFullScreen());
    }
  });

  // IPC: Check fullscreen state
  ipcMain.handle("window:isFullscreen", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win?.isFullScreen() ?? false;
  });

  // IPC: Save export buffer with dialog
  ipcMain.handle(
    "export:saveBuffer",
    async (
      _event,
      data: number[],
      defaultName: string,
      filters: { name: string; extensions: string[] }[],
    ) => {
      const result = await dialog.showSaveDialog({
        defaultPath: defaultName,
        filters,
      });

      if (result.canceled || !result.filePath) {
        return false;
      }

      try {
        writeFileSync(result.filePath, Buffer.from(new Uint8Array(data)));
        return true;
      } catch {
        return false;
      }
    },
  );

  createWindow();

  app.on("activate", function() {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
