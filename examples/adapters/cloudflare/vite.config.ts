import preact from "@preact/preset-vite";
import { otok } from "@otok/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({ plugins: [preact(), otok()] });
