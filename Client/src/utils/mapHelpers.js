export const slugOf = (layer) =>
  String(layer?.slug || layer?.name || layer?.id || "layer")
    .trim()
    .replace(/\s+/g, "_");

export const jwtToken = () => localStorage.getItem("sl:token") || "";
