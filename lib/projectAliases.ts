import { apiRequest } from "@/lib/authClient";

type ProjectAlias = {
  status: string;
};

type Project = {
  aliases?: ProjectAlias[];
};

export async function getPendingProjectAliasCount() {
  const response = await apiRequest("/api/daily-summary/projects", { method: "GET" });
  const data = (await response.json().catch(() => null)) as Project[] | null;

  if (!response.ok || !Array.isArray(data)) {
    return 0;
  }

  return data.reduce(
    (count, project) => count + (project.aliases ?? []).filter((alias) => alias.status === "PENDING").length,
    0,
  );
}
