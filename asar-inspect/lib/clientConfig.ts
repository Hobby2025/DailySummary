tion/json" },
    body: JSON.stringify({}),
  }).catch(() => null);
  return !!response?.ok;
}

function isDesktopRuntime() {
  return !!getDesktopBridge();
}

function getDesktopBridge() {
  if (typeof window === "undefined") {
    return n