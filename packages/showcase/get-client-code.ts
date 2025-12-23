// Lit Refresh Plugin - HMR Event Listener (client)
if (import.meta.hot) {
  import.meta.hot.on("lit-refresh:update", data => {
    console.log("[lit-refresh] Received update (client):", data);

    if (data.fileType === "scss") {
      // data.tags contains the component tagNames that reference this SCSS file
      if (Array.isArray(data.tags) && data.tags.length > 0) {
        import("virtual:lit-refresh-handler")
          .then(m => {
            // virtual module provided by the plugin
            if (m && typeof m.handleScssUpdate === "function") {
              m.handleScssUpdate(data.file, data.tags);
            }
          })
          .catch(e =>
            console.error("[lit-refresh] failed to load handler:", e)
          );
      }
    }
  });
  console.log("[lit-refresh] HMR listener registered (client)");
}
