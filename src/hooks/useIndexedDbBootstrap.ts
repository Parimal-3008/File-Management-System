import { useEffect, useRef, useState } from "react";
import { hasIndexedDBData } from "../db/utils";

export function useIndexedDbBootstrap() {
  const [isDbReady, setIsDbReady] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      const hasData = await hasIndexedDBData();

      if (hasData) {
        setIsDbReady(true);
        return;
      }

      workerRef.current = new Worker(
        new URL("../worker/dbWorker.ts", import.meta.url),
        { type: "module" }
      );

      workerRef.current.postMessage({ type: "INIT_PARSE" });

      workerRef.current.onmessage = (e) => {
        if (e.data.type === "complete") {
          setIsDbReady(true);
        }
      };
    };

    init();

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  return isDbReady;
}
