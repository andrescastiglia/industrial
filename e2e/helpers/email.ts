import { promises as fs } from "node:fs";
import path from "node:path";

import { EMAIL_CAPTURE_DIR } from "../test-config";

export type CapturedEmail = {
  id: string;
  to: string[];
  subject: string;
  html: string;
  attachments: Array<{
    filename: string;
    contentType: string;
    size: number;
  }>;
};

export async function clearCapturedEmails() {
  await fs.rm(EMAIL_CAPTURE_DIR, { recursive: true, force: true });
  await fs.mkdir(EMAIL_CAPTURE_DIR, { recursive: true });
}

export async function listCapturedEmails(): Promise<CapturedEmail[]> {
  try {
    const entries = await fs.readdir(EMAIL_CAPTURE_DIR, {
      withFileTypes: true,
    });
    const messageDirectories = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(EMAIL_CAPTURE_DIR, entry.name));

    const messages = await Promise.all(
      messageDirectories.map(async (messageDirectory) => {
        const messagePath = path.join(messageDirectory, "message.json");
        const payload = await fs.readFile(messagePath, "utf8");
        return JSON.parse(payload) as CapturedEmail;
      })
    );

    return messages.sort((left, right) => left.id.localeCompare(right.id));
  } catch (error) {
    return [];
  }
}
