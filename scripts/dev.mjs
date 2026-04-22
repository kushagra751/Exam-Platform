import { spawn } from "node:child_process";
import net from "node:net";

const PORTS = [
  { port: 5000, label: "API server" },
  { port: 5173, label: "Vite client" }
];

const isPortInUse = (port) =>
  new Promise((resolve) => {
    const socket = new net.Socket();

    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.once("error", () => {
      resolve(false);
    });

    socket.setTimeout(700, () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, "127.0.0.1");
  });

const occupiedPorts = [];

for (const entry of PORTS) {
  if (await isPortInUse(entry.port)) {
    occupiedPorts.push(entry);
  }
}

if (occupiedPorts.length > 0) {
  const summary = occupiedPorts.map((entry) => `${entry.label} on ${entry.port}`).join(", ");
  console.log(`Dev services already appear to be running: ${summary}.`);
  console.log("Reuse the existing instance, or stop the running processes before starting a fresh one.");
  process.exit(0);
}

const child = spawn(
  "npx",
  ["concurrently", "npm run dev --workspace server", "npm run dev --workspace client"],
  {
    stdio: "inherit",
    shell: true
  }
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
