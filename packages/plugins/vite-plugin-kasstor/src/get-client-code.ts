// Kasstor Plugin - HMR Event Listener (client)
//
// This client receives custom HMR events from the Vite plugin and delegates
// the actual handling to the virtual `virtual:lit-refresh-handler` module.
//
// Responsibilities:
//  - For SCSS updates: compute the affected tags server-side and trigger a
//    style replacement on the client.
//  - For component updates: re-import the updated component module so that
//    the decorator runs again and the HMR runtime (`register`) can swap the
//    implementation behind the proxies.
if (import.meta.hot) {
  import.meta.hot.on("lit-refresh:update", data => {
    if (data.debug) {
      console.log("[kasstor] Received update (client):", data);
    }

    // Handle SCSS updates (styles only)
    if (data.fileType === "scss") {
      // data.tags contains the component tagNames that reference this SCSS file
      if (Array.isArray(data.tags) && data.tags.length > 0) {
        // @ts-expect-error TODO: Use a different approach for divining the
        // implementation into multiple files
        import("virtual:lit-refresh-handler")
          .then(m => {
            // virtual module provided by the plugin
            if (m && typeof m.handleScssUpdate === "function") {
              m.handleScssUpdate(data.file, data.tags, data.operationId);
            }
          })
          .catch(e => console.error("[kasstor] failed to load handler:", e));
      }
      return;
    }

    // Handle component updates (re-import the module so decorators run again)
    if (data.fileType === "component") {
      // @ts-expect-error TODO: Use a different approach for divining the
      // implementation into multiple files
      import("virtual:lit-refresh-handler")
        .then(m => {
          if (m && typeof m.handleComponentUpdate === "function") {
            m.handleComponentUpdate(data.file, data.tags, data.operationId);
          }
        })
        .catch(e => console.error("[kasstor] failed to load handler:", e));
    }
  });

  console.log("[kasstor] HMR listener registered (client)");
}

