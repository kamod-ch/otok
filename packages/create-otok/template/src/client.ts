import { createOtokClient } from "otok/client";
import { islandModules } from "virtual:otok-islands";
import "./style.css";

createOtokClient({ registry: islandModules });
