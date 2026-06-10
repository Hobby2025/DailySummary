type GithubModelJsonRequest = {
  system: string;
  user: string;
};

export async function requestGithubModelJson({ system, user }: GithubModelJsonRequest) {
  const token = process.env.GITHUB_MODELS_TOKEN;

  if (!token) {
    throw new Error("GitHub Models 토큰이 없습니다.");
  }

  const response = await fetch(resolveModelsEndpoint(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GITHUB_MODELS_MODEL ?? "openai/gpt-4.1-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error("GitHub Models 요청에 실패했습니다.");
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (typeof content !== "string" || content.length > 200_000) {
    throw new Error("GitHub Models 응답 형식이 올바르지 않습니다.");
  }

  return JSON.parse(content);
}

function resolveModelsEndpoint() {
  const endpoint = process.env.GITHUB_MODELS_ENDPOINT ?? "https://models.github.ai/inference/chat/completions";
  const url = new URL(endpoint);

  if (url.protocol !== "https:") {
    throw new Error("GitHub Models 엔드포인트는 HTTPS만 허용됩니다.");
  }

  return url;
}
