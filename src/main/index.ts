import { app, shell, BrowserWindow, ipcMain, dialog } from "electron";
import { join } from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";

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

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return mainWindow;
}

app.whenReady().then(() => {
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
