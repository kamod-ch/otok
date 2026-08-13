import { createOtokClient } from "@kamod-ch/otok/client";
import { islandModules } from "virtual:otok-islands";

createOtokClient({
  registry: islandModules,
  softNav: true,
});
