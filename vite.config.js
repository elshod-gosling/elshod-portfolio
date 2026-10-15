import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            // Keep the engine cached when the portfolio or optional effects change.
            {
              name: "three-engine",
              test: /node_modules[\\/]three[\\/]build[\\/]/,
            },
          ],
        },
      },
    },
  },
});
