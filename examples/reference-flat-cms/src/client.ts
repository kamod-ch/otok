import { createOtokClient } from "otok/client";
import { islandModules } from "virtual:otok-islands";

createOtokClient({ registry: islandModules, softNav: { forms: true } });
