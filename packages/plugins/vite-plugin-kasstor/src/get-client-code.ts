// Kasstor Plugin - HMR Event Listener (client)
//
// This client receives custom HMR events from the Vite plugin and delegates
// the actual handling to the virtual `virtual:kasstor-client-handlers` module.
//
// Responsibilities:
//  - For SCSS updates: compute the affected tags server-side and trigger a
//    style replacement on the client.
//  - For component updates: re-import the updated component module so that
//    the decorator runs again and the HMR runtime (`register`) can swap the
//    implementation behind the proxies.
if (import.meta.hot) {
  import.meta.hot.on("kasstor:update", data => {
    // Handle SCSS updates (styles only)
    if (data.fileType === "scss") {
      // data.tags contains the component tagNames that reference this SCSS file
      if (data.tags.length > 0) {
        // @ts-expect-error TODO: Use a different approach for divining the
        // implementation into multiple files
        import("virtual:kasstor-client-handlers")
          .then(m => {
            // virtual module provided by the plugin
            if (m && typeof m.handleScssUpdate === "function") {
              m.handleScssUpdate(data.scssPath, data.tags, data.operationId);
            }
          })
          .catch(e =>
            console.error("[kasstor] Failed to load handler for styles:", e)
          );
      }
      return;
    }

    // Handle component updates (re-import the module so decorators run again)
    // @ts-expect-error TODO: Use a different approach for divining the
    // implementation into multiple files
    import("virtual:kasstor-client-handlers")
      .then(m => {
        if (m && typeof m.handleComponentUpdate === "function") {
          m.handleComponentUpdate(
            data.componentPaths,
            data.tags,
            data.operationId
          );
        }
      })
      .catch(e =>
        console.error("[kasstor] Failed to load handler for components:", e)
      );
  });

  console.log("[kasstor] HMR listener registered");
}

