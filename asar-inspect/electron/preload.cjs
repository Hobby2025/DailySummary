.from(await response.arrayBuffer());
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    ok: response.ok,
    status: response.status,
    headers,
    bodyBase64: bufferToBase64(buffer),
  };
}

function buildJsonLikeResponse(status, data) {
  const body = Buffer.from(JSON.stringify(data));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Hea