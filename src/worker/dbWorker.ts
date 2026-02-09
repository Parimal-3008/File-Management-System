import { batchInsert } from "../db/utils";

onmessage = async ({ data }) => {
  if (data.type === "INIT_PARSE") {
    try {
      const response = await fetch("../../big(1).ndjson");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let processed = 0;
      const totalBytes = parseInt(
        response.headers.get("content-length") || "0"
      );
      let bytesReceived = 0;

      const items = [];

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;
        if (items.length >= 10000) {
          await batchInsert(items);
          items.length = 0;
        }
        bytesReceived += value.length;
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            items.push(parsed);
            processed++;
            postMessage({
              type: "data",
              data: parsed,
              progress: {
                current: processed,
                bytesReceived,
                totalBytes,
                percentBytes: totalBytes
                  ? Math.round((bytesReceived / totalBytes) * 100)
                  : 0,
              },
            });
          } catch (parseError) {
            console.error("Parse error:", parseError, "Line:", line);
            postMessage({
              type: "error",
              error: `Parse error: ${parseError.message}`,
            });
          }
        }
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer);
          items.push(parsed);
          processed++;
          postMessage({
            type: "data",
            data: parsed,
            progress: { current: processed, bytesReceived, totalBytes },
          });
        } catch (e) {
          // Ignore final parse errors
          console.log("Final parse error ignored:", e);
        }
      }

      // Insert any remaining items in the array
      if (items.length > 0) {
        await batchInsert(items);
      }

      postMessage({ type: "complete", total: processed });
    } catch (error) {
      console.log("error inside worker", error);
      postMessage({
        type: "error",
        error: error.message,
      });
    }
  }
};
